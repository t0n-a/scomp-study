<!-- track: C | order: 2 | title: Valores de retorno — o exit code das threads | time: 25 min -->
<!-- section: teoria -->
## Devolver resultados sem variáveis globais

Uma thread pode devolver um ponteiro ao main, via `return` (ou `pthread_exit(ptr)`), e o main recolhe-o no `pthread_join`:

```c
void *worker(void *arg) {
    int *meu_id = (int *)arg;
    if (achei)
        return meu_id;              /* devolve o ponteiro para o meu slot */
    return NULL;                    /* "não fui eu" */
}

void *ret;
pthread_join(th[i], &ret);          /* &ret: um ponteiro para ponteiro */
if (ret != NULL)
    printf("thread %d encontrou\n", *(int *)ret);
```

A regra de ouro: **devolve sempre um ponteiro para memória que sobreviva à thread** — um slot de um array do main (o mesmo `ids[]` da lição C1), uma global, ou `malloc`. **Nunca** o endereço de uma variável local da thread: a stack dela morre no return e o main leria lixo.

Repara na simetria com processos: `exit(n)` + `wait(&status)` ↔ `return ptr` + `pthread_join(th, &ret)`. A diferença é que o exit code de um processo são 8 bits; a thread devolve um ponteiro, logo qualquer coisa.

Guia: conceito 7 (JOIN).

<!-- section: exercicio -->
**(PL6, ex. 4)** Procura de um número num array de 1000 inteiros sem repetidos, com **5 threads**, cada uma responsável por 200 posições:

- Se a thread encontrar o número, imprime a posição e devolve **um ponteiro para o seu número de thread** (1–5).
- Se não encontrar, devolve `NULL`.
- O main faz join às 5 e imprime qual thread encontrou (ou "não encontrado").

Preenche o array com `v[i] = i * 3` e procura o 1500 (deve estar na posição 500 → thread 3). Depois procura um valor impossível (ex.: 1501) para testar o caminho do NULL.

[Enunciado original](/pdfs/SCOMP2526-PL6.pdf#page=1)

<!-- section: checklist -->
- Cada thread recebe o seu intervalo via struct/slot próprio (lição C1)
- O ponteiro devolvido aponta para memória do main, não para uma local da thread
- O main testa ret != NULL antes de fazer o cast
- Os dois cenários (encontrado / não encontrado) funcionam

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define N 5
#define SIZE 1000
#define SLICE (SIZE / N)

int v[SIZE];
int alvo;

typedef struct { int num; } targ_t;   /* número da thread: 1..5 */

void *procura(void *arg) {
    targ_t *t = (targ_t *)arg;
    int ini = (t->num - 1) * SLICE;
    for (int i = ini; i < ini + SLICE; i++) {
        if (v[i] == alvo) {
            printf("thread %d: encontrei na posicao %d\n", t->num, i);
            return &t->num;            /* slot do main — sobrevive à thread */
        }
    }
    return NULL;
}

int main(void) {
    for (int i = 0; i < SIZE; i++) v[i] = i * 3;
    alvo = 1500;                       /* posicao 500 → thread 3 */

    pthread_t th[N];
    targ_t args[N];
    for (int i = 0; i < N; i++) {
        args[i].num = i + 1;
        pthread_create(&th[i], NULL, procura, &args[i]);
    }

    int quem = 0;
    for (int i = 0; i < N; i++) {
        void *ret;
        pthread_join(th[i], &ret);
        if (ret != NULL)
            quem = *(int *)ret;
    }

    if (quem)
        printf("main: foi a thread %d\n", quem);
    else
        printf("main: nao encontrado\n");
    return 0;
}
```

Nota de exame: aqui não é preciso mutex — as threads só LEEM o array e escrevem cada uma no seu slot. Sincronização só é necessária quando há escrita partilhada (próxima lição).
