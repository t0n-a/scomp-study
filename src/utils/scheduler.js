// Simulador de escalonamento (dependency-free ESM — importável diretamente
// pelo Node em scripts/test-scheduler.mjs e pelo Vite na app).
//
// Suporta dois algoritmos:
//   - 'priority': prioridades fixas preemptivas (número menor = mais prioritário)
//   - 'rr'      : round-robin com quantum fixo
//
// Semântica de 'priority' foi calibrada contra um exame modelo resolvido à
// mão (ver GROUND_TRUTH em scripts/test-scheduler.mjs) — não alterar sem
// voltar a validar contra esse caso.
//
// Semântica de 'rr' é convenção nossa (não verificada em exame), documentada
// abaixo junto à implementação.

function cloneProcess(p) {
  return {
    id: p.id,
    arrival: p.arrival,
    priority: p.priority,
    quantum: p.quantum,
    phases: p.phases.map((ph) => ({ t: ph.t, n: ph.n })),
    // estado de simulação
    phaseIdx: 0,
    unitsLeftInPhase: p.phases[0] ? p.phases[0].n : 0,
    state: 'future', // 'future' | 'ready' | 'io' | 'done'
    ioEndTick: null,
  }
}

function totalUnits(process) {
  return process.phases.reduce((acc, ph) => acc + ph.n, 0)
}

// Perfil textual de um processo, ex.: "111I1" (unidades de cpu mostradas
// como o dígito do id, unidades de io como 'I').
export function profileString(process) {
  let out = ''
  for (const ph of process.phases) {
    const ch = ph.t === 'io' ? 'I' : String(process.id)
    out += ch.repeat(ph.n)
  }
  return out
}

const MAX_TICKS = 500

// Corre a simulação completa, devolvendo o traço tick-a-tick e informação de
// depuração por tick (usada por explainTick).
export function simulateDetailed(scenario) {
  const { algorithm, quantum } = scenario
  const processes = scenario.processes.map(cloneProcess)
  const byId = new Map(processes.map((p) => [p.id, p]))

  let trace = ''
  const ticks = []

  // Fila FIFO só usada pelo RR.
  const queue = []
  let runningId = null
  let runElapsed = 0

  function advancePhaseAfterCpuTick(p, tick) {
    // p acabou de consumir a última unidade da fase de cpu corrente neste tick.
    const nextIdx = p.phaseIdx + 1
    if (nextIdx >= p.phases.length) {
      p.state = 'done'
      return 'done'
    }
    const nextPhase = p.phases[nextIdx]
    if (nextPhase.t === 'io') {
      p.phaseIdx = nextIdx
      p.state = 'io'
      p.ioEndTick = tick + nextPhase.n
      return 'io'
    }
    // Caso raro: cpu logo a seguir a cpu (sem io a separar). Continua pronto.
    p.phaseIdx = nextIdx
    p.unitsLeftInPhase = nextPhase.n
    p.state = 'ready'
    return 'ready'
  }

  function completeIoReturn(p) {
    // p estava em io e a fase de io terminou no tick anterior.
    const nextIdx = p.phaseIdx + 1
    if (nextIdx >= p.phases.length) {
      p.state = 'done'
      return
    }
    p.phaseIdx = nextIdx
    p.unitsLeftInPhase = p.phases[nextIdx].n
    p.state = 'ready'
  }

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    // 1) chegadas neste tick
    const arrivals = processes
      .filter((p) => p.state === 'future' && p.arrival === tick)
      .sort((a, b) => a.id - b.id)
    for (const p of arrivals) p.state = 'ready'

    // 2) regressos de io concluídos no tick anterior
    const ioReturners = processes
      .filter((p) => p.state === 'io' && p.ioEndTick === tick - 1)
      .sort((a, b) => a.id - b.id)
    for (const p of ioReturners) completeIoReturn(p)

    if (algorithm === 'rr') {
      // Fila: chegadas, depois regressos de io, ambos por ordem de id.
      // Nota de convenção: um processo preemptado por quantum reentra na fila
      // no FIM do tick em que expira (ver abaixo) — ou seja, ANTES das
      // chegadas/regressos do tick seguinte. Não é verificável contra exames
      // (não há traços RR completos no banco); é a convenção desta app.
      for (const p of arrivals) queue.push(p.id)
      for (const p of ioReturners) queue.push(p.id)
    }

    const allDone = processes.every((p) => p.state === 'done')
    if (allDone) break

    const ioNow = processes.filter((p) => p.state === 'io').map((p) => p.id)

    let chosen = null

    if (algorithm === 'rr') {
      if (runningId === null) {
        if (queue.length > 0) {
          runningId = queue.shift()
          runElapsed = 0
        }
      }
      chosen = runningId
      const tickInfo = {
        t: tick,
        algorithm,
        ready: queue.map((id, i) => ({ id, queuePos: i })),
        io: ioNow,
        chosen,
      }

      if (chosen === null) {
        trace += '-'
        ticks.push(tickInfo)
        continue
      }

      trace += String(chosen)
      const p = byId.get(chosen)
      p.unitsLeftInPhase -= 1
      runElapsed += 1

      if (p.unitsLeftInPhase === 0) {
        const result = advancePhaseAfterCpuTick(p, tick)
        runningId = null
        if (result === 'ready') queue.push(p.id)
      } else if (runElapsed === quantum) {
        queue.push(runningId)
        runningId = null
      }

      ticks.push(tickInfo)
      continue
    }

    // ---- priority (preemptiva, fixa) ----
    const ready = processes
      .filter((p) => p.state === 'ready')
      .sort((a, b) => (a.priority - b.priority) || (a.id - b.id))

    const tickInfo = {
      t: tick,
      algorithm,
      ready: ready.map((p) => ({ id: p.id, priority: p.priority })),
      io: ioNow,
      chosen: null,
    }

    if (ready.length === 0) {
      trace += '-'
      ticks.push(tickInfo)
      continue
    }

    const running = ready[0]
    chosen = running.id
    tickInfo.chosen = chosen
    trace += String(chosen)

    running.unitsLeftInPhase -= 1
    if (running.unitsLeftInPhase === 0) {
      advancePhaseAfterCpuTick(running, tick)
    }
    // se não terminou a fase, mantém-se 'ready' e volta a concorrer no
    // próximo tick (preempção imediata é natural aqui: recalculamos os
    // prontos do zero em cada tick).

    ticks.push(tickInfo)
  }

  return { trace, ticks }
}

