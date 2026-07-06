<!-- track: C | order: 7 | title: Fases e cadeias — threads que se passam o testemunho | time: 45 min -->
<!-- section: teoria -->
## A variante "controlador"

Os exames de recurso gostam de uma variante do produtor-consumidor: em vez de um buffer, há **estágios** — a thread A produz algo, notifica a B, que processa e notifica a C. É uma linha de montagem de notificações, e resolve-se com o mesmo kit da lição C4: **estado + mutex + condvar por fronteira**.

A receita genérica para "quando X acontecer, a thread Y faz Z":

1. Uma variável de estado que descreve o que já aconteceu (`int prontos`, `int fase`, uma flag por item…).
2. Quem **causa** o evento: lock → atualiza estado → signal/broadcast → unlock.
3. Quem **reage**: lock → `while` (estado ainda não é o que espero) wait → reage → unlock.

Duas armadilhas específicas desta família:

- **Broadcast vs signal**: se várias threads esperam coisas DIFERENTES na mesma condvar (ex.: T2 espera itens pares, T3 ímpares), um `signal` pode acordar a errada, que re-testa o while e volta a dormir — e a certa continua a dormir! Usa `broadcast` nesses casos: acordam todas, cada `while` filtra a sua.
- **Terminação em cadeia**: a última fase só sabe parar se souber o total, OU se a fase anterior lhe passar um "acabou" (flag `fim` + broadcast). Define isto ANTES de escrever código.

No Recurso 24/25 isto apareceu como "semáforo rodoviário": uma thread controladora muda a fase (verde/vermelho) e as threads carro só avançam na fase certa — literalmente o passo 3 com `while (fase != a_minha)`.

Guia: conceito 7 · Notas do Template C (mutações b/c: ping-pong e phase-gate).

<!-- section: exercicio -->
**(PL6, ex. 13 simplificado)** Notas de SCOMP em pipeline, com **3 threads** e um array de 10 alunos `{float sprints, exame, final; int pronto, calculado;}`:

- **T1 (geradora)**: para cada aluno, gera notas aleatórias (0–20), marca `pronto=1`, e **sinaliza**.
- **T2 (calculadora)**: espera que haja um aluno `pronto` mas não `calculado`; calcula `final = 0.4*sprints + 0.6*exame`, marca `calculado=1` e sinaliza.
- **T3 (contadora)**: espera por alunos `calculado`; conta positivas (final ≥ 10) e negativas. Ao 10.º aluno contado, imprime "positivas: X, negativas: Y" e termina.

Todas as threads terminam sozinhas (total conhecido: 10). Usa UMA condvar + broadcast, ou uma condvar por fronteira — a tua escolha, mas justifica-a no papel.

[Enunciado original](/pdfs/SCOMP2526-PL6.pdf#page=5)

<!-- section: checklist -->
- Cada fronteira tem estado explícito (pronto/calculado) protegido pelo mutex
- while à volta de todos os waits, a testar o estado certo
- Escolhi signal vs broadcast conscientemente e sei justificar
- As 3 threads terminam sozinhas (total = 10 conhecido por todas)
- Contagem final bate certo com as notas geradas

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define N 10

typedef struct {
    float sprints, exame, final;
    int   pronto, calculado;
} aluno_t;

aluno_t alunos[N];
pthread_mutex_t m  = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cv = PTHREAD_COND_INITIALIZER;   /* uma condvar, broadcast */

void *gera(void *arg) {
    (void)arg;
    for (int i = 0; i < N; i++) {
        pthread_mutex_lock(&m);
        alunos[i].sprints = rand() % 21;
        alunos[i].exame   = rand() % 21;
        alunos[i].pronto  = 1;
        pthread_cond_broadcast(&cv);
        pthread_mutex_unlock(&m);
    }
    return NULL;
}

void *calcula(void *arg) {
    (void)arg;
    for (int i = 0; i < N; i++) {
        pthread_mutex_lock(&m);
        while (!alunos[i].pronto)
            pthread_cond_wait(&cv, &m);
        alunos[i].final = 0.4f * alunos[i].sprints + 0.6f * alunos[i].exame;
        alunos[i].calculado = 1;
        pthread_cond_broadcast(&cv);
        pthread_mutex_unlock(&m);
    }
    return NULL;
}

void *conta(void *arg) {
    (void)arg;
    int pos = 0, neg = 0;
    for (int i = 0; i < N; i++) {
        pthread_mutex_lock(&m);
        while (!alunos[i].calculado)
            pthread_cond_wait(&cv, &m);
        if (alunos[i].final >= 10.0f) pos++; else neg++;
        pthread_mutex_unlock(&m);
    }
    printf("positivas: %d, negativas: %d\n", pos, neg);
    return NULL;
}

int main(void) {
    srand(42);
    pthread_t t1, t2, t3;
    pthread_create(&t1, NULL, gera, NULL);
    pthread_create(&t2, NULL, calcula, NULL);
    pthread_create(&t3, NULL, conta, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    pthread_join(t3, NULL);
    pthread_mutex_destroy(&m);
    pthread_cond_destroy(&cv);
    return 0;
}
```

Escolhi UMA condvar + broadcast: T2 e T3 esperam condições diferentes (pronto vs calculado); um signal podia acordar a thread errada e deixar a certa a dormir. Como cada thread processa os alunos por ordem (índice i próprio), o estado por aluno chega. Com uma condvar por fronteira, os signals podiam ser dirigidos — também aceite no exame, umas linhas a mais.
