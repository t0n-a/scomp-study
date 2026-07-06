import { useEffect, useRef, useState } from 'react'
import TheoryRefs from './TheoryRefs.jsx'
import Markdown from './Markdown.jsx'
import { guidesForTopic } from '../utils/guides.js'

// Shown when the user picks a WRONG option in Drill. Must be dismissed
// explicitly: "Percebi, próxima" (onAdvance) records nothing itself (the
// attempt was already recorded on selection) and moves to the next
// question; X / backdrop / Escape (onClose) just closes the popup so the
// user can keep re-reading the question — no advance, no re-record.
export default function WrongAnswerModal({ question, selectedIndex, onAdvance, onClose }) {
  const matchingGuides = guidesForTopic(question.topic)
  const [activeGuideId, setActiveGuideId] = useState(matchingGuides[0]?.id ?? null)
  const advanceRef = useRef(null)

  useEffect(() => {
    setActiveGuideId(matchingGuides[0]?.id ?? null)
    // Only re-sync when the question changes, not on every guides re-filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  useEffect(() => {
    advanceRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const activeGuide = matchingGuides.find((g) => g.id === activeGuideId) || matchingGuides[0]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <p className="modal-question">{question.question}</p>

        <div className="modal-answers">
          <div className="modal-answer modal-answer-wrong">
            <span className="modal-answer-label">A tua resposta</span>
            <span>{question.options[selectedIndex]}</span>
          </div>
          <div className="modal-answer modal-answer-correct">
            <span className="modal-answer-label">Resposta correta</span>
            <span>{question.options[question.correctIndex]}</span>
          </div>
        </div>

        <div className="modal-explanation">
          <strong>Explicação</strong>
          <p>{question.explanation}</p>
          <TheoryRefs refs={question.theoryRefs} />
        </div>

        <div className="modal-guide">
          <strong>Guia relacionado</strong>
          {matchingGuides.length === 0 ? (
            <p className="muted modal-guide-empty">
              Ainda não há guia para este tópico — cola os guias do NotebookLM no separador Guias.
            </p>
          ) : (
            <>
              {matchingGuides.length > 1 && (
                <div className="modal-guide-switch">
                  {matchingGuides.map((g) => (
                    <button
                      key={g.id}
                      className={`guide-switch-btn ${
                        g.id === activeGuide.id ? 'guide-switch-btn-active' : ''
                      }`}
                      onClick={() => setActiveGuideId(g.id)}
                    >
                      {g.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="modal-guide-content">
                <h3>{activeGuide.title}</h3>
                <Markdown text={activeGuide.body} />
              </div>
            </>
          )}
        </div>

        <button ref={advanceRef} className="btn btn-primary modal-advance" onClick={onAdvance}>
          Percebi, próxima
        </button>
      </div>
    </div>
  )
}
