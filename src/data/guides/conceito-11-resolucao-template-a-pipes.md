<!-- topic: pipes | title: Conceito 11 — Resolução Grupo II Q1: Template A (Pipes) passo-a-passo -->

# Conceito 11 — Resolução Grupo II Q1: Template A (Pipes), passo-a-passo

---

## 0. Como usar esta ficha

Isto **não** é uma lição de conceitos — é a ficha de resolução. A Q1 do Grupo II do exame SCOMP é, ano após ano, a **mesma forma**: N processos filho (clientes) que falam com o processo pai (servidor) através de pipes, trocando um pedido por uma resposta. Muda o enredo (bilhetes de museu, encomendas, sensores, mesas de restaurante...), mas o **esqueleto do código é sempre este**.

A estratégia de estudo é: memorizar o esqueleto em 6 blocos, pela ordem em que se escreve no papel, e treinar a decorar apenas os **nomes** que mudam (a struct do pedido, a struct da resposta, o que o pai faz quando recebe um pedido). Se souberes este ficheiro de cor, sabes resolver a Q1.

Usa o "Drill de memorização" (secção 8) como o teu cábula de última hora antes de entrares na sala de exame.

---

## 1. Modelo mental numa linha

```
pedidos:   N filhos ──▶ [ 1 pipe partilhado ] ──▶ pai
respostas: pai ──▶ [ 1 pipe privado por filho i ] ──▶ filho i
```

**Porquê esta forma e não outra?**

> Muitos **escritores** no mesmo pipe é seguro (escritas menores que `PIPE_BUF` são atómicas — o kernel não intercala os bytes de duas escritas concorrentes).
> Muitos **leitores** no mesmo pipe **não** é utilizável — não controlas qual dos filhos vai "roubar" a resposta que era para outro. Por isso as respostas viajam por **pipes privados**, um por filho.

Consequência direta: a struct do pedido **tem de** identificar quem pediu (`child_index`), porque é a única forma do pai saber para que pipe de resposta deve escrever.

---

## 2. O esqueleto em 6 blocos, pela ordem em que se escreve

### ① Structs

```c
#define N_SCANNERS      3
#define N_TICKETS       5
#define REQS_PER_CHILD  2

typedef struct {
    int child_index;   // CHAVE DE ROTEAMENTO — obrigatório
    int ticket_id;
} request_t;

typedef struct {
    int  id;
    char event_name[32];
    int  valid;
} ticket_t;
```

☑️ A struct do pedido tem sempre um campo tipo `child_index` (ou `client_id`, `origem`, etc.) — é o que permite ao pai saber a quem responder.
☑️ Confirma de cabeça que `sizeof(request_t)` e `sizeof(ticket_t)` são bem menores que `PIPE_BUF` (normalmente 4096 no Linux) — garante escrita atómica.
☑️ Não mandes campos individuais (ex.: só o `int ticket_id`) quando a resposta é uma struct composta — manda sempre a struct inteira de uma vez.

---

### ② Declarar + criar TODOS os pipes antes de qualquer fork

```c
int req_fd[2];                    // partilhado: filhos -> pai
int reply_fd[N_SCANNERS][2];      // privado: pai -> filho i
pid_t pids[N_SCANNERS];
int i, j;

ticket_t db[N_TICKETS] = { /* ... pré-preenchido, só existe no pai ... */ };

if (pipe(req_fd) == -1) { perror("pipe req_fd"); exit(EXIT_FAILURE); }

for (i = 0; i < N_SCANNERS; i++) {
    if (pipe(reply_fd[i]) == -1) { perror("pipe reply_fd"); exit(EXIT_FAILURE); }
}
```

☑️ **Todos** os `pipe()` são chamados **antes** do ciclo de `fork()` — sem exceções.
☑️ Cada `pipe()` tem o seu `perror()` + `exit()` imediato ao lado — não deixes isto para depois.
☑️ A base de dados (`db`) só faz sentido existir no processo pai; não precisa de pipe próprio, é acedida diretamente pelo pai quando serve os pedidos.

---

### ③ Ciclo de fork

```c
for (i = 0; i < N_SCANNERS; i++) {
    pids[i] = fork();
    if (pids[i] == -1) { perror("fork"); exit(EXIT_FAILURE); }

    if (pids[i] == 0) {
        // ---- CÓDIGO DO FILHO i (bloco ④) ----
    }
}
// se chegámos aqui, estamos sempre no PAI (os filhos fazem exit() lá dentro)
```

☑️ Guarda sempre o `pid_t` de cada filho em `pids[i]` — precisas dele no `waitpid()` do bloco ⑥.
☑️ Verifica o `-1` do `fork()` antes de testares `== 0`.
☑️ O código do filho tem de terminar em `exit()` dentro do `if (pids[i] == 0)`, senão o filho continua a executar o resto do ciclo de fork e faz forks a mais.

