# Template C — Producer-Consumer (threads, bounded circular buffer) — Reconstruction Notes

Gold file: `template-C-producer-consumer.c` (typical exam Grupo II Q2: N sensor
threads produce readings, one logger thread consumes and prints, bounded
circular buffer, passive blocking both ways).

## The mental recipe (invariants FIRST, code second)

Say the invariants before writing a single line:

1. **`count < BUFFER_SIZE` to produce, `count > 0` to consume.** Those two
   inequalities ARE the whole synchronization problem; everything else is
   plumbing around them.
2. **One mutex for the whole buffer** (array + `in` + `out` + `count`).
   Never touch any of those four things outside lock/unlock.
3. **One condvar PER waited-on condition:** `not_full` for producers,
   `not_empty` for consumers. Never reuse a single condvar for both roles —
   a producer signalling would wake another producer instead of a consumer.
4. **`while`, never `if`, around `pthread_cond_wait`.** Recheck the condition
   after reacquiring the mutex: spurious wakeups exist, and even a "real"
   wakeup can be stale if a same-role thread got there first (e.g. two
   producers both waiting on `not_full` — only one slot opened, only one of
   them should actually write).

Then the 6 writing steps:
1. `#define N_PRODUCERS / N_CONSUMERS / BUFFER_SIZE / ITEMS_PER_PRODUCER`;
   `item_t` struct (producer_id, seq_number, value); global array-buffer +
   `in`/`out`/`count` + `items_consumed`; one mutex + two condvars
   (`PTHREAD_MUTEX_INITIALIZER` / `PTHREAD_COND_INITIALIZER`).
2. Producer: `lock; while(count==SIZE) cond_wait(not_full); buffer[in]=item;
   in=(in+1)%SIZE; count++; signal(not_empty); unlock;`
3. Consumer: `lock; while(count==0 && items_consumed<TOTAL) cond_wait(not_empty);
   if (items_consumed>=TOTAL) { unlock; break; } item=buffer[out];
   out=(out+1)%SIZE; count--; items_consumed++; signal(not_full); unlock;`
