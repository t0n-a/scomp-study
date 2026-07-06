import { useEffect, useMemo, useState } from 'react'
import { simulate, explainTick, profileString } from '../utils/scheduler.js'
import '../styles/tracer.css'

// ---------------------------------------------------------------------------
// Cenários. A solução de cada um é sempre simulate(scenario) — nunca escrita
// à mão — exceto o traço GROUND_TRUTH_TRACE abaixo, que serve só de
// verificação de sanidade contra o cenário #1 (exame modelo resolvido à mão).
// ---------------------------------------------------------------------------

const GROUND_TRUTH_TRACE = '3311131332222-2'

const SCENARIOS = [
  {
    id: 'modelo',
    label: 'Exame modelo 24/25',
    scenario: {
      algorithm: 'priority',
      processes: [
        { id: 1, arrival: 2, priority: 1, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 1 }] },
        { id: 2, arrival: 1, priority: 3, phases: [{ t: 'cpu', n: 4 }, { t: 'io', n: 1 }, { t: 'cpu', n: 1 }] },
        { id: 3, arrival: 0, priority: 2, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 2 }] },
      ],
    },
  },
  {
    id: 'prio-2',
    label: 'Prioridades #2',
    scenario: {
      algorithm: 'priority',
      processes: [
        { id: 1, arrival: 0, priority: 2, phases: [{ t: 'cpu', n: 2 }, { t: 'io', n: 2 }, { t: 'cpu', n: 3 }] },
        { id: 2, arrival: 0, priority: 1, phases: [{ t: 'cpu', n: 4 }] },
        { id: 3, arrival: 3, priority: 3, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 2 }] },
      ],
    },
  },
  {
    id: 'prio-3',
    label: 'Prioridades #3',
    scenario: {
      algorithm: 'priority',
      processes: [
        { id: 1, arrival: 0, priority: 3, phases: [{ t: 'cpu', n: 4 }, { t: 'io', n: 2 }, { t: 'cpu', n: 1 }] },
        { id: 2, arrival: 2, priority: 1, phases: [{ t: 'cpu', n: 2 }, { t: 'io', n: 1 }, { t: 'cpu', n: 2 }] },
        { id: 3, arrival: 4, priority: 2, phases: [{ t: 'cpu', n: 3 }] },
      ],
    },
  },
  {
    id: 'prio-4',
    label: 'Prioridades #4',
    scenario: {
      algorithm: 'priority',
      processes: [
        { id: 1, arrival: 1, priority: 1, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 3 }, { t: 'cpu', n: 2 }] },
        { id: 2, arrival: 0, priority: 2, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 2 }] },
        { id: 3, arrival: 5, priority: 3, phases: [{ t: 'cpu', n: 4 }] },
      ],
    },
  },
  {
    id: 'rr-2',
    label: 'Round-robin q=2',
    scenario: {
      algorithm: 'rr',
      quantum: 2,
      processes: [
        { id: 1, arrival: 0, phases: [{ t: 'cpu', n: 4 }] },
        { id: 2, arrival: 0, phases: [{ t: 'cpu', n: 3 }] },
        { id: 3, arrival: 2, phases: [{ t: 'cpu', n: 2 }] },
      ],
    },
  },
  {
    id: 'rr-3',
    label: 'Round-robin q=3',
    scenario: {
      algorithm: 'rr',
      quantum: 3,
      processes: [
        { id: 1, arrival: 0, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 2 }, { t: 'cpu', n: 2 }] },
        { id: 2, arrival: 1, phases: [{ t: 'cpu', n: 4 }] },
        { id: 3, arrival: 3, phases: [{ t: 'cpu', n: 2 }, { t: 'io', n: 1 }, { t: 'cpu', n: 1 }] },
      ],
    },
  },
]

// Sanidade: se o motor não reproduzir o traço verificado à mão do cenário
// modelo, algo está partido e não podemos confiar em nenhum exercício.
const SCHEDULER_OK = simulate(SCENARIOS[0].scenario) === GROUND_TRUTH_TRACE

const STORAGE_KEY = 'scomp:tracer'

function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best))
  } catch {
    // armazenamento indisponível; ignora
  }
}

