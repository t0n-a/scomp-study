<!-- track: A | order: 7 | title: Master/slave completo — o Template A | time: 60 min -->
<!-- section: teoria -->
## O padrão que É a pergunta 1 do exame

Junta as duas lições anteriores e tens o **Template A**, o padrão que caiu em TODOS os exames como Q1:

- **Um pipe de pedidos partilhado** (filhos→pai): qualquer filho escreve o seu pedido; como o pedido é uma struct ≤ PIPE_BUF, não se mistura. **O pedido leva o índice/PID do filho** — é o remetente no envelope.
- **Um pipe de resposta por filho** (pai→filho i): o pai lê um pedido, vê de quem é, e responde no pipe DESSE filho.

```
filhos ──pedidos {i, dados}──▶ [pipe partilhado] ──▶ pai
pai ──resposta──▶ [pipe do filho i] ──▶ filho i
```

O fluxo do pai é um ciclo simples:

```c
while (read(req[0], &pedido, sizeof(pedido)) > 0) {   /* até EOF */
    resposta = processa(pedido);
    write(resp[pedido.child][1], &resposta, sizeof(resposta));
}
```

Checklist mental da higiene (é aqui que se perdem pontos):

1. Todos os pipes (1 + N) criados **antes** dos forks.
2. Filho i: fecha `req[0]`, fecha os pipes de resposta dos outros e `resp[i][1]`; usa só `req[1]` e `resp[i][0]`.
3. Pai: fecha `req[1]` (senão não há EOF!) e todos os `resp[k][0]`.
4. Quando um filho termina, fecha `req[1]` — quando TODOS terminarem, o `read` do pai devolve 0 e o ciclo acaba sozinho. A terminação é *de borla*, sem sinais nem contadores.
5. `wait()` por todos + fechar as pontas restantes.

Histórico: museu (exame modelo), fatoriais distribuídos (Normal 24/25), encomendas (Recurso 24/25) — todos são ESTE desenho com nomes diferentes. Compara com `patterns/template-A-pipes.c`, a versão de referência comentada.

<!-- section: exercicio -->
**(PL3, ex. 11)** Um supermercado tem **5 leitores de código de barras** (filhos). O **pai** tem a base de dados de produtos:

```c
typedef struct { char nome[32]; float preco; } produto_t;   /* BD: array de 10 */
typedef struct { int child; int codigo; } pedido_t;         /* código = índice na BD */
```

- Cada filho simula 3 leituras: escolhe códigos (ex.: `(i*3+j) % 10`), envia o pedido pelo **pipe partilhado** e espera a resposta no **seu** pipe.
- O pai responde com a `produto_t` correspondente; o filho imprime "leitor X: nome — preço".
- Quando todos os filhos terminam, o pai deteta EOF, faz os waits e termina.

Este exercício é o teu ensaio geral da Q1 — faz primeiro em **papel** (20–25 min), só depois passa ao Code Lab.

[Enunciado original](/pdfs/SCOMP2526_PL3.pdf#page=4)

<!-- section: checklist -->
- 1 pipe de pedidos + 5 de resposta, todos antes dos forks
- O pedido leva o índice do filho
- Ciclo de closes correto no filho (fecha tudo menos req[1] e resp[i][0])
- Pai fecha req[1] antes do ciclo de leitura
- Pai termina por EOF, sem contadores mágicos
- 5 waits no fim
- Compila sem warnings e as 15 linhas de output têm os produtos certos

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

#define N 5
#define LEITURAS 3
#define NPROD 10

typedef struct { char nome[32]; float preco; } produto_t;
typedef struct { int child; int codigo; } pedido_t;

int main(void) {
    produto_t bd[NPROD];
    for (int i = 0; i < NPROD; i++) {
        snprintf(bd[i].nome, sizeof(bd[i].nome), "Produto-%d", i);
        bd[i].preco = 1.5f * (i + 1);
    }

    int req[2], resp[N][2];
    if (pipe(req) == -1) { perror("pipe"); exit(1); }
    for (int i = 0; i < N; i++)
        if (pipe(resp[i]) == -1) { perror("pipe"); exit(1); }

    for (int i = 0; i < N; i++) {
        pid_t pid = fork();
        if (pid == -1) { perror("fork"); exit(1); }
        if (pid == 0) {                       /* ---- filho i (leitor) ---- */
            close(req[0]);                    /* nunca lê pedidos */
            for (int k = 0; k < N; k++) {
                close(resp[k][1]);            /* nunca responde */
                if (k != i) close(resp[k][0]);/* só lê o SEU pipe */
            }
            for (int j = 0; j < LEITURAS; j++) {
                pedido_t p = { i, (i * LEITURAS + j) % NPROD };
                write(req[1], &p, sizeof(p));
                produto_t prod;
                read(resp[i][0], &prod, sizeof(prod));
                printf("leitor %d: %s — %.2f\n", i, prod.nome, prod.preco);
            }
            close(req[1]);                    /* o meu contributo para o EOF */
            close(resp[i][0]);
            exit(0);
        }
    }

    /* ---- pai (base de dados) ---- */
    close(req[1]);                            /* senão o EOF nunca chega */
    for (int k = 0; k < N; k++) close(resp[k][0]);

    pedido_t p;
    while (read(req[0], &p, sizeof(p)) > 0)
        write(resp[p.child][1], &bd[p.codigo], sizeof(produto_t));

    close(req[0]);
    for (int k = 0; k < N; k++) close(resp[k][1]);
    for (int i = 0; i < N; i++) wait(NULL);
    printf("pai: todos os leitores terminaram\n");
    return 0;
}
```

É literalmente o exame modelo (museu): troca "leitor de código de barras" por "posto de consulta" e "produto" por "obra de arte". No dia, escreve primeiro as structs, depois os pipes+forks, depois o filho, depois o pai — nesta ordem.
