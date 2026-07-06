import { useState } from 'react'
import questions from '../data/questions.json'
import grupo2 from '../data/grupo2.json'
import QuestionView from '../components/QuestionView.jsx'
import {
  getAttempts,
  lastSeen,
  recordAttempt,
  recordExam,
  getG2Attempts,
  recordG2Attempt,
} from '../utils/storage.js'
import { shuffle } from '../utils/misc.js'

const EXAM_SIZE = 10
const POINTS_CORRECT = 0.8
const POINTS_INCORRECT = -0.8 / 3

const CRITERIA = [
  { key: 'estrutura', label: 'Estrutura', weight: 0.4 },
  { key: 'sync', label: 'Sincronização / lógica', weight: 0.3 },
  { key: 'limpeza', label: 'Limpeza — fecho de recursos / fds / joins', weight: 0.2 },
  { key: 'estilo', label: 'Estilo', weight: 0.1 },
]

const LEVELS = [
  { value: 0, label: 'Não fiz' },
  { value: 50, label: 'Parcial' },
  { value: 100, label: 'Completo' },
]

function emptyG2Answer() {
  return {
    graded: false,
    dicasOpen: false,
    criteria: { estrutura: 0, sync: 0, limpeza: 0, estilo: 0 },
  }
}

function pickExamQuestions() {
  const attempts = getAttempts()
  // Prefer least-recently-seen: sort by last-seen timestamp (never seen first),
  // shuffling within so ties don't always give the same order.
  const sorted = shuffle(questions).sort(
    (a, b) => lastSeen(attempts, a.id) - lastSeen(attempts, b.id)
  )
  return sorted.slice(0, Math.min(EXAM_SIZE, sorted.length))
}

// Pick one "A" archetype question and one "B"/"C" archetype question,
// preferring least-recently-used, same idea as pickExamQuestions.
function pickGrupo2Questions() {
  const attempts = getG2Attempts()
  const byLru = (arr) =>
    shuffle(arr).sort((a, b) => lastSeen(attempts, a.id) - lastSeen(attempts, b.id))

  const archA = byLru(grupo2.filter((q) => q.archetype === 'A'))
  const archBC = byLru(grupo2.filter((q) => q.archetype === 'B' || q.archetype === 'C'))

  const picked = []
  if (archA.length > 0) picked.push(archA[0])
  if (archBC.length > 0) picked.push(archBC[0])
  return picked
}

function questionScore(question, answer) {
  const weighted = CRITERIA.reduce(
    (acc, c) => acc + c.weight * (answer.criteria[c.key] / 100),
    0
  )
  return question.points * weighted
}

