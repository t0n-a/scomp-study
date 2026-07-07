<!-- topic: threads | title: Conceito 12 — Resolução Grupo II Q2: Template C (Threads / Produtor-Consumidor) passo-a-passo -->

# Conceito 12 — Resolução Grupo II Q2: Template C para Threads (Produtor-Consumidor)

## 1. Como usar esta ficha

Isto **não** é uma lição de conceitos — é o checklist que segues no dia do exame, com o livro fechado, para reproduzir o programa de threads da Q2 do Grupo II. Esta pergunta segue quase sempre uma de duas formas: **produtor-consumidor** (a mais frequente, de longe) ou **leitores-escritores**. Esta ficha cobre a template de produtor-consumidor até ao osso, e no fim tens 4 mutações mínimas para adaptar a outros enunciados (alternância estrita, portão de fases, dois consumidores).

**A estratégia**: memoriza o esqueleto de 6 blocos pela ordem em que se escreve, não o programa inteiro de uma vez. Cada bloco é curto e mecânico. Se souberes os 6 blocos e as 4 invariantes, consegues reconstruir o programa completo em qualquer enunciado que peça "produtor-consumidor com buffer partilhado".

Antes de escrever uma única linha de código no exame, **diz as 4 invariantes em voz alta** (secção 2). Isto evita 90% dos erros que tiram pontos.

---

## 2. As 4 invariantes (dizer em voz alta antes de escrever)

1. **Um mutex protege TODO o estado partilhado.** O buffer (array + `in` + `out` + `count`) é um bloco só. Nunca tocas em `in`, `out`, `count` ou em qualquer célula do array fora de `lock`/`unlock`. Se é partilhado, está debaixo do mesmo cadeado.

2. **Uma condition variable por condição diferente esperada.** Há duas condições distintas (buffer cheio vs. buffer vazio) → duas condvars: `not_full` (produtores esperam quando `count == BUFFER_SIZE`) e `not_empty` (consumidores esperam quando `count == 0`). Um mutex, mas **uma condvar por papel** — nunca partilhes uma única condvar entre produtores e consumidores, ou um sinal acorda o papel errado.

3. **`while`, nunca `if`, à volta do `cond_wait`.** Depois de `pthread_cond_wait` regressar, **repete sempre o teste da condição num `while`**: podem existir *spurious wakeups*, e outra thread do mesmo papel pode ter-te roubado a vaga/o item entretanto. `while (count == BUFFER_SIZE) cond_wait(...)` é obrigatório; um `if` é o erro clássico que tira pontos mesmo que "pareça funcionar".

4. **Terminação depende de conheceres o total à partida.** Se o número total de itens é conhecido (`N_PRODUCERS * ITEMS_PER_PRODUCER`), compara um contador partilhado `items_consumed` contra esse total — é a opção mais segura e simples no exame. O **poison pill** (um item "stop" por consumidor) só se justifica quando o total **não** é conhecido à partida — menciona este trade-off se o enunciado o sugerir.

**Nota**: as duas desigualdades `count < BUFFER_SIZE` (para produzir) e `count > 0` (para consumir) **são** o problema todo de sincronização. O resto é canalização (plumbing).

---

## 3. O esqueleto em 6 blocos, pela ordem em que se escreve

### ① Defines + struct + estado global + mutex + 2 condvars

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>

#define N_PRODUCERS         2
#define N_CONSUMERS         1
#define BUFFER_SIZE         10
#define ITEMS_PER_PRODUCER  40
#define TOTAL_ITEMS         (N_PRODUCERS * ITEMS_PER_PRODUCER)

typedef struct {
    int producer_id;
    int seq_number;
    int value;
} item_t;

