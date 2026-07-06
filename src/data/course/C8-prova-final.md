<!-- track: C | order: 8 | title: Prova final — leitores/escritores (o exame modelo) | time: 45 min -->
<!-- section: teoria -->
## O segundo pilar: readers-writers

O exame modelo (e o Especial 23/24) usou **leitores-escritores** na Q2 — por isso, mesmo com produtor-consumidor a ser o mais frequente, este padrão é obrigatório. A ideia:

- **Leitores** podem entrar VÁRIOS ao mesmo tempo (ler não estraga nada).
- **Escritores** entram SOZINHOS (nem outros escritores, nem leitores).
- **Prioridade aos leitores**: se há leitores lá dentro, novos leitores entram diretos.

A implementação clássica usa **dois mutexes e um contador**:

```c
int read_count = 0;
pthread_mutex_t mutex_rc   = PTHREAD_MUTEX_INITIALIZER;  /* protege read_count */
pthread_mutex_t mutex_data = PTHREAD_MUTEX_INITIALIZER;  /* a "chave da sala"  */

/* leitor */                              /* escritor */
lock(&mutex_rc);                          lock(&mutex_data);
read_count++;                             /* escrever sozinho */
if (read_count == 1)                      unlock(&mutex_data);
    lock(&mutex_data);   /* 1º tranca */
unlock(&mutex_rc);
/* ... ler (em grupo) ... */
lock(&mutex_rc);
read_count--;
if (read_count == 0)
    unlock(&mutex_data); /* último destranca */
unlock(&mutex_rc);
```

A metáfora: `mutex_data` é a chave da sala. O **primeiro leitor** a entrar tranca a porta "por dentro" em nome de todos; os seguintes só se registam no contador; o **último a sair** devolve a chave. O escritor precisa da chave inteira só para ele.

Nota técnica honesta: neste desenho o `mutex_data` pode ser destrancado por um leitor diferente do que o trancou — em pthreads isso é tecnicamente indefinido, embora seja o que os slides e exames esperam. A alternativa 100% correta usa um semáforo como chave (`sem_t` init 1 — semáforos não têm dono). Escreve a versão dos slides no exame; se te pedirem para comentar, menciona a alternativa. (Detalhe nas notas do Template B.)

Slides: [T8 — readers-writers](/pdfs/SCOMP2526-T8.pdf#page=6) · Guia: conceito 6 (6.9, RW).

<!-- section: exercicio -->
**(PL6, ex. 15 = Grupo II do exame modelo)** Em papel, cronometrado, 40 minutos:

Estrutura partilhada na heap com uma string. Threads de dois tipos:

- **reader** — lê a string e imprime-a junto com o **número de leitores ativos**; nunca modifica; vários em simultâneo; prioridade sobre escritores.
- **writer** — escreve o seu ID + hora atual na string; um de cada vez; só quando não há leitores; imprime o nº de escritores e leitores ativos.

Cria 3 readers e 2 writers, cada um a fazer 3 acessos (com `usleep` aleatório entre acessos para os interlaçar). Main: joins, free, destroys.

Depois transcreve para o Code Lab tal e qual e corrige a partir dos erros do gcc, como na A8.

[Enunciado original](/pdfs/SCOMP2526-PL6.pdf#page=6)

<!-- section: checklist -->
- read_count SÓ é tocado com mutex_rc trancado (incluindo no printf!)
- Primeiro leitor tranca mutex_data; último destranca — if (==1) e if (==0) certos
- Escritor: lock/unlock simples de mutex_data
- IDs passados por array (lição C1), joins todos, free + destroys
- Fiz em papel ≤ 40 min e anotei os erros que o gcc apanhou
- Sei explicar porque é que os escritores podem morrer à fome neste desenho (starvation — pergunta típica de alínea)

<!-- section: solucao -->
A solução de referência comentada é o **Template B** — abre `patterns/template-B-readers-writers.c` no repo, ou escolhe "Esqueleto B" na lista do `./lab` para a versão com TODOs.

```c
/* Núcleo do leitor, para conferires a tua versão de papel: */
void *reader(void *arg) {
    int id = *(int *)arg;
    for (int k = 0; k < 3; k++) {
        pthread_mutex_lock(&mutex_rc);
        read_count++;
        if (read_count == 1)
            pthread_mutex_lock(&mutex_data);   /* 1º leitor tranca a sala */
        printf("reader %d entra (leitores ativos: %d)\n", id, read_count);
        pthread_mutex_unlock(&mutex_rc);

        /* ... ler a string partilhada ... */

        pthread_mutex_lock(&mutex_rc);
        read_count--;
        if (read_count == 0)
            pthread_mutex_unlock(&mutex_data); /* último devolve a chave */
        pthread_mutex_unlock(&mutex_rc);
        usleep(1000 * (rand() % 50));
    }
    return NULL;
}
```

E a resposta à pergunta da checklist: com leitores a chegar continuamente, `read_count` nunca chega a 0 e o escritor nunca apanha `mutex_data` — **starvation dos escritores**. É o preço da prioridade aos leitores; a variante "prioridade a escritores" (PL5.14) resolve-a bloqueando novos leitores quando há escritores à espera.

Terminaste as duas trilhas. Próximos passos: simulação completa no `./exame`, e o plano dos últimos dias está em `patterns/PL-TREINO.md` e `patterns/DRILL.md`.
