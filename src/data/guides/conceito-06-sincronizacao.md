<!-- topic: sync | title: Conceito 06 — Sincronização e Semáforos (race conditions e problemas clássicos) -->

# Conceito 6 — Sincronização e Semáforos (Race Conditions, Peterson, Secções Críticas, POSIX Semaphores e Problemas Clássicos)

No contexto de sistemas multiprogramados, processos concorrentes que cooperam entre si podem aceder a áreas de dados partilhadas. Se o acesso a estes dados não for devidamente controlado por mecanismos de sincronização, o estado final das estruturas de dados torna-se não-determinista, originando corrupção e inconsistência de dados.

---

## 6.1. O Problema da Concorrência: Partilha de Dados e Race Conditions

**O Acrónimo Associativo**: **RACE** (**R**ead-modify-write **A**ccess **C**orrupts **E**verything).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e o teu colega de quarto estão a usar a mesma conta partilhada da Uber ou da Amazon para fazer uma encomenda ao mesmo tempo. O saldo da conta é de 50€.
1. O teu telemóvel lê o saldo: "Saldo = 50€".
2. O telemóvel do teu colega lê o saldo no mesmo milissegundo: "Saldo = 50€".
3. Tu compras um carregador de 30€ (o teu telemóvel calcula 50 - 30 = 20€ e envia o pedido de atualização).
4. O teu colega compra uns fones de 40€ (o telemóvel dele calcula 50 - 40 = 10€ e envia o pedido de atualização).
Se o servidor da app não bloquear a escrita concorrente, uma das atualizações vai sobrepor-se à outra. O saldo final pode ficar registado como 20€ ou 10€, e a Uber/Amazon perdeu dinheiro porque processou 70€ de compras com apenas 50€ de saldo real. Esta inconsistência é uma **Race Condition**.

**A Explicação Formal**:
Uma **Race Condition (Corrida de dados)** ocorre quando múltiplos processos ou threads acedem e manipulam simultaneamente uma zona de dados partilhada, em que pelo menos um executa uma operação de escrita. O resultado final da execução depende estritamente da ordem não-determinística com que as instruções são intercaladas pelo escalonador do sistema operativo.
Ao nível do hardware, uma operação simples em C como `(*shm_counter)++` não é atómica; ela é traduzida pelo compilador em três instruções de assembly distintas:

1. `movl (%rdi), %ecx` (Lê o valor da memória para um registo da CPU).
2. `incl %ecx` (Incrementa o valor no registo).
3. `movl %ecx, (%rdi)` (Escreve o novo valor de volta na memória).

Se ocorrer uma interrupção de relógio (context switch) a meio deste ciclo de três passos, o registo temporário de um processo é guardado e outro processo corre, lendo o valor antigo da memória. Ao repor os contextos, ambos os processos escrevem o mesmo valor final de forma redundante, perdendo-se um dos incrementos.

*(Mapeado de: SCOMP2425-TP9.pdf, SCOMP2526-T6.pdf e ResumoSCOMP.pdf)*

---

## 6.2. O Problema da Secção Crítica

**O Acrónimo Associativo**: **CS** (**C**ontrol **S**equence).

**A Analogia Gen Z / Vida Real**:
Pensa na cabine de WC de um café movimentado. A cabine em si é a **Secção Crítica** (onde apenas uma pessoa pode estar a usufruir do recurso de cada vez).

- **Entry Section**: É o trinco da porta. Tu tentas rodar o trinco para entrar. Se estiver verde, entras e trancas a porta; se estiver vermelho, ficas à espera na fila.
- **Critical Section**: É o momento em que estás lá dentro a usar o WC.
- **Exit Section**: É quando abres a porta e destrancas o trinco, mudando a cor para verde para sinalizar que o próximo da fila já pode entrar.
- **Remainder Section**: Voltar para a mesa do café a beber o teu matcha latte (continuar a executar o resto do código sem tocar no recurso protegido).

**A Explicação Formal**:
Qualquer processo concorrente que manipule variáveis partilhadas possui um segmento de código designado por **Secção Crítica (Critical Section)**. Para evitar a corrupção de dados, o fluxo do programa deve ser estruturado em quatro secções sequenciais:

