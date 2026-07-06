# Template A — Pipes (N clients ↔ 1 server) — Reconstruction Notes

Gold file: `template-A-pipes.c` (museum scanners, model exam Grupo II Q1).

## The 6-step mental recipe (reconstruct on paper)

1. **Structs first.** `request_t { int child_index; int ticket_id; }` and the
   data struct (`ticket_t`). The request MUST carry `child_index` — it is the
   routing key the parent uses to pick the reply pipe. Both structs < PIPE_BUF
   ⇒ one `write()` per message is atomic.
2. **Declare all pipes, create them ALL before any fork.**
   `int req_fd[2];` + `int reply_fd[N][2];` → one `pipe()` call each, with
   `perror`/`exit` on failure. (A pipe created after `fork()` is invisible to
   already-forked children.)
3. **Fork loop** `for (i = 0; i < N; i++)` saving `pids[i]`; child branch is
   `pids[i] == 0`.
4. **Child i:** close everything except `req_fd[1]` and `reply_fd[i][0]`
   (see checklist). Loop: fill request → `write(req_fd[1], &req, sizeof req)`
   → `read(reply_fd[i][0], &reply, sizeof reply)` → print. After the loop,
   close its two ends and `exit(EXIT_SUCCESS)`.
5. **Parent:** close `req_fd[1]` (critical for EOF!) and every
   `reply_fd[i][0]`. Serve loop:
   `while (read(req_fd[0], &req, sizeof req) > 0)`
   `write(reply_fd[req.child_index][1], &db[req.ticket_id], sizeof(ticket_t));`
6. **Shutdown:** parent closes `req_fd[0]` + all `reply_fd[i][1]`, then
   `waitpid(pids[i], NULL, 0)` for every child. Drain pipe BEFORE waiting.

Two valid shutdown styles — pick one and be consistent:
- **EOF style (used in the gold file):** each child closes `req_fd[1]` when
  done; when ALL have closed it, parent's `read()` returns 0. No counting.
- **Counting style:** parent loops exactly `N * REQS_PER_CHILD` times. Works,
  but breaks the moment the per-child count varies — EOF style is safer.

## fd-hygiene checklist

**The EOF rule (memorize verbatim):** `read()` returns 0 (EOF) only when the
pipe is empty AND **every** copy of the write end — in every process — is
closed. One forgotten `fd[1]` anywhere = reader blocks forever.

| Process  | Keeps open                     | Closes immediately after fork              | Why |
|----------|--------------------------------|--------------------------------------------|-----|
| child i  | `req_fd[1]`, `reply_fd[i][0]`  | `req_fd[0]`; `reply_fd[j][*]` for j≠i; `reply_fd[i][1]` | Unused ends held open break EOF on those pipes and leak fds |
| parent   | `req_fd[0]`, all `reply_fd[i][1]` | `req_fd[1]`; all `reply_fd[i][0]`       | If parent keeps `req_fd[1]`, its own `read()` never sees EOF ⇒ **parent hangs on itself** |

At the end each process also closes what it kept. Rule of thumb on paper:
right after `fork()`, in each branch, write the closes FIRST, before any
logic. Comment every `close()` — that is where the marks are.

## Common exam mutations (minimal diff from the gold file)

### 1. Single pipe, parent → child (parent sends work to ONE child)
Delete the `reply_fd` array and the fork loop. One pipe, one fork.
Parent: `close(fd[0]); write(fd[1], ...); close(fd[1]); wait(NULL);`
Child: `close(fd[1]); while (read(fd[0], &x, sizeof x) > 0) ...; close(fd[0]);`
(This is the gold file cut down to 1 pipe — direction reversed.)

### 2. Child → parent results collection (scatter-gather)
Delete the `reply_fd` array entirely; keep only the shared pipe, now carrying
RESULTS instead of requests. Children compute, `write()` one result struct
(atomic, < PIPE_BUF), close, exit. Parent closes `fd[1]`, then
`while (read(...) > 0)` collects until EOF, then waits. That is the gold
file with steps 4's read and 5's write removed.

### 3. Pipeline with dup2 + execlp (e.g. `ls | wc -l`)
```c
int fd[2]; pipe(fd);
if (fork() == 0) {              /* producer: stdout -> pipe   */
    close(fd[0]);               /* not reading                */
    dup2(fd[1], STDOUT_FILENO); /* stdout now IS the pipe     */
    close(fd[1]);               /* original no longer needed  */
    execlp("ls", "ls", (char*)NULL);
    perror("execlp"); exit(1);  /* exec only returns on error */
}
if (fork() == 0) {              /* consumer: stdin <- pipe    */
    close(fd[1]);               /* KEY: or wc never sees EOF  */
    dup2(fd[0], STDIN_FILENO);
    close(fd[0]);
    execlp("wc", "wc", "-l", (char*)NULL);
    perror("execlp"); exit(1);
}
close(fd[0]); close(fd[1]);     /* parent uses neither end    */
wait(NULL); wait(NULL);
```
The idiom `dup2(fd[x], STDIN/STDOUT); close(fd[x]);` is inseparable — fds
survive `exec`, so a leaked write end kills EOF detection downstream.

### 4. "Serve children in round-robin / select-like fairness"
Not needed. A single blocking `read()` on the shared request pipe already
serializes requests in arrival order; the kernel queues concurrent atomic
writes. Just state that in a comment. (`select()` is not on the reference
sheet — don't invent it.)

## Top 5 mistakes that lose points

1. **Partial-struct I/O.** Writing `sizeof(int)` when sending a struct, or
   reading into a buffer of the wrong size. Always
   `write(fd, &s, sizeof(struct_t))` / `read(fd, &s, sizeof(struct_t))` —
   same type, same sizeof, both sides.
2. **A forgotten close ⇒ hang.** Most often the PARENT forgetting
   `close(req_fd[1])` before its read loop (hangs on itself), or a child
   keeping other children's `reply_fd[j][1]` open. Symptom in the lab:
   program prints everything then never exits.
3. **`pipe()` after `fork()`.** The two processes get two UNRELATED pipes.
   All `pipe()` calls go before the fork loop, no exceptions.
4. **Zombies / no `wait`.** One `waitpid` per child, after draining the pipe.
   Waiting BEFORE reading can deadlock (children blocked writing to a full
   pipe, parent blocked in `wait`).
5. **Routing without the index.** Sending only `ticket_id` and having the
   parent reply "to whoever asked" on a shared reply pipe — impossible to
   guarantee which child reads it. The request must carry `child_index`, and
   replies must travel on per-child pipes.