export default function Tracer() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [best, setBest] = useState(() => loadBest())
  const [cells, setCells] = useState([])
  const [verifyResult, setVerifyResult] = useState(null)
  const [showSolution, setShowSolution] = useState(false)

  const entry = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0]
  const scenario = entry.scenario
  const solution = useMemo(() => simulate(scenario), [scenario])
  const processIds = useMemo(
    () => scenario.processes.map((p) => p.id).sort((a, b) => a - b),
    [scenario]
  )

  useEffect(() => {
    setCells(Array(solution.length).fill(null))
    setVerifyResult(null)
    setShowSolution(false)
  }, [scenarioId, solution.length])

  const currentIndex = cells.findIndex((c) => c === null)
  const allFilled = currentIndex === -1

  function pickAnswer(ch) {
    if (!SCHEDULER_OK || currentIndex === -1) return
    const next = [...cells]
    next[currentIndex] = ch
    setCells(next)
    setVerifyResult(null)
  }

  function undo() {
    const lastFilled = cells.reduce((acc, c, i) => (c !== null ? i : acc), -1)
    if (lastFilled === -1) return
    const next = [...cells]
    next[lastFilled] = null
    setCells(next)
    setVerifyResult(null)
  }

  function verify() {
    const userTrace = cells.join('')
    if (userTrace === solution) {
      setVerifyResult({ ok: true })
      const nextBest = { ...best, [scenarioId]: true }
      setBest(nextBest)
      saveBest(nextBest)
      return
    }
    let firstWrong = 0
    while (firstWrong < solution.length && cells[firstWrong] === solution[firstWrong]) firstWrong++
    const explanation = explainTick(scenario, firstWrong)
    setVerifyResult({ ok: false, firstWrong, explanation })
    const nextBest = { ...best, [scenarioId]: best[scenarioId] || false }
    setBest(nextBest)
    saveBest(nextBest)
  }

  function cellClass(i) {
    if (verifyResult && !verifyResult.ok) {
      if (i < verifyResult.firstWrong) return 'tick-cell tick-good'
      if (i === verifyResult.firstWrong) return 'tick-cell tick-bad'
    } else if (verifyResult && verifyResult.ok) {
      return 'tick-cell tick-good'
    }
    if (i === currentIndex) return 'tick-cell tick-current'
    return 'tick-cell'
  }

  if (!SCHEDULER_OK) {
    return (
      <div className="page">
        <h1>traços de escalonamento</h1>
        <div className="tracer-error">
          Erro interno: o motor de simulação não reproduziu o traço verificado
          do exame modelo. Os exercícios foram desativados até isto ser
          corrigido — nenhum outro cenário é fiável enquanto este falhar.
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>traços de escalonamento</h1>
      <p className="subtitle">
        Preenche tick a tick quem ocupa a CPU; é o tipo de pergunta que vale
        0.8 pts no Grupo I.
      </p>

      <div className="topic-filter">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`chip ${scenarioId === s.id ? 'chip-on' : ''}`}
            onClick={() => setScenarioId(s.id)}
          >
            {s.label}
            {best[s.id] ? ' ✓' : ''}
          </button>
        ))}
      </div>

      <table className="tracer-table">
        <thead>
          <tr>
            <th>Processo</th>
            <th>Perfil</th>
            <th>Chegada</th>
            <th>{scenario.algorithm === 'rr' ? 'Quantum' : 'Prioridade'}</th>
          </tr>
        </thead>
        <tbody>
          {scenario.processes
            .slice()
            .sort((a, b) => a.id - b.id)
            .map((p) => (
              <tr key={p.id}>
                <td>P{p.id}</td>
                <td className="tracer-mono">{profileString(p)}</td>
                <td>{p.arrival}</td>
                <td>{scenario.algorithm === 'rr' ? scenario.quantum : p.priority}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="tick-grid">
        {cells.map((c, i) => (
          <div key={i} className={cellClass(i)}>
            <span className="tick-label">t{i}</span>
            <span className="tick-value">{c === null ? '' : c}</span>
          </div>
        ))}
      </div>

      <div className="btn-row tracer-answer-row">
        {processIds.map((id) => (
          <button
            key={id}
            className="btn"
            disabled={allFilled}
            onClick={() => pickAnswer(String(id))}
          >
            P{id}
          </button>
        ))}
        <button className="btn" disabled={allFilled} onClick={() => pickAnswer('-')}>
          —
        </button>
        <button className="btn" onClick={undo} disabled={cells.every((c) => c === null)}>
          Apagar
        </button>
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={verify} disabled={!allFilled}>
          Verificar
        </button>
        <button className="btn" onClick={() => setShowSolution((s) => !s)}>
          {showSolution ? 'Esconder solução' : 'Mostrar solução'}
        </button>
      </div>

      {verifyResult && verifyResult.ok && (
        <p className="tracer-feedback tracer-feedback-good">
          Certo. Traço idêntico à solução: <span className="tracer-mono">{solution}</span>
        </p>
      )}

      {verifyResult && !verifyResult.ok && (
        <div className="tracer-feedback tracer-feedback-bad">
          <p>
            Errado a partir do tick t{verifyResult.firstWrong}: escreveste{' '}
            <span className="tracer-mono">{cells[verifyResult.firstWrong]}</span>, mas devia
            ser <span className="tracer-mono">{solution[verifyResult.firstWrong]}</span>.
          </p>
          {verifyResult.explanation && <p>{verifyResult.explanation.text}</p>}
        </div>
      )}

      {showSolution && (
        <p className="tracer-solution">
          Solução: <span className="tracer-mono">{solution}</span>
        </p>
      )}
    </div>
  )
}
