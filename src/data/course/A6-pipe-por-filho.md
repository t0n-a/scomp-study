<!-- track: A | order: 6 | title: Um pipe por filho — respostas endereçadas | time: 40 min -->
<!-- section: teoria -->
## Quando o pai precisa de responder A CADA filho

O pipe partilhado da lição A5 funciona filho→pai porque não interessa a ordem. Mas quando o **pai tem de enviar algo a um filho específico** (a resposta ao pedido DELE), um pipe partilhado não serve: qualquer filho podia "roubar" a resposta de outro. A solução é **um pipe dedicado por filho**:

```c
int fd[N][2];                     /* matriz de pipes */
for (int i = 0; i < N; i++) pipe(fd[i]);   /* TODOS antes dos forks */

for (int i = 0; i < N; i++) {
    if (fork() == 0) {
        /* filho i: fecha TODOS os pipes que não são o seu! */
        for (int k = 0; k < N; k++) {
            close(fd[k][1]);               /* nunca escreve em nenhum */
            if (k != i) close(fd[k][0]);   /* só lê do seu */
        }
        dados_t d;
        read(fd[i][0], &d, sizeof(d));
        /* ... trabalhar ... */
        close(fd[i][0]);
        exit(0);
    }
}
/* pai: fecha as pontas de leitura, escreve no pipe de cada filho */
for (int i = 0; i < N; i++) close(fd[i][0]);
for (int i = 0; i < N; i++) write(fd[i][1], &dados[i], sizeof(dados_t));
for (int i = 0; i < N; i++) close(fd[i][1]);
```

A armadilha nova: **cada filho herda os 2N descritores TODOS**. A higiene de fecho deixa de ser 2 closes e passa a ser um ciclo — o filho fecha tudo menos a ponta que usa. Se um filho deixar aberta a ponta de escrita do pipe de outro, o EOF desse outro nunca chega. No exame, este ciclo de closes no filho vale pontos de "limpeza" e evita encravamentos.

Quando usar qual: **partilhado** = muitos→um sem ordem (A5); **dedicado** = um→cada com endereçamento (esta lição). O padrão de exame completo (A7) usa os dois ao mesmo tempo.

<!-- section: exercicio -->
**(PL3, ex. 6)** O mesmo problema da lição A5 (2 arrays de 1000, 5 filhos, cada um soma 200 posições) mas agora **cada filho envia as suas 200 somas individuais** (não a soma parcial) e o pai guarda-as **no sítio certo** de um array `result[1000]`.

Usa **5 pipes, um por filho**. O pai lê do pipe do filho 0 primeiro, depois do 1, etc. — assim as somas entram por ordem e `result[]` fica correto. No fim o pai verifica: `result[i] == vec1[i]+vec2[i]` para todo o i, e imprime "OK" ou o primeiro índice errado.

[Enunciado original](/pdfs/SCOMP2526_PL3.pdf#page=2)

<!-- section: checklist -->
- Os N pipes são todos criados antes de qualquer fork
- Cada filho fecha, em ciclo, todas as pontas que não usa
- O filho i escreve as suas 200 somas no SEU pipe (fd[i][1])
- O pai lê os pipes por ordem 0..4 e coloca em result[i*200 + j]
- Verificação final imprime OK
- Sei dizer quando usar pipe partilhado vs pipe por filho

<!-- section: solucao -->
Nota: aqui o filho escreve e o pai lê — as pontas trocam em relação ao esqueleto da teoria (que mostrava pai→filho). O princípio de higiene é o mesmo: fechar tudo o que não se usa.

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

#define N 5
#define SIZE 1000
#define SLICE (SIZE / N)

int main(void) {
    int vec1[SIZE], vec2[SIZE], result[SIZE];
    for (int i = 0; i < SIZE; i++) { vec1[i] = i; vec2[i] = 2 * i; }

    int fd[N][2];
    for (int i = 0; i < N; i++)
        if (pipe(fd[i]) == -1) { perror("pipe"); exit(1); }

    for (int i = 0; i < N; i++) {
        pid_t pid = fork();
        if (pid == -1) { perror("fork"); exit(1); }
        if (pid == 0) {                          /* filho i: escreve no seu pipe */
            for (int k = 0; k < N; k++) {
                close(fd[k][0]);                 /* nunca lê */
                if (k != i) close(fd[k][1]);     /* só escreve no seu */
            }
            for (int j = i * SLICE; j < (i + 1) * SLICE; j++) {
                int soma = vec1[j] + vec2[j];
                write(fd[i][1], &soma, sizeof(soma));
            }
            close(fd[i][1]);
            exit(0);
        }
    }

    for (int i = 0; i < N; i++) close(fd[i][1]); /* pai só lê */
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < SLICE; j++)
            read(fd[i][0], &result[i * SLICE + j], sizeof(int));
        close(fd[i][0]);
    }
    for (int i = 0; i < N; i++) wait(NULL);

    for (int i = 0; i < SIZE; i++) {
        if (result[i] != vec1[i] + vec2[i]) {
            printf("ERRO no indice %d\n", i);
            return 1;
        }
    }
    printf("OK — result[] correto\n");
    return 0;
}
```
