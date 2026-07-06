# SCOMP 2025/26 — Theory Slide Topic Map

Maps each lecture-slide PDF (`scomp-sprint2/pdfs/Teóricas/`) to its topics and the page where each key section starts. Page numbers are PDF page numbers (1-based, as shown by the slide footer).

## SCOMP2526-T1.pdf — Course Overview
- topic tags: processes, scheduling, sync
- key sections: course theme (p. 3), main topics (p. 7), filesystems example (p. 9), multiprocessing & the process abstraction (p. 13), scheduling (p. 16), concurrent programming (p. 17), logistics/grading (p. 24)

## SCOMP2526-T1b.pdf — System-level I/O
- topic tags: processes, pipes
- key sections: Linux I/O overview (p. 4), file types incl. named pipes/FIFOs mention (p. 6), opening/closing files (p. 13), reading/writing files (p. 15), short counts (p. 18), file metadata/stat (p. 20), file sharing across fork (p. 23), I/O redirection with dup2 (p. 26), C standard buffered I/O (p. 33)

## SCOMP2526-T2.pdf — Operating Systems — General Principles
- topic tags: memory, scheduling
- key sections: OS services (p. 5), architectural support (p. 9), system calls & dual-mode operation (p. 14), wrapper functions/libraries (p. 18), hardware interrupts (p. 27), CPU protection & timer (p. 28), scheduler and dispatcher (p. 30), memory protection / virtual memory (p. 34)

## SCOMP2526-T2b.pdf — Operating Systems — Design Patterns
- topic tags: memory, scheduling
- key sections: hardware mechanisms recap — dual mode, MMU, interrupts, timers (p. 3), kinds of operating systems (p. 5), simple structure / MS-DOS (p. 14), monolithic kernels (p. 16), modular kernels / Linux (p. 19), microkernels (p. 24), hybrid kernels (p. 33), comparison table (p. 36)

## SCOMP2526-T3.pdf — The Process Abstraction
- topic tags: processes, signals
- key sections: the process abstraction (p. 3), asynchronous I/O vs process-based servers (p. 14), process lifecycle (p. 22), process creation / fork() (p. 23), conceptual view of fork() (p. 25), process states — ready/running/blocked (p. 29), termination, SIGCHLD & zombies (p. 36), wait()/waitpid() reaping (p. 38)

## SCOMP2526-T4.pdf — Virtual Memory
- topic tags: memory, processes
- key sections: virtual memory intro (p. 4), VM as a tool for caching (p. 7), pages & address translation (p. 13), page tables and PTEs (p. 14), page hit/page fault (p. 16), TLB (p. 22), VM for memory management — private address spaces (p. 25), sharing memory & user-level mmap (p. 27), VM for memory protection (p. 34)

## SCOMP2526-T5.pdf — Exceptional Control Flow
- topic tags: signals, processes, scheduling
- key sections: exceptional control flow & kernel exceptions (p. 4), ECF taxonomy (p. 11), synchronous exceptions / system calls (p. 13), page fault example (p. 20), asynchronous exceptions / interrupts (p. 25), context switching & multitasking (p. 27), Process Control Block (p. 34), signals — sending/receiving/handlers (p. 41), nested signal handlers (p. 46)

## SCOMP2526-T6.pdf — Process Synchronization Part I
- topic tags: sync, memory, processes
- key sections: sharing data & IPC models (p. 3), shared memory background — shared physical frames (p. 6), producer-consumer / bounded buffer (p. 11), active vs passive waiting (p. 15), race conditions (p. 18), critical section problem (p. 19), software solutions (p. 21), hardware solutions (p. 24), semaphores (p. 26), POSIX semaphore API — sem_open/sem_wait/sem_post (p. 29), producer-consumer with semaphores (p. 34)

## SCOMP2526-T7.pdf — Process Synchronization Part 2
- topic tags: sync, processes
- key sections: safety and liveness (p. 6), deadlock (p. 13), necessary conditions (p. 15), handling deadlocks (p. 18), coarse vs fine-grained locking (p. 24), lock ordering (p. 31), non-blocking variants — sem_trywait (p. 36), livelock (p. 40)

## SCOMP2526-T8.pdf — Process Synchronization Part 3
- topic tags: sync, processes, threads
- key sections: starvation (p. 5), Readers-Writers problem (p. 6), first solution & correctness guarantees (p. 10), second (writer-preference) readers-writers problem (p. 25), starvation trade-offs (p. 30), readers-writers with FIFO fairness (p. 32), read-write locks (p. 34), POSIX read-write lock API (p. 37)

