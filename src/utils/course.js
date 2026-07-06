// Loads guided-course lessons from src/data/course/*.md. Each file's first
// line is an HTML comment with metadata (track/order/title/time), and the
// body is split into sections by `<!-- section: name -->` markers.

const files = import.meta.glob('../data/course/*.md', { query: '?raw', import: 'default', eager: true })

export const TRACKS = [
  {
    id: 'A',
    label: 'Q1 — Processos e Pipes',
    blurb: 'O padrão master/slave que cai sempre na primeira pergunta prática.',
  },
  {
    id: 'C',
    label: 'Q2 — Threads e Sincronização',
    blurb: 'Produtor-consumidor, semáforos e leitores-escritores.',
  },
]

function parseMeta(raw) {
  const metaMatch = raw.match(/^<!--([\s\S]*?)-->\s*\n?/)
  let track = null
  let order = 0
  let title = ''
  let time = ''
  let rest = raw

  if (metaMatch) {
    const meta = metaMatch[1]
    const trackMatch = meta.match(/track:\s*([^|]+)/i)
    const orderMatch = meta.match(/order:\s*([^|]+)/i)
    const titleMatch = meta.match(/title:\s*([^|]+)/i)
    const timeMatch = meta.match(/time:\s*([^|]+)/i)
    if (trackMatch) track = trackMatch[1].trim()
    if (orderMatch) order = Number(orderMatch[1].trim()) || 0
    if (titleMatch) title = titleMatch[1].trim()
    if (timeMatch) time = timeMatch[1].trim()
    rest = raw.slice(metaMatch[0].length)
  }

  return { track, order, title, time, rest }
}

function parseSections(rest) {
  const sections = {}
  const regex = /<!--\s*section:\s*(\w+)\s*-->/g
  const marks = []
  let m
  while ((m = regex.exec(rest))) {
    marks.push({ name: m[1], start: m.index, contentStart: m.index + m[0].length })
  }
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : rest.length
    sections[marks[i].name] = rest.slice(marks[i].contentStart, end).trim()
  }
  return sections
}

function parseChecklist(text) {
  if (!text) return []
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
}

function extractSolutionCode(text) {
  if (!text) return null
  const m = text.match(/```c\s*\n([\s\S]*?)```/)
  return m ? m[1].replace(/\s+$/, '') : null
}

function parseLesson(path, raw) {
  const filename = path.split('/').pop().replace(/\.md$/, '')
  const { track, order, title, time, rest } = parseMeta(raw)
  const sections = parseSections(rest)
  const teoria = sections.teoria || ''
  const exercicio = sections.exercicio || ''
  const checklistRaw = sections.checklist || ''
  const solucao = sections.solucao || ''

  return {
    id: filename,
    track,
    order,
    title,
    time,
    teoria,
    exercicio,
    checklist: parseChecklist(checklistRaw),
    solucao,
    solutionCode: extractSolutionCode(solucao),
  }
}

export const lessons = Object.entries(files)
  .map(([path, raw]) => parseLesson(path, raw))
  .sort((a, b) => {
    if (a.track !== b.track) return (a.track || '').localeCompare(b.track || '')
    return a.order - b.order
  })

export function lessonsForTrack(trackId) {
  return lessons.filter((l) => l.track === trackId)
}
