// node scripts/test-scheduler.mjs
//
// Testa src/utils/scheduler.js contra o exame modelo verificado, mais três
// casos derivados à mão (comentados com a derivação).

import { simulate } from '../src/utils/scheduler.js'

let failures = 0

function assertEqual(name, actual, expected) {
  if (actual === expected) {
    console.log(`ok   - ${name}`)
  } else {
    failures += 1
    console.log(`FAIL - ${name}`)
    console.log(`  esperado: ${expected}`)
    console.log(`  obtido:   ${actual}`)
  }
}

// ---------------------------------------------------------------------------
// GROUND_TRUTH — exame modelo 24/25, verificado à mão no enunciado do agente.
//
// P1: arrival 2, priority 1, phases cpu3, io1, cpu1
// P2: arrival 1, priority 3, phases cpu4, io1, cpu1
// P3: arrival 0, priority 2, phases cpu3, io1, cpu2
//
// Worked: t0-t1 P3 (P2 arrives t1, lower prio); t2 P1 arrives, preempts,
// runs t2-t4; P1 io occupies t5; t5 P3 runs 3rd unit; P3 io occupies t6;
// t6 P1 (regressa de io) corre última unidade, termina; t7-t8 P3 últimas 2
// unidades; t9-t12 as 4 unidades de P2; P2 io ocupa t13, ninguém pronto -> '-';
// t14 última unidade de P2.
const GROUND_TRUTH = {
  algorithm: 'priority',
  processes: [
    { id: 1, arrival: 2, priority: 1, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 1 }] },
    { id: 2, arrival: 1, priority: 3, phases: [{ t: 'cpu', n: 4 }, { t: 'io', n: 1 }, { t: 'cpu', n: 1 }] },
    { id: 3, arrival: 0, priority: 2, phases: [{ t: 'cpu', n: 3 }, { t: 'io', n: 1 }, { t: 'cpu', n: 2 }] },
  ],
}

assertEqual('exame modelo (ground truth)', simulate(GROUND_TRUTH), '3311131332222-2')

// ---------------------------------------------------------------------------
// Caso 2: dois processos, sem io, prioridades fixas, mesma chegada.
// P1: arrival 0, priority 1, phases cpu2
// P2: arrival 0, priority 2, phases cpu3
//
// Derivação à mão: ambos chegam a t0. P1 tem prioridade mais alta (1 < 2),
// por isso corre primeiro, sem interrupções (não há io): t0,t1 -> "11".
// Só depois de P1 terminar (fim de t1) é que P2 pode correr: t2,t3,t4 -> "222".
// Traço esperado: "11222" (5 ticks).
const TWO_PROC_NO_IO = {
  algorithm: 'priority',
  processes: [
    { id: 1, arrival: 0, priority: 1, phases: [{ t: 'cpu', n: 2 }] },
    { id: 2, arrival: 0, priority: 2, phases: [{ t: 'cpu', n: 3 }] },
  ],
}

assertEqual('dois processos, sem io', simulate(TWO_PROC_NO_IO), '11222')

// ---------------------------------------------------------------------------
// Caso 3: intervalo de CPU ociosa (idle gap) enquanto um processo está em io
// e outro ainda não chegou.
// P1: arrival 0, priority 1, phases cpu1, io2, cpu1
// P2: arrival 5, priority 1, phases cpu1
//
// Derivação à mão:
//   t0: só P1 pronto -> corre '1', termina a fase cpu (1 unidade) no fim de t0.
//   A fase de io (n=2) ocupa t1 e t2; P1 fica pronto em t3.
//   t1: ninguém pronto (P1 em io, P2 só chega em t5) -> '-'
//   t2: ainda em io -> '-'
//   t3: P1 pronto, corre a última unidade de cpu -> '1', termina (done).
//   t4: ninguém pronto (P2 só chega em t5) -> '-'
//   t5: P2 chega, corre a sua única unidade -> '2', termina.
// Traço esperado: "1--1-2" (6 ticks).
const IDLE_GAP = {
  algorithm: 'priority',
  processes: [
    { id: 1, arrival: 0, priority: 1, phases: [{ t: 'cpu', n: 1 }, { t: 'io', n: 2 }, { t: 'cpu', n: 1 }] },
    { id: 2, arrival: 5, priority: 1, phases: [{ t: 'cpu', n: 1 }] },
  ],
}

assertEqual('intervalo ocioso (idle gap)', simulate(IDLE_GAP), '1--1-2')

// ---------------------------------------------------------------------------
// Caso 4: round-robin, quantum 2, sem io.
// P1: arrival 0, quantum 2, phases cpu3
// P2: arrival 0, quantum 2, phases cpu2
//
// Derivação à mão (convenção RR: fila FIFO; chegadas por ordem de id entram
// na fila; processo cujo quantum expira vai para o fim da fila):
//   t0: fila=[1,2] -> corre P1 (1ª unidade das 3). Fila fica [2].
//   t1: P1 continua (2ª unidade). runElapsed chega a 2 (quantum) e a fase
//       ainda não terminou (falta 1 unidade) -> preempção: P1 vai para o fim
//       da fila. Fila fica [2,1].
//   t2: corre P2 (1ª das 2 unidades). runElapsed=1.
//   t3: P2 continua (2ª unidade) -> termina a fase, done. Fila fica [1].
//   t4: corre P1 (3ª e última unidade) -> termina, done.
// Traço esperado: "11221" (5 ticks).
const RR_NO_IO = {
  algorithm: 'rr',
  quantum: 2,
  processes: [
    { id: 1, arrival: 0, quantum: 2, phases: [{ t: 'cpu', n: 3 }] },
    { id: 2, arrival: 0, quantum: 2, phases: [{ t: 'cpu', n: 2 }] },
  ],
}

assertEqual('round-robin, quantum 2, sem io', simulate(RR_NO_IO), '11221')

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
} else {
  console.log('\nTodos os testes passaram.')
}
