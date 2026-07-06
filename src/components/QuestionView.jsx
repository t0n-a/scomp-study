import TheoryRefs from './TheoryRefs.jsx'

// Renders one question. Behaviour depends on props:
// - selected: index chosen (or null)
// - revealed: whether to show right/wrong colours + explanation
// - onSelect(index): callback when an option is clicked
export default function QuestionView({ question, selected, revealed, onSelect }) {
  return (
    <div className="question-view">
      <div className="question-meta">
        <span className="badge">{question.topic}</span>
        <span className="question-source">{question.source}</span>
        {question.timesSeen >= 2 && <span className="badge">caiu {question.timesSeen}×</span>}
      </div>
      <p className="question-text">{question.question}</p>
      {question.code && <pre className="code-block">{question.code}</pre>}
      <div className="options">
        {question.options.map((opt, i) => {
          let cls = 'option'
          if (revealed) {
            if (i === question.correctIndex) cls += ' option-correct'
            else if (i === selected) cls += ' option-wrong'
            cls += ' option-locked'
          } else if (i === selected) {
            cls += ' option-selected'
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => !revealed && onSelect && onSelect(i)}
              disabled={!!revealed}
            >
              <span className="option-letter">{String.fromCharCode(97 + i)})</span>
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="explanation">
          <p>
            <strong>{selected === question.correctIndex ? 'Certa.' : 'Errada.'}</strong>{' '}
            {question.explanation}
          </p>
          <TheoryRefs refs={question.theoryRefs} />
        </div>
      )}
    </div>
  )
}