/* Estado partilhado — TUDO protegido pelo mesmo mutex */
item_t buffer[BUFFER_SIZE];
int in = 0;              /* próxima posição livre para ESCREVER */
int out = 0;              /* próxima posição cheia para LER */
int count = 0;            /* nº de itens atualmente no buffer */
int items_consumed = 0;   /* contador de terminação */

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full  = PTHREAD_COND_INITIALIZER;  /* produtores esperam aqui */
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;  /* consumidores esperam aqui */
```

☑️ Checklist:
- [ ] `item_t` tem tudo o que o enunciado pede identificar (id do produtor, sequência, valor)
- [ ] `in`, `out`, `count`, `items_consumed` são globais (não locais a nenhuma função)
- [ ] Um único mutex, inicializado estaticamente com `PTHREAD_MUTEX_INITIALIZER`
- [ ] Duas condvars, cada uma com o nome do papel que **espera** nela (`not_full` = quem quer meter espera; `not_empty` = quem quer tirar espera)

---

### ② Produtor

```c
void *producer(void *arg) {
    int id = *((int *) arg);

    for (int seq = 0; seq < ITEMS_PER_PRODUCER; seq++) {
        item_t it;
        it.producer_id = id;
        it.seq_number  = seq;
        it.value       = id * 1000 + seq;

        pthread_mutex_lock(&mutex);
        while (count == BUFFER_SIZE)
            pthread_cond_wait(&not_full, &mutex);

        buffer[in] = it;
        in = (in + 1) % BUFFER_SIZE;
        count++;

        printf("Producer %d: produced seq=%d value=%d (count=%d)\n",
               id, it.seq_number, it.value, count);

        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&mutex);

        usleep(1000);
    }
    pthread_exit(NULL);
}
```

☑️ Checklist:
- [ ] `lock` antes de testar `count`
- [ ] `while (count == BUFFER_SIZE)` — não `if`
- [ ] escreve em `buffer[in]`, avança `in` com módulo, incrementa `count` — os 3 sempre juntos
- [ ] `signal(&not_empty)` **dentro** do lock, logo a seguir a mudar o estado
- [ ] `unlock` só depois do signal
- [ ] `usleep` (se existir) fica **fora** da secção crítica

---

### ③ Consumidor

```c
void *consumer(void *arg) {
    int id = *((int *) arg);

    for (;;) {
        pthread_mutex_lock(&mutex);
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

        printf("Consumer %d: consumed producer=%d seq=%d value=%d (count=%d, total consumed=%d)\n",
               id, it.producer_id, it.seq_number, it.value, count, items_consumed);

        pthread_cond_signal(&not_full);

        if (items_consumed == TOTAL_ITEMS)
            pthread_cond_broadcast(&not_empty);

        pthread_mutex_unlock(&mutex);
    }
    pthread_exit(NULL);
}
```

☑️ Checklist:
- [ ] `while (count == 0 && items_consumed < TOTAL_ITEMS)` — a condição de espera **inclui** a condição de paragem
- [ ] logo a seguir ao `while`, testa `items_consumed >= TOTAL_ITEMS` outra vez e sai com `unlock` + `break` (sem consumir nada)
- [ ] lê de `buffer[out]`, avança `out` com módulo, decrementa `count`, incrementa `items_consumed` — sempre juntos
- [ ] `signal(&not_full)` sempre que consome
- [ ] `broadcast(&not_empty)` **só** quando `items_consumed == TOTAL_ITEMS` (acorda todos os consumidores adormecidos que nunca mais teriam itens)
- [ ] `unlock` no fim de cada iteração do `for(;;)`

---

### ④ Terminação: contador vs. poison pill

```c
/* Opção A (usada acima) — total conhecido à partida: */
while (count == 0 && items_consumed < TOTAL_ITEMS)
    pthread_cond_wait(&not_empty, &mutex);
if (items_consumed >= TOTAL_ITEMS) { pthread_mutex_unlock(&mutex); break; }

/* Opção B — total desconhecido: poison pill (um item "stop" por consumidor) */
/* cada produtor, no fim, mete N_CONSUMERS itens especiais no buffer;
   cada consumidor, ao ler um item "stop", sai do loop — mas exige
   um campo extra no item_t (ex.: is_stop) e mais cuidado na contagem. */
