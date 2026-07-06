<!-- track: C | order: 5 | title: Produtor-consumidor — o Template C | time: 60 min -->
<!-- section: teoria -->
## O padrão mais provável da Q2

Estatística dos exames: **produtor-consumidor caiu mais vezes que qualquer outro padrão na Q2** (Normal 24/25, Especial 24/25, Normal 23/24…). É um buffer circular limitado entre quem produz e quem consome:

```c
int buffer[SIZE];
int in = 0, out = 0, count = 0;    /* circular: in/out avançam com % SIZE */
```

Dois invariantes, duas condvars:

- produtor só insere se `count < SIZE` → espera em **not_full**
- consumidor só remove se `count > 0` → espera em **not_empty**

```c
/* produtor */                        /* consumidor */
lock(&m);                             lock(&m);
while (count == SIZE)                 while (count == 0)
    cond_wait(&not_full, &m);             cond_wait(&not_empty, &m);
buffer[in] = item;                    item = buffer[out];
in = (in + 1) % SIZE;                 out = (out + 1) % SIZE;
count++;                              count--;
cond_signal(&not_empty);              cond_signal(&not_full);
unlock(&m);                           unlock(&m);
```

Lê as diagonais: o produtor **sinaliza not_empty** (acabou de criar dados) e o consumidor **sinaliza not_full** (acabou de criar espaço). Sinalizar a condvar errada é o erro nº 2 do exame — o nº 1 continua a ser `if` em vez de `while`.

**Terminação** (a parte que os enunciados avaliam): quando o total é conhecido (ex.: "2 produtores × 15 valores = 30"), o consumidor conta o que consome e para aos 30. Se houver vários consumidores, o main (ou o último produtor) faz `pthread_cond_broadcast(&not_empty)` no fim para acordar consumidores pendurados no wait.

Guia: conceito 6 (6.8) e 7 · Slides: [T8 — problemas clássicos](/pdfs/SCOMP2526-T8.pdf#page=1).

<!-- section: exercicio -->
**(PL6, ex. 14 = exame Normal 24/25 sem a história)** Três threads: **2 produtores + 1 consumidor**, buffer circular de **10 inteiros**, **30 valores** no total (15 por produtor):

- Cada produtor insere valores sequenciais (produtor 1: 100, 101, …; produtor 2: 200, 201, …).
- O consumidor remove e imprime cada valor, e conta até 30.
- Produtor bloqueia com buffer cheio; consumidor bloqueia com buffer vazio. Zero busy waiting.

Faz primeiro em papel a partir do esqueleto de memória (15 min), depois transcreve. O output deve ter exatamente 30 linhas e o programa deve TERMINAR sozinho (se pendura no fim, a tua terminação está errada).

[Enunciado original](/pdfs/SCOMP2526-PL6.pdf#page=6)

<!-- section: checklist -->
- Buffer circular com in/out/count e % SIZE
- while à volta dos DOIS cond_wait
- Produtor sinaliza not_empty; consumidor sinaliza not_full (as diagonais!)
- Consumidor para ao fim de 30 — o programa termina sozinho
- 30 linhas de output, sem valores repetidos nem perdidos
- mutex + 2 condvars destruídos no fim

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define SIZE 10
#define POR_PRODUTOR 15
#define TOTAL (2 * POR_PRODUTOR)

int buffer[SIZE];
int in = 0, out = 0, count = 0;

pthread_mutex_t m         = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  not_full  = PTHREAD_COND_INITIALIZER;
pthread_cond_t  not_empty = PTHREAD_COND_INITIALIZER;

void *produtor(void *arg) {
    int base = *(int *)arg;               /* 100 ou 200 */
    for (int i = 0; i < POR_PRODUTOR; i++) {
        pthread_mutex_lock(&m);
        while (count == SIZE)
            pthread_cond_wait(&not_full, &m);
        buffer[in] = base + i;
        in = (in + 1) % SIZE;
        count++;
        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&m);
    }
    return NULL;
}

void *consumidor(void *arg) {
    (void)arg;
    for (int consumidos = 0; consumidos < TOTAL; consumidos++) {
        pthread_mutex_lock(&m);
        while (count == 0)
            pthread_cond_wait(&not_empty, &m);
        int item = buffer[out];
        out = (out + 1) % SIZE;
        count--;
        pthread_cond_signal(&not_full);
        pthread_mutex_unlock(&m);
        printf("consumi %d\n", item);     /* fora do lock: item já é local */
    }
    return NULL;
}

int main(void) {
    pthread_t p1, p2, c;
    int base1 = 100, base2 = 200;
    pthread_create(&p1, NULL, produtor, &base1);
    pthread_create(&p2, NULL, produtor, &base2);
    pthread_create(&c, NULL, consumidor, NULL);

    pthread_join(p1, NULL);
    pthread_join(p2, NULL);
    pthread_join(c, NULL);

    pthread_mutex_destroy(&m);
    pthread_cond_destroy(&not_full);
    pthread_cond_destroy(&not_empty);
    printf("fim: %d valores\n", TOTAL);
    return 0;
}
```

Com UM consumidor e total conhecido, o `for` até TOTAL chega — nunca fica pendurado porque os produtores produzem exatamente TOTAL. Com VÁRIOS consumidores, cada um não sabe quantos lhe calham: usa-se um contador partilhado dentro do lock + `broadcast` final (ver variante d nas notas do Template C). No exame, escreve a versão que o enunciado pede — não compliques.
