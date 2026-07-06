# DRILL — 4 days to the exam

One cycle = **paper → keyboard → compiler → diff**. Never skip the paper step:
the exam is handwritten, and the compiler can't help you there.

Statistically (7 past exams analyzed), the Grupo II threads question is most
often **Template C (producer-consumer, bounded circular buffer)**, with
**Template B (readers-writers)** a close second. If time runs short, C gets
priority over B, and both get priority over the mutation sketches.

## The cycle (≈45 min per template)

1. **Paper (25 min, timed, notes closed).** Write the full program by hand.
   Say the invariants / recipe steps out loud first, then write.
2. **Type it in exactly as written** — do NOT fix mistakes while typing.
   Typing-time fixes hide what you'd have lost marks for.
3. **Compile:** `wsl gcc -Wall -pthread -o /tmp/a yourfile.c` from the
   `patterns` dir. Every warning = a divergence. Run it with
   `wsl bash -lc "timeout 10 /tmp/a"` (templates B and C: watch for hangs —
   a hang IS the bug, either the readers-writers protocol or a missed
   `broadcast` at termination in the producer-consumer buffer). For
   template C, also check the final printed line: total consumed MUST
   equal `N_PRODUCERS * ITEMS_PER_PRODUCER`.
4. **Diff against gold:** `wsl diff yourfile.c template-A-pipes.c` (or B, or
   C). Log EVERY divergence in a running list `mistakes.md` — one line each:
   date, template, what you wrote, what gold has, why gold is right.
5. Re-study only the lines you got wrong; re-read your mistakes list before
   the next cycle.

## Day plan (exam = day 4 — 3 days left)

Template C (producer-consumer) is the statistical favorite for Grupo II Q2
and MUST get at least one full paper→type→compile→run pass before the exam.
Template B (readers-writers) is the second most likely and keeps its slot.

| Day | Morning | Evening |
|-----|---------|---------|
| 1 | Read all three gold files + notes actively (cover code, predict next line). One full cycle of Template C (paper → type → compile → run → diff). | One cycle of Template B. Start/continue `mistakes.md`. |
| 2 | Cycle C from memory, timed at exam pace (25 min paper). Read C's mutation guide; hand-sketch on paper (no typing) mutation (b) strict alternation/ping-pong and (c) phase-gate. | Cycle B from memory. Hand-sketch B's mutation A2-equivalent (process/shm version) and the semaphore producer-consumer sketch. |
| 3 | Mutation day: type + compile ONE of C's sketches (b or c, whichever felt shakier) end to end. Also one full cycle of whichever of B/C has more entries in `mistakes.md`. | STOP coding. Read `mistakes.md` + both Top-5 lists + fd-hygiene table + RW invariants + producer-consumer invariants (count<SIZE / count>0, while not if, signal vs broadcast rule). Sleep. |

## Self-check rubric (score each paper attempt, marks-weighted)

| Area | Weight | Full marks means |
|------|--------|------------------|
| **Structure** | 40% | Right skeleton: structs, pipes/mutexes created before fork/create, fork/create loops, correct parent/child or reader/writer bodies, headers plausible. A wrong skeleton caps everything else. |
| **Sync correctness** | 30% | A: atomic full-struct read/write, EOF logic, request carries child index. B: first-in/last-out protocol exact, every `read_count` access under `mutex_rc`, writer holds `mutex_data` for the whole write. C: `while` (not `if`) around every `cond_wait`, in/out/count only touched under the mutex, correct condvar signalled for each state change, termination check doesn't hang a sleeping consumer. |
| **Cleanup** | 20% | A: every close present and commented, wait per child. B/C: all joins, `free` where applicable, `mutex_destroy` + `cond_destroy`/`sem_unlink`/`shm_unlink` as applicable. |
| **Style** | 10% | `#define` constants, `perror`+`exit` on syscall failure, WHY-comments on closes and lock protocol, consistent names. |

Passing bar for a cycle: ≥ 85% AND it compiles with zero warnings AND
(templates B and C) runs to completion under `timeout 10`, and for C the
final printed total-consumed count matches `N_PRODUCERS*ITEMS_PER_PRODUCER`
exactly. Below that: the same template gets the next cycle, not the other one.

## Red flags to self-detect on paper (each is a repeat-cycle trigger)

- You wrote a `read()` loop but can't point at the line that guarantees EOF.
- You wrote `if` where the condvar/count pattern needs `while` / first-last.
- Any `pipe()` or `malloc`/`sem_open` after the `fork`/`pthread_create` loop.
- You finished the program and there is no `wait`/`join` loop.
- You can't restate the invariant of the lock you just used, in one sentence.
- (Template C) You used ONE condvar for both producers and consumers instead
  of two (`not_full` / `not_empty`).
- (Template C) You can't point at the exact line where a sleeping consumer
  is woken once the known total is reached — if there isn't one, it hangs.
