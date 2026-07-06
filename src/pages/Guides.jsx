import { useState } from 'react'
import Markdown from '../components/Markdown.jsx'

const files = import.meta.glob('../data/guides/*.md', { query: '?raw', import: 'default', eager: true })

function parseGuide(path, raw) {
  const filename = path.split('/').pop().replace(/\.md$/, '')
  let topic = 'geral'
  let title = filename
  let body = raw

  const metaMatch = raw.match(/^<!--([\s\S]*?)-->\s*\n?/)
  if (metaMatch) {
    const meta = metaMatch[1]
    const topicMatch = meta.match(/topic:\s*([^|]+)/i)
    const titleMatch = meta.match(/title:\s*([^|]+)/i)
    if (topicMatch) topic = topicMatch[1].trim()
    if (titleMatch) title = titleMatch[1].trim()
    body = raw.slice(metaMatch[0].length)
  }

  return { id: path, topic, title, body }
}

const guides = Object.entries(files)
  .map(([path, raw]) => parseGuide(path, raw))
  .sort((a, b) => a.title.localeCompare(b.title))

export default function Guides() {
  const [activeId, setActiveId] = useState(guides[0]?.id ?? null)
  const active = guides.find((g) => g.id === activeId)

  return (
    <div className="page">
      <h1>guias</h1>
      <p className="subtitle">
        Os 10 conceitos do NotebookLM — acrónimos, analogias e a explicação formal, por tema.
      </p>

      {guides.length === 0 ? (
        <p className="muted">
          Ainda não há guias. Adiciona ficheiros <code>.md</code> em
          <code> src/data/guides/</code>.
        </p>
      ) : (
        <>
          <div className="guides-layout">
            <div className="guides-list">
              {guides.map((g) => (
                <button
                  key={g.id}
                  className={`guide-item ${g.id === activeId ? 'guide-item-active' : ''}`}
                  onClick={() => setActiveId(g.id)}
                >
                  <span className="badge">{g.topic}</span>
                  <span>{g.title}</span>
                </button>
              ))}
            </div>
            <div className="guide-content">{active && <Markdown text={active.body} />}</div>
          </div>
          {guides.length <= 1 && (
            <p className="muted">
              Ainda não há guias de tópicos além deste README — assim que adicionares mais
              ficheiros markdown a <code>src/data/guides/</code>, aparecem aqui.
            </p>
          )}
        </>
      )}
    </div>
  )
}