1. **Entry Section (Secção de Entrada)**: Bloco de código onde o processo solicita permissão explícita para entrar na sua secção crítica (ex: executando um bloqueio ou decrementando um semáforo).
2. **Critical Section (Secção Crítica)**: Onde os dados partilhados são ativamente lidos ou modificados.
3. **Exit Section (Secção de Saída)**: Onde o processo liberta o recurso, permitindo que outros processos pendentes avancem.
4. **Remainder Section (Secção Restante)**: Todo o restante código não relacionado com os recursos partilhados.

*(Mapeado de: SCOMP2526-T6.pdf e ResumoSCOMP.pdf)*

---

## 6.3. Três Requisitos para Soluções da Secção Crítica

**O Acrónimo Associativo**: **MEPB** (**M**utual **E**xclusion, **P**rogress, **B**ounded Waiting).

**A Analogia Gen Z / Vida Real**:
Imagina a cabine de fotos instantâneas num centro comercial:

- **Mutual Exclusion**: Só pode estar um grupo lá dentro a tirar fotos de cada vez. É fisicamente impossível duas sessões de fotos distintas acontecerem na mesma cabine em simultâneo.
- **Progress**: Se a cabine estiver completamente vazia e tu quiseres tirar fotos, ninguém que esteja a passear noutras lojas do shopping (fora da fila da cabine) te pode proibir ou adiar a tua entrada.
- **Bounded Waiting**: Tu estás na fila da cabine. Não podes ficar ali para sempre só porque influencers com passes VIP continuam a passar-te à frente infinitamente. Tem de haver uma regra que garanta que, após um número máximo de pessoas entrarem, chega a tua vez.

**A Explicação Formal**:
Qualquer solução de software ou hardware desenhada para resolver o problema da secção crítica deve satisfazer obrigatoriamente três requisitos fundamentais:

1. **Mutual Exclusion (Exclusão Mútua)**: Se um processo P_i está a executar código dentro da sua secção crítica, nenhum outro processo pode entrar na respetiva secção crítica para o mesmo conjunto de dados partilhados.
2. **Progress (Progressão / Ausência de Deadlock)**: Se nenhum processo está na secção crítica e existem processos que desejam entrar, a decisão de qual será o próximo a entrar não pode ser adiada indefinidamente. Apenas os processos que não estão na sua *Remainder Section* podem participar nessa decisão.
3. **Bounded Waiting (Espera Limitada / Ausência de Starvation)**: Deve existir um limite (bound) no número de vezes que outros processos podem entrar nas suas secções críticas após um processo ter submetido o seu pedido de entrada e antes de esse pedido ser concedido, prevenindo o bloqueio perpétuo do processo solicitante.

*(Mapeado de: SCOMP2526-T6.pdf e ResumoSCOMP.pdf)*

---

## 6.4. Soluções por Software baseadas em Espera Ativa (Active Waiting)

