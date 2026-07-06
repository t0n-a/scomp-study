import { useCallback, useEffect, useMemo, useState } from 'react'
import flashcards from '../data/flashcards.json'
import TheoryRefs from '../components/TheoryRefs.jsx'
import { getCardWeights, bumpCardWeight } from '../utils/storage.js'
import { TOPICS, TOPIC_LABELS, shuffle } from '../utils/misc.js'

const REQUEUE_GAP = 3 // "Again" re-inserts the card this many positions later

function buildQueue(topics) {
  const weights = getCardWeights()
  const deck = flashcards.filter((c) => topics.has(c.topic))
  // Shuffle, then stable-sort by weight descending so heavier ("again"-heavy)
  // cards come first while equal-weight cards stay randomly ordered.
  return shuffle(deck).sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0))
}

export default function Flashcards() {
  const [selectedTopics, setSelectedTopics] = useState(() => new Set(TOPICS))
  const [queue, setQueue] = useState(() => buildQueue(new Set(TOPICS)))
  const [flipped, setFlipped] = useState(false)
  const [doneIds, setDoneIds] = useState(() => new Set())

  const deckSize = useMemo(
    () => flashcards.filter((c) => selectedTopics.has(c.topic)).length,
    [selectedTopics]
  )
  const current = queue[0]

  function toggleTopic(topic) {
    const next = new Set(selectedTopics)
    if (next.has(topic)) next.delete(topic)
    else next.add(topic)
    setSelectedTopics(next)
    setQueue(buildQueue(next))
    setDoneIds(new Set())
    setFlipped(false)
  }

  function restart() {
    setQueue(buildQueue(selectedTopics))
    setDoneIds(new Set())
    setFlipped(false)
  }

  const flip = useCallback(() => setFlipped((f) => !f), [])

  function again() {
    bumpCardWeight(current.id, 1)
    setQueue((q) => {
      const [card, ...rest] = q
      const at = Math.min(REQUEUE_GAP, rest.length)
      return [...rest.slice(0, at), card, ...rest.slice(at)]
    })
    setFlipped(false)
  }

  function gotIt() {
    bumpCardWeight(current.id, -1)
    setDoneIds((d) => new Set(d).add(current.id))
    setQueue((q) => q.slice(1))
    setFlipped(false)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        flip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip])

  return (
    <div className="page">
      <h1>flashcards</h1>
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
      </div>

      <div className="session-score">
        Baralho: {doneIds.size} / {deckSize} sabidas
        {queue.length > 0 && <span className="muted"> · {queue.length} na fila</span>}
      </div>

      {deckSize === 0 ? (
        <p className="muted">Nenhum cartão corresponde aos temas selecionados.</p>
      ) : !current ? (
        <div className="deck-done">
          <p>Baralho completo.</p>
          <button className="btn btn-primary" onClick={restart}>
            Recomeçar baralho
          </button>
        </div>
      ) : (
        <>
          <div
            className={`flashcard ${flipped ? 'flashcard-back' : ''}`}
            onClick={flip}
            role="button"
            tabIndex={0}
          >
            <span className="badge">{TOPIC_LABELS[current.topic]}</span>
            <p className="flashcard-text">{flipped ? current.back : current.front}</p>
            {flipped && <TheoryRefs refs={current.theoryRefs} />}
            <span className="muted flashcard-hint">
              {flipped ? '' : 'Clica ou carrega em Espaço para virar'}
            </span>
          </div>
          {flipped && (
            <div className="btn-row">
              <button className="btn btn-again" onClick={again}>
                Outra vez
              </button>
              <button className="btn btn-gotit" onClick={gotIt}>
                Sei esta
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
