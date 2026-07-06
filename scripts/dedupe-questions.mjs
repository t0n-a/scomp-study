// Dedupe the MCQ question bank in src/data/questions.json.
// Merges content-duplicate questions that come from different exam sittings
// but keep different ids. See CLAUDE task description for the full spec.
//
// Usage: node scripts/dedupe-questions.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'questions.json')

const raw = fs.readFileSync(DATA_PATH, 'utf8')
const questions = JSON.parse(raw)
const totalBefore = questions.length

// ---------- normalization helpers ----------

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeText(s) {
  if (s == null) return ''
  let t = stripAccents(String(s)).toLowerCase()
  // strip trailing ellipsis / trailing punctuation runs like "..." or "…"
  t = t.replace(/[.…]{2,}\s*$/g, '')
  // remove punctuation (keep letters/numbers/spaces)
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  // collapse whitespace runs
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

function normalizeCode(code) {
  if (code == null) return ''
  return String(code).replace(/\s+/g, ' ').trim()
}

function normalizedOptionsKey(options) {
  return options.map(normalizeText).slice().sort().join('||')
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      prev = tmp
    }
  }
  return dp[n]
}

function levenshteinRatio(a, b) {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const dist = levenshtein(a, b)
  return 1 - dist / maxLen
}

function nearIdenticalText(a, b) {
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  return levenshteinRatio(a, b) >= 0.9
}

// ---------- precompute normalized fields ----------

for (const q of questions) {
  q._normQuestion = normalizeText(q.question)
  q._normCode = normalizeCode(q.code)
  q._normOptions = normalizedOptionsKey(q.options)
  q._normCorrectText = normalizeText(q.options[q.correctIndex])
  q._tier1Key = `${q._normQuestion}|||${q._normCode}|||${q._normOptions}`
}

// ---------- TIER 1: exact match groups ----------

const tier1Groups = new Map() // key -> [questions]
for (const q of questions) {
  if (!tier1Groups.has(q._tier1Key)) tier1Groups.set(q._tier1Key, [])
  tier1Groups.get(q._tier1Key).push(q)
}

const tier1Merges = []
const consumedIds = new Set()

for (const [, group] of tier1Groups) {
  if (group.length < 2) continue
  tier1Merges.push(group)
  for (const q of group) consumedIds.add(q.id)
}

// ---------- TIER 2: near-identical, among remaining (non tier-1-merged) questions ----------
// Also re-examine tier1 groups' leftover pairing isn't needed since tier1 already grouped by exact key.
// For tier2 we compare remaining questions pairwise (excluding those already merged in tier1)
// grouping transitively (union-find) when the tier2 criteria hold.

const remaining = questions.filter(q => !consumedIds.has(q.id))

// Union-Find for transitive grouping of tier-2 candidates
const parent = new Map()
function find(x) {
  if (!parent.has(x)) parent.set(x, x)
  if (parent.get(x) !== x) parent.set(x, find(parent.get(x)))
  return parent.get(x)
}
function union(a, b) {
  const ra = find(a)
  const rb = find(b)
  if (ra !== rb) parent.set(ra, rb)
}

const tier2PairReasons = [] // {aId, bId} that passed tier2 checks
const suspicious = [] // {aId, bId, reason}

for (let i = 0; i < remaining.length; i++) {
  for (let j = i + 1; j < remaining.length; j++) {
    const a = remaining[i]
    const b = remaining[j]

    // quick filter: options set must match exactly (tier2 requires "options sets match")
    if (a._normOptions !== b._normOptions) continue

    // must be same topic - otherwise suspicious/never merge
    const sameTopic = a.topic === b.topic
    const textNear = nearIdenticalText(a._normQuestion, b._normQuestion)
    const sameCorrectText = a._normCorrectText === b._normCorrectText

    if (!textNear) continue // not even a candidate, skip silently (not suspicious - too different)

    // At this point questions have near-identical text AND identical option sets.
    // That's a strong duplicate signal - check the remaining safety conditions.
    if (!sameTopic) {
      suspicious.push({
        aId: a.id,
        bId: b.id,
        reason: `topicos diferentes (${a.topic} vs ${b.topic}) apesar de pergunta/opcoes quase identicas`
      })
      continue
    }

    if (!sameCorrectText) {
      suspicious.push({
        aId: a.id,
        bId: b.id,
        reason: `texto da resposta correta difere ("${a.options[a.correctIndex]}" vs "${b.options[b.correctIndex]}")`
      })
      continue
    }

    // all tier2 conditions hold
    tier2PairReasons.push({ aId: a.id, bId: b.id })
    union(a.id, b.id)
  }
}

// build tier2 groups from union-find
const tier2GroupsMap = new Map()
for (const q of remaining) {
  if (!parent.has(q.id)) continue
  const root = find(q.id)
  if (!tier2GroupsMap.has(root)) tier2GroupsMap.set(root, [])
  tier2GroupsMap.get(root).push(q)
}

