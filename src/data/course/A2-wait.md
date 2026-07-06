<!-- track: A | order: 2 | title: wait() e exit codes — fechar bem os filhos | time: 25 min -->
<!-- section: teoria -->
## Ninguém morre sem o pai assinar

Quando um filho termina (`exit(n)`), não desaparece: fica **zombie** — a memória é libertada, mas a entrada na tabela de processos fica lá com o exit code, à espera de que o pai a recolha. Recolher chama-se *reaping* e faz-se com `wait()`:

```c
int status;
pid_t who = wait(&status);          // bloqueia até UM filho terminar
if (WIFEXITED(status))
    printf("filho %d saiu com %d\n", who, WEXITSTATUS(status));
```

As três ferramentas:

- `wait(&status)` — espera por **um filho qualquer**; retorna o PID dele
- `waitpid(pid, &status, 0)` — espera por **aquele filho** específico
- Macros: `WIFEXITED(status)` (terminou normalmente?) e `WEXITSTATUS(status)` (o valor 0–255 passado ao `exit`)

Regra de exame: **um `wait()` por cada filho criado** — normalmente `for (i=0;i<N;i++) wait(NULL);` no fim do pai. Vale pontos de "limpeza" na cotação, e sem isso os filhos ficam zombies.

O caso inverso: se o **pai** morre primeiro, o filho vira **órfão** e é adotado pelo `init`/`systemd` (PID 1), que faz `wait` por ele. Zombie = filho morto não recolhido; órfão = pai morto.

Slides: [T3 — zombies](/pdfs/SCOMP2526-T3.pdf#page=36) · Guia: conceito 1 (RIP e WAIT).

<!-- section: exercicio -->
**(PL1, ex. 2)** Escreve um programa que cria **dois filhos**:

- O pai imprime "I am the father" + PID, espera **primeiro pelo 1.º filho e depois pelo 2.º** (por esta ordem, usa `waitpid`), verifica se cada um terminou normalmente e imprime o exit value de cada.
- O 1.º filho imprime "I am the first child" + PID, dorme 5 s, e sai com `exit(1)`.
- O 2.º filho imprime "I am the second child" + PID e sai com `exit(2)`.

Repara no que acontece: o 2.º filho acaba logo, mas o pai está preso no `waitpid` do 1.º — durante esses ~5 s, o 2.º filho é um **zombie**. Corre no Code Lab e pensa: em que linha do output é que o zombie existe?

[Enunciado original](/pdfs/SCOMP2526-PL1.pdf#page=1)

<!-- section: checklist -->
- O fork de cada filho está verificado (pid == -1 → erro)
- Cada filho tem o seu ramo if/else e termina com exit() — não cai no código do outro
- Usei waitpid para impor a ordem 1.º → 2.º
- Verifico WIFEXITED antes de ler WEXITSTATUS
- Sei explicar em que intervalo o 2.º filho esteve zombie

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int main(void) {
    pid_t c1 = fork();
    if (c1 == -1) { perror("fork"); exit(1); }
    if (c1 == 0) {
        printf("I am the first child, PID %d\n", (int)getpid());
        sleep(5);
        exit(1);
    }
    pid_t c2 = fork();
    if (c2 == -1) { perror("fork"); exit(1); }
    if (c2 == 0) {
        printf("I am the second child, PID %d\n", (int)getpid());
        exit(2);
    }

    printf("I am the father, PID %d\n", (int)getpid());
    int status;
    waitpid(c1, &status, 0);
    if (WIFEXITED(status))
        printf("child 1 exited with %d\n", WEXITSTATUS(status));
    waitpid(c2, &status, 0);
    if (WIFEXITED(status))
        printf("child 2 exited with %d\n", WEXITSTATUS(status));
    return 0;
}
```

O 2.º filho é zombie desde o seu `exit(2)` (quase imediato) até o pai sair do `waitpid(c1,...)` — cerca de 5 segundos. Podes vê-lo com `ps` no estado `Z` se correres fora do Code Lab.
