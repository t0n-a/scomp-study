import { useMemo, useState } from 'react'
import questions from '../data/questions.json'
import QuestionView from '../components/QuestionView.jsx'
import WrongAnswerModal from '../components/WrongAnswerModal.jsx'
import { recordAttempt, lastAttemptWrongIds } from '../utils/storage.js'
import { TOPICS, TOPIC_LABELS, shuffle } from '../utils/misc.js'

export default function Drill() {
  const [selectedTopics, setSelectedTopics] = useState(() => new Set(TOPICS))
  const [order, setOrder] = useState(() => shuffle(questions.map((q) => q.id)))
  const [pos, setPos] = useState(0)
  const [choice, setChoice] = useState(null)
  const [showWrongModal, setShowWrongModal] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [wrongOnly, setWrongOnly] = useState(false)
  // Snapshot of "last attempt was wrong" ids. Attempts live in localStorage,
  // not React state, so we only refresh this on toggle/next — never mid-question.
  const [wrongSet, setWrongSet] = useState(() => lastAttemptWrongIds())

  const pool = useMemo(
    () => order
      .map((id) => questions.find((q) => q.id === id))
      .filter((q) => q && selectedTopics.has(q.topic))
      .filter((q) => !wrongOnly || wrongSet.has(q.id)),
    [order, selectedTopics, wrongOnly, wrongSet]
  )

  const current = pool[pos % (pool.length || 1)]

  function toggleTopic(topic) {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })
    setPos(0)
    setChoice(null)
    setShowWrongModal(false)
  }

  function toggleWrongOnly() {
    setWrongOnly((prev) => !prev)
    setWrongSet(lastAttemptWrongIds())
    setPos(0)
    setChoice(null)
    setShowWrongModal(false)
  }

  function handleSelect(i) {
    if (choice !== null || !current) return
    setChoice(i)
    const correct = i === current.correctIndex
    recordAttempt(current.id, correct)
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    if (!correct) setShowWrongModal(true)
  }

  function next() {
    setChoice(null)
    setShowWrongModal(false)
    // Refresh the wrong-set snapshot so a question just answered correctly
    // drops out of the "só erradas" pool on the next pass.
    setWrongSet(lastAttemptWrongIds())
    if (pos + 1 >= pool.length) {
      // Reshuffle for a fresh pass.
      setOrder(shuffle(questions.map((q) => q.id)))
      setPos(0)
    } else {
      setPos(pos + 1)
    }
  }

  return (
    <div className="page">
      <h1>drill</h1>
      <div className="topic-filter">
        {TOPICS.map((t) => (
          <label key={t} className={`chip ${selectedTopics.has(t) ? 'chip-on' : ''}`}>
            <input
              type="checkbox"
              checked={selectedTopics.has(t)}
              onChange={() => toggleTopic(t)}
            />
            {TOPIC_LABELS[t]}
          </label>
        ))}
        <label
          className={`chip ${wrongOnly ? 'chip-on' : ''}`}
          style={{ marginLeft: 'auto' }}
        >
          <input type="checkbox" checked={wrongOnly} onChange={toggleWrongOnly} />
          só erradas
        </label>
      </div>

      <div className="session-score">
        Sessão: {score.correct}/{score.total} certas
        {pool.length > 0 && (
          <span className="muted"> · pergunta {(pos % pool.length) + 1} de {pool.length}</span>
        )}
      </div>

      {pool.length === 0 ? (
        <p className="muted">
          {wrongOnly
            ? 'Nada por rever — não tens perguntas com a última tentativa errada nos temas escolhidos. 🎉'
            : 'Nenhuma pergunta corresponde aos temas selecionados.'}
        </p>
      ) : (
        <>
          <QuestionView
            question={current}
            selected={choice}
            revealed={choice !== null}
            onSelect={handleSelect}
          />
          {choice !== null && (
            <button className="btn btn-primary" onClick={next}>
              Próxima pergunta
            </button>
          )}
          {showWrongModal && current && (
            <WrongAnswerModal
              question={current}
              selectedIndex={choice}
              onAdvance={next}
              onClose={() => setShowWrongModal(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