---

### ④ Filho i — fechos primeiro, depois trabalho

```c
if (pids[i] == 0) {
    request_t req;
    ticket_t  reply;

    // --- higiene de descritores: fechar TUDO o que não é meu ---
    close(req_fd[0]);                 // filho nunca lê pedidos
    for (j = 0; j < N_SCANNERS; j++) {
        if (j != i) close(reply_fd[j][0]);
        close(reply_fd[j][1]);
    }
    // fica com: req_fd[1] e reply_fd[i][0]

    for (j = 0; j < REQS_PER_CHILD; j++) {
        req.child_index = i;
        req.ticket_id   = (i + j) % N_TICKETS;

        write(req_fd[1], &req, sizeof(request_t));
        read(reply_fd[i][0], &reply, sizeof(ticket_t));

        printf("Scanner %d (PID %d): ticket %d '%s' -> %s\n",
               i, getpid(), reply.id, reply.event_name,
               reply.valid ? "VALID" : "NOT VALID");
    }

    close(req_fd[1]);        // liberta a ponta de escrita — contribui para o EOF do pai
    close(reply_fd[i][0]);
    exit(EXIT_SUCCESS);
}
```

☑️ Os `close()` são a **primeira** coisa a acontecer no corpo do filho, antes de qualquer `write`/`read`.
☑️ O filho fecha `reply_fd[j][*]` de **todos** os outros filhos (`j != i`), e as duas pontas — só guarda a leitura da sua própria.
☑️ Escreve pedido, lê resposta, imprime — sempre este trio, sempre com `sizeof(tipo)` a condizer nos dois lados.
☑️ No fim do ciclo: fecha `req_fd[1]` (a sua cópia da escrita partilhada) e `reply_fd[i][0]` (a sua leitura privada), depois `exit()`.

---

### ⑤ Pai — fechos primeiro, depois ciclo de serviço

```c
request_t req;

close(req_fd[1]);                 // CRÍTICO — ver Regra do EOF
for (i = 0; i < N_SCANNERS; i++) {
    close(reply_fd[i][0]);
}
// fica com: req_fd[0] e todos os reply_fd[i][1]

while (read(req_fd[0], &req, sizeof(request_t)) > 0) {
    write(reply_fd[req.child_index][1], &db[req.ticket_id], sizeof(ticket_t));
}
```

☑️ `close(req_fd[1])` é feito logo no início do bloco do pai — se te esqueceres disto, o `while(read(...) > 0)` do pai **nunca** vê EOF (o próprio pai é um escritor "vivo" nesse pipe) e o programa fica pendurado para sempre.
☑️ O pai fecha as leituras de todas as réplicas (`reply_fd[i][0]`) — ele só escreve nelas, nunca lê.
☑️ O ciclo de serviço é sempre `while (read(...) > 0) { ...routing... }` — nunca precisas de `select()` nem de round-robin manual: um único `read()` bloqueante já serializa os pedidos pela ordem de chegada, porque o kernel enfileira escritas atómicas concorrentes.
☑️ O routing é sempre `write(reply_fd[req.child_index][1], &db[req.ticket_id], sizeof(ticket_t))` — usa o campo de rotas do pedido para escolher o pipe de resposta certo.

---

### ⑥ Encerramento (close + waitpid)

```c
close(req_fd[0]);
for (i = 0; i < N_SCANNERS; i++) {
    close(reply_fd[i][1]);
}

for (i = 0; i < N_SCANNERS; i++) {
    waitpid(pids[i], NULL, 0);
}

printf("Parent: all scanners finished.\n");
return 0;
```

☑️ O `while` já terminou (chegou EOF) antes de chegares aqui — a pipe está drenada.
☑️ Fecha tudo o resto que o pai ainda tinha aberto: `req_fd[0]` e todos os `reply_fd[i][1]`.
☑️ Só depois de fechar é que fazes o `waitpid()` de cada filho — **nunca** esperes antes de drenar a pipe, ou arriscas deadlock (um filho pode estar bloqueado a escrever à espera que o pai leia, enquanto o pai está bloqueado à espera que o filho morra).

---

### Programa completo, anotado, de uma só vez

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>

#define N_SCANNERS      3
#define N_TICKETS       5
#define REQS_PER_CHILD  2

typedef struct {
    int child_index;   // chave de roteamento
    int ticket_id;
} request_t;

typedef struct {
    int  id;
    char event_name[32];
    int  valid;
} ticket_t;

