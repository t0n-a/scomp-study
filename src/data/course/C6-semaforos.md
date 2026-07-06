<!-- track: C | order: 6 | title: Semáforos — o plano B (e o ping-pong) | time: 40 min -->
<!-- section: teoria -->
## Um contador que bloqueia

Um **semáforo** é um contador não-negativo com duas operações atómicas:

- `sem_wait(&s)` — tenta decrementar; se o valor é 0, **bloqueia** até alguém incrementar
- `sem_post(&s)` — incrementa e acorda um bloqueado, se houver

```c
#include <semaphore.h>
sem_t s;
sem_init(&s, 0, VALOR_INICIAL);   /* 2.º arg 0 = entre threads */
sem_wait(&s);  /* "tirar uma ficha" */
sem_post(&s);  /* "devolver uma ficha" */
sem_destroy(&s);
```

O valor inicial define o papel:

- **init 1** → mutex dos pobres (wait = lock, post = unlock)
- **init 0** → **sinalização**: quem faz wait espera por um "podes ir" de quem faz post. Ao contrário das condvars, **um post nunca se perde** — fica guardado no contador. Não precisa de variável de estado nem de while!
- **init N** → no máximo N em simultâneo (ex.: 5 lugares no parque)

A diferença crucial vs mutex: **um semáforo pode ser "destrancado" por outra thread** — é exatamente isso que torna a sinalização possível (e é por isso que usar um MUTEX para sinalizar entre threads é indefinido; se o enunciado pede alternância entre threads, a resposta é semáforos ou condvars, nunca unlock de um mutex alheio).

O padrão **ping-pong estrito** (caiu no Recurso 23/24!): dois semáforos, um por jogador, um deles começa a 1:

```c
sem_init(&vez_ping, 0, 1);      /* ping começa */
sem_init(&vez_pong, 0, 0);
/* ping: sem_wait(&vez_ping); joga; sem_post(&vez_pong); */
/* pong: sem_wait(&vez_pong); joga; sem_post(&vez_ping); */
```

Slides: [T6 — semáforos](/pdfs/SCOMP2526-T6.pdf#page=26) · Guia: conceito 6 (6.6–6.7, SEMA).

<!-- section: exercicio -->
**(PL5, ex. 6, em versão threads)** Duas threads escrevem **10 mensagens alternadas**, começando SEMPRE na thread A:

```
A: mensagem 1 / B: mensagem 1 / A: mensagem 2 / B: mensagem 2 / ...
```

Usa dois semáforos (um a 1, outro a 0) e NENHUM mutex/condvar. Corre 5 vezes — a ordem tem de ser perfeita todas as vezes.

Compara com o ping-pong da lição C4 (condvars): mesmo problema, duas ferramentas. Qual tem menos linhas? Qual precisou de variável de estado? (No exame, escolhe a que o enunciado sugerir; em caso de dúvida, semáforos são mais curtos para alternância.)

[Enunciado original](/pdfs/SCOMP2526-PL5.pdf#page=2)

<!-- section: checklist -->
- sem_init com os valores certos (1 e 0) e 2.º argumento 0
- Cada thread: wait no SEU semáforo, post no do OUTRO
- Sem mutex, sem condvar, sem variável de vez — e mesmo assim alterna
- Sei explicar porque é que aqui não é preciso while (o post fica guardado no contador)
- sem_destroy no fim

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>

#define RONDAS 10

sem_t vez_a, vez_b;

void *thread_a(void *arg) {
    (void)arg;
    for (int i = 1; i <= RONDAS; i++) {
        sem_wait(&vez_a);
        printf("A: mensagem %d\n", i);
        sem_post(&vez_b);
    }
    return NULL;
}

void *thread_b(void *arg) {
    (void)arg;
    for (int i = 1; i <= RONDAS; i++) {
        sem_wait(&vez_b);
        printf("B: mensagem %d\n", i);
        sem_post(&vez_a);
    }
    return NULL;
}

int main(void) {
    sem_init(&vez_a, 0, 1);      /* A tem a primeira ficha */
    sem_init(&vez_b, 0, 0);

    pthread_t a, b;
    pthread_create(&a, NULL, thread_a, NULL);
    pthread_create(&b, NULL, thread_b, NULL);
    pthread_join(a, NULL);
    pthread_join(b, NULL);

    sem_destroy(&vez_a);
    sem_destroy(&vez_b);
    return 0;
}
```

Sem `while` porque o semáforo tem memória: se B faz post antes de A chegar ao wait, a ficha fica no contador à espera. Nas condvars um sinal sem ninguém à escuta evapora-se — daí precisarem da variável de estado + while. Esta é A pergunta teórica de comparação que os exames adoram.