4. Termination: compare `items_consumed` to the KNOWN total
   `N_PRODUCERS*ITEMS_PER_PRODUCER` instead of a poison pill — simplest when
   the total is known ahead of time (see mutation guide for when it isn't).
5. main: per-thread id arrays (never `&i`), create ALL producers then ALL
   consumers, join ALL of them in the same order.
6. Cleanup: `pthread_mutex_destroy`, `pthread_cond_destroy` x2 (no heap
   struct here — buffer is a static array, nothing to `free`).

## signal vs broadcast rule of thumb

- Producer just added ONE item -> exactly one waiting consumer can usefully
  proceed -> `pthread_cond_signal(&not_empty)`.
- Consumer just freed ONE slot -> exactly one waiting producer can usefully
  proceed -> `pthread_cond_signal(&not_full)`.
- **Broadcast only at a state change that unblocks potentially MANY
  waiters at once** — e.g. once `items_consumed == TOTAL_ITEMS`, every
  consumer asleep on `not_empty` is waiting for items that will NEVER
  arrive; `pthread_cond_broadcast(&not_empty)` at that exact moment so ALL
  of them wake, recheck the stop condition, and exit instead of hanging.
  Signalling only one there would leave the rest deadlocked forever.

## Mutation guide (minimal diffs)

### (a) Semaphores version (empty/full/mutex) — less writing when...
...the exam doesn't require "passive blocking with pthread_cond" explicitly,
or default-inits are allowed (semaphores skip writing `while`-conditions by
hand since the counting semaphore blocks internally). Three semaphores:
```c
sem_t *mutex = sem_open("/mx", O_CREAT, 0644, 1);          /* buffer lock  */
sem_t *empty = sem_open("/empty", O_CREAT, 0644, BUFFER_SIZE); /* free slots */
sem_t *full  = sem_open("/full",  O_CREAT, 0644, 0);           /* filled slots */

/* producer */                    /* consumer */
sem_wait(empty);                  sem_wait(full);
sem_wait(mutex);                  sem_wait(mutex);
buf[in] = item;                   item = buf[out];
in = (in + 1) % SIZE;             out = (out + 1) % SIZE;
sem_post(mutex);                  sem_post(mutex);
sem_post(full);                   sem_post(empty);
```
RULE: counting semaphore BEFORE mutex, both sides — swap them and it
deadlocks (a producer holding the buffer lock while sleeping on `empty`
blocks the consumer that would free a slot). Cleanup: `sem_close` +
`sem_unlink` each name. Termination still needs the known-total check (or a
poison pill) — semaphores don't remove that part.

### (b) Strict alternation / ping-pong, 2 threads, turn variable (Recurso 23/24: T1 generates a score, T2 computes final score, 300 items)
No buffer needed at all — one item in flight at a time, handed off strictly.
Replace the whole buffer+2-condvar machinery with ONE shared `int turn`
(0 = T1's turn, 1 = T2's turn) and ONE condvar:
```c
int turn = 0;                                   /* whose turn it is      */
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cond  = PTHREAD_COND_INITIALIZER;

/* T1 (producer role) */                  /* T2 (consumer role) */
for (i = 0; i < 300; i++) {                for (i = 0; i < 300; i++) {
  lock(&mutex);                              lock(&mutex);
  while (turn != 0) cond_wait(&cond,&mutex);  while (turn != 1) cond_wait(&cond,&mutex);
  shared_score = generate();                  final = compute(shared_score);
  turn = 1;                                   turn = 0;
  cond_broadcast(&cond); /* wake the other */ cond_broadcast(&cond);
  unlock(&mutex);                             unlock(&mutex);
}                                          }
```
Use `broadcast` here even with only 2 threads: it costs nothing extra with
one condvar shared by both roles, and it avoids a subtle bug if you ever add
a third waiter. `count`/`in`/`out` disappear entirely — `turn` IS the whole
synchronization state.

### (c) Phase-gate variant (Recurso 24/25: cars/pedestrians alternate every 5 crossings, controller thread flips phase)
Shared `int phase` (0 = CARS, 1 = PEDESTRIANS) + `int crossings_this_phase`
+ a controller thread that flips the gate:
```c
int phase = 0;                    /* current active phase             */
int crossings_this_phase = 0;     /* resets every phase flip          */
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cond  = PTHREAD_COND_INITIALIZER;  /* one condvar, both roles wait on it */

/* car / pedestrian thread body (role = 0 or 1) */
lock(&mutex);
while (phase != role) cond_wait(&cond, &mutex);   /* wait for my phase   */
crossings_this_phase++;
printf("crossing...\n");
if (crossings_this_phase == 5) {                  /* last of this phase: */
    phase = 1 - phase;                            /* flip                */
    crossings_this_phase = 0;
    cond_broadcast(&cond);      /* wake EVERYONE (both roles must recheck) */
}
unlock(&mutex);
```
Broadcast is mandatory here (not signal): flipping the phase changes which
ENTIRE group (all cars or all pedestrians) is now allowed through, not just
one thread — same reasoning as reader-priority's first-in/last-out, just
generalized to two named phases instead of two named roles. A separate
"controller thread" is optional busywork — the 5th crosser flipping the
phase itself is the simplest exam-safe version; only add a real controller
thread if the statement explicitly demands one (then it owns `phase` and
the counter, and workers just wait/signal it).

### (d) Two consumers with different roles reading the same stream (Especial 24/25: logger consumes everything, alert thread only urgent items)
Simplest exam answer: **don't split the queue — let the consumer's own
logic decide what "urgent" means**, i.e. keep ONE consumer loop (the
logger) and have it call an `if (is_urgent(item)) print_alert(item);` right
after printing the normal log line. One buffer, one pair of condvars,
zero extra synchronization — this is the answer to give first, since the
statement usually just wants urgent items to ALSO be printed/flagged, not
processed by a structurally different thread.

If the statement explicitly REQUIRES a second, independent thread (so
urgent-item handling can't block/slow the logger), sketch a second small
buffer + second condvar pair fed by the first consumer:
```c
item_t alert_buffer[ALERT_SIZE]; int a_in=0,a_out=0,a_count=0;
pthread_mutex_t alert_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  alert_not_empty = PTHREAD_COND_INITIALIZER;
pthread_cond_t  alert_not_full  = PTHREAD_COND_INITIALIZER;

/* inside the logger consumer, right after dequeuing `it` from the main buffer: */
if (is_urgent(it)) {
    lock(&alert_mutex);
    while (a_count == ALERT_SIZE) cond_wait(&alert_not_full, &alert_mutex);
    alert_buffer[a_in] = it; a_in = (a_in+1)%ALERT_SIZE; a_count++;
    cond_signal(&alert_not_empty);
    unlock(&alert_mutex);
}
/* separate alert_thread(): identical consumer loop, reading alert_buffer  */
```
Same recipe as the main buffer, just a second, smaller instance of it,
fed FROM the first consumer rather than from the original producers.

## Top 5 mistakes that lose points

1. **`if` instead of `while` around `pthread_cond_wait`.** Loses marks even
   if it "happens to work" in the demo — the exam grades the pattern, and
   spurious/stale wakeups are exactly what `while` guards against.
2. **Signal-before-unlock vs signal-after-unlock confusion.** Either order is
   correct with `pthread_cond_*` (unlike some semaphore setups) as long as
   the signal happens while still holding the mutex that protects the state
   you changed — do the signal INSIDE the lock, right after updating
   `count`/`in`/`out`, then unlock. Don't unlock first "to be safe"; it adds
   a race window for no benefit and looks like you don't know why it's safe.
3. **Forgetting to `signal(not_full)` after a consume** (or `not_empty`
   after a produce). Buffer state changed but nobody blocked on the other
   condvar gets told — a full/empty producer or consumer sleeps forever
   even though the condition it's waiting for is now true.
4. **Deadlock by waiting while holding a second lock.** If (as in a two-
   buffer or alert-thread variant) you ever nest locks, waiting on a condvar
   tied to `mutex` while STILL holding an unrelated second mutex can freeze
   the whole program if another thread needs that second mutex to make
   progress on the condition you're waiting for. Keep one buffer's lock
   scope self-contained; never hold `alert_mutex` while blocked on `mutex`.
5. **Terminating consumers that wait forever.** If termination is driven by
   a counter (as in the gold file) and you forget to `broadcast` once the
   total is reached, any consumer still asleep on `not_empty` never wakes —
   the program hangs instead of exiting, and `timeout 10` on the exam
   checker will kill it and cost you the "clean termination" marks.