**O Acrónimo Associativo**: **PETA** (**P**eterson's **E**ntry **T**urn **A**lgorithm).

**A Analogia Gen Z / Vida Real**:

- *Algoritmo de Peterson*: Imagina que tu e o teu irmão querem usar o único computador gaming da casa. Para evitar conflitos, vocês usam dois post-its no ecrã (vetor `flag`) e um papel a dizer de quem é a vez (`turn`). Quando tu queres jogar, colas o teu post-it dizendo "Flag[Eu] = TRUE". No entanto, de forma educada, escreves no papel "Turn = Irmão" (dás a vez ao outro primeiro). Tu só começas a jogar se o teu irmão não quiser jogar (Flag[Irmão] == FALSE) ou se for o teu turno (Turn == Eu).
- *Algoritmo da Padaria (Bakery)*: É o sistema de senhas digitais de um balcão de atendimento de uma loja da Apple. Tu chegas, carregas no ecrã e tiras uma senha numerada. O cliente com o número mais baixo é sempre atendido primeiro. Se duas pessoas tirarem o mesmo número devido a um atraso no ecrã tátil, o desempate é feito por ordem alfabética do nome.

**A Explicação Formal**:

- **Algoritmo de Peterson**: Uma solução puramente de software restrita a **dois processos** (P_0 e P_1) que alternam a execução. Partilha duas estruturas de dados:
- `boolean flag`: Inicializado a `false`. Indica a intenção de cada processo de entrar na secção crítica.
- `int turn`: Indica a quem pertence a vez de entrar.

O código para o processo P_i (sendo j = 1 - i) é:

```c
flag[i] = true;
turn = j;
while (flag[j] && turn == j); // Espera ativa (spinning)
/* SECÇÃO CRÍTICA */
flag[i] = false;
```

*Limitação Crítica em Hardware Moderno*: Este algoritmo assume **Consistência Sequencial**. No entanto, os compiladores e os processadores modernos reordenam agressivamente as instruções de leitura e escrita para otimizar pipelines e caches. Sem a inserção de instruções de barreira de memória (*Memory Fences*), o algoritmo de Peterson falha por completo em CPUs modernos, permitindo acessos simultâneos na secção crítica.

- **Bakery Algorithm (Algoritmo de Lamport)**: Estende a exclusão mútua a N processos. Cada processo obtém um número de bilhete (ticket) ao chegar. O processo com o menor par ordenado `(number[i], i)` entra na secção crítica. Se `number[i] == number[j]`, desempata o identificador do processo i < j. Utiliza o vetor `boolean choosing[N]` para garantir que o cálculo do número máximo de bilhete (`max(...) + 1`) terminou antes de o processo ser avaliado na fila de espera.

*(Mapeado de: SCOMP2526-T6.pdf e ResumoSCOMP.pdf)*

---

## 6.5. Soluções por Hardware: Instruções Atómicas

**O Acrónimo Associativo**: **ATOM** (**A**tomic **T**est-and-set **O**perating **M**achine).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a tentar reservar o último bilhete disponível para o concerto do *Travis Scott* ou do *Coldplay* na Ticketline. Se dez mil pessoas clicarem em "Comprar" no mesmo milissegundo, a base de dados do servidor do site tem de executar uma operação atómica de "verificar se o bilhete está livre e, se sim, marcá-lo como vendido instantaneamente numa única ação indivisível". Se o sistema fizesse isto em dois passos separados (primeiro ler se está livre e depois marcar), milhares de pessoas compravam o mesmo bilhete físico. As instruções de hardware como `cmpxchg` fazem este bloqueio atómico a nível do chip.

**O Explicação Formal**:
Para simplificar a exclusão mútua por software, os processadores fornecem instruções de assembly especiais e privilegiadas que são executadas como **uma unidade indivisível (atómica)** no hardware, trancando o barramento de memória de modo a impedir que outros cores alterem a palavra física durante a operação:

- **Test-and-Set / `cmpxchg` (Compare-and-Swap)**: Lê o conteúdo de uma variável de memória, compara com um valor esperado e, se forem iguais, substitui o conteúdo por um valor novo de forma totalmente atómica.
- **Swap / `xchg`**: Troca de forma atómica o conteúdo de duas palavras de memória.

Com estas instruções, os programadores de sistemas operativos conseguem desenhar primitivas de sincronização de alto nível (como mutexes e semáforos) livres de falhas de reordenação.

*(Mapeado de: SCOMP2526-T6.pdf)*

---

## 6.6. Semáforos (Semaphores) e o seu Funcionamento Interno

**O Acrónimo Associativo**: **SEMA** (**S**ynchronized **E**vent **M**utex **A**llocator).

**A Analogia Gen Z / Vida Real**:
Pensa num parque de estacionamento subterrâneo inteligente com painéis digitais à entrada:

- O painel digital marca um contador (o valor do semáforo).
- **`down()` / `sem_wait()`**: Quando um carro se aproxima da barreira de entrada, o sistema faz um decremento ao contador. Se o painel marcava 2 (vagas livres), passa a 1 e o carro entra. Se o painel marcar 0, a barreira não sobe; o carro fica parado à entrada (o processo bloqueia passivamente e vai para a fila de espera, desligando o motor para poupar energia).
- **`up()` / `sem_post()`**: Quando um carro sai do parque, passa pelo sensor de saída, que incrementa o contador. O sistema envia um sinal luminoso e destranca a barreira do primeiro carro que estava bloqueado à entrada, deixando-o passar.

**A Explicação Formal**:
Um semáforo é um objeto de sincronização fornecido pelo sistema operativo que gere uma variável inteira não-negativa protegida s e uma fila de processos bloqueados à espera de recursos. Cumpre o seguinte invariante de Dijkstra: **o valor do semáforo nunca pode ser inferior a zero (s ≥ 0)**.
A manipulação de um semáforo faz-se exclusivamente através de duas funções atómicas garantidas pelo kernel:

- **`down(s)` / `sem_wait(s)`**: Tenta decrementar o contador do semáforo em 1 unidade.
- Se s > 0: decrementa imediatamente e o processo continua.
- Se s == 0: o processo é **bloqueado de forma passiva**, removido da *Ready Queue* da CPU, inserido na fila de espera associada ao semáforo e colocado em estado *Waiting/Blocked*.
- **`up(s)` / `sem_post(s)`**: Incrementa o contador do semáforo em 1 unidade.
- Se existirem processos bloqueados na fila de espera do semáforo, o kernel acorda pelo menos um deles, movendo-o de volta para a *Ready Queue* para que possa decrementar e prosseguir.

*(Mapeado de: SCOMP2425-TP9.pdf, SCOMP2526-T6.pdf, ResumoSCOMP.pdf e SCOMP Reference Sheet.pdf)*

---

## 6.7. API POSIX para Semáforos em C

**O Acrónimo Associativo**: **POSIX** (**P**ortable **O**perating **S**ystem **I**nterface for **X**-sync).

**A Analogia Gen Z / Vida Real**:
É exatamente o mesmo que gerires convites digitais de acesso a uma sala privada de chat ou a uma mesa VIP num clube:

- **`sem_open()`**: Registar o nome da mesa VIP no sistema ("/vip_mesa") com 5 lugares iniciais.
- **`sem_wait()`**: Usar o teu passe para entrar na mesa (gasta um lugar dos 5).
- **`sem_trywait()`**: Espreitar a mesa para ver se há lugar livre. Se estiver cheia, não ficas ali parado a fazer fila; vais embora fazer outra coisa de imediato.
- **`sem_timedwait()`**: Esperar na fila da mesa apenas durante 10 minutos. Se não entrares até lá, desistes e vais embora.
- **`sem_post()`**: Sair da mesa e libertar o lugar para o próximo da fila.
- **`sem_unlink()`**: Apagar o nome da mesa VIP do sistema central de reservas.

**A Explicação Formal**:
A nível de programação em C no Linux, a biblioteca POSIX `<semaphore.h>` disponibiliza as seguintes funções nativas:

- `sem_t *sem_open(const char *name, int oflag, mode_t mode, unsigned int value)`: Cria ou abre um semáforo nomeado no sistema.
- `name`: Identificador que obrigatoriamente deve começar por `/`.
- `oflag`: Permite passar `O_CREAT` (criar se não existir) e `O_EXCL` (forçar erro caso já exista).
- `mode`: Permissões do Linux (ex: `0644` ou `S_IRUSR | S_IWUSR` para ler/escrever).
- `value`: Valor inicial do contador do semáforo.
- `int sem_wait(sem_t *sem)`: Operação `down` bloqueante. Decrementa o semáforo ou adormece o processo.
- `int sem_trywait(sem_t *sem)`: Versão não bloqueante de `sem_wait`. Se o semáforo for 0, retorna de imediato o valor `-1` com a variável `errno` definida para `EAGAIN` em vez de bloquear.
- `int sem_timedwait(sem_t *sem, const struct timespec *abs_timeout)`: Bloqueia o processo, mas apenas até o temporizador atingir o limite especificado em `abs_timeout`. Se o tempo expirar, retorna `-1` com `errno = ETIMEDOUT`.
- `int sem_post(sem_t *sem)`: Operação `up` atómica. Incrementa o semáforo e acorda processos suspensos.
- `int sem_getvalue(sem_t *sem, int *sval)`: Lê o valor atual do contador do semáforo e guarda-o na variável apontada por `sval`.
- `int sem_close(sem_t *sem)`: Fecha a ligação local do processo ao semáforo.
- `int sem_unlink(const char *name)`: Remove o nome do semáforo do sistema. O semáforo físico é eliminado do kernel assim que todos os processos ativos fecharem os seus descritores.

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP9.pdf e ResumoSCOMP.pdf)*