int main(void) {
    int req_fd[2];
    int reply_fd[N_SCANNERS][2];
    pid_t pids[N_SCANNERS];
    int i, j;

    ticket_t db[N_TICKETS] = {
        {0, "Rock in Rio",     1},
        {1, "Museu da Ciencia",1},
        {2, "Expo Robotica",   0},
        {3, "Feira do Livro",  1},
        {4, "Concerto Jazz",   1}
    };

    // ---- ② criar TODOS os pipes antes de qualquer fork ----
    if (pipe(req_fd) == -1) { perror("pipe req_fd"); exit(EXIT_FAILURE); }
    for (i = 0; i < N_SCANNERS; i++) {
        if (pipe(reply_fd[i]) == -1) { perror("pipe reply_fd"); exit(EXIT_FAILURE); }
    }

    // ---- ③ ciclo de fork ----
    for (i = 0; i < N_SCANNERS; i++) {
        pids[i] = fork();
        if (pids[i] == -1) { perror("fork"); exit(EXIT_FAILURE); }

        if (pids[i] == 0) {
            // ---- ④ FILHO i: fechos primeiro ----
            request_t req;
            ticket_t  reply;

            close(req_fd[0]);
            for (j = 0; j < N_SCANNERS; j++) {
                if (j != i) close(reply_fd[j][0]);
                close(reply_fd[j][1]);
            }

            for (j = 0; j < REQS_PER_CHILD; j++) {
                req.child_index = i;
                req.ticket_id   = (i + j) % N_TICKETS;

                write(req_fd[1], &req, sizeof(request_t));
                read(reply_fd[i][0], &reply, sizeof(ticket_t));

                printf("Scanner %d (PID %d): ticket %d '%s' -> %s\n",
                       i, getpid(), reply.id, reply.event_name,
                       reply.valid ? "VALID" : "NOT VALID");
            }

            close(req_fd[1]);
            close(reply_fd[i][0]);
            exit(EXIT_SUCCESS);
        }
    }

    // ---- ⑤ PAI: fechos primeiro ----
    request_t req;
    close(req_fd[1]);                 // CRITICO
    for (i = 0; i < N_SCANNERS; i++) {
        close(reply_fd[i][0]);
    }

    while (read(req_fd[0], &req, sizeof(request_t)) > 0) {
        write(reply_fd[req.child_index][1], &db[req.ticket_id], sizeof(ticket_t));
    }

    // ---- ⑥ encerramento ----
    close(req_fd[0]);
    for (i = 0; i < N_SCANNERS; i++) {
        close(reply_fd[i][1]);
    }
    for (i = 0; i < N_SCANNERS; i++) {
        waitpid(pids[i], NULL, 0);
    }

    printf("Parent: all scanners finished.\n");
    return 0;
}
```

---

## 3. Regra do EOF (decorar à letra)

> `read()` só retorna `0` (EOF) quando o pipe está **vazio** E **todas** as cópias da ponta de escrita — em **todos** os processos — estão fechadas.
> Um único `fd[1]` esquecido aberto, em qualquer processo, é suficiente para o leitor bloquear para sempre.

Isto é a razão de ser de quase todos os `close()` do esqueleto. Sempre que escreveres um `close()`, pergunta-te: "se me esquecer deste, quem fica à espera de um EOF que nunca vem?"

---

## 4. Tabela de higiene de descritores

| Processo   | Mantém aberto                          | Fecha logo após o fork                                                    | Porquê |
|------------|------------------------------------------------|----------------------------------------------------------------------------|--------|
| Filho `i`  | `req_fd[1]`, `reply_fd[i][0]`                   | `req_fd[0]`; `reply_fd[j][0]` e `reply_fd[j][1]` para `j != i`; `reply_fd[i][1]` | Pontas não usadas mantidas abertas impedem o EOF nos pipes dos outros e desperdiçam descritores. |
| Pai        | `req_fd[0]`, todos os `reply_fd[i][1]`          | `req_fd[1]`; todos os `reply_fd[i][0]`                                     | Se o pai guardar `req_fd[1]`, o seu próprio `read()` nunca vê EOF — o pai bloqueia-se a si mesmo. |

Regra de ouro: logo a seguir ao `fork()`, em cada ramo, escreve **primeiro** os `close()`, só depois a lógica. Comenta cada `close()` — é aí que estão os pontos no exame.

---

## 5. Mutações de exame (diff mínimo)

### Mutação 1 — Pipe único, pai → filho (pai manda trabalho a UM filho)

Quando só há um filho e o fluxo é unidirecional pai-para-filho: elimina o array `reply_fd` e o ciclo de fork, fica só um `fork()`.

```c
int fd[2];
pipe(fd);

