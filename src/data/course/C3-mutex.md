<!-- track: C | order: 3 | title: Race conditions e o mutex | time: 35 min -->
<!-- section: teoria -->
## counter++ é uma mentira

`counter++` parece uma operação, mas a CPU faz três: **ler** da memória para um registo, **incrementar** o registo, **escrever** de volta. Se duas threads intercalarem estes passos, perde-se um incremento:

```
T1 lê 5        T2 lê 5        T1 escreve 6        T2 escreve 6   ← devia ser 7!
```

Isto é uma **race condition**: o resultado depende da ordem (aleatória) do escalonador. Com 2 threads a incrementar 1 milhão de vezes cada, o total dá quase sempre < 2 milhões — e diferente em cada execução.

A cura é a **exclusão mútua**: só uma thread de cada vez dentro da secção crítica.

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

pthread_mutex_lock(&m);
counter++;                       /* secção crítica */
pthread_mutex_unlock(&m);
...
pthread_mutex_destroy(&m);       /* no fim do main — pontos de limpeza */
```

Regras de exame:

- Secção crítica **mínima**: tranca só o acesso partilhado, não o trabalho todo (senão mata o paralelismo).
- Quem tranca destranca — **a mesma thread**, em todos os caminhos (cuidado com `return` a meio!).
- Um mutex protege **dados**, não código: "o mutex do contador", "o mutex do buffer".
- `printf` de valores partilhados também vai dentro do lock, senão imprimes valores rasgados.

Slides: [T6 — sincronização](/pdfs/SCOMP2526-T6.pdf#page=1) · Guia: conceito 6 (RACE, secção 6.1–6.2).

<!-- section: exercicio -->
Prova a race e mata-a:

1. **Versão com bug**: 2 threads, cada uma faz `for (i=0; i<1000000; i++) counter++;` sobre uma global SEM mutex. O main faz os joins e imprime o total. Corre 3 vezes — anota os 3 valores (todos errados e todos diferentes).
2. **Versão corrigida**: acrescenta o mutex à volta do incremento. Total = 2000000, sempre.

Bónus (é o PL4 ex. 2 em versão threads): porque é que a versão com bug às vezes até dá certo? O que é que isso te diz sobre testar programas concorrentes?

[Enunciado PL6](/pdfs/SCOMP2526-PL6.pdf#page=2)

<!-- section: checklist -->
- Vi totais errados e não-determinísticos na versão sem mutex
- Sei explicar o entrelaçar ler/incrementar/escrever
- lock/unlock envolvem SÓ o counter++
- pthread_mutex_destroy no fim
- Total 2000000 em 3 execuções seguidas

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define ITERS 1000000

long counter = 0;
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

void *incrementa(void *arg) {
    (void)arg;
    for (int i = 0; i < ITERS; i++) {
        pthread_mutex_lock(&m);
        counter++;
        pthread_mutex_unlock(&m);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, incrementa, NULL);
    pthread_create(&t2, NULL, incrementa, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    pthread_mutex_destroy(&m);

    printf("counter = %ld (esperado %d)\n", counter, 2 * ITERS);
    return 0;
}
```

Para a versão com bug, comenta o lock/unlock. Ela "às vezes dá certo" porque a intercalação má é probabilística — é por isso que **testar não prova correção** em concorrência; só o raciocínio sobre secções críticas prova. (E é por isso que o exame pergunta "porquê", não só "escreve".)
