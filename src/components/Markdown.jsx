// Small hand-rolled markdown renderer — no library, ~80 lines.
// Supports: # ## ### headings, **bold**, *italic*, `inline code`, ``` code
// blocks, - / * lists, 1. numbered lists, > blockquotes, [text](url).
// Everything is rendered as text nodes / React elements, so there is no raw
// HTML pass-through — anything that looks like a tag is shown literally.

function renderInline(text, keyPrefix) {
  const nodes = []
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m
  let key = 0
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${key++}`}>{m[1]}</strong>)
    } else if (m[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{m[2]}</em>)
    } else if (m[3] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-${key++}`}>{m[3]}</code>)
    } else if (m[4] !== undefined) {
      const url = m[5]
      const external = /^https?:\/\//.test(url)
      nodes.push(
        <a
          key={`${keyPrefix}-${key++}`}
          href={url}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {m[4]}
        </a>
      )
    }
    last = regex.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function parseBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }
    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.*)/)
    if (heading) {
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] })
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const q = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: q.join(' ') })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }
    const para = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', text: para.join(' ') })
  }
  return blocks
}

export default function Markdown({ text }) {
  const blocks = parseBlocks(text || '')
  return (
    <div className="markdown">
      {blocks.map((b, idx) => {
        const k = `b${idx}`
        if (b.type === 'h1') return <h1 key={k}>{renderInline(b.text, k)}</h1>
        if (b.type === 'h2') return <h2 key={k}>{renderInline(b.text, k)}</h2>
        if (b.type === 'h3') return <h3 key={k}>{renderInline(b.text, k)}</h3>
        if (b.type === 'code') return <pre key={k} className="code-block">{b.text}</pre>
        if (b.type === 'hr') return <hr key={k} />


        if (b.type === 'quote') {
          return (
            <blockquote key={k} className="md-quote">
              {renderInline(b.text, k)}
            </blockquote>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={k}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={k}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
              ))}
            </ol>
          )
        }
        return <p key={k}>{renderInline(b.text, k)}</p>
      })}
    </div>
  )
}
