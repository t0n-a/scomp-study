/**
 * TEMPLATE A — Pipes: N clients, one shared request pipe, N private reply pipes
 *
 * Exam question (model exam, Grupo II Q1):
 *   Museum with N ticket scanners. The PARENT holds the ticket database
 *   (pre-filled array of structs). Each of the N CHILDREN is a scanner.
 *   All children write requests into ONE shared pipe; the parent answers
 *   each child through a PRIVATE per-child reply pipe. The scanner prints
 *   the ticket info + validity.
 *
 * The shape to memorize:
 *   requests:  N children --> [ shared pipe ] --> parent
 *   replies:   parent --> [ reply pipe i ] --> child i   (one pipe per child)
 *
 * WHY this shape: many writers on one pipe is safe (writes < PIPE_BUF are
 * atomic), but many READERS on one pipe is NOT usable — you cannot control
 * which child grabs which reply. So replies need one private pipe per child.
 */
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define N_SCANNERS 3          /* number of child processes (scanners)      */
#define N_TICKETS 5           /* size of the ticket database               */
#define REQS_PER_CHILD 2      /* each scanner sends a fixed nr of requests */

/* What a child sends to the parent.
 * MUST carry the child index — the parent needs it to pick the reply pipe. */
typedef struct {
    int child_index;          /* who is asking (selects reply pipe)        */
    int ticket_id;            /* which ticket it wants                     */
} request_t;

/* One database entry; the parent sends the whole struct as the reply.
 * sizeof(ticket_t) < PIPE_BUF (4096), so each write() is atomic.          */
typedef struct {
    int id;
    char event_name[32];
    int valid;                /* 1 = valid, 0 = not valid                  */
} ticket_t;

int main(void) {
    int req_fd[2];                    /* shared pipe: children -> parent   */
    int reply_fd[N_SCANNERS][2];      /* private pipes: parent -> child i  */
    pid_t pids[N_SCANNERS];
    int i, j;

    /* Pre-filled ticket database (lives only in the parent). */
    ticket_t db[N_TICKETS] = {
        {0, "Mona Lisa Tour", 1},
        {1, "Egypt Exhibit",  0},
        {2, "Modern Art",     1},
        {3, "Night Visit",    1},
        {4, "Roman Wing",     0}
    };

    /* ALL pipes are created BEFORE any fork(): a child only inherits
     * descriptors that already exist when fork() runs.                    */
    if (pipe(req_fd) == -1) {
        perror("pipe");
        exit(EXIT_FAILURE);
    }
    for (i = 0; i < N_SCANNERS; i++) {
        if (pipe(reply_fd[i]) == -1) {
            perror("pipe");
            exit(EXIT_FAILURE);
        }
    }

    /* ---------------- fork the N scanners ---------------- */
    for (i = 0; i < N_SCANNERS; i++) {
        if ((pids[i] = fork()) == -1) {
            perror("fork");
            exit(EXIT_FAILURE);
        }

        if (pids[i] == 0) {
            /* ================= CHILD i (scanner) ================= */
            request_t req;
            ticket_t reply;

            /* fd hygiene: keep ONLY req_fd[1] (to send requests) and
             * reply_fd[i][0] (to get my replies). Close everything else. */
            close(req_fd[0]);          /* I never read requests           */
            for (j = 0; j < N_SCANNERS; j++) {
                if (j != i)
                    close(reply_fd[j][0]);  /* not my reply pipe          */
                close(reply_fd[j][1]);      /* I never write replies; if I
                                               kept reply write ends open,
                                               a reader of that pipe could
                                               never see EOF              */
            }

            for (j = 0; j < REQS_PER_CHILD; j++) {
                /* build request: ask for a ticket (any pick rule works)  */
                req.child_index = i;
                req.ticket_id = (i + j) % N_TICKETS;

                /* whole struct in one write: < PIPE_BUF => atomic, so
                 * concurrent children never interleave bytes             */
                write(req_fd[1], &req, sizeof(request_t));

                /* block until the parent answers on MY private pipe     */
                read(reply_fd[i][0], &reply, sizeof(ticket_t));

                printf("Scanner %d (PID %d): ticket %d '%s' -> %s\n",
                       i, getpid(), reply.id, reply.event_name,
                       reply.valid ? "VALID" : "NOT VALID");
            }

            /* Done: close my ends. Closing req_fd[1] is what lets the
             * parent eventually see EOF (read()==0) on the shared pipe. */
            close(req_fd[1]);
            close(reply_fd[i][0]);
            exit(EXIT_SUCCESS);
        }
    }

    /* ================= PARENT (database) ================= */
    request_t req;

    /* fd hygiene: parent only READS requests and WRITES replies.
     * Closing req_fd[1] is CRITICAL: if the parent kept it open, read()
     * below would never return 0 (EOF) — the OS would think a writer
     * (the parent itself) still exists, and the parent would hang.       */
    close(req_fd[1]);
    for (i = 0; i < N_SCANNERS; i++)
        close(reply_fd[i][0]);         /* parent never reads replies      */

    /* Serve requests until EOF. read() returns 0 only when the pipe is
     * empty AND every write end is closed — i.e. all children finished.  */
    while (read(req_fd[0], &req, sizeof(request_t)) > 0) {
        /* route the answer using the index carried in the request        */
        write(reply_fd[req.child_index][1], &db[req.ticket_id],
              sizeof(ticket_t));
    }

    /* All requests served: close the remaining parent descriptors.       */
    close(req_fd[0]);
    for (i = 0; i < N_SCANNERS; i++)
        close(reply_fd[i][1]);

    /* Reap every child — no zombies. Drain the pipe BEFORE waiting
     * (waiting first could deadlock if children were blocked writing).   */
    for (i = 0; i < N_SCANNERS; i++)
        waitpid(pids[i], NULL, 0);

    printf("Parent: all scanners finished.\n");
    return 0;
}