---

## 6.8. Problema Clássico: Produtor-Consumidor (Bounded Buffer)

**O Acrónimo Associativo**: **PROCON** (**P**roducer **R**esource **O**rdered **C**onsumer **O**ptimized **N**etwork).

**A Analogia Gen Z / Vida Real**:
Imagina uma cozinha de *fast food* com uma estufa de aquecimento de hambúrgueres que leva no máximo 10 unidades (o buffer circular de tamanho N = 10).

- **Produtores (Cozinheiros)**: Fazem hambúrgueres. Eles só podem colocar um hambúrguer na estufa se houver prateleiras vazias (**`empty` / slots**). Se a estufa estiver cheia (empty == 0), eles têm de parar e esperar.
- **Consumidores (Empregados de Balcão)**: Vendem hambúrgueres. Eles só podem retirar um hambúrguer se houver comida na estufa (**`full` / items**). Se a estufa estiver vazia (full == 0), eles têm de esperar que os cozinheiros façam mais comida.
- **Mutex**: Apenas um funcionário pode meter a mão dentro da estufa de cada vez para não chocarem os braços lá dentro e deixarem cair os hambúrgueres.

**A Explicação Formal**:
Este padrão gere o acesso concorrente a um buffer circular de tamanho N utilizando três semáforos distintos:

1. `sem_t *mutex` (Inicializado a `1`): Garante exclusão mútua total no acesso físico aos ponteiros e arrays do buffer circular.
2. `sem_t *slots` ou `empty` (Inicializado a `N`): Conta as posições livres disponíveis no buffer.
3. `sem_t *items` ou `full` (Inicializado a `0`): Conta os elementos atualmente preenchidos e prontos a consumir.

**Implementação Correta em C**:

```c
// PRODUTOR
void producer(int item) {
    sem_wait(slots);       // Decrementa vagas livres (espera se buffer estiver cheio)
    sem_wait(mutex);       // Garante acesso exclusivo
    buffer[in] = item;
    in = (in + 1) % N;
    sem_post(mutex);       // Liberta acesso exclusivo
    sem_post(items);       // Incrementa itens prontos (sinaliza consumidor)
}

// CONSUMIDOR
int consumer() {
    int item;
    sem_wait(items);       // Decrementa itens prontos (espera se buffer estiver vazio)
    sem_wait(mutex);       // Garante acesso exclusivo
    item = buffer[out];
    out = (out + 1) % N;
    sem_post(mutex);       // Liberta acesso exclusivo
    sem_post(slots);       // Incrementa vagas livres (sinaliza produtor)
    return item;
}
```

*O Bug do Deadlock Clássico*: Se o programador alterar a ordem dos bloqueios colocando o `sem_wait(mutex)` **antes** do `sem_wait(slots/items)`, o sistema entra em **Deadlock imediato** se o buffer estiver cheio/vazio. Por exemplo, o consumidor tranca o `mutex`, mas fica adormecido no `sem_wait(items)` porque o buffer está vazio. O produtor acorda, mas fica bloqueado no `sem_wait(mutex)` que está na posse do consumidor. Ambos os processos ficam eternamente adormecidos à espera um do outro.

*(Mapeado de: SCOMP2526-T6.pdf, SCOMP2526-T7.pdf e ResumoSCOMP.pdf)*

---

## 6.9. Problema Clássico: Leitores-Escritores (Readers-Writers)

**O Acrónimo Associativo**: **RW** (**R**eaders **W**riters).

**A Analogia Gen Z / Vida Real**:
Pensa na página de perfil de um artista gigante de música (como a *Taylor Swift* ou o *The Weeknd*) na base de dados da Wikipédia:

- **Leitores (Fãs)**: Podem estar 10.000 pessoas em simultâneo a ler a página (leitura concorrente de dados não altera nada na base de dados, logo é 100% seguro).
- **Escritores (Editores)**: Apenas um administrador de cada vez pode estar a editar a biografia (escrita exige acesso exclusivo). Se um editor estiver a escrever, mais ninguém pode estar a ler a biografia a meio, sob o risco de apanharem frases incompletas ou dados inconsistentes.

**A Explicação Formal**:
Este problema modela o acesso a uma base de dados partilhada. Divide-se em duas abordagens clássicas de prioridade:

