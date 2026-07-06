<!-- track: A | order: 3 | title: O pipe — o cano com duas pontas | time: 30 min -->
<!-- section: teoria -->
## pipe(): um cano unidirecional

Processos não partilham memória — comunicam por **pipes**: um buffer no kernel com uma ponta de leitura e uma de escrita.

```c
int fd[2];
pipe(fd);        // fd[0] = LER, fd[1] = ESCREVER  (mnemónica: 0 = boca, 1 = caneta)
```

A ordem sagrada, sempre a mesma: **criar o pipe ANTES do fork** (para os dois herdarem os descritores), e depois **cada processo fecha a ponta que não usa**:

```c
pipe(fd);
pid_t pid = fork();
if (pid == 0) {              // filho vai LER
    close(fd[1]);            // fecha a escrita que não usa
    read(fd[0], &x, sizeof(x));
    close(fd[0]);
} else {                     // pai vai ESCREVER
    close(fd[0]);
    write(fd[1], &x, sizeof(x));
    close(fd[1]);
    wait(NULL);
}
```

Porque é que fechar importa (isto é O conceito da trilha toda):

- `read` num pipe vazio **bloqueia** até haver dados…
- …e só devolve **0 (EOF)** quando **TODAS as pontas de escrita estiverem fechadas**. Se alguém (até o próprio leitor!) tiver `fd[1]` aberto e esquecido, o `read` nunca devolve 0 e o programa **encrava para sempre**.

Regras rápidas: o pipe é um fluxo de **bytes** (não de mensagens); escreve/lê sempre `sizeof(struct)` inteiro; escritas ≤ `PIPE_BUF` são atómicas (não se misturam).

Slides: [T1b — I/O e descritores](/pdfs/SCOMP2526-T1b.pdf#page=1) · Guia: conceito 4.

<!-- section: exercicio -->
**(PL3, ex. 1)** Implementa um programa que cria um processo filho e um pipe:

- O **pai** imprime o seu PID e envia-o ao filho pelo pipe.
- O **filho** lê o PID do pipe e imprime "O meu pai é o processo X".

Confirma no output que o X bate certo com o PID que o pai imprimiu. Depois parte o programa de propósito: comenta o `close(fd[1])` no filho e substitui a leitura por um ciclo `while (read(...) > 0)` — vê o programa encravar e explica porquê.

[Enunciado original](/pdfs/SCOMP2526_PL3.pdf#page=1)

<!-- section: checklist -->
- pipe() criado ANTES do fork
- Filho fecha fd[1] antes de ler; pai fecha fd[0] antes de escrever
- read/write usam sizeof(pid_t), não "4"
- Pai faz wait(NULL) no fim
- Consegui provocar o encravamento e sei explicá-lo (write-end aberto → nunca há EOF)

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int main(void) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); exit(1); }

    pid_t pid = fork();
    if (pid == -1) { perror("fork"); exit(1); }

    if (pid == 0) {                       // filho: lê
        close(fd[1]);
        pid_t parent_pid;
        read(fd[0], &parent_pid, sizeof(parent_pid));
        printf("O meu pai é o processo %d\n", (int)parent_pid);
        close(fd[0]);
        exit(0);
    }

    close(fd[0]);                         // pai: escreve
    pid_t me = getpid();
    printf("Pai: o meu PID é %d\n", (int)me);
    write(fd[1], &me, sizeof(me));
    close(fd[1]);
    wait(NULL);
    return 0;
}
```

No teste do encravamento: com `fd[1]` aberto no filho, quando o pai fecha a ponta dele ainda existe UMA ponta de escrita viva (a do próprio filho) — logo o kernel nunca dá EOF e o `read` bloqueia eternamente. É o bug nº 1 dos exames.
