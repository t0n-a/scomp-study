/**
 * TEMPLATE C — Threads: Producer-Consumer, BOUNDED CIRCULAR BUFFER
 *
 * Exam question (typical Grupo II Q2, e.g. "3 sensor threads produce 40
 * readings each into a 10-slot circular buffer; a logger thread consumes
 * and prints; producers block passively when full, consumer blocks when
 * empty"):
 *   N producer threads each generate ITEMS_PER_PRODUCER items (id, seq,
 *   value) and push them into a shared bounded buffer of BUFFER_SIZE slots.
 *   M consumer threads pop items and print them. Producers must block
 *   (not busy-wait) when the buffer is full; consumers must block when
 *   it is empty. All items must be consumed exactly once, then everyone
 *   terminates cleanly.
 *
 * The invariants to memorize (say them out loud before writing code):
 *   1. The buffer (array + in/out indices + count) is shared state ->
 *      ALL of it is protected by ONE mutex. Never touch in/out/count/
 *      the array cells outside lock/unlock.
 *   2. Two DIFFERENT conditions are waited on -> TWO condvars, one each:
 *        not_full  : producers wait here while count == BUFFER_SIZE
 *        not_empty : consumers wait here while count == 0
 *      (one mutex, but one condvar PER waited-on condition — never share
 *      a single condvar for both, or a wrong signal wakes the wrong role.)
 *   3. ALWAYS re-check the condition in a while-loop after cond_wait
 *      returns, never assume the state you waited for is still true —
 *      cond_wait can return on a SPURIOUS wakeup, or another thread of
 *      the SAME role (e.g. two producers both waiting on not_full) may
 *      have re-filled the slot you were signalled about before you got
 *      the mutex back. `while (count == BUFFER_SIZE) cond_wait(...)`
 *      is mandatory, `if` is a classic exam bug.
 *   4. Termination: the total number of items is known in advance
 *      (N_PRODUCERS * ITEMS_PER_PRODUCER). We use that number directly —
 *      each consumer loop compares a shared "items_consumed" counter
 *      against the known total, instead of a poison-pill sentinel value.
 *      This is the SIMPLEST exam-safe approach whenever the total count
 *      is known: no extra buffer slot format to smuggle a sentinel
 *      through, and it generalizes cleanly to M consumers (whichever
 *      consumer sees the counter reach the total, ALL of them stop,
 *      each still checking under the same mutex that guards the buffer).
 *      A poison pill (one "stop" item per consumer) is the right choice
 *      instead only when the total item count is NOT known ahead of
 *      time — mention that trade-off if asked.
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>

#define N_PRODUCERS       2
#define N_CONSUMERS       1
#define BUFFER_SIZE       10
#define ITEMS_PER_PRODUCER 40
#define TOTAL_ITEMS       (N_PRODUCERS * ITEMS_PER_PRODUCER)

/* One unit of data flowing through the pipe */
typedef struct {
    int producer_id;
    int seq_number;   /* 0..ITEMS_PER_PRODUCER-1, per producer            */
    int value;        /* the "reading" itself                            */
} item_t;

/* ---- shared buffer state: ALL fields below live under ONE mutex ---- */
item_t buffer[BUFFER_SIZE];
int in = 0;             /* next free slot to WRITE into                  */
int out = 0;            /* next filled slot to READ from                 */
int count = 0;          /* number of items currently held in the buffer  */
int items_consumed = 0; /* running total consumed so far (termination)   */

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full  = PTHREAD_COND_INITIALIZER; /* producers wait here */
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER; /* consumers wait here */

void *producer(void *arg) {
    int id = *((int *)arg);
    int seq;

    for (seq = 0; seq < ITEMS_PER_PRODUCER; seq++) {
        item_t it;
        it.producer_id = id;
        it.seq_number  = seq;
        it.value       = id * 1000 + seq;   /* deterministic, easy to check */

        pthread_mutex_lock(&mutex);
        /* WHILE, not if: after we are woken and reacquire the mutex, some
         * other producer may have refilled the slot a consumer just freed
         * (spurious wakeup or "stolen" slot) — must recheck before writing. */
        while (count == BUFFER_SIZE)
            pthread_cond_wait(&not_full, &mutex);

        buffer[in] = it;
        in = (in + 1) % BUFFER_SIZE;   /* circular advance               */
        count++;

        printf("Producer %d: produced seq=%d value=%d (count=%d)\n",
               id, it.seq_number, it.value, count);

        /* We just made the buffer NON-empty: wake ONE waiting consumer.
         * signal (not broadcast) is enough: exactly one new item became
         * available, so exactly one blocked consumer can usefully proceed. */
        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&mutex);

        usleep(1000);   /* tiny pause so producers/consumer interleave    */
    }
    pthread_exit(NULL);
}

void *consumer(void *arg) {
    int id = *((int *)arg);

    for (;;) {
        pthread_mutex_lock(&mutex);

        /* Stop condition checked under the SAME mutex that guards
         * items_consumed: once every item ever produced has been
         * consumed, there is nothing left to wait for — leave now,
         * or we'd block forever on not_empty (a hang, not a crash). */
        while (count == 0 && items_consumed < TOTAL_ITEMS)
            pthread_cond_wait(&not_empty, &mutex);

        if (items_consumed >= TOTAL_ITEMS) {
            pthread_mutex_unlock(&mutex);
            break;
        }

        item_t it = buffer[out];
        out = (out + 1) % BUFFER_SIZE;
        count--;
        items_consumed++;

        printf("Consumer %d: consumed producer=%d seq=%d value=%d "
               "(count=%d, total consumed=%d)\n",
               id, it.producer_id, it.seq_number, it.value,
               count, items_consumed);

        /* We just freed a slot: wake ONE waiting producer. Also wake
         * consumers via broadcast on not_empty is NOT needed here for
         * producers (that's not_full's job) — but if items_consumed just
         * reached TOTAL_ITEMS, other consumers may be asleep on not_empty
         * waiting for more items that will NEVER come; broadcast so they
         * all re-check the stop condition and exit instead of hanging. */
        pthread_cond_signal(&not_full);
        if (items_consumed == TOTAL_ITEMS)
            pthread_cond_broadcast(&not_empty);

        pthread_mutex_unlock(&mutex);
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t p_tid[N_PRODUCERS], c_tid[N_CONSUMERS];
    int p_id[N_PRODUCERS], c_id[N_CONSUMERS];  /* per-thread arg array:
                                                   each thread gets its OWN
                                                   stable address, never &i */
    int i;

    /* create ALL threads first, join later (never create-join-create) */
    for (i = 0; i < N_PRODUCERS; i++) {
        p_id[i] = i;
        pthread_create(&p_tid[i], NULL, producer, &p_id[i]);
    }
    for (i = 0; i < N_CONSUMERS; i++) {
        c_id[i] = i;
        pthread_create(&c_tid[i], NULL, consumer, &c_id[i]);
    }

    /* join ALL threads — forgetting a join risks main exiting while
     * threads still touch the shared buffer/mutex/condvars */
    for (i = 0; i < N_PRODUCERS; i++)
        pthread_join(p_tid[i], NULL);
    for (i = 0; i < N_CONSUMERS; i++)
        pthread_join(c_tid[i], NULL);

    printf("main: done. total consumed = %d (expected %d)\n",
           items_consumed, TOTAL_ITEMS);

    /* cleanup: destroy sync objects (no heap struct here to free) */
    pthread_mutex_destroy(&mutex);
    pthread_cond_destroy(&not_full);
    pthread_cond_destroy(&not_empty);

    return (items_consumed == TOTAL_ITEMS) ? 0 : 1;
}