- **Primeiro Problema (Prioridade aos Leitores)**: Nenhum leitor deve ser mantido à espera a menos que um escritor já tenha obtido acesso exclusivo. Se houver leitores ativos, novos leitores entram sem esperar, mesmo que haja um escritor na fila.
- *Variáveis Partilhadas*: `int readcnt = 0` (conta leitores no interior), semáforo `mutex_rc = 1` (protege a variável `readcnt`), semáforo `mutex_data = 1` (protege a escrita física de dados).

```c
// LEITOR
sem_wait(mutex_rc);
readcnt++;
if (readcnt == 1) sem_wait(mutex_data); // O primeiro leitor a entrar tranca os escritores
sem_post(mutex_rc);

/* LEITURA DE DADOS OCORRE AQUI (Múltiplos leitores em simultâneo) */

sem_wait(mutex_rc);
readcnt--;
if (readcnt == 0) sem_post(mutex_data); // O último leitor a sair destranca os escritores
sem_post(mutex_rc);

// ESCRITOR
sem_wait(mutex_data); // Acesso exclusivo à escrita
/* ESCRITA DE DADOS */
sem_post(mutex_data);
```

*Limitação de Liveness*: Este modelo causa **Starvation (fome) dos escritores**. Se houver um fluxo contínuo e infinito de leitores a chegar, o `readcnt` nunca chega a zero e os escritores nunca conseguem obter o bloqueio `mutex_data`.

- **Segundo Problema (Prioridade aos Escritores)**: Quando um escritor fica pronto a escrever, este tem prioridade absoluta sobre os leitores. Novos leitores que cheguem à fila ficam bloqueados até que todos os escritores pendentes concluam as suas escritas. Exige semáforos adicionais de controlo como `wrt` e `r`.

*(Mapeado de: SCOMP2526-T8.pdf e ResumoSCOMP.pdf)*

---

## 6.10. Problema Clássico: Jantar dos Filósofos (Dining Philosophers)

**O Acrónimo Associativo**: **DINER** (**D**eadlock **I**ncurred on **N**on-asymmetric **E**ating **R**esources).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e mais 4 amigos estão sentados numa mesa redonda a comer uma fondue chinesa de massa. Na mesa existem apenas 5 pauzinhos (utensílios) individuais intercalados entre vocês. Para comer, qualquer pessoa precisa obrigatoriamente de pegar nos dois pauzinhos que estão imediatamente ao seu lado (o da esquerda e o da direita).
Se todos vocês decidirem, ao mesmo segundo exato, esticar o braço direito e pegar no pauzinho da direita (**Espera Circular**), todos ficam com um único pauzinho na mão. Agora, todos ficam parados a olhar para o amigo do lado à espera que ele liberte o outro pauzinho para poderem comer. Ninguém consegue comer, ninguém larga o seu pauzinho: a mesa inteira congelou em **Deadlock**.

**A Explicação Formal**:
Este problema modela os desafios de alocar múltiplos recursos físicos de capacidade limitada entre processos concorrentes sem causar impasses. Numa mesa de 5 filósofos, cada pauzinho é gerido por um semáforo binário `chopstick` inicializado a `1`.

- *Cenário de Deadlock*: Cada filósofo i executa `down(chopstick[i])` e de seguida `down(chopstick[(i+1)%5])`. Sob concorrência simétrica pura, todos podem reter o seu pauzinho direito em simultâneo, ficando suspensos no segundo bloqueio indefinidamente.
- *Soluções de Desenho para Evitar Deadlock*:
- **Limitação de Lotação**: Permitir que apenas no máximo 4 filósofos se sentem à mesa em simultâneo.
- **Acesso Atómico**: Um filósofo só pode pegar nos pauzinhos se ambos estiverem disponíveis (usando uma secção crítica protegida por um mutex).
- **Solução Assimétrica (Par/Ímpar)**: Filósofos com ID par pegam primeiro no pauzinho da esquerda e depois no da direita; filósofos com ID ímpar fazem o oposto. Isto quebra a simetria de espera circular.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 6.11. O Barbeiro Dorminhoco e a Barreira de Sincronização

**O Acrónimo Associativo**: **BAR** (**B**arrier **A**lignment **R**equirement).

**A Analogia Gen Z / Vida Real**:

