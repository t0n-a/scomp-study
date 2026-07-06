# Template B — Readers-Writers (threads, reader priority) — Reconstruction Notes

Gold file: `template-B-readers-writers.c` (model exam Grupo II Q2).
Same logic as the course's `rw1.c`, but with pthreads instead of processes.

## The mental recipe (invariants FIRST, code second)

Say the invariants before writing a single line:

1. **"First reader takes the room key, last reader returns it."**
   `mutex_data` = the room key. Writers take it directly; readers take it
   collectively via the first-in / last-out protocol.
2. **`read_count` is shared state ⇒ it gets its own mutex** (`mutex_rc`).
   Every `++`/`--`/read of it happens inside lock/unlock of `mutex_rc`.
3. **Reader priority is emergent, not coded:** while readers keep arriving,
   `read_count` never reaches 0, the key is never returned, writers starve.
   (If the exam asks "why do readers have priority?" — that's the answer.)

Then the 6 writing steps:
1. `#define N_WRITERS / M_READERS / ITERATIONS`; shared struct typedef;
   global `shared_t *shared;` + two mutexes (`PTHREAD_MUTEX_INITIALIZER`
   is the fastest correct init on paper).
2. Reader ENTRY: `lock(rc); read_count++; if (read_count==1) lock(data);
   copy count to local; unlock(rc);`
3. Reader BODY: read + print (no lock needed — writers are locked out,
   concurrent reads are safe). Reader EXIT: `lock(rc); read_count--;
   if (read_count==0) unlock(data); unlock(rc);`
4. Writer: `lock(data);` … write ID + time, update counters, print …
   `unlock(data);` — that's ALL a writer does.
5. main: `malloc` the shared struct (check NULL), init fields, create all
   threads (per-thread id array, never `&i`), join ALL threads.
6. Cleanup: `pthread_mutex_destroy` both, `free(shared)`.

Time on the reference sheet: `time(NULL)` + `ctime()` or
`strftime(buf, sz, "%H:%M:%S", localtime(&t))`. (`ctime` output ends with
`'\n'` — strip it or accept the ugly print.)

## Mutation guide (minimal diffs)

### 1. Writer-priority version (2nd RW problem — sketch)
Add a gate the writers can close (this is `rw2.c` with mutexes):
- new shared `write_count` + `mutex_wc` + gate lock `try_read`.
- READER entry gains a wrapper: `lock(try_read); …existing entry…
  unlock(try_read);` (exit protocol unchanged).
- WRITER: first-in/last-out on the GATE:
  `lock(wc); write_count++; if(==1) lock(try_read); unlock(wc);`
  then `lock(data); write; unlock(data);` then
  `lock(wc); write_count--; if(==0) unlock(try_read); unlock(wc);`
- Effect: the first waiting writer closes the gate, new readers queue on
  `try_read`, current readers drain, writer enters. Readers can now starve.
- pthread caveat: unlocking a mutex locked by another thread is undefined —
  if first-writer-locks/last-writer-unlocks crosses threads, use a
  `sem_t`-style gate or note it; with processes (rw2.c) semaphores avoid
  the issue. Mention this and you look smart.

### 2. Producer-consumer with counting semaphores (full sketch)
Three semaphores, values 1 / N / 0 — order of waits is the whole exam:
```c
sem_t *mutex = sem_open("/mx", O_CREAT, 0644, 1); /* buffer lock   */
sem_t *slots = sem_open("/sl", O_CREAT, 0644, N); /* free slots    */
sem_t *items = sem_open("/it", O_CREAT, 0644, 0); /* filled slots  */

/* producer */                    /* consumer */
sem_wait(slots);                  sem_wait(items);
sem_wait(mutex);                  sem_wait(mutex);
buf[in] = item;                   item = buf[out];
in = (in + 1) % N;                out = (out + 1) % N;
sem_post(mutex);                  sem_post(mutex);
sem_post(items);                  sem_post(slots);
```
RULE: counting semaphore BEFORE mutex. Swapping them (`mutex` first, then
`slots`) deadlocks: producer holds the lock while sleeping on a full buffer,
consumer can't get the lock to make space. Cleanup: `sem_close` +
`sem_unlink` each name.

### 3. Plain N threads increment a counter (the minimal exam warm-up)
Delete everything except: one global `int counter` + one mutex; thread body
`lock; counter++; unlock;` in a loop; main = create-all / join-all / print /
destroy. Printing the final value happens AFTER the joins — that's the point
of the question.

### 4. Same pattern with PROCESSES (API swap: shm + named semaphores)
Logic identical to the gold file; only the plumbing changes (this is rw1.c):
| threads version              | process version                                   |
|------------------------------|---------------------------------------------------|
| `shared = malloc(...)`       | `fd = shm_open("/shm_rw", O_CREAT\|O_RDWR, 0666);` `ftruncate(fd, sizeof(shared_t));` `shared = mmap(0, sizeof(shared_t), PROT_READ\|PROT_WRITE, MAP_SHARED, fd, 0);` |
| `pthread_mutex_t mutex_rc`   | `sem_t *mutex_rc = sem_open("/rc", O_CREAT, 0666, 1);` |
| `pthread_mutex_lock/unlock`  | `sem_wait` / `sem_post`                           |
| `pthread_create` / `join`    | `fork()` / `waitpid`                              |
| `free` + `mutex_destroy`     | `munmap` + `shm_unlink` + `sem_close` + `sem_unlink` |
Reader/writer entry-exit protocols: byte-for-byte the same.

## Top 5 mistakes that lose points

1. **Race on `read_count`.** Any touch of `read_count` outside `mutex_rc` —
   including the `if (read_count == 1)` test done after unlocking. The test
   and the increment MUST sit in the same critical section.
2. **Printing the count outside the lock.** Copy it to a local variable
   while holding `mutex_rc`, print the local. Printing `shared->read_count`
   later reports a value that may already be stale/racing.
3. **`if` instead of first-in/last-out logic errors.** Locking `mutex_data`
   on EVERY reader (serializes readers — wrong, loses the "concurrent
   readers" marks) or unlocking it on every exit (unlocks a mutex you don't
   hold — undefined behavior).
4. **Forgotten joins ⇒ use-after-free.** main `free(shared)` / returns while
   threads still run. Join ALL of them first. (With condvars the analog is
   `pthread_cond_signal` vs `broadcast`: waking ONE thread when the state
   change enables MANY waiters — e.g. all readers — needs `broadcast`.)
5. **Passing `&i` as the thread argument.** All threads read the same
   mutating loop variable. Use a per-thread array `id[i] = i;
   pthread_create(..., &id[i])` — worth easy marks, trivially checkable.
