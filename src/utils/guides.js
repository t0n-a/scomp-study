// Loads study guides the same way src/pages/Guides.jsx does, so other
// features (e.g. the Drill wrong-answer popup) can look guides up by topic
// without importing a page component.

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

export const guides = Object.entries(files)
  .map(([path, raw]) => parseGuide(path, raw))
  .sort((a, b) => a.title.localeCompare(b.title))

export function guidesForTopic(topic) {
  return guides.filter((g) => g.topic === topic)
}