- **Barbeiro Dorminhoco (Sleeping Barber)**: É a receção de um consultório médico de atendimento urgente com 5 cadeiras na sala de espera. Se não houver doentes, o médico adormece no seu gabinete. Se chega um doente e o médico está a dormir, o doente acorda-o e é atendido. Se o médico estiver a atender e houver cadeiras livres, o doente senta-se na sala de espera. Se todas as 5 cadeiras estiverem ocupadas, o doente vai-se embora de imediato para outra clínica.
- **Barreira (Barrier)**: É o *Lobby* de preparação de uma equipa num jogo de *Valorant* ou *Counter-Strike*. Vocês são 5 jogadores na equipa. Nenhum de vocês pode entrar no servidor físico de combate de forma isolada; todos têm de se juntar no lobby, carregar em "Pronto" e, no instante em que o último jogador entrar e carregar em pronto (atingirem a barreira de sincronização), o ecrã de carregamento é desbloqueado em simultâneo para todos.

**A Explicação Formal**:

- **Sleeping Barber**: Utiliza três semáforos: `cliente` (conta doentes na fila, inicia a `0`), `barbeiro` (disponibilidade do barbeiro, inicia a `0`) e um `mutex` para proteger a variável partilhada `lugares_vazios`. Se um processo cliente chega e `lugares_vazios == 0`, executa `exit()` e vai-se embora. Caso contrário, reduz `lugares_vazios`, incrementa `cliente` (acorda o barbeiro) e bloqueia à espera no semáforo `barbeiro`.
- **Synchronization Barrier**: Mecanismo que força um conjunto de threads ou processos concorrentes a bloquear e aguardar num ponto específico até que um número predefinido N de participantes atinja esse mesmo ponto, momento em que todos são libertados em simultâneo para prosseguir. É implementado mantendo um contador partilhado protegido por exclusão mútua (`sem_nproc`). Quando uma thread chega, incrementa o contador. Se o contador for inferior a N, a thread bloqueia passivamente num semáforo de barreira (`sem_barrier` inicializado a `0`). A última thread a chegar, ao detetar que o contador atingiu o valor N, executa múltiplos `sem_post()` sucessivos para acordar todos os processos retidos na barreira antes de continuar.

*(Mapeado de: SCOMP2425-TP10.pdf, ResumoSCOMP.pdf e SCOMP2425-TP12.pdf)*

---

## 6.12. Riscos de Liveness: Deadlock, Livelock e Starvation

**O Acrónimo Associativo**: **DEAD** (**D**eadlock **E**ntails **A**bsolute **D**evastation).

**A Analogia Gen Z / Vida Real**:

- **Deadlock**: Duas pessoas vão a andar num corredor estreito e encontram-se de frente. Nenhuma delas se move e ficam a olhar uma para a outra infinitamente sem dar um passo.
- **Livelock**: No mesmo corredor estreito, as duas pessoas tentam desviar-se de forma ativa. Elas andam para a esquerda ao mesmo tempo, depois para a direita ao mesmo tempo, oscilando continuamente de um lado para o outro. Elas estão a consumir energia de forma ativa (gastar CPU), mas não fazem qualquer progresso real e continuam presas no mesmo ponto.
- **Starvation**: Estás na fila normal de entrada de uma discoteca super exclusiva. A discoteca tem um fluxo constante de pessoas com passes VIP que chegam mais tarde, mas têm prioridade absoluta de entrada. O segurança da porta deixa sempre entrar os VIPs primeiro. Como os VIPs não param de chegar, tu ficas na fila normal para sempre sem nunca conseguir entrar.

**A Explicação Formal**:
Estes três fenómenos representam falhas graves na propriedade de **Liveness (Vivacidade)** de um sistema concorrente:

- **Deadlock (Impasse)**: Ocorre quando dois ou mais processos ficam bloqueados permanentemente porque cada um retém um recurso que o outro necessita, gerando um ciclo de dependências infinitas. Segundo os critérios de Coffman, exige quatro condições simultâneas:
- *Mutual Exclusion*: Recursos em modo não-partilhável.
- *Hold and Wait*: Processos retêm recursos enquanto esperam por outros.
- *No Preemption*: Recursos não podem ser retirados de forma forçada.
- *Circular Wait*: Existe uma cadeia circular de processos em que cada um espera por um recurso retido pelo seguinte.
- *Mitigações*: **Lock Ordering** (definir uma ordem estrita e global de aquisição de trancas com base em IDs para quebrar a espera circular) ou o uso de primitivas não-bloqueantes com limites de tempo (`sem_trywait` ou `sem_timedwait`) com estratégias de libertação de recursos em caso de falha para evitar o *Hold and Wait*.
- **Livelock**: Semelhante ao deadlock, mas os processos alteram ativamente os seus estados internos de forma coordenada e repetida em resposta às reações uns dos outros, consumindo 100% de CPU sem realizar qualquer progresso útil. É mitigado forçando cada processo a aguardar um tempo aleatório (*Random Backoff*) antes de tentar repetir a ação falhada.
- **Starvation (Fome)**: Situação onde um processo elegível para correr nunca obtém acesso ao recurso ou à CPU devido a decisões de escalonamento ou regras de prioridade injustas. É mitigado através de mecanismos de **Aging (Envelhecimento)** geridos pelo escalonador do SO, que aumentam gradualmente a prioridade dos processos à medida que estes permanecem em fila de espera.

*(Mapeado de: SCOMP2526-T7.pdf, SCOMP2526-T8.pdf e ResumoSCOMP.pdf)*

---

## 6.13. Granularidade de Tranca: Coarse-Grained vs. Fine-Grained e Hand-Over-Hand Locking

**O Acrónimo Associativo**: **GRAIN** (**G**ranular **R**esource **A**llocation **I**ncreasing **N**on-contention).

**A Analogia Gen Z / Vida Real**:

- **Coarse-Grained Locking**: Imagina que queres ir à casa de banho do teu ginásio de SCOMP. Para garantir a privacidade, o ginásio decide colocar uma tranca eletrónica na porta principal exterior do edifício. Se tu entrares no edifício para ir ao WC, mais ninguém em toda a faculdade pode entrar no ginásio para treinar ou beber água. É seguro e fácil de gerir, mas a eficiência do ginásio cai para zero.
- **Fine-Grained Locking**: Cada cabine de WC e cada cacifo individual tem o seu próprio trinco eletrónico independente. Agora, 100 pessoas podem usar o ginásio concorrentemente, desde que não tentem abrir o mesmo cacifo em simultâneo.
- **Hand-Over-Hand Locking**: Imagina que estás a subir uma escada de corda vertical ou a progredir ao longo de uma ponte suspensa feita de tábuas de madeira frágeis. Para progredir em segurança concorrente com outros amigos, tu agarras na tábua A à tua frente. Só quando tiveres a mão firme na tábua B seguinte é que largas a tábua A anterior. Isto garante que ninguém que venha atrás de ti te deita abaixo e que o Snapshot da tua subida é consistente.

**A Explicação Formal**:
O nível de granularidade dita a quantidade de dados protegidos por uma única primitiva de sincronização:

- **Coarse-Grained Locking**: Utiliza poucas trancas para proteger grandes volumes de dados (ex: um único semáforo para trancar uma base de dados inteira com milhões de contas bancárias). É simples de programar e livre de deadlocks, mas cria estrangulamentos de performance maciços sob concorrência devido à elevada contenção.
- **Fine-Grained Locking**: Divide as estruturas de dados em pequenas secções individuais, cada uma com a sua tranca (ex: cada conta bancária ou nó de uma lista ligada tem o seu próprio semáforo). Maximiza o paralelismo real e o débito de dados, mas exige uma lógica de gestão complexa e aumenta drasticamente o risco de deadlocks por espera circular.
- **Hand-Over-Hand Locking (Trancamento Passo-a-Passo)**: Técnica aplicada em estruturas lineares indexadas (como listas ligadas concorrentes). Em vez de trancar a lista inteira a partir do ponteiro `head`, uma thread adquire uma tranca de leitura no nó atual N, avança para o nó seguinte N+1, adquire a tranca em N+1 e apenas depois liberta a tranca do nó anterior N. Isto permite que múltiplas threads percorram a mesma lista de forma segura e paralela, minimizando a contenção a elementos adjacentes.

*(Mapeado de: SCOMP2526-T7.pdf e SCOMP2526-T8b.pdf)*
