import { useEffect, useRef, useState } from 'react'
import templates from '../data/labTemplates.json'
import { diffLines } from '../utils/diff'
import '../styles/diff.css'

// Templates-gold (soluções de referência) vivem em patterns/ na raiz do repo,
// fora de src/ — o glob com ?raw funciona porque o Vite permite import de
// ficheiros dentro da raiz do projeto, mesmo fora de src/.
const goldModules = import.meta.glob('../../patterns/template-*.c', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const GOLD_LABELS = {
  A: 'A — pipes',
  B: 'B — leitores-escritores',
  C: 'C — produtor-consumidor',
}

const goldTemplates = Object.entries(goldModules)
  .map(([filePath, code]) => {
    const match = filePath.match(/template-([A-C])-/)
    const letter = match ? match[1] : '?'
    return { id: letter, label: GOLD_LABELS[letter] || letter, code }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

// pendingLoad: optional { templateFile, nonce } set by App when another tab
// (e.g. Exam's "Abrir no Code Lab") asks to load a specific template here.
// `nonce` changes every time so the same templateFile can be requested twice.
export default function CodeLab({ pendingLoad }) {
  const [code, setCode] = useState(templates[0]?.code || '')
  const [stdin, setStdin] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [compareId, setCompareId] = useState(goldTemplates[0]?.id || '')
  const [diffRows, setDiffRows] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!pendingLoad) return
    if (typeof pendingLoad.code === 'string') {
      setCode(pendingLoad.code)
      setResult(null)
      setDiffRows(null)
      return
    }
    const t = templates.find((t) => t.id === pendingLoad.templateFile)
    if (t) {
      setCode(t.code)
      setResult(null)
      setDiffRows(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLoad])

  const lineCount = code.split('\n').length

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = code.slice(0, start) + '    ' + code.slice(end)
      setCode(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4
      })
    }
  }

  function loadTemplate(id) {
    const t = templates.find((t) => t.id === id)
    if (t) {
      setCode(t.code)
      setResult(null)
      setDiffRows(null)
    }
  }

  function handleCompare() {
    const gold = goldTemplates.find((t) => t.id === compareId)
    if (!gold) return
    setDiffRows(diffLines(code, gold.code))
  }

  async function compile(run) {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, run, stdin: stdin || undefined }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ error: `Request failed: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page-wide">
      <h1>lab</h1>
      <p className="subtitle">
        O C é compilado com <code>gcc -Wall -pthread</code> no WSL. A execução tem limite de 5
        segundos.
      </p>

      <div className="lab-controls">
        <label>
          Template:{' '}
          <select onChange={(e) => loadTemplate(e.target.value)} defaultValue={templates[0]?.id}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">{lineCount} linhas</span>
      </div>

      <textarea
        ref={textareaRef}
        className="code-editor"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        rows={Math.max(16, lineCount + 2)}
      />

      <label className="stdin-label">
        stdin (opcional):
        <textarea
          className="stdin-input"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder="Entrada enviada ao programa quando corre"
        />
      </label>

      <div className="btn-row">
        <button className="btn" disabled={busy} onClick={() => compile(false)}>
          Compilar
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => compile(true)}>
          Compilar e correr
        </button>
        {busy && <span className="muted">A compilar…</span>}
      </div>

      <div className="diff-controls">
        <label>
          Comparar com:{' '}
          <select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
            {goldTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={handleCompare}>
          Comparar
        </button>
      </div>

      {result && (
        <div className="lab-output">
          {result.error && <div className="lab-error">Erro: {result.error}</div>}
          {result.compileOutput !== undefined && (
            <div className="output-panel">
              <div className="output-header">
                Saída do compilador
                {result.compileExitCode !== null && result.compileExitCode !== undefined && (
                  <span
                    className={result.compileExitCode === 0 ? 'exit-ok' : 'exit-fail'}
                  >
                    exit {result.compileExitCode}
                  </span>
                )}
              </div>
              <pre className="output-body">
                {result.compileOutput || '(sem avisos — compilou limpo)'}
              </pre>
            </div>
          )}
          {result.runExitCode !== null && result.runExitCode !== undefined && (
            <div className="output-panel">
              <div className="output-header">
                Saída do programa
                <span className={result.runExitCode === 0 ? 'exit-ok' : 'exit-fail'}>
                  exit {result.runExitCode}
                </span>
                {result.timedOut && <span className="timeout-badge">tempo excedido</span>}
              </div>
              <pre className="output-body">{result.runOutput || '(sem output)'}</pre>
            </div>
          )}
        </div>
      )}

      {diffRows && (
        <div className="diff-panel">
          <div className="diff-header">
            <div className="diff-summary">
              <span className="diff-summary-counts">
                {diffRows.filter((r) => r.type === 'del' || r.type === 'mod').length} linhas só no
                teu código · {diffRows.filter((r) => r.type === 'add' || r.type === 'mod').length}{' '}
                linhas só no template
              </span>
              <p className="diff-summary-hint muted">
                diferenças ≠ erros — compara a ESTRUTURA (pipes antes do fork, closes,
                waits/joins), não o texto
              </p>
            </div>
            <button className="btn" onClick={() => setDiffRows(null)}>
              Fechar comparação
            </button>
          </div>
          <div className="diff-columns">
            <div>o teu código</div>
            <div>template</div>
          </div>
          <div className="diff-scroll">
            {diffRows.map((row, i) => (
              <div key={i} className={`diff-row diff-row-${row.type}`}>
                <div className="diff-cell diff-cell-left">{row.left ?? ''}</div>
                <div className="diff-cell diff-cell-right">{row.right ?? ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
