<!-- track: A | order: 5 | title: Um pipe, N filhos — ler até EOF | time: 40 min -->
<!-- section: teoria -->
## O padrão filho→pai com pipe partilhado

Primeira metade do padrão de exame: **N filhos trabalham em paralelo e reportam ao pai por UM pipe partilhado**. Cada filho escreve a sua resposta (uma struct, claro) e o pai lê tudo.

O esqueleto:

```c
int fd[2];
pipe(fd);                              /* 1 pipe para todos, ANTES dos forks */
for (int i = 0; i < N; i++) {
    if (fork() == 0) {                 /* filho i */
        close(fd[0]);                  /* filho só escreve */
        res_t r = trabalho(i);         /* usa i para saber a sua fatia */
        write(fd[1], &r, sizeof(r));
        close(fd[1]);
        exit(0);
    }
}
/* pai */
close(fd[1]);                          /* CRÍTICO — ver abaixo */
res_t r;
while (read(fd[0], &r, sizeof(r)) > 0) /* lê até EOF */
    acumula(r);
close(fd[0]);
for (int i = 0; i < N; i++) wait(NULL);
```

Os dois pontos onde os exames se ganham e perdem:

1. **O pai fecha `fd[1]` antes de ler.** O pai também herda a ponta de escrita; se não a fechar, mesmo depois de todos os filhos saírem há uma ponta de escrita aberta (a dele!) e o `while(read...)` nunca vê EOF → programa pendurado. É O erro clássico.
2. **Cada filho sabe quem é pelo `i` do momento do fork** — a variável é copiada, o `i` do filho fica congelado. É assim que se divide o array em fatias: filho `i` trata `[i*FATIA, (i+1)*FATIA[`.

E porque não se misturam as respostas de 5 filhos no mesmo pipe? Lição A4: escritas ≤ PIPE_BUF são atómicas.

<!-- section: exercicio -->
**(PL3, ex. 5)** Dois arrays de inteiros com 1000 elementos cada. Cria **5 filhos**; cada um soma 200 posições (`vec1[i]+vec2[i]`) e envia a sua **soma parcial** ao pai pelo **único** pipe partilhado. O pai lê as 5 somas parciais e imprime o total.

Preenche os arrays com valores fixos (ex.: `vec1[i]=i; vec2[i]=1;`) para saberes o resultado esperado: soma de 0..999 = 499500, +1000 → **500500**. Se o teu programa imprimir isso, está certo.

Envia numa struct `{int child; long soma;}` e faz o pai imprimir também qual filho enviou o quê.

[Enunciado original](/pdfs/SCOMP2526_PL3.pdf#page=2)

<!-- section: checklist -->
- Pipe único criado antes do ciclo de forks
- O filho i calcula a fatia certa com base no i congelado no fork
- Filho: close(fd[0]) no início, close(fd[1]) + exit(0) no fim
- Pai: close(fd[1]) ANTES do while(read...) — sei explicar porquê
- Pai lê até read devolver 0 (EOF) e faz N waits
- Total = 500500 no Code Lab

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

#define N 5
#define SIZE 1000
#define SLICE (SIZE / N)

typedef struct {
    int  child;
    long soma;
} res_t;

int main(void) {
    int vec1[SIZE], vec2[SIZE];
    for (int i = 0; i < SIZE; i++) { vec1[i] = i; vec2[i] = 1; }

    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); exit(1); }

    for (int i = 0; i < N; i++) {
        pid_t pid = fork();
        if (pid == -1) { perror("fork"); exit(1); }
        if (pid == 0) {                     /* filho i */
            close(fd[0]);
            res_t r = { i, 0 };
            for (int j = i * SLICE; j < (i + 1) * SLICE; j++)
                r.soma += vec1[j] + vec2[j];
            write(fd[1], &r, sizeof(r));
            close(fd[1]);
            exit(0);
        }
    }

    close(fd[1]);                           /* sem isto: nunca há EOF! */
    long total = 0;
    res_t r;
    while (read(fd[0], &r, sizeof(r)) > 0) {
        printf("filho %d somou %ld\n", r.child, r.soma);
        total += r.soma;
    }
    close(fd[0]);
    for (int i = 0; i < N; i++) wait(NULL);

    printf("total = %ld\n", total);         /* 500500 */
    return 0;
}
```
