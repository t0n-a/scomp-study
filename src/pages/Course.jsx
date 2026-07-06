import { useEffect, useState } from 'react'
import Markdown from '../components/Markdown.jsx'
import { lessons, TRACKS, lessonsForTrack } from '../utils/course.js'
import { getCourseDone, toggleCourseDone } from '../utils/storage.js'

function starterFor(lesson) {
  const includes = [
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '#include <string.h>',
    '#include <unistd.h>',
    '#include <sys/types.h>',
    '#include <sys/wait.h>',
  ]
  if (lesson.track === 'C') includes.push('#include <pthread.h>')

  return `/* ${lesson.title}
 * Escreve a tua solução; a solução de referência está no curso.
 */
${includes.join('\n')}

int main(void) {
    return 0;
}
`
}

export default function Course({ onOpenCodeLab }) {
  const [done, setDone] = useState(() => getCourseDone())
  const [activeId, setActiveId] = useState(() => {
    const firstNotDone = lessons.find((l) => !getCourseDone()[l.id])
    return (firstNotDone || lessons[0])?.id ?? null
  })
  const [checked, setChecked] = useState({})
  const [solutionOpen, setSolutionOpen] = useState(false)

  const active = lessons.find((l) => l.id === activeId)

  useEffect(() => {
    setChecked({})
    setSolutionOpen(false)
  }, [activeId])

  if (lessons.length === 0) {
    return (
      <div className="page">
        <h1>curso</h1>
        <p className="muted">
          Ainda não há lições. Adiciona ficheiros <code>.md</code> em{' '}
          <code>src/data/course/</code>.
        </p>
      </div>
    )
  }

  function selectLesson(id) {
    setActiveId(id)
  }

  function handleToggleDone() {
    setDone(toggleCourseDone(active.id))
  }

  function toggleChecklistItem(idx) {
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  function goRelative(delta) {
    const idx = lessons.findIndex((l) => l.id === activeId)
    if (idx === -1) return
    const next = lessons[idx + delta]
    if (next) setActiveId(next.id)
  }

  const activeIdx = lessons.findIndex((l) => l.id === activeId)
  const track = TRACKS.find((t) => t.id === active?.track)

  return (
    <div className="page page-wide">
      <h1>curso</h1>
      <p className="subtitle">
        Percurso guiado por temas — teoria curta, um exercício, e a solução comentada.
      </p>

      <div className="course-layout">
        <div className="course-sidebar">
          {TRACKS.map((t) => {
            const trackLessons = lessonsForTrack(t.id)
            if (trackLessons.length === 0) return null
            const doneCount = trackLessons.filter((l) => done[l.id]).length
            const pct = trackLessons.length
              ? Math.round((doneCount / trackLessons.length) * 100)
              : 0
            return (
              <div key={t.id} className="course-track">
                <div className="course-track-header">
                  <div>
                    <strong>{t.label}</strong>
                    <p className="muted course-track-blurb">{t.blurb}</p>
                  </div>
                  <span className="course-track-progress">
                    {doneCount}/{trackLessons.length}
                  </span>
                </div>
                <div className="course-progress-track">
                  <div className="course-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="course-lesson-list">
                  {trackLessons.map((l) => (
                    <button
                      key={l.id}
                      className={`course-lesson-item ${
                        l.id === activeId ? 'course-lesson-item-active' : ''
                      } ${done[l.id] ? 'course-lesson-item-done' : ''}`}
                      onClick={() => selectLesson(l.id)}
                    >
                      <span className="course-lesson-order">{l.order}</span>
                      <span className="course-lesson-title">{l.title}</span>
                      <span className="badge">{l.time}</span>
                      {done[l.id] && <span className="course-lesson-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="course-content">
          {active && (
            <>
              <div className="course-meta">
                <span className="badge">{track?.id}</span>
                <span className="muted">Lição {active.order}</span>
                <span className="badge">{active.time}</span>
                {done[active.id] && <span className="muted">concluída</span>}
              </div>

              <Markdown text={active.teoria} />

              <h2>Exercício</h2>
              <Markdown text={active.exercicio} />

              <button className="btn" onClick={() => onOpenCodeLab({ code: starterFor(active) })}>
                Abrir no Code Lab
              </button>

              {active.checklist.length > 0 && (
                <>
                  <h2>Checklist</h2>
                  <div className="course-checklist">
                    {active.checklist.map((item, idx) => (
                      <label key={idx} className="course-checklist-row">
                        <input
                          type="checkbox"
                          checked={!!checked[idx]}
                          onChange={() => toggleChecklistItem(idx)}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <h2>Solução</h2>
              {!solutionOpen ? (
                <button className="btn" onClick={() => setSolutionOpen(true)}>
                  Já tentei — mostrar solução
                </button>
              ) : (
                <div className="course-solution">
                  <Markdown text={active.solucao} />
                  {active.solutionCode && (
                    <button
                      className="btn"
                      onClick={() => onOpenCodeLab({ code: active.solutionCode })}
                    >
                      Abrir solução no Code Lab
                    </button>
                  )}
                </div>
              )}

              <div className="course-actions btn-row">
                {done[active.id] ? (
                  <button className="btn" onClick={handleToggleDone}>
                    Desmarcar
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleToggleDone}>
                    Marcar lição como concluída
                  </button>
                )}
                <button className="btn" disabled={activeIdx <= 0} onClick={() => goRelative(-1)}>
                  ← Anterior
                </button>
                <button
                  className="btn"
                  disabled={activeIdx === -1 || activeIdx >= lessons.length - 1}
                  onClick={() => goRelative(1)}
                >
                  Seguinte →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
