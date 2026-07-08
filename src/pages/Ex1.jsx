import { useState } from 'react'
import exercises from '../data/exercicios1.json'

function initBlockState(ex) {
  const text = {}
  const status = {}
  ex.blocks.forEach((b, i) => {
    text[i] = ''
    status[i] = 'untried'
  })
  return { text, status }
}

export default function Ex1() {
  const [exIndex, setExIndex] = useState(0)
  const exercise = exercises[exIndex]

  const [blockState, setBlockState] = useState(() => initBlockState(exercises[0]))
  const [blockOutput, setBlockOutput] = useState({})
  const [validatingBlock, setValidatingBlock] = useState(null)
  const [stdin, setStdin] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  function selectExercise(idx) {
    const idxNum = Number(idx)
    setExIndex(idxNum)
    setBlockState(initBlockState(exercises[idxNum]))
    setBlockOutput({})
    setResult(null)
    setStdin('')
  }

  function handleKeyDown(e, i) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const current = blockState.text[i] || ''
      const next = current.slice(0, start) + '    ' + current.slice(end)
      setBlockState((prev) => ({
        ...prev,
        text: { ...prev.text, [i]: next },
      }))
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4
      })
    }
  }

  function setBlockText(i, value) {
    setBlockState((prev) => ({
      ...prev,
      text: { ...prev.text, [i]: value },
    }))
  }

  function revealBlock(i) {
    setBlockText(i, exercise.blocks[i].code)
    setBlockState((prev) => ({
      ...prev,
      status: { ...prev.status, [i]: 'untried' },
    }))
    setBlockOutput((prev) => {
      const next = { ...prev }
      delete next[i]
      return next
    })
  }

  function revealAll() {
    setBlockState((prev) => {
      const text = {}
      exercise.blocks.forEach((b, i) => {
        text[i] = b.code
      })
      return { ...prev, text }
    })
  }

  async function validateBlock(i) {
    const userText = blockState.text[i] ?? ''
    const code =
      exercise.preamble +
      '\n' +
      exercise.blocks
        .map((b, idx) => (idx === i ? userText : b.code))
        .join('\n') +
      '\n'

    setValidatingBlock(i)
    setBlockState((prev) => ({
      ...prev,
      status: { ...prev.status, [i]: 'validating' },
    }))

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, run: false }),
      })
      const data = await res.json()
      if (data.error) {
        setBlockState((prev) => ({
          ...prev,
          status: { ...prev.status, [i]: 'error' },
        }))
        setBlockOutput((prev) => ({ ...prev, [i]: `Erro: ${data.error}` }))
      } else if (data.compileExitCode === 0) {
        setBlockState((prev) => ({
          ...prev,
          status: { ...prev.status, [i]: 'ok' },
        }))
        setBlockOutput((prev) => {
          const next = { ...prev }
          delete next[i]
          return next
        })
      } else {
        setBlockState((prev) => ({
          ...prev,
          status: { ...prev.status, [i]: 'error' },
        }))
        setBlockOutput((prev) => ({
          ...prev,
          [i]: data.compileOutput || '(sem output do compilador)',
        }))
      }
    } catch (err) {
      setBlockState((prev) => ({
        ...prev,
        status: { ...prev.status, [i]: 'error' },
      }))
      setBlockOutput((prev) => ({ ...prev, [i]: `Request failed: ${err.message}` }))
    } finally {
      setValidatingBlock(null)
    }
  }

  async function compileAndRunAll(run) {
    const code =
      exercise.preamble +
      '\n' +
      exercise.blocks
        .map((b, idx) => {
          const userText = blockState.text[idx]
          return userText && userText.trim() ? userText : b.code
        })
        .join('\n') +
      '\n'

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

  const okCount = exercise.blocks.filter((b, i) => blockState.status[i] === 'ok').length

  function statusBadge(status) {
    switch (status) {
      case 'ok':
        return <span className="badge exit-ok">✓ compila</span>
      case 'error':
        return <span className="badge exit-fail">✗ erro</span>
      case 'validating':
        return <span className="badge muted">a validar…</span>
      default:
        return <span className="badge muted">por tentar</span>
    }
  }

  return (
    <div className="page page-wide">
      <h1>exercícios 1</h1>
      <p className="subtitle">
        Processos + pipes, bloco a bloco. O C é compilado com <code>gcc -Wall -pthread</code> no
        WSL.
      </p>

      <div className="lab-controls">
        <label>
          Exercício:{' '}
          <select value={exIndex} onChange={(e) => selectExercise(e.target.value)}>
            {exercises.map((ex, i) => (
              <option key={ex.id} value={i}>
                {ex.title} — {ex.source}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">
          {okCount}/{exercise.blocks.length} blocos a compilar
        </span>
      </div>

      <details>
        <summary>Enunciado</summary>
        <pre className="ex1-statement">{exercise.statement}</pre>
      </details>

      <details>
        <summary>Includes (fixo, não se treina)</summary>
        <pre className="ex1-statement">{exercise.preamble}</pre>
      </details>

      <p className="muted ex1-note">
        Cada bloco é validado compilando o teu texto junto com a solução de referência dos
        restantes blocos, por isso os nomes (structs, variáveis) têm de coincidir com a
        referência — usa &quot;Ver solução&quot; se precisares.
      </p>

      <div className="ex1-blocks">
        {exercise.blocks.map((block, i) => {
          const text = blockState.text[i] ?? ''
          const status = blockState.status[i] ?? 'untried'
          const lineCount = Math.max(4, (text.split('\n').length || 1) + 1)
          return (
            <div className="ex1-block-card" key={`${exercise.id}-${block.id}`}>
              <div className="ex1-block-header">
                <strong>
                  {i + 1}. {block.label}
                </strong>
                {statusBadge(status)}
              </div>
              <p className="muted ex1-block-hint">{block.hint}</p>
              <textarea
                className="code-editor"
                value={text}
                onChange={(e) => setBlockText(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                spellCheck={false}
                rows={lineCount}
              />
              <div className="btn-row">
                <button
                  className="btn"
                  disabled={validatingBlock === i}
                  onClick={() => validateBlock(i)}
                >
                  Validar bloco
                </button>
                <button className="btn" onClick={() => revealBlock(i)}>
                  Ver solução
                </button>
              </div>
              {blockOutput[i] && (
                <div className="output-panel">
                  <div className="output-header">
                    Saída do compilador
                    <span className="exit-fail">erro</span>
                  </div>
                  <pre className="output-body">{blockOutput[i]}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
        <button className="btn btn-primary" disabled={busy} onClick={() => compileAndRunAll(true)}>
          Compilar e correr tudo
        </button>
        <button className="btn" onClick={revealAll}>
          Revelar solução completa
        </button>
        {busy && <span className="muted">A compilar…</span>}
      </div>

      {result && (
        <div className="lab-output">
          {result.error && <div className="lab-error">Erro: {result.error}</div>}
          {result.compileOutput !== undefined && (
            <div className="output-panel">
              <div className="output-header">
                Saída do compilador
                {result.compileExitCode !== null && result.compileExitCode !== undefined && (
                  <span className={result.compileExitCode === 0 ? 'exit-ok' : 'exit-fail'}>
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
    </div>
  )
}