pid = fork();
if (pid == 0) {
    close(fd[1]);
    int x;
    while (read(fd[0], &x, sizeof(x)) > 0) {
        // processa x
    }
    close(fd[0]);
    exit(EXIT_SUCCESS);
}

close(fd[0]);
write(fd[1], &valor, sizeof(valor));
close(fd[1]);
wait(NULL);
```

Usa quando: o enunciado só fala de um processo filho a receber trabalho/ordens do pai, sem resposta de volta.

### Mutação 2 — Filhos → pai, recolha de resultados (scatter-gather)

Elimina `reply_fd`; o pipe partilhado passa a transportar **resultados**, não pedidos.

```c
// cada filho computa e escreve o SEU resultado (struct atómica), depois fecha e sai
write(fd[1], &resultado, sizeof(resultado_t));
close(fd[1]);
exit(EXIT_SUCCESS);

// pai:
close(fd[1]);
while (read(fd[0], &resultado, sizeof(resultado_t)) > 0) {
    // acumula/imprime
}
for (i = 0; i < N; i++) waitpid(pids[i], NULL, 0);
```

Usa quando: o enunciado pede para N filhos calcularem algo em paralelo e o pai só precisa de juntar/imprimir os resultados — não há resposta a devolver a cada filho.

### Mutação 3 — Pipeline com dup2 + execlp (ex.: `ls | wc -l`)

```c
int fd[2];
pipe(fd);

if (fork() == 0) {
    close(fd[0]);
    dup2(fd[1], STDOUT_FILENO);
    close(fd[1]);
    execlp("ls", "ls", (char *)NULL);
    perror("execlp");
    exit(1);
}

if (fork() == 0) {
    close(fd[1]);
    dup2(fd[0], STDIN_FILENO);
    close(fd[0]);
    execlp("wc", "wc", "-l", (char *)NULL);
    perror("execlp");
    exit(1);
}

close(fd[0]);
close(fd[1]);
wait(NULL);
wait(NULL);
```

O idioma `dup2(fd[x], STDIN/STDOUT_FILENO); close(fd[x]);` é inseparável — os descritores sobrevivem ao `exec()`, e uma ponta de escrita esquecida aberta mata a deteção de EOF a jusante.

Usa quando: o enunciado descreve dois programas externos encadeados (o output de um alimenta o input do outro).

### Mutação 4 — "Servir os filhos de forma justa / round-robin"

**Não é preciso nada de especial.** Um único `read()` bloqueante sobre o pipe partilhado de pedidos já serializa os pedidos pela ordem de chegada — o kernel enfileira as escritas atómicas concorrentes. Basta comentar isso no código; não inventes `select()` nem mecanismos de fairness — não está na matéria de referência.

---

## 6. Top 5 erros que tiram pontos

1. **I/O parcial de struct** — escrever `sizeof(int)` quando devias escrever a struct toda, ou ler para um buffer de tamanho errado. Regra: `write(fd, &s, sizeof(T))` / `read(fd, &s, sizeof(T))` — mesmo tipo `T`, mesmo `sizeof`, nos dois lados sempre.
2. **Um `close()` esquecido ⇒ programa fica pendurado.** O mais comum: o **pai** esquecer-se do `close(req_fd[1])` antes do seu ciclo de leitura (bloqueia-se a si mesmo), ou um filho manter aberto o `reply_fd[j][1]` de outro filho. Sintoma: o programa imprime tudo o que devia e depois nunca termina.
3. **`pipe()` depois do `fork()`** — os dois processos ficam com pipes **completamente diferentes** e sem relação entre si. Todas as chamadas a `pipe()` vão antes do ciclo de fork, sem exceções.
4. **Zombies / falta de `wait`.** Um `waitpid()` por cada filho, sempre depois de drenar a pipe. Esperar **antes** de ler pode causar deadlock.
5. **Routing sem índice** — mandar só o `ticket_id` e o pai tentar responder num pipe partilhado é impossível de rotear. O pedido tem de transportar `child_index`; as respostas têm de viajar em pipes privados por filho.

---

## 7. Drill de memorização

Antes de começares a escrever código no papel, escreve estas 6 palavras na margem da folha, uma por linha, e expande cada uma de memória:

```
STRUCTS
PIPES
FORK
FILHO (fechos, ciclo)
PAI   (fechos, serve)
ENCERRAR (close, wait)
```

Se conseguires expandir estas 6 linhas sem olhar para trás — struct do pedido com chave de roteamento, todos os pipes criados antes do fork, ciclo de fork a guardar pids, filho a fechar tudo o que não é seu antes de trabalhar, pai a fechar `req_fd[1]` antes de servir, encerramento a fechar tudo e só depois esperar — então sabes escrever a Q1 do Grupo II.