export default function Exam({ onOpenCodeLab }) {
  const [phase, setPhase] = useState('start') // start | g1 | g2 | done
  const [examQs, setExamQs] = useState([])
  const [answers, setAnswers] = useState([]) // index or null (skipped)
  const [pos, setPos] = useState(0)
  const [choice, setChoice] = useState(null)
  const [g1Result, setG1Result] = useState(null)

  const [g2Qs, setG2Qs] = useState([])
  const [g2Answers, setG2Answers] = useState([])
  const [finalRecord, setFinalRecord] = useState(null)

  function start() {
    setExamQs(pickExamQuestions())
    setAnswers([])
    setPos(0)
    setChoice(null)
    setG1Result(null)
    setG2Qs([])
    setG2Answers([])
    setFinalRecord(null)
    setPhase('g1')
  }

  function submit(answer) {
    const nextAnswers = [...answers, answer]
    setChoice(null)
    if (nextAnswers.length >= examQs.length) {
      finishGrupo1(nextAnswers)
    } else {
      setAnswers(nextAnswers)
      setPos(pos + 1)
    }
  }

  function finishGrupo1(finalAnswers) {
    let correct = 0
    let incorrect = 0
    let blank = 0
    examQs.forEach((q, i) => {
      const a = finalAnswers[i]
      if (a === null) blank++
      else if (a === q.correctIndex) correct++
      else incorrect++
      // Count answered exam questions as attempts so topic stats and
      // least-recently-seen ordering stay accurate.
      if (a !== null) recordAttempt(q.id, a === q.correctIndex)
    })
    const score = Math.max(0, correct * POINTS_CORRECT + incorrect * POINTS_INCORRECT)
    const res = { ts: Date.now(), score, correct, incorrect, blank, total: examQs.length }
    setAnswers(finalAnswers)
    setG1Result(res)

    const picked = pickGrupo2Questions()
    setG2Qs(picked)
    setG2Answers(picked.map(() => emptyG2Answer()))
    setPhase('g2')
  }

  function setCriterion(qIdx, key, value) {
    setG2Answers((prev) => {
      const next = [...prev]
      next[qIdx] = { ...next[qIdx], criteria: { ...next[qIdx].criteria, [key]: value } }
      return next
    })
  }

  function toggleDicas(qIdx) {
    setG2Answers((prev) => {
      const next = [...prev]
      next[qIdx] = { ...next[qIdx], dicasOpen: !next[qIdx].dicasOpen }
      return next
    })
  }

  function grade(qIdx) {
    setG2Answers((prev) => {
      const next = [...prev]
      next[qIdx] = { ...next[qIdx], graded: true }
      return next
    })
  }

  const allGraded = g2Qs.length > 0 && g2Answers.every((a) => a.graded)

  function finishExam() {
    const questionsResult = g2Qs.map((q, i) => {
      const ans = g2Answers[i]
      const score = questionScore(q, ans)
      recordG2Attempt(q.id)
      return {
        id: q.id,
        title: q.title,
        source: q.source,
        archetype: q.archetype,
        points: q.points,
        score,
        criteria: ans.criteria,
      }
    })
    const g2TotalPoints = g2Qs.reduce((acc, q) => acc + q.points, 0)
    const g2Score = questionsResult.reduce((acc, r) => acc + r.score, 0)

    const record = {
      ts: Date.now(),
      // Grupo I fields — kept flat for backward compatibility with old records.
      score: g1Result.score,
      correct: g1Result.correct,
      incorrect: g1Result.incorrect,
      blank: g1Result.blank,
      total: g1Result.total,
      // Grupo II — absent on records created before this feature existed.
      g2: {
        questions: questionsResult,
        totalPoints: g2TotalPoints,
        score: g2Score,
      },
      grandTotal: g1Result.score + g2Score,
    }
    recordExam(record)
    setFinalRecord(record)
    setPhase('done')
  }

  if (phase === 'start') {
    return (
      <div className="page">
        <h1>exame — simulação</h1>
        <p>
          Simula o exame completo: Grupo I ({EXAM_SIZE} perguntas de escolha múltipla, sem
          feedback até ao fim) seguido do Grupo II (2 perguntas práticas, autoavaliadas).
        </p>
        <ul>
          <li>Grupo I — correta: +0.8 pontos</li>
          <li>Grupo I — incorreta: −0.8/3 pontos (≈ −0.27)</li>
          <li>Grupo I — em branco: 0 pontos</li>
          <li>Grupo I — máximo: 8 pontos</li>
          <li>Grupo II — 2 perguntas práticas, autoavaliadas por rubrica</li>
          <li>Total do exame: 20 pontos</li>
        </ul>
        {questions.length < EXAM_SIZE && (
          <p className="muted">
            Só há {questions.length} pergunta(s) disponíveis — o exame usa todas.
          </p>
        )}
        {grupo2.length === 0 && (
          <p className="muted">Ainda não há perguntas de Grupo II disponíveis.</p>
        )}
        <button className="btn btn-primary" onClick={start}>
          Começar exame
        </button>
      </div>
    )
  }

  if (phase === 'g1') {
    const current = examQs[pos]
    return (
      <div className="page">
        <h1>exame — Grupo I</h1>
        <div className="session-score">
          Pergunta {pos + 1} de {examQs.length}
        </div>
        <QuestionView
          question={current}
          selected={choice}
          revealed={false}
          onSelect={setChoice}
        />
        <div className="btn-row">
          <button
            className="btn btn-primary"
            disabled={choice === null}
            onClick={() => submit(choice)}
          >
            Responder
          </button>
          <button className="btn" onClick={() => submit(null)}>
            Deixar em branco
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'g2') {
    return (
      <div className="page">
        <h1>exame — Grupo II</h1>
        <div className="exam-result-summary">
          <div>
            Grupo I: <strong>{g1Result.score.toFixed(2)}</strong>{' '}
            <span className="muted">/ 8</span>
          </div>
        </div>
        <p className="muted">
          Escreve a tua resposta no papel ou no Code Lab e depois clica em "Autoavaliar" para
          registar a tua pontuação nesta pergunta.
        </p>
        {g2Qs.length === 0 && (
          <p className="muted">Não há perguntas de Grupo II disponíveis.</p>
        )}
        {g2Qs.map((q, i) => {
          const ans = g2Answers[i]
          const score = ans.graded ? questionScore(q, ans) : null
          return (
            <div key={q.id} className="g2-card">
              <div className="question-meta">
                <span className="badge">{q.archetype}</span>
                <span className="badge">{q.points} pts</span>
                <span className="question-source">{q.source}</span>
              </div>
              <h2>{q.title}</h2>
              <pre className="g2-statement">{q.statement}</pre>
              {q.twist && (
                <p>
                  <strong>Variante:</strong> {q.twist}
                </p>
              )}

              <button className="btn" onClick={() => toggleDicas(i)}>
                {ans.dicasOpen ? 'Esconder dicas' : 'Mostrar dicas'}
              </button>
              {ans.dicasOpen && (
                <ul className="g2-hints">
                  {q.hints.map((h, hi) => (
                    <li key={hi}>{h}</li>
                  ))}
                </ul>
              )}

              <div className="btn-row">
                <button className="btn" onClick={() => onOpenCodeLab && onOpenCodeLab(q.templateFile)}>
                  Abrir no Code Lab
                </button>
              </div>

              {!ans.graded ? (
                <div className="rubric">
                  <h2>Autoavaliação</h2>
                  {CRITERIA.map((c) => (
                    <div key={c.key} className="rubric-row">
                      <label>
                        {c.label}{' '}
                        <span className="muted">({Math.round(c.weight * 100)}%)</span>
                      </label>
                      <select
                        value={ans.criteria[c.key]}
                        onChange={(e) => setCriterion(i, c.key, Number(e.target.value))}
                      >
                        {LEVELS.map((lv) => (
                          <option key={lv.value} value={lv.value}>
                            {lv.label} ({lv.value}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={() => grade(i)}>
                    Autoavaliar
                  </button>
                </div>
              ) : (
                <div className="exam-result-summary">
                  Pontuação desta pergunta: <strong>{score.toFixed(2)}</strong>{' '}
                  <span className="muted">/ {q.points}</span>
                </div>
              )}
            </div>
          )
        })}
        <button className="btn btn-primary" disabled={!allGraded} onClick={finishExam}>
          Finalizar exame
        </button>
      </div>
    )
  }

  // done
  const g2Total = finalRecord.g2.totalPoints
  const denom = 8 + g2Total
  return (
    <div className="page">
      <h1>exame — resultado</h1>
      <div className="exam-result-summary">
        <div className="exam-score">
          {finalRecord.grandTotal.toFixed(2)} <span className="muted">/ {denom}</span>
        </div>
        <div>
          Grupo I: {finalRecord.score.toFixed(2)} / 8 · Grupo II:{' '}
          {finalRecord.g2.score.toFixed(2)} / {g2Total}
        </div>
        <div>
          {g1Result.correct} certas · {g1Result.incorrect} erradas · {g1Result.blank} em branco
        </div>
      </div>
      <button className="btn btn-primary" onClick={start}>
        Novo exame
      </button>

      <h2>Grupo I — revisão</h2>
      {examQs.map((q, i) => {
        const a = answers[i]
        const statusKey = a === null ? 'blank' : a === q.correctIndex ? 'correct' : 'incorrect'
        const statusLabel =
          statusKey === 'blank' ? 'Em branco' : statusKey === 'correct' ? 'Certa' : 'Errada'
        return (
          <div key={q.id} className="review-item">
            <div className={`review-status review-${statusKey}`}>
              P{i + 1}: {statusLabel}
              {a !== null && a !== q.correctIndex && (
                <span className="muted">
                  {' '}— escolheste {String.fromCharCode(97 + a)}), a correta é{' '}
                  {String.fromCharCode(97 + q.correctIndex)})
                </span>
              )}
            </div>
            <QuestionView question={q} selected={a} revealed={true} />
          </div>
        )
      })}

      <h2>Grupo II — revisão</h2>
      {finalRecord.g2.questions.map((r) => (
        <div key={r.id} className="review-item">
          <div className="review-status">
            {r.title} — <strong>{r.score.toFixed(2)}</strong>{' '}
            <span className="muted">/ {r.points}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
