export const TOPICS = [
  'processes',
  'pipes',
  'signals',
  'threads',
  'sync',
  'memory',
  'scheduling',
]

export const TOPIC_LABELS = {
  processes: 'Processos',
  pipes: 'Pipes',
  signals: 'Sinais',
  threads: 'Threads',
  sync: 'Sincronização',
  memory: 'Memória',
  scheduling: 'Escalonamento',
}

export function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
