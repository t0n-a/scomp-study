import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LAB_DIR = path.join(__dirname, '.lab')
const RUN_TIMEOUT_S = 5
const WSL_KILL_TIMEOUT_MS = 30_000 // backstop so a hung wsl call never wedges the server

// Escape a string for safe inclusion inside single quotes in a bash script.
function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`
}

function runWsl(script) {
  return new Promise((resolve) => {
    execFile(
      'wsl',
      ['bash', '-lc', script],
      { timeout: WSL_KILL_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err && err.code === 'ENOENT') {
          resolve({ ok: false, error: 'WSL not found — is WSL installed and on PATH?' })
        } else if (err && err.killed) {
          resolve({ ok: false, error: 'WSL call timed out (killed after 30s).' })
        } else {
          // err.code is the process exit code when the process ran but exited non-zero.
          const exitCode = err ? (typeof err.code === 'number' ? err.code : 1) : 0
          resolve({ ok: true, exitCode, stdout: String(stdout), stderr: String(stderr) })
        }
      }
    )
  })
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) reject(new Error('Request body too large'))
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, obj) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

function compileApiPlugin() {
  return {
    name: 'scomp-compile-api',
    configureServer(server) {
      server.middlewares.use('/api/compile', async (req, res) => {
        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Use POST' })
        }
        try {
          const { code, run = false, stdin } = await readJsonBody(req)
          if (typeof code !== 'string' || code.trim() === '') {
            return sendJson(res, 400, { error: 'Missing "code" (string) in request body' })
          }

          mkdirSync(LAB_DIR, { recursive: true })
          writeFileSync(path.join(LAB_DIR, 'prog.c'), code, 'utf8')
          const hasStdin = typeof stdin === 'string' && stdin.length > 0
          if (hasStdin) {
            writeFileSync(path.join(LAB_DIR, 'stdin.txt'), stdin, 'utf8')
          }

          // wslpath converts the single-quoted Windows path (backslashes intact)
          // to a /mnt/... path inside WSL.
          const cdCmd = `cd "$(wslpath ${shq(LAB_DIR)})"`

          // --- Compile ---
          const compile = await runWsl(`${cdCmd} && gcc -Wall -pthread prog.c -o prog`)
          if (!compile.ok) {
            return sendJson(res, 500, { error: compile.error })
          }
          const result = {
            compileOutput: (compile.stdout + compile.stderr).trim(),
            compileExitCode: compile.exitCode,
            runOutput: null,
            runExitCode: null,
            timedOut: false,
          }

          // --- Run ---
          if (run && compile.exitCode === 0) {
            const redirect = hasStdin ? ' < stdin.txt' : ''
            const runRes = await runWsl(
              `${cdCmd} && timeout ${RUN_TIMEOUT_S} ./prog${redirect}`
            )
            if (!runRes.ok) {
              return sendJson(res, 500, { error: runRes.error, ...result })
            }
            result.runOutput = (runRes.stdout + runRes.stderr).trim()
            result.runExitCode = runRes.exitCode
            result.timedOut = runRes.exitCode === 124
          }

          return sendJson(res, 200, result)
        } catch (err) {
          return sendJson(res, 400, { error: err.message || 'Unexpected error' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), compileApiPlugin()],
})