```

☑️ Checklist:
- [ ] Se o enunciado dá números fixos (nº de produtores × itens por produtor) → usa **sempre** o contador (Opção A), é mais simples e menos código
- [ ] Só uses poison pill se o enunciado disser explicitamente "produção infinita/desconhecida" ou pedir explicitamente esse mecanismo

---

### ⑤ main — arrays de id (nunca `&i`), criar TODOS, join TODOS

```c
int main(void) {
    pthread_t p_tid[N_PRODUCERS], c_tid[N_CONSUMERS];
    int p_id[N_PRODUCERS], c_id[N_CONSUMERS];
    int i;

    /* criar TODOS os produtores primeiro */
    for (i = 0; i < N_PRODUCERS; i++) {
        p_id[i] = i;
        pthread_create(&p_tid[i], NULL, producer, &p_id[i]);
    }
    /* depois TODOS os consumidores */
    for (i = 0; i < N_CONSUMERS; i++) {
        c_id[i] = i;
        pthread_create(&c_tid[i], NULL, consumer, &c_id[i]);
    }

    /* join na mesma ordem */
    for (i = 0; i < N_PRODUCERS; i++)
        pthread_join(p_tid[i], NULL);
    for (i = 0; i < N_CONSUMERS; i++)
        pthread_join(c_tid[i], NULL);

    printf("main: done. total consumed = %d (expected %d)\n",
           items_consumed, TOTAL_ITEMS);

    pthread_mutex_destroy(&mutex);
    pthread_cond_destroy(&not_full);
    pthread_cond_destroy(&not_empty);

    return (items_consumed == TOTAL_ITEMS) ? 0 : 1;
}
```

☑️ Checklist:
- [ ] `p_id[N_PRODUCERS]` e `c_id[N_CONSUMERS]` são **arrays**, um endereço estável por thread — **nunca** passar `&i` (a variável de loop muda antes da thread ler o valor)
- [ ] cria **todos** os produtores, depois **todos** os consumidores (ordem não é crítica para correção, mas é a convenção do template)
- [ ] junta (`join`) todos, na mesma ordem em que foram criados
- [ ] `return` reflete se a terminação foi limpa (`items_consumed == TOTAL_ITEMS`)

---

### ⑥ Cleanup

```c
pthread_mutex_destroy(&mutex);
pthread_cond_destroy(&not_full);
pthread_cond_destroy(&not_empty);
/* buffer é array estático — nada a fazer free() */
```

☑️ Checklist:
- [ ] destruir o mutex e **as duas** condvars
- [ ] não há `free()` a fazer — o buffer é um array estático, não alocado em heap

---

### Programa completo anotado (para ler de fio a pavio)

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>

#define N_PRODUCERS         2
#define N_CONSUMERS         1
#define BUFFER_SIZE         10
#define ITEMS_PER_PRODUCER  40
#define TOTAL_ITEMS         (N_PRODUCERS * ITEMS_PER_PRODUCER)

typedef struct {
    int producer_id;
    int seq_number;
    int value;
} item_t;

item_t buffer[BUFFER_SIZE];
int in = 0;
int out = 0;
int count = 0;
int items_consumed = 0;

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full  = PTHREAD_COND_INITIALIZER;
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;

void *producer(void *arg) {
    int id = *((int *) arg);

    for (int seq = 0; seq < ITEMS_PER_PRODUCER; seq++) {
        item_t it;
        it.producer_id = id;
        it.seq_number  = seq;
        it.value       = id * 1000 + seq;

        pthread_mutex_lock(&mutex);
        while (count == BUFFER_SIZE)
            pthread_cond_wait(&not_full, &mutex);

        buffer[in] = it;
        in = (in + 1) % BUFFER_SIZE;
        count++;

        printf("Producer %d: produced seq=%d value=%d (count=%d)\n",
               id, it.seq_number, it.value, count);

        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&mutex);

        usleep(1000);
    }
    pthread_exit(NULL);
}

void *consumer(void *arg) {
    int id = *((int *) arg);

    for (;;) {
        pthread_mutex_lock(&mutex);
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

        printf("Consumer %d: consumed producer=%d seq=%d value=%d (count=%d, total consumed=%d)\n",
               id, it.producer_id, it.seq_number, it.value, count, items_consumed);

        pthread_cond_signal(&not_full);

        if (items_consumed == TOTAL_ITEMS)
            pthread_cond_broadcast(&not_empty);

        pthread_mutex_unlock(&mutex);
    }
    pthread_exit(NULL);
}

int main(void) {
    pthread_t p_tid[N_PRODUCERS], c_tid[N_CONSUMERS];
    int p_id[N_PRODUCERS], c_id[N_CONSUMERS];
    int i;

    for (i = 0; i < N_PRODUCERS; i++) {
        p_id[i] = i;
        pthread_create(&p_tid[i], NULL, producer, &p_id[i]);
    }
    for (i = 0; i < N_CONSUMERS; i++) {
        c_id[i] = i;
        pthread_create(&c_tid[i], NULL, consumer, &c_id[i]);
    }

    for (i = 0; i < N_PRODUCERS; i++)
        pthread_join(p_tid[i], NULL);
    for (i = 0; i < N_CONSUMERS; i++)
        pthread_join(c_tid[i], NULL);

    printf("main: done. total consumed = %d (expected %d)\n",
           items_consumed, TOTAL_ITEMS);

    pthread_mutex_destroy(&mutex);
    pthread_cond_destroy(&not_full);
    pthread_cond_destroy(&not_empty);

    return (items_consumed == TOTAL_ITEMS) ? 0 : 1;
}
```