const tier2Merges = [...tier2GroupsMap.values()].filter(g => g.length > 1)
for (const g of tier2Merges) {
  for (const q of g) consumedIds.add(q.id)
}

// ---------- canonical selection ----------

function pickCanonical(group) {
  // prefer source containing "Modelo"
  const modelo = group.filter(q => /modelo/i.test(q.source))
  let pool = modelo.length > 0 ? modelo : group
  // else the one with the longest explanation
  let best = pool[0]
  for (const q of pool) {
    if ((q.explanation || '').length > (best.explanation || '').length) best = q
  }
  return best
}

function mergeGroup(group) {
  const canonical = pickCanonical(group)
  const sources = [...new Set(group.map(q => q.source))]
  const merged = {
    id: canonical.id,
    source: sources.join(' · '),
    topic: canonical.topic,
    question: canonical.question,
    code: canonical.code,
    options: canonical.options,
    correctIndex: canonical.correctIndex,
    explanation: canonical.explanation,
    timesSeen: group.length
  }
  if (canonical.confidence !== undefined) merged.confidence = canonical.confidence
  if (canonical.adapted !== undefined) merged.adapted = canonical.adapted
  merged.theoryRefs = canonical.theoryRefs
  return { merged, canonicalId: canonical.id, removedIds: group.map(q => q.id).filter(id => id !== canonical.id) }
}

const allMergeGroups = [...tier1Merges.map(g => ({ tier: 1, group: g })), ...tier2Merges.map(g => ({ tier: 2, group: g }))]

const mergeReports = []
const idToMerged = new Map()
const idsToRemove = new Set()

for (const { tier, group } of allMergeGroups) {
  const { merged, canonicalId, removedIds } = mergeGroup(group)
  idToMerged.set(canonicalId, merged)
  for (const id of removedIds) idsToRemove.add(id)
  mergeReports.push({
    tier,
    keptId: canonicalId,
    removedIds,
    questionPreview: merged.question.slice(0, 60),
    sources: merged.source
  })
}

// ---------- build final array ----------

const finalQuestions = []
for (const q of questions) {
  if (idsToRemove.has(q.id)) continue
  // strip helper fields regardless
  const { _normQuestion, _normCode, _normOptions, _normCorrectText, _tier1Key, ...clean } = q
  if (idToMerged.has(q.id)) {
    finalQuestions.push(idToMerged.get(q.id))
  } else {
    finalQuestions.push(clean)
  }
}

const totalAfter = finalQuestions.length
const totalRemoved = idsToRemove.size

// SAFETY assertion
if (totalBefore !== totalAfter + totalRemoved) {
  throw new Error(`Safety check failed: before=${totalBefore} after=${totalAfter} removed=${totalRemoved}`)
}

// sanity: every question has 4 options and valid correctIndex
for (const q of finalQuestions) {
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw new Error(`Question ${q.id} does not have exactly 4 options`)
  }
  if (!(q.correctIndex >= 0 && q.correctIndex <= 3)) {
    throw new Error(`Question ${q.id} has invalid correctIndex ${q.correctIndex}`)
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(finalQuestions, null, 2) + '\n', 'utf8')

// ---------- per-topic counts ----------

function topicCounts(list) {
  const counts = {}
  for (const q of list) counts[q.topic] = (counts[q.topic] || 0) + 1
  return counts
}

const beforeTopics = topicCounts(questions)
const afterTopics = topicCounts(finalQuestions)

// ---------- report ----------

console.log('=== DEDUPE REPORT ===')
console.log(`Total before: ${totalBefore}`)
console.log(`Total after:  ${totalAfter}`)
console.log(`Removed:      ${totalRemoved}`)
console.log()
console.log('Per-topic before:', JSON.stringify(beforeTopics))
console.log('Per-topic after: ', JSON.stringify(afterTopics))
console.log()

console.log(`--- TIER 1 (exact) merges: ${tier1Merges.length} groups ---`)
for (const r of mergeReports.filter(r => r.tier === 1)) {
  console.log(`kept=${r.keptId} <- removed=[${r.removedIds.join(', ')}]  "${r.questionPreview}..."  sources="${r.sources}"`)
}
console.log()

console.log(`--- TIER 2 (near-identical) merges: ${tier2Merges.length} groups ---`)
for (const r of mergeReports.filter(r => r.tier === 2)) {
  console.log(`kept=${r.keptId} <- removed=[${r.removedIds.join(', ')}]  "${r.questionPreview}..."  sources="${r.sources}"`)
}
console.log()

console.log(`--- SUSPICIOUS (not merged): ${suspicious.length} pairs ---`)
for (const s of suspicious) {
  console.log(`${s.aId} vs ${s.bId}: ${s.reason}`)
}
console.log()
console.log('Done.')
