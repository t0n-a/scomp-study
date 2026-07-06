<!-- track: C | order: 1 | title: pthreads — criar, esperar, passar argumentos | time: 30 min -->
<!-- section: teoria -->
## Threads: processos-irmãos que partilham tudo

Uma **thread** é um fluxo de execução dentro do mesmo processo: partilha o heap, as globais e os descritores com as outras threads; só a stack é própria. É por isso que threads comunicam "de borla" (basta uma variável partilhada)… e é por isso que precisam de sincronização (lições C3+).

A API mínima (compilar com `-pthread`):

```c
void *worker(void *arg) {           /* a função da thread */
    int id = *(int *)arg;           /* recebe void*, faz cast */
    printf("thread %d\n", id);
    return NULL;                    /* ou pthread_exit(ptr) */
}

pthread_t th[N];
int ids[N];                         /* um slot POR thread — ver armadilha */
for (int i = 0; i < N; i++) {
    ids[i] = i;
    pthread_create(&th[i], NULL, worker, &ids[i]);
}
for (int i = 0; i < N; i++)
    pthread_join(th[i], NULL);      /* o wait() das threads */
```

**A armadilha nº 1 de todos os exames**: passar `&i` como argumento. O `i` é UMA variável que continua a mudar no ciclo do main — quando a thread finalmente lê `*(int*)arg`, o `i` já vale outra coisa (ou o ciclo já acabou). Threads diferentes veem o mesmo valor, valores saltados, lixo. A cura é o array `ids[]`: cada thread recebe o endereço do **seu** slot, que nunca mais muda.

`pthread_join` faz duas coisas: bloqueia até a thread acabar (como `wait`) e recolhe o valor de retorno (lição C2). Um join por thread, sempre, no fim do main.

Slides: [T9 — threads](/pdfs/SCOMP2526-T9.pdf#page=1) · Guia: conceito 7 (LITE, JOIN).

<!-- section: exercicio -->
**(PL6, ex. 3)** Tens um array de 5 structs `{int numero; char nome[32]; float nota;}` preenchido no main. Implementa uma função que recebe **um elemento do array** e imprime todos os campos. Cria **5 threads**, cada uma a executar essa função **com um elemento diferente** como argumento.

Duas rondas:
1. Escreve primeiro a versão ERRADA de propósito (passa `&i`) e corre 3–4 vezes — observa os duplicados/saltos.
2. Corrige passando `&alunos[i]` e confirma que saem os 5, cada um uma vez.

[Enunciado original](/pdfs/SCOMP2526-PL6.pdf#page=1)

<!-- section: checklist -->
- A função da thread tem assinatura void *f(void *)
- O argumento é o endereço de um elemento estável (&alunos[i]), nunca &i
- 5 pthread_create + 5 pthread_join
- Vi com os meus olhos o bug do &i antes de o corrigir
- Compila com -pthread sem warnings

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define N 5

typedef struct {
    int   numero;
    char  nome[32];
    float nota;
} aluno_t;

void *imprime(void *arg) {
    aluno_t *a = (aluno_t *)arg;
    printf("numero=%d nome=%s nota=%.1f\n", a->numero, a->nome, a->nota);
    return NULL;
}

int main(void) {
    aluno_t alunos[N] = {
        { 1, "Ana",   17.5f },
        { 2, "Bruno", 12.0f },
        { 3, "Carla", 15.3f },
        { 4, "Diogo", 10.8f },
        { 5, "Eva",   19.1f },
    };

    pthread_t th[N];
    for (int i = 0; i < N; i++) {
        if (pthread_create(&th[i], NULL, imprime, &alunos[i]) != 0) {
            perror("pthread_create");
            exit(1);
        }
    }
    for (int i = 0; i < N; i++)
        pthread_join(th[i], NULL);

    return 0;
}
```

Na versão errada (`&i`), todas as threads recebem o endereço da MESMA variável do main — uma race condition de oferta antes da lição C3. `&alunos[i]` funciona porque cada endereço é distinto e o conteúdo não muda durante a vida da thread.
