<!-- track: A | order: 1 | title: fork() — um processo vira dois | time: 25 min -->
<!-- section: teoria -->
## Programa vs. processo, e o fork()

Um **programa** é o ficheiro no disco (a receita); um **processo** é esse programa a correr (a cozinhar), com memória própria e um PID. Em UNIX, novos processos nascem por clonagem: `fork()` duplica o processo atual.

O truque que decide metade das perguntas de exame: **`fork()` é chamado uma vez mas retorna duas vezes** — uma em cada processo:

- no **pai** retorna o **PID do filho** (> 0)
- no **filho** retorna **0**
- se falhar retorna **−1** (só no pai)

```c
pid_t pid = fork();
if (pid == -1) { perror("fork"); exit(1); }
if (pid == 0) {
    printf("Sou o filho, PID %d\n", getpid());
} else {
    printf("Sou o pai do %d\n", pid);
}
```

Depois do `fork()`, pai e filho executam **o mesmo código a partir dali**, cada um com a sua cópia das variáveis (copy-on-write). Num `for` com `fork()` lá dentro, cada iteração duplica TODOS os processos vivos: `for(i=0;i<4;i++) fork();` cria 2⁴ = 16 processos (15 novos).

Slides: [T3 — processos](/pdfs/SCOMP2526-T3.pdf#page=23) · Guia: conceito 1 (secção 1.3, acrónimo CLONE).

<!-- section: exercicio -->
**(PL1, ex. 1)** Considera:

```c
int main(void){
    pid_t p, a;
    p = fork();
    a = fork();
    printf("Concurrent Programming\n");
    return 0;
}
```

a) Quantos processos existem no total? Desenha a árvore num papel.
b) Quantas vezes é impresso "Concurrent Programming"?

Depois confirma: escreve o programa no Code Lab, corre, e conta as linhas. A seguir altera-o para imprimir também `getpid()` e `getppid()` em cada linha e volta a desenhar a árvore com os PIDs reais.

[Enunciado original](/pdfs/SCOMP2526-PL1.pdf#page=1)

<!-- section: checklist -->
- Sei dizer o que fork() retorna no pai, no filho e em erro
- Desenhei a árvore: 2 forks seguidos = 4 processos
- Percebi porquê 4 prints (todos os processos passam no printf)
- Alterei o código e os PIDs reais bateram certo com a minha árvore

<!-- section: solucao -->
a) 4 processos (o original + 3). O 1.º fork cria um filho; o 2.º fork é executado pelos DOIS, criando mais dois. b) 4 vezes — todos chegam ao printf.

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>

int main(void) {
    pid_t p, a;
    p = fork();
    a = fork();
    printf("Concurrent Programming — pid=%d ppid=%d p=%d a=%d\n",
           (int)getpid(), (int)getppid(), (int)p, (int)a);
    return 0;
}
```

Lê o output: os processos com `p==0` descendem do 1.º fork; os com `a==0` nasceram do 2.º. A árvore é: original → filho1 (p=0); ambos → mais um filho cada (a=0).
