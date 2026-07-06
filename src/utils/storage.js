// localStorage helpers. All keys namespaced under "scomp:".

const ATTEMPTS_KEY = 'scomp:attempts'
const EXAMS_KEY = 'scomp:exams'
const CARD_WEIGHTS_KEY = 'scomp:cardWeights'
const G2_ATTEMPTS_KEY = 'scomp:g2attempts'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable; ignore
  }
}

// ---- Question attempts ----
// Shape: { [questionId]: [{ correct: bool, ts: number }, ...] }

export function getAttempts() {
  return readJson(ATTEMPTS_KEY, {})
}

export function recordAttempt(questionId, correct) {
  const attempts = getAttempts()
  if (!attempts[questionId]) attempts[questionId] = []
  attempts[questionId].push({ correct, ts: Date.now() })
  writeJson(ATTEMPTS_KEY, attempts)
}

export function lastSeen(attempts, questionId) {
  const hist = attempts[questionId]
  if (!hist || hist.length === 0) return 0
  return hist[hist.length - 1].ts
}

// Per-topic stats: { [topic]: { answered, correct } }
export function topicStats(questions) {
  const attempts = getAttempts()
  const stats = {}
  for (const q of questions) {
    if (!stats[q.topic]) stats[q.topic] = { answered: 0, correct: 0 }
    const hist = attempts[q.id] || []
    stats[q.topic].answered += hist.length
    stats[q.topic].correct += hist.filter((a) => a.correct).length
  }
  return stats
}

// ---- Exam history ----
// Shape: [{ ts, score, correct, incorrect, blank, total }]

export function getExamHistory() {
  return readJson(EXAMS_KEY, [])
}

export function recordExam(result) {
  const history = getExamHistory()
  history.push(result)
  writeJson(EXAMS_KEY, history)
}

// ---- Grupo II (practical exam) question attempts ----
// Shape: { [questionId]: [{ ts: number }, ...] } — used for least-recently-used
// selection, same idea as MCQ attempts but without a correct/incorrect notion.

export function getG2Attempts() {
  return readJson(G2_ATTEMPTS_KEY, {})
}

export function recordG2Attempt(questionId) {
  const attempts = getG2Attempts()
  if (!attempts[questionId]) attempts[questionId] = []
  attempts[questionId].push({ ts: Date.now() })
  writeJson(G2_ATTEMPTS_KEY, attempts)
}

// ---- Flashcard weights ----
// Shape: { [cardId]: number } — higher = needs more review.

export function getCardWeights() {
  return readJson(CARD_WEIGHTS_KEY, {})
}

export function bumpCardWeight(cardId, delta) {
  const weights = getCardWeights()
  const next = Math.max(0, (weights[cardId] || 0) + delta)
  weights[cardId] = next
  writeJson(CARD_WEIGHTS_KEY, weights)
  return weights
}