---

## 4. Signal vs. broadcast (a regra)

- O produtor acabou de meter **um** item no buffer → no máximo **um** consumidor adormecido pode avançar → `pthread_cond_signal(&not_empty)`.
- O consumidor acabou de libertar **uma** vaga → no máximo **um** produtor adormecido pode avançar → `pthread_cond_signal(&not_full)`.
- **Broadcast só quando uma mudança de estado desbloqueia potencialmente MUITOS à vez.** Assim que `items_consumed == TOTAL_ITEMS`, todos os consumidores adormecidos em `not_empty` estão à espera de itens que **nunca mais vão chegar** — nesse exato momento fazes `pthread_cond_broadcast(&not_empty)` para que **todos** acordem, testem de novo a condição de paragem, e saiam. Se só sinalizasses um, os restantes ficavam bloqueados para sempre.

---

## 5. Tabela: quem espera onde, quem acorda quem

| Papel | Espera em | Condição de espera (`while`) | Depois de agir, sinaliza |
|---|---|---|---|
| Produtor | `not_full` | `count == BUFFER_SIZE` | `signal(&not_empty)` (produziu 1 item) |
| Consumidor | `not_empty` | `count == 0 && items_consumed < TOTAL_ITEMS` | `signal(&not_full)`; e `broadcast(&not_empty)` só quando `items_consumed == TOTAL_ITEMS` |

---

## 6. Mutações de exame (diff mínimo)

### (a) Versão com semáforos (empty/full/mutex)

Usa quando o enunciado não exige explicitamente `pthread_cond_*` — poupa código.

```c
sem_t *mutex = sem_open("/mx", O_CREAT, 0644, 1);
sem_t *empty = sem_open("/empty", O_CREAT, 0644, BUFFER_SIZE);
sem_t *full  = sem_open("/full",  O_CREAT, 0644, 0);

/* produtor */
sem_wait(empty); sem_wait(mutex);
buf[in] = item; in = (in + 1) % BUFFER_SIZE;
sem_post(mutex); sem_post(full);

/* consumidor */
sem_wait(full); sem_wait(mutex);
item = buf[out]; out = (out + 1) % BUFFER_SIZE;
sem_post(mutex); sem_post(empty);
```

**Regra fixa**: o semáforo de contagem vem **sempre antes** do mutex, dos dois lados — trocar a ordem causa deadlock (um produtor que fica com o lock do buffer e adormece à espera de `empty` bloqueia o consumidor que libertaria uma vaga). Cleanup: `sem_close` + `sem_unlink` de cada nome. A terminação continua a precisar do contador conhecido (ou poison pill).

*Quando usar*: enunciado pede semáforos nomeados/POSIX em vez de condvars.

### (b) Alternância estrita / ping-pong (2 threads, variável `turn`)

Sem buffer nenhum — um único item de cada vez, entregue estritamente (padrão do Recurso 23/24: T1 gera uma pontuação, T2 calcula o resultado final, 300 itens).

```c
int turn = 0; /* 0 = T1, 1 = T2 */
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;

/* T1 */
for (i = 0; i < 300; i++) {
    pthread_mutex_lock(&mutex);
    while (turn != 0) pthread_cond_wait(&cond, &mutex);
    shared_score = generate();
    turn = 1;
    pthread_cond_broadcast(&cond);
    pthread_mutex_unlock(&mutex);
}

/* T2 */
for (i = 0; i < 300; i++) {
    pthread_mutex_lock(&mutex);
    while (turn != 1) pthread_cond_wait(&cond, &mutex);
    final = compute(shared_score);
    turn = 0;
    pthread_cond_broadcast(&cond);
    pthread_mutex_unlock(&mutex);
}
```

`count`/`in`/`out` desaparecem — `turn` **é** todo o estado de sincronização. Usa `broadcast` mesmo com só 2 threads: não custa nada com uma única condvar partilhada e evita um bug se alguém acrescentar uma terceira thread depois.

