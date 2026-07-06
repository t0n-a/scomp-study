<!-- track: C | order: 4 | title: Condition variables — esperar sem queimar CPU | time: 40 min -->
<!-- section: teoria -->
## "Acorda-me quando isto mudar"

O mutex resolve *acesso simultâneo*, mas não resolve *espera por uma condição* ("o buffer tem espaço?", "já há dados?"). Esperar num `while` a testar (busy waiting) queima CPU e é proibido pelos enunciados. A ferramenta certa: **condition variable**, sempre em par com um mutex.

```c
pthread_mutex_t m   = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cv  = PTHREAD_COND_INITIALIZER;

/* quem espera */
pthread_mutex_lock(&m);
while (!condicao)                    /* WHILE. Nunca if. */
    pthread_cond_wait(&cv, &m);      /* liberta m, dorme; ao acordar re-tranca m */
/* ... usar o estado, condicao é verdadeira e tenho o lock ... */
pthread_mutex_unlock(&m);

/* quem muda o estado */
pthread_mutex_lock(&m);
condicao = 1;
pthread_cond_signal(&cv);            /* acorda UMA thread à espera */
pthread_mutex_unlock(&m);
```

Os três mandamentos (perguntados diretamente em exames!):

1. **`while`, nunca `if`**, à volta do `cond_wait` — a thread pode acordar sem razão (*spurious wakeup*) ou outra thread pode ter "roubado" a condição entre o acordar e o re-lock. Ao acordar, re-testa. (Guia 7.4: acrónimo WAIT.)
2. **`cond_wait` só com o mutex trancado** — ele liberta o mutex atomicamente ao adormecer e volta a trancá-lo ao acordar. É esta atomicidade que impede perder o sinal.
3. **`signal` acorda uma, `broadcast` acorda todas.** Usa broadcast quando threads diferentes esperam por condições diferentes na MESMA condvar, ou para libertar toda a gente no fim (terminação).

Um sinal emitido quando ninguém espera **perde-se** — por isso o estado (a variável `condicao`) é obrigatório; a condvar sozinha não guarda memória.

Slides: [T9](/pdfs/SCOMP2526-T9.pdf#page=1) · Guia: conceito 7 (7.4, o dilema while vs if).

<!-- section: exercicio -->
Ping-pong com condvar: duas threads imprimem alternadamente, 5 vezes cada:

```
ping 1 / pong 1 / ping 2 / pong 2 / ...
```

Estado partilhado: `int vez` (0 = ping, 1 = pong). Cada thread: tranca, `while (vez != minha) cond_wait`, imprime, troca a `vez`, `signal`, destranca. O main faz os joins e imprime "fim".

Teste de fogo: troca o `while` por `if` e o `signal` por `broadcast` ao mesmo tempo — o programa deixa de garantir alternância? Porquê? (Pista: com if, um spurious wakeup imprime fora de vez.)

<!-- section: checklist -->
- while (não if) à volta do cond_wait — e sei citar as DUAS razões
- cond_wait chamado com o mutex trancado
- O estado (vez) muda ANTES do signal, dentro do lock
- Output perfeitamente alternado em várias execuções
- mutex e condvar destruídos no fim

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define RONDAS 5

int vez = 0;                              /* 0 = ping, 1 = pong */
pthread_mutex_t m  = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cv = PTHREAD_COND_INITIALIZER;

typedef struct { int minha; const char *nome; } targ_t;

void *jogador(void *arg) {
    targ_t *t = (targ_t *)arg;
    for (int r = 1; r <= RONDAS; r++) {
        pthread_mutex_lock(&m);
        while (vez != t->minha)           /* WHILE: re-testa ao acordar */
            pthread_cond_wait(&cv, &m);
        printf("%s %d\n", t->nome, r);
        vez = 1 - t->minha;               /* muda o estado... */
        pthread_cond_signal(&cv);         /* ...e só depois sinaliza */
        pthread_mutex_unlock(&m);
    }
    return NULL;
}

int main(void) {
    pthread_t a, b;
    targ_t ping = { 0, "ping" }, pong = { 1, "pong" };
    pthread_create(&a, NULL, jogador, &ping);
    pthread_create(&b, NULL, jogador, &pong);
    pthread_join(a, NULL);
    pthread_join(b, NULL);
    pthread_mutex_destroy(&m);
    pthread_cond_destroy(&cv);
    printf("fim\n");
    return 0;
}
```

Com `if` + `broadcast`: ambas acordam, a primeira a apanhar o mutex joga (bem), mas a segunda — que com `if` NÃO re-testa — joga logo a seguir mesmo sem ser a vez dela. O `while` é o que a manda de volta a dormir. Este mini-programa é o núcleo do produtor-consumidor da próxima lição.
