<!-- track: A | order: 4 | title: Structs pelo pipe — a unidade de mensagem | time: 25 min -->
<!-- section: teoria -->
## Uma mensagem = uma struct = um write

O pipe transporta bytes, não "mensagens" — se o pai escrever um inteiro e depois um nome em duas escritas, o filho tem de adivinhar onde acaba um e começa o outro. A solução usada em TODOS os exames: definir uma **struct** com tudo o que a mensagem leva, e enviá-la **inteira num só `write`**:

```c
typedef struct {
    int  numero;
    char nome[64];        /* array embutido, NUNCA char* (o ponteiro não vale
                             nada no outro processo!) */
} msg_t;

msg_t m = { 42, "Ana" };
write(fd[1], &m, sizeof(m));      /* envia */
msg_t r;
read(fd[0], &r, sizeof(r));       /* recebe — mesmos sizeof dos dois lados */
```

Três razões para isto ser a norma:

1. **Fronteiras**: um `read(sizeof(msg_t))` apanha exatamente uma mensagem.
2. **Atomicidade**: escritas ≤ `PIPE_BUF` (≥ 4096 bytes) são atómicas — mesmo com vários escritores no mesmo pipe, as structs não se entrelaçam. (Isto vai ser crucial na lição A6.)
3. **Extensível**: no exame, quando o enunciado diz "o pedido inclui o índice do filho", acrescentas um campo e está feito.

Erro clássico a evitar: `char *nome` dentro da struct. O pipe copia o **ponteiro** (um endereço da memória do pai), que no filho aponta para lixo. Arrays embutidos, sempre.

Guia: conceito 4 · [PL3](/pdfs/SCOMP2526_PL3.pdf#page=1).

<!-- section: exercicio -->
**(PL3, ex. 2)** O pai lê do teclado um número inteiro e um nome, e envia-os ao filho pelo pipe. O filho lê e imprime ambos.

a) Primeiro resolve com **duas** escritas separadas (um `write` para o int, outro para o nome).
b) Depois refaz com **uma struct num único write** — a versão que vais usar no exame.

No Code Lab, usa o campo stdin para dar o input (ex.: `42 Ana`). Compara as duas versões: qual delas continuaria correta se houvesse 5 filhos a escrever pedidos no mesmo pipe ao mesmo tempo?

[Enunciado original](/pdfs/SCOMP2526_PL3.pdf#page=1)

<!-- section: checklist -->
- A struct usa char nome[N], não char*
- write e read usam sizeof(msg_t) — o mesmo dos dois lados
- Pipe antes do fork; cada lado fecha a ponta que não usa
- Sei justificar porque é que a versão b) é a única segura com vários escritores (atomicidade ≤ PIPE_BUF)

<!-- section: solucao -->
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

typedef struct {
    int  numero;
    char nome[64];
} msg_t;

int main(void) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); exit(1); }

    pid_t pid = fork();
    if (pid == -1) { perror("fork"); exit(1); }

    if (pid == 0) {                        /* filho: lê a struct inteira */
        close(fd[1]);
        msg_t m;
        read(fd[0], &m, sizeof(m));
        printf("Recebi: numero=%d nome=%s\n", m.numero, m.nome);
        close(fd[0]);
        exit(0);
    }

    close(fd[0]);                          /* pai: lê do teclado e envia */
    msg_t m;
    if (scanf("%d %63s", &m.numero, m.nome) != 2) {
        fprintf(stderr, "input invalido\n");
        exit(1);
    }
    write(fd[1], &m, sizeof(m));
    close(fd[1]);
    wait(NULL);
    return 0;
}
```

Com vários escritores, só a versão b) garante mensagens intactas: cada `write(sizeof(msg_t))` cabe em PIPE_BUF e é atómico. Na versão a), os writes de processos diferentes podiam intercalar-se (int do filho 1, nome do filho 2…).