*Quando usar*: dois papéis que alternam estritamente, um item de cada vez, sem fila.

### (c) Portão de fases (carros/peões alternam a cada 5 travessias)

Padrão do Recurso 24/25: `phase` (0=CARROS, 1=PEÕES) + contador de travessias na fase atual + uma única condvar para os dois papéis.

```c
int phase = 0;               /* 0 = CARS, 1 = PEDS */
int crossings_this_phase = 0;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;

/* thread de um carro ou de um peão, role = 0 ou 1 */
pthread_mutex_lock(&mutex);
while (phase != role) pthread_cond_wait(&cond, &mutex);
crossings_this_phase++;
printf("crossing...\n");
if (crossings_this_phase == 5) {
    phase = 1 - phase;
    crossings_this_phase = 0;
    pthread_cond_broadcast(&cond);
}
pthread_mutex_unlock(&mutex);
```

`broadcast` é **obrigatório** aqui: trocar a fase muda qual o **grupo inteiro** que pode passar. Uma thread controladora separada é opcional — deixar o 5º a atravessar trocar a fase é a versão mais simples e segura para o exame; só acrescentes um controlador se o enunciado o exigir explicitamente.

*Quando usar*: dois grupos que se revezam em blocos de N, sem fila de itens.

### (d) Dois consumidores com papéis diferentes sobre o mesmo stream

Padrão do Especial 24/25: um logger consome tudo, uma thread de alerta só quer os urgentes. **A resposta mais simples é não dividir a fila** — mantém **um só** loop de consumidor e chama `if (is_urgent(item)) print_alert(item);` logo a seguir a fazer log. Um buffer, um par de condvars, zero sincronização extra.

```c
/* dentro do consumidor único, depois de tirar o item do buffer: */
log_item(it);
if (is_urgent(it))
    print_alert(it);
```

Só esboces um segundo buffer mais pequeno + segundo par de condvars, alimentado pelo primeiro consumidor, **se** o enunciado exigir estruturalmente uma thread separada.

*Quando usar*: um enunciado que parece pedir "dois consumidores" mas na prática só precisa de um filtro dentro do mesmo consumidor.

---

## 7. Top 5 erros que tiram pontos

1. **`if` em vez de `while` à volta do `pthread_cond_wait`.** Perdes pontos mesmo que "pareça funcionar" na prática — spurious/stale wakeups são exatamente o que o `while` protege.
2. **Ordem do signal relativamente ao unlock.** Qualquer ordem é tecnicamente correta com `pthread_cond_*`, desde que o signal aconteça **enquanto ainda tens o mutex** que protege o estado que mudaste. Faz o signal **dentro** do lock, logo a seguir a atualizar `count`/`in`/`out`, e só depois `unlock`. Não faças `unlock` primeiro "para ser mais seguro" — isso só abre uma janela de corrida sem benefício nenhum.
3. **Esquecer o `signal(&not_full)` depois de consumir (ou `signal(&not_empty)` depois de produzir).** O estado do buffer mudou mas ninguém bloqueado na outra condvar é avisado — um produtor com o buffer cheio ou um consumidor com o buffer vazio adormece para sempre mesmo com a condição já satisfeita.
4. **Deadlock por esperar enquanto seguras um segundo lock** (nas variantes de dois buffers/alertas). Mantém o âmbito do lock de um buffer autocontido; nunca sejas bloqueado em `mutex` enquanto ainda seguras `alert_mutex`.
5. **Consumidores que ficam à espera para sempre no fim.** Se a terminação é por contador e te esqueceres do `broadcast` quando o total é atingido, um consumidor adormecido em `not_empty` nunca acorda; o programa fica pendurado, o `timeout 10` do exame mata-o, e perdes os pontos de "terminação limpa".

---

## 8. Drill de memorização

Repete de memória, expandindo cada bloco:

```
DEFINES/ESTADO
   → PRODUTOR (lock, while-cheio, escreve, signal)
   → CONSUMIDOR (lock, while-vazio+fim, lê, signal)
   → TERMINAR (contador, broadcast)
   → MAIN (ids, create-all, join-all)
   → CLEANUP (destroy)
```

Para cada palavra da linha, força-te a escrever o código correspondente sem olhar para trás. Se travares num bloco, volta à secção 3 correspondente, não ao programa completo — o objetivo é automatizar cada bloco individualmente.
