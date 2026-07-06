import questions from '../data/questions.json'
import { topicStats, getExamHistory } from '../utils/storage.js'
import { TOPICS, TOPIC_LABELS } from '../utils/misc.js'

// Expected points per answered question under the real Grupo I scoring
// (+0.8 certa, -0.8/3 errada). Breakeven accuracy is 25%.
function expectedPointsPerQuestion(accuracy) {
  return 0.8 * accuracy - (0.8 / 3) * (1 - accuracy)
}

// Expected Grupo I score (0-8) from per-topic accuracy, weighted by each
// topic's share of the question bank. Topics never answered fall back to the
// overall accuracy across answered topics (rather than renormalizing their
// weight away) so the headline reflects "if the exam looked like the bank".
function computeReadiness(questions, stats) {
  const topicCounts = {}
  for (const q of questions) topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1
  const totalQuestions = questions.length

  let totalAnswered = 0
  let totalCorrect = 0
  for (const t of TOPICS) {
    const s = stats[t] || { answered: 0, correct: 0 }
    totalAnswered += s.answered
    totalCorrect += s.correct
  }
  if (totalAnswered === 0) return { expected: null, weak: [] }

  const overallAccuracy = totalCorrect / totalAnswered
  const weak = []
  let sum = 0
  for (const t of TOPICS) {
    const s = stats[t] || { answered: 0, correct: 0 }
    const share = totalQuestions > 0 ? (topicCounts[t] || 0) / totalQuestions : 0
    let a
    if (s.answered > 0) {
      a = s.correct / s.answered
      if (a < 0.25) weak.push(t)
    } else {
      a = overallAccuracy
    }
    sum += share * expectedPointsPerQuestion(a)
  }

  const expected = Math.max(0, Math.min(8, 10 * sum))
  return { expected, weak }
}

export default function Home({ onNavigate }) {
  const stats = topicStats(questions)
  const exams = getExamHistory()
  const readiness = computeReadiness(questions, stats)

  const rows = TOPICS.map((topic) => {
    const s = stats[topic] || { answered: 0, correct: 0 }
    const pct = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : null
    return { topic, ...s, pct }
  })

  // Weak topics: answered at least once, sorted by lowest % correct.
  const weak = rows
    .filter((r) => r.answered > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)

  return (
    <div className="page">
      <h1>scomp — sala de estudo</h1>
      <p className="subtitle">
        Exame a 9 de julho: Grupo I (teoria, 8 pts) + Grupo II (C, 12 pts). Objetivo: passar.
      </p>

      <div className="quick-links">
        <button className="quick-link" onClick={() => onNavigate('drill')}>
          <strong>drill</strong>
          <span>Perguntas por tema, feedback imediato</span>
        </button>
        <button className="quick-link" onClick={() => onNavigate('exam')}>
          <strong>exame</strong>
          <span>Simulação com a cotação real, /20</span>
        </button>
        <button className="quick-link" onClick={() => onNavigate('flashcards')}>
          <strong>flashcards</strong>
          <span>Recall rápido de conceitos</span>
        </button>
        <button className="quick-link" onClick={() => onNavigate('codelab')}>
          <strong>lab</strong>
          <span>Escreve e compila C no WSL</span>
        </button>
        <button className="quick-link" onClick={() => onNavigate('guides')}>
          <strong>guias</strong>
          <span>Analogias e acrónimos por tema</span>
        </button>
        <button className="quick-link" onClick={() => onNavigate('course')}>
          <strong>curso</strong>
          <span>Do zero ao Grupo II, lição a lição</span>
        </button>
      </div>

      <h2>Progresso por tema</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Tema</th>
            <th>Respondidas</th>
            <th>% certas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.topic}>
              <td>{TOPIC_LABELS[r.topic]}</td>
              <td>{r.answered}</td>
              <td>
                {r.pct === null ? (
                  <span className="muted">—</span>
                ) : (
                  <span className={r.pct >= 70 ? 'pct-good' : r.pct >= 40 ? 'pct-mid' : 'pct-bad'}>
                    {r.pct}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Prontidão para o Grupo I</h2>
      {readiness.expected === null ? (
        <p className="muted">Responde a perguntas no drill para calcular a tua prontidão.</p>
      ) : (
        <>
          <p className="session-score">
            Nota esperada do Grupo I:{' '}
            <span style={{ color: 'var(--accent)' }}>{readiness.expected.toFixed(2)} / 8</span>
          </p>
          <p className="muted">
            Assume que o exame reflete a distribuição de perguntas do banco e a tua taxa de
            acerto atual por tema (0.8 por certa, -0.8/3 por errada; temas nunca respondidos usam
            a tua taxa média global).
          </p>
          {readiness.weak.length > 0 && (
            <ol className="weak-list">
              {readiness.weak.map((t) => (
                <li key={t}>
                  {TOPIC_LABELS[t]} — abaixo do breakeven — estuda o guia antes de responder a
                  estas no exame; na dúvida, em branco
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <h2>Temas fracos</h2>
      {weak.length === 0 ? (
        <p className="muted">Responde a perguntas no drill para veres os teus pontos fracos.</p>
      ) : (
        <ol className="weak-list">
          {weak.map((r) => (
            <li key={r.topic}>
              {TOPIC_LABELS[r.topic]} — {r.pct}% certas em {r.answered} respostas
            </li>
          ))}
        </ol>
      )}

      <h2>Exames simulados</h2>
      {exams.length === 0 ? (
        <p className="muted">Ainda não fizeste nenhuma simulação. A primeira é hoje.</p>
      ) : (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nota</th>
              <th>Certas</th>
              <th>Erradas</th>
              <th>Em branco</th>
            </tr>
          </thead>
          <tbody>
            {[...exams].reverse().map((e, i) => {
              // Older records only cover Grupo I (score / 8). Newer ones also
              // carry a `g2` block and a `grandTotal` (score / (8 + g2 points)).
              const hasG2 = e.g2 && typeof e.grandTotal === 'number'
              return (
                <tr key={i}>
                  <td>{new Date(e.ts).toLocaleString()}</td>
                  <td>
                    {hasG2 ? (
                      <>
                        <strong>{e.grandTotal.toFixed(2)}</strong> / {8 + e.g2.totalPoints}
                        <div className="muted">
                          GI {e.score.toFixed(2)}/8 · GII {e.g2.score.toFixed(2)}/
                          {e.g2.totalPoints}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>{e.score.toFixed(2)}</strong> / 8
                      </>
                    )}
                  </td>
                  <td>{e.correct}</td>
                  <td>{e.incorrect}</td>
                  <td>{e.blank}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