export function simulate(scenario) {
  return simulateDetailed(scenario).trace
}

// Explica o tick `t`: quem estava pronto (com prioridade/posição na fila),
// quem estava em io, e quem devia (ou deveria ter) corrido.
export function explainTick(scenario, t) {
  const { ticks } = simulateDetailed(scenario)
  const info = ticks[t]
  if (!info) return null

  const idToProc = new Map(scenario.processes.map((p) => [p.id, p]))
  const lines = []

  if (info.io.length > 0) {
    lines.push(`Em io: ${info.io.map((id) => `P${id}`).join(', ')}.`)
  } else {
    lines.push('Nenhum processo em io.')
  }

  if (info.algorithm === 'rr') {
    if (info.ready.length === 0) {
      lines.push('Fila de prontos vazia.')
    } else {
      const order = info.ready
        .map((r) => `P${r.id}${r.queuePos === 0 ? ' (cabeça da fila)' : ` (pos. ${r.queuePos + 1})`}`)
        .join(', ')
      lines.push(`Fila de prontos: ${order}.`)
    }
  } else {
    if (info.ready.length === 0) {
      lines.push('Nenhum processo pronto.')
    } else {
      const order = info.ready
        .map((r) => `P${r.id} (prioridade ${idToProc.get(r.id)?.priority ?? r.priority})`)
        .join(', ')
      lines.push(`Prontos: ${order}.`)
    }
  }

  lines.push(
    info.chosen === null
      ? 'Logo, a CPU fica ociosa (—) neste tick.'
      : `Logo, corre P${info.chosen} neste tick.`
  )

  return {
    t: info.t,
    ready: info.ready,
    io: info.io,
    chosen: info.chosen,
    text: lines.join(' '),
  }
}

export function scenarioLength(scenario) {
  return simulate(scenario).length
}

export { totalUnits }