## SCOMP2526-T8b.pdf — Example Problem — Linked List
- topic tags: sync, threads
- key sections: concurrent linked-list problem (p. 3), single lock (p. 7), single reader-writer lock (p. 9), multiple locks — per-node (p. 11), hand-over-hand locking (p. 13)

## SCOMP2526-T9.pdf — The Thread Abstraction
- topic tags: threads, sync, signals
- key sections: processes vs threads (p. 3), a process with multiple threads (p. 6), why multithreading (p. 8), POSIX threads interface — pthread_create/join (p. 10), threads memory model & sharing data (p. 14), shared variable analysis (p. 21), thread-safe APIs (p. 30), threads/signals interactions (p. 32), thread safety & reentrant functions (p. 35)

## SCOMP2526-T10.pdf — Thread-level Parallelism
- topic tags: threads, sync, memory
- key sections: parallel computing hardware / SMP & multicore (p. 5), cache coherency & snoopy caches (p. 10), sequential consistency (p. 16), relaxed consistency & memory barriers (p. 19), types of memory fences (p. 25), exploiting thread-level parallelism (p. 30), semaphore/mutex performance (p. 38), false sharing (p. 44), lessons learned (p. 49)

## SCOMP2526-T11.pdf — Process Scheduling Part I
- topic tags: scheduling, processes
- key sections: multitasking & process states (p. 3), I/O-bound vs CPU-bound (p. 5), dispatcher & context switching (p. 7), scheduling queues (p. 11), scheduling metrics & goals (p. 17), non-preemptive scheduling / FIFO-FCFS (p. 26), preemptive scheduling & time slice (p. 35), Round-Robin (p. 37), Linux real-time scheduling policies (p. 42)

## SCOMP2526-T12.pdf — Process Scheduling Part 2
- topic tags: scheduling, sync
- key sections: priority-based scheduling, static vs dynamic (p. 3), Shortest Job First (p. 8), Shortest Remaining Time First (p. 14), multilevel queue scheduling (p. 18), Linux core scheduler / MLFQ (p. 24), starvation & aging (p. 32), Completely Fair Scheduler (p. 35), resource sharing & priority inversion (p. 37), priority inheritance protocol (p. 44), priority ceiling protocol (p. 46)

---

# Reverse index (topic → PDFs, best deck first)

- **processes**: SCOMP2526-T3.pdf (p. 3), SCOMP2526-T5.pdf (p. 27), SCOMP2526-T11.pdf (p. 3), SCOMP2526-T1b.pdf (p. 23), SCOMP2526-T6.pdf (p. 3), SCOMP2526-T4.pdf (p. 25), SCOMP2526-T1.pdf (p. 13)
- **pipes**: SCOMP2526-T1b.pdf (p. 6 — named pipes/FIFOs listed among file types only; no deck in this set has a dedicated pipes section), SCOMP2526-T6.pdf (p. 4 — message-passing IPC model context)
- **signals**: SCOMP2526-T5.pdf (p. 41), SCOMP2526-T3.pdf (p. 36 — SIGCHLD/zombies), SCOMP2526-T9.pdf (p. 32 — threads/signals interactions)
- **threads**: SCOMP2526-T9.pdf (p. 3), SCOMP2526-T10.pdf (p. 3), SCOMP2526-T8b.pdf (p. 9), SCOMP2526-T8.pdf (p. 34 — read-write locks with pthreads)
- **sync**: SCOMP2526-T6.pdf (p. 18), SCOMP2526-T7.pdf (p. 13), SCOMP2526-T8.pdf (p. 5), SCOMP2526-T8b.pdf (p. 3), SCOMP2526-T9.pdf (p. 21), SCOMP2526-T10.pdf (p. 26), SCOMP2526-T12.pdf (p. 39 — priority inversion)
- **memory**: SCOMP2526-T4.pdf (p. 4), SCOMP2526-T6.pdf (p. 6 — shared memory), SCOMP2526-T10.pdf (p. 10 — cache coherency/consistency), SCOMP2526-T2.pdf (p. 34), SCOMP2526-T2b.pdf (p. 3)
- **scheduling**: SCOMP2526-T11.pdf (p. 3), SCOMP2526-T12.pdf (p. 3), SCOMP2526-T5.pdf (p. 27 — context switching/multitasking), SCOMP2526-T2.pdf (p. 30), SCOMP2526-T1.pdf (p. 16)
