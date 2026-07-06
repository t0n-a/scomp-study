/**
 * TEMPLATE B — Threads: Readers-Writers, READER PRIORITY (1st RW problem)
 *
 * Exam question (model exam, Grupo II Q2):
 *   N writer threads and M reader threads. Shared struct on the HEAP with
 *   two strings. Readers may read concurrently and have PRIORITY over
 *   writers; they print both strings + the current active-reader count.
 *   Writers get EXCLUSIVE access (only when zero readers are inside) and
 *   write their thread ID + the current time; they print writer count +
 *   reader count.
 *
 * The invariants to memorize (say them out loud before writing code):
 *   1. read_count is shared state          -> protected by mutex_rc.
 *   2. mutex_data is the "room key":
 *        FIRST reader in  takes the key  (locks writers out),
 *        LAST  reader out returns the key (writers may enter).
 *   3. A writer holds the room key for the whole write -> exclusive,
 *      and can only get it when read_count is 0 (last reader returned it).
 *   Reader priority falls out for free: while readers keep arriving,
 *   read_count never hits 0, so the key is never returned -> writers starve.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <pthread.h>

#define N_WRITERS 2
#define M_READERS 4
#define ITERATIONS 3          /* each thread repeats its role a few times  */

/* Shared data: MUST live on the heap (malloc'd in main, freed at the end) */
typedef struct {
    char str1[64];            /* writers put their thread ID here          */
    char str2[64];            /* writers put the current time here         */
    int read_count;           /* nr of readers INSIDE the room right now   */
    int write_count;          /* total writes done so far                  */
} shared_t;

shared_t *shared;                                 /* the heap struct       */
pthread_mutex_t mutex_rc = PTHREAD_MUTEX_INITIALIZER;   /* guards read_count */
pthread_mutex_t mutex_data = PTHREAD_MUTEX_INITIALIZER; /* the room key      */

void *reader(void *arg) {
    int id = *((int *)arg);
    int k, my_count;

    for (k = 0; k < ITERATIONS; k++) {
        /* ---- ENTRY protocol ---- */
        pthread_mutex_lock(&mutex_rc);
        shared->read_count++;
        if (shared->read_count == 1)          /* FIRST reader in:          */
            pthread_mutex_lock(&mutex_data);  /* take the room key so no
                                                 writer can enter          */
        my_count = shared->read_count;        /* copy count UNDER the lock:
                                                 printing shared->read_count
                                                 later would be a race     */
        pthread_mutex_unlock(&mutex_rc);

        /* ---- READING (no lock on data needed: writers are out,
                other readers only read — concurrent reads are safe) ---- */
        printf("Reader %d: '%s' | '%s' (%d readers inside)\n",
               id, shared->str1, shared->str2, my_count);

        /* ---- EXIT protocol ---- */
        pthread_mutex_lock(&mutex_rc);
        shared->read_count--;
        if (shared->read_count == 0)          /* LAST reader out:          */
            pthread_mutex_unlock(&mutex_data);/* return the key            */
        pthread_mutex_unlock(&mutex_rc);

        usleep(1000);   /* tiny pause so roles interleave in the demo      */
    }
    pthread_exit(NULL);
}

void *writer(void *arg) {
    int id = *((int *)arg);
    int k;
    time_t now;

    for (k = 0; k < ITERATIONS; k++) {
        /* Exclusive access: blocks while ANY reader is inside (the first
         * reader holds mutex_data) or another writer is writing.          */
        pthread_mutex_lock(&mutex_data);

        /* ---- WRITING (we own the room: nobody else touches the data) -- */
        snprintf(shared->str1, sizeof(shared->str1),
                 "written by thread %lu", (unsigned long)pthread_self());
        now = time(NULL);
        strftime(shared->str2, sizeof(shared->str2),
                 "%H:%M:%S", localtime(&now));
        shared->write_count++;

        /* NOTE the subtlety: read_count may be NON-zero here! A first
         * reader increments read_count and only THEN blocks on the room
         * key we are holding — it is registered but stuck at the door.
         * No reader is ever INSIDE while we write; exclusivity holds.
         * Do NOT lock mutex_rc here to read it: a first reader holds
         * mutex_rc while waiting for mutex_data (which WE hold) — taking
         * mutex_rc now would be a lock-order DEADLOCK. Unlocked peek OK.  */
        printf("Writer %d: write nr %d done (readers at the door: %d)\n",
               id, shared->write_count, shared->read_count);

        pthread_mutex_unlock(&mutex_data);

        usleep(1000);
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t r_tid[M_READERS], w_tid[N_WRITERS];
    int r_id[M_READERS], w_id[N_WRITERS];   /* per-thread arg array: each
                                               thread gets its OWN stable
                                               address (never pass &i!)    */
    int i;

    /* shared struct on the HEAP, as the statement demands                 */
    shared = malloc(sizeof(shared_t));
    if (shared == NULL) {
        perror("malloc");
        exit(EXIT_FAILURE);
    }
    strcpy(shared->str1, "initial string 1");
    strcpy(shared->str2, "initial string 2");
    shared->read_count = 0;
    shared->write_count = 0;

    /* create ALL threads first, join later (never create-join-create)     */
    for (i = 0; i < N_WRITERS; i++) {
        w_id[i] = i;
        pthread_create(&w_tid[i], NULL, writer, &w_id[i]);
    }
    for (i = 0; i < M_READERS; i++) {
        r_id[i] = i;
        pthread_create(&r_tid[i], NULL, reader, &r_id[i]);
    }

    /* join ALL threads — forgetting a join means main may free the shared
     * struct while threads still use it                                   */
    for (i = 0; i < N_WRITERS; i++)
        pthread_join(w_tid[i], NULL);
    for (i = 0; i < M_READERS; i++)
        pthread_join(r_tid[i], NULL);

    printf("main: done. total writes = %d\n", shared->write_count);

    /* cleanup: destroy sync objects, free the heap struct                 */
    pthread_mutex_destroy(&mutex_rc);
    pthread_mutex_destroy(&mutex_data);
    free(shared);
    return 0;
}
