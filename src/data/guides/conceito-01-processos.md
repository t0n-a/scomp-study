<!-- topic: processes | title: Conceito 01 — Processos: criação e ciclo de vida -->
# Conceito 1 — O Conceito de Processo, Criação e Ciclo de Vida

Tudo o que é preciso saber sobre processos: o que são, como nascem (`fork`), como mudam de pele (`exec`), como morrem (zombies, órfãos, `wait`) e como o SO os organiza.

---

## 1.1. Programa vs. Processo

**O Acrónimo Conetivo**: **PvP** (**P**assivo **v**ersus **P**otente — Programa vs. Processo)

**A Analogia Gen Z / Vida Real**:
O programa é a app instalada no teu telemóvel: um ícone parado no ecrã, bytes mortos no armazenamento — pode lá estar meses sem fazer rigorosamente nada. O processo é o que acontece quando tocas no ícone: a app abre, ganha memória própria, começa a gastar bateria e a reagir aos teus toques. E se abrires duas janelas do Chrome lado a lado, tens **dois processos independentes** nascidos do **mesmo programa** — cada um com os seus separadores, a sua memória e a sua vida. Fechar um não afeta o outro.

**A Explicação Formal**:
Um **programa** é uma entidade passiva (um ficheiro executável no disco), enquanto um **processo** é uma entidade ativa, descrita como "uma instância de um programa em execução". O processo fornece a cada programa a ilusão de ter exclusividade sobre a máquina através de duas abstrações: um **espaço de endereçamento privado** (provido por memória virtual) e um **fluxo de controlo lógico privado** (provido por escalonamento de CPU). Um processo consiste nas instruções do programa (*program text*), no estado da CPU (program counter, registos, flags), no estado de memória (stack, heap, dados) e nos recursos do sistema (como a tabela de descritores de ficheiros abertos).

*(Mapeado de: SCOMP2526-T1.pdf, SCOMP2526-T3.pdf, SCOMP2425-TP1.pdf e ResumoSCOMP.pdf)*

---

## 1.2. User Space vs. Kernel Space e System Calls

**O Acrónimo Conetivo**: **VIP** (**V**ery **I**mportant **P**rivileges — o Kernel Mode é a zona VIP)

**A Analogia Gen Z / Vida Real**:
Estás num festival de verão com a pulseira normal (**User Mode**). Podes circular pelo recinto, mas não podes entrar no backstage nem mexer na mesa de som (hardware, memória protegida) — se saltares a vedação, a segurança expulsa-te no segundo seguinte (exceção → processo terminado). Se precisares de algo do backstage (ler um ficheiro do disco), falas com o segurança do portão (**system call / trap**): ele tem pulseira de staff (**Kernel Mode**), entra por ti, faz o que pediste em segurança e traz-te o resultado cá para fora. E tal como ninguém fala diretamente com o segurança sem a app do festival, tu raramente invocas syscalls à mão — usas as **wrapper functions** da biblioteca C (`printf`, `fopen`), que tratam da burocracia por ti.

**A Explicação Formal**:
Para proteger o sistema contra falhas e acessos maliciosos, os processadores modernos fornecem suporte a múltiplos modos de operação:

- **User Mode (Modo Utilizador)**: Modo não privilegiado onde correm as aplicações. Qualquer tentativa direta de aceder a instruções protegidas, hardware ou memória fora do limite do processo causa uma exceção imediata (trap) e o término do processo.
- **Kernel Mode (Modo Kernel)**: Modo privilegiado com acesso total a todas as instruções da CPU, hardware, dispositivos de E/S e a todo o espaço de memória física.
- **System Calls (Chamadas de Sistema)**: A interface padrão para as aplicações solicitarem serviços privilegiados ao kernel (ex: `open`, `read`, `write`, `fork`). O processo coloca os argumentos nos registos da CPU e executa a instrução `syscall` (que causa um *trap* de hardware). O hardware altera o nível para modo kernel e salta para o tratador de chamadas de sistema, que executa o serviço de forma controlada.
- **Wrapper Functions**: Na prática, o programador C usa funções de biblioteca padrão (ex: `glibc`, como `fopen()` e `printf()`), que agem como embalagens que gerem a transferência de registos e executam o *trap* de sistema de forma transparente.

*(Mapeado de: SCOMP2526-T2.pdf, SCOMP2526-T1b.pdf e ResumoSCOMP.pdf)*

---

## 1.3. Criação de Processos com `fork()` e Copy-on-Write (COW)

**O Acrónimo Conetivo**: **CLONE** (**C**opied **L**azily **O**n **N**ext **E**dit — a essência do Copy-on-Write)

**A Analogia Gen Z / Vida Real**:
O `fork()` é como abrires um template no Canva. No instante em que o abres, aquilo que vês é **exatamente** o design original — e, espertamente, o Canva não gastou espaço nenhum a copiar: estás literalmente a olhar para os mesmos ficheiros que toda a gente (páginas de memória partilhadas). Só no momento em que tu escreves a primeira letra é que aparece o aviso "a criar a tua cópia..." — e a partir daí tens o TEU ficheiro, separado do original (**Copy-on-Write**: a página só é duplicada quando alguém escreve).
E o retorno duplo? Pensa numa videochamada contigo próprio: a mesma chamada aparece em dois ecrãs, mas cada ecrã sabe quem é — no ecrã do pai aparece o número do filho (PID > 0), no ecrã do filho aparece `0`.

**A Explicação Formal**:
A criação de processos em Linux/UNIX baseia-se na duplicação através da função `pid_t fork()`. O processo que efetua a chamada é o "pai" e o processo recém-criado é o "filho". Inicialmente, ambos partilham a mesma zona de código (que é read-only). Os segmentos de dados, heap e stack são inicialmente partilhados de forma virtual através de **Copy-on-Write (COW)**: as páginas físicas de memória permanecem partilhadas até que o pai ou o filho tente efetuar uma escrita. Nesse momento, o SO duplica a página física de memória específica, aplicando a alteração de forma isolada sem afetar o outro processo.
A função `fork()` possui um comportamento único: **é chamada uma vez, mas retorna duas vezes**:

- No processo **pai**: retorna o **PID do filho** (valor > 0).
- No processo **filho**: retorna o valor **`0`**.

*(Mapeado de: SCOMP2425-TP1.pdf, SCOMP2526-T3.pdf e ResumoSCOMP.pdf)*

---

## 1.4. Ciclo de Vida e Estados de um Processo

**O Acrónimo Conetivo**: **GAMER** (**G**erado → **A**guarda → **M**anda → **E**mperrado → **R**eformado = New → Ready → Running → Waiting → Terminated)

**A Analogia Gen Z / Vida Real**:
O ciclo de vida de um processo é uma partida de um jogo online competitivo:

- **New (Gerado)**: estás a criar a conta e a instalar o jogo (o SO cria o PCB).
- **Ready (Aguarda)**: estás no lobby, na queue do matchmaking, pronto a jogar — só esperas que o servidor te chame (a *Ready Queue* do escalonador).
- **Running (Manda)**: estás in-game, a jogar de verdade (instruções a correr na CPU — só um jogador por core de cada vez).
- **Waiting/Blocked (Emperrado)**: apareceu "a descarregar atualização — 87%"; não podes fazer NADA até o download acabar (E/S). Quando acaba, não voltas direto ao jogo: voltas à queue (**Ready**, não Running!).
- **Terminated (Reformado)**: desinstalaste o jogo / fizeste `exit()`.

**A Explicação Formal**:
O kernel do sistema operativo faz a gestão de processos movendo-os por diversos estados ao longo da sua execução:

- **New**: O processo está em criação; o kernel cria a sua estrutura de dados interna de controlo, o **Process Control Block (PCB)** (em Linux, a estrutura `struct task_struct`).
- **Ready**: O processo está carregado em memória física e pronto a executar, aguardando que o escalonador lhe atribua tempo de CPU. Estes processos são encadeados na *Ready Queue*.
- **Running**: As instruções do processo estão a correr num core da CPU. Apenas um processo pode estar neste estado por core de CPU num dado instante.
- **Waiting / Blocked**: O processo solicitou um recurso demorado (ex: leitura de ficheiro) ou aguarda um sinal, ficando impossibilitado de progredir. O processo é colocado na *Wait Queue* do respetivo recurso, libertando a CPU. Quando a operação de E/S é concluída, um sinal de interrupção faz com que o tratador mova o processo de volta para o estado *Ready*.
- **Terminated**: O processo terminou e aguarda que o seu pai recolha os dados de saída.

*(Mapeado de: SCOMP2425-TP2.pdf, SCOMP2526-T11.pdf, SCOMP2526-T3.pdf, ResumoSCOMP.pdf e SCOMP2526-T5.pdf)*

---

## 1.5. Processos Zombies e Órfãos

**O Acrónimo Conetivo**: **RIP** (**R**eaping **I**s **P**eace — um zombie só descansa quando o pai faz `wait()`)

**A Analogia Gen Z / Vida Real**:
Um filho que termina é como uma encomenda entregue num cacifo: o estafeta já foi embora (a memória e os recursos foram libertados), mas o cacifo continua ocupado com o talão lá dentro (a entrada na tabela de processos com o exit status). O cacifo só fica livre quando TU o abres com o código (`wait()` — o famoso *reaping*). Se nunca fores buscar as encomendas, os cacifos enchem-se todos — e é assim que zombies esgotam a tabela de processos.
E o **órfão** é o contrário: o dono da conta desapareceu antes do filho terminar. Nesse caso o filho é adotado automaticamente pelo utilizador mais antigo do sistema — o **`init`/`systemd` (PID 1)** — que passa a fazer `wait()` por ele religiosamente, para que nunca se transforme em zombie eterno.

**A Explicação Formal**:

- **Zombie (Defunct)**: Estado em que um processo filho termina antes do pai. O SO liberta a sua memória e recursos físicos, mas mantém a sua entrada na tabela de processos e a informação de término (exit value, sinais). Esta entrada só é libertada quando o pai executa a chamada de sistema `wait()` ou `waitpid()`, num processo conhecido como "reaping" (recolha). Se o pai nunca recolher o filho, o zombie permanece indefinidamente, podendo causar exaustão da tabela de processos.
- **Orphan (Órfão)**: Situação que ocorre quando um processo pai termina antes do processo filho. Os processos órfãos são automaticamente adotados pelo processo `init` ou `systemd` (PID 1) em sistemas Linux/UNIX. O `init`/`systemd` executa periodicamente chamadas `wait()` para recolher o estado destes processos quando estes finalmente terminarem, prevenindo a proliferação de zombies.

*(Mapeado de: SCOMP2425-TP1.pdf, SCOMP2425-TP2.pdf, SCOMP2526-T3.pdf e ResumoSCOMP.pdf)*

---

## 1.6. Sincronização com `wait()`, `waitpid()` e Macros de Término

**O Acrónimo Conetivo**: **WAIT** (**W**atch **A**nd **I**nspect **T**ermination)

**A Analogia Gen Z / Vida Real**:
É o ecrã de tracking da tua encomenda. O `wait(&status)` é ficares especado a olhar para o mapa até o estafeta chegar (bloqueias até UM filho qualquer terminar). O `waitpid(pid, ...)` é seguires UMA encomenda específica em vez de "a próxima que chegar". A flag `WNOHANG` é o pull-to-refresh: espreitas se já chegou, mas não ficas pendurado — se não há novidades, segues com a tua vida.
Quando a encomenda chega, inspecionas o estado com as macros: `WIFEXITED` — foi entregue normalmente? `WEXITSTATUS` — que nota/código veio no talão? `WIFSIGNALED` — foi cancelada a meio por um acidente (sinal)?

**A Explicação Formal**:
O controlo de término e a sincronização simples entre processos pai e filho é gerido pelas funções da biblioteca `<sys/wait.h>`:

- `pid_t wait(int *status)`: Bloqueia a execução do processo chamador (pai) até que um dos seus processos filhos termine. Retorna o PID do filho que terminou e armazena os dados de término no endereço apontado por `status`.
- `pid_t waitpid(pid_t pid, int *status, int options)`: Uma versão mais flexível do `wait`. Permite especificar exatamente qual o filho pelo qual se quer esperar através do argumento `pid`, e configurar comportamentos não bloqueantes (ex: utilizando a flag `WNOHANG` em `options`).
- `WIFEXITED(status)`: Retorna verdadeiro se o filho terminou normalmente (através de `exit()` ou retorno da função `main`).
- `WEXITSTATUS(status)`: Extrai o valor de retorno de 8 bits fornecido pelo filho no término (válido apenas se `WIFEXITED` for verdadeiro).
- `WIFSIGNALED(status)`: Verifica se o processo terminou de forma anormal devido à receção de um sinal não tratado.

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP1.pdf, SCOMP2526-T3.pdf e ResumoSCOMP.pdf)*

---

## 1.7. Funções de Execução da Família `exec()`

**O Acrónimo Conetivo**: **SWAP** (**S**ame **W**rapper, **A**nother **P**rogram — mesma "carcaça", programa novo)

**A Analogia Gen Z / Vida Real**:
Fazer `exec()` é dar flash a uma ROM nova no teu telemóvel. Apagas TUDO o que lá estava — apps, fotos, definições (código, stack, heap, variáveis) — e instalas um sistema completamente diferente. Mas repara no que **não** muda: o número de telefone continua o mesmo (o **PID**), o cartão SIM continua no slot (os **descritores de ficheiros abertos**), e o teu contrato com a operadora mantém-se (o mesmo processo pai).
E há um detalhe fatal: se o flash correr bem, o sistema antigo **nunca mais volta a executar** — a linha a seguir ao `exec()` só corre se o `exec()` FALHAR (retorna −1). É por isso que no exame, quando perguntam "quantas vezes imprime X depois do execlp?", a resposta ignora todo o código após o `exec` bem-sucedido.

**A Explicação Formal**:
As funções `exec` (ex: `execlp`, `execvp`) substituem a imagem do processo corrente por um programa novo e independente.

- **Substituição da imagem**: O código (*text segment*), dados estáticos, heap e a stack do processo original são totalmente eliminados e substituídos pelos dados do ficheiro executável lido do disco.
- **Preservação**: O processo mantém o mesmo **Process ID (PID)**, a mesma relação hierárquica (o mesmo processo pai) e a sua **Tabela de Descritores de Ficheiros** permanece aberta (exceto se configurada especificamente com a flag de fecho em execução).
- **Inexistência de Retorno**: Uma chamada a `exec` com sucesso **nunca retorna** ao código do programa original, uma vez que esse código deixou de existir em memória. Apenas retorna o valor `-1` caso ocorra um erro na localização ou carga do ficheiro executável.

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP2.pdf, SCOMP2425-TP6.pdf e ResumoSCOMP.pdf)*

---

## 1.8. Separação de Mecanismo e Política

**O Acrónimo Conetivo**: **HOW vs WHAT** (Mecanismo = **como** se faz; Política = **o que** se decide fazer)

**A Analogia Gen Z / Vida Real**:
Pensa no TikTok. O **mecanismo** é o player de vídeo: carrega bytes, descodifica, mete o vídeo no ecrã — é igual para toda a gente, ultra-otimizado, e não muda há anos. A **política** é o algoritmo do feed: decidir QUAL o vídeo que aparece a seguir. Podes trocar de política num toque (For You → A seguir → pesquisa) sem que o player mude uma linha. O SO faz igual: o *context switch* e o `mmap` são o player (mecanismo, estável, no kernel); o escalonador decidir quem corre a seguir é o feed (política, configurável).

**A Explicação Formal**:
Este é um princípio crucial na engenharia de sistemas operativos:

- **Mecanismo**: Define **como** algo é feito. Fornece a capacidade funcional básica do sistema, estando fortemente acoplado ao hardware e sendo altamente otimizado e estável ao longo do tempo (ex: alternar de processo, mover páginas, trocar bits de privilégio).
- **Política**: Define **o que** deve ser feito com essa funcionalidade. Trata-se da lógica de decisão de alto nível, sendo dependente do tipo de carga de trabalho e altamente ajustável ao longo do tempo (ex: escolher qual o processo que corre a seguir, decidir que página de memória deve ser enviada para o disco).
- A regra de ouro de desenho dita que os mecanismos devem ser o mais simples e gerais possíveis, enquanto as políticas devem ser configuráveis e fáceis de substituir.

*(Mapeado de: SCOMP2526-T2b.pdf)*

---

## 1.9. Padrões de Design e Arquitetura de Sistemas Operativos

**O Acrónimo Conetivo**: **SM³H** (**S**imple, **M**onolithic, **M**odular, **M**icro, **H**ybrid — as 5 arquiteturas)

**A Analogia Gen Z / Vida Real**:
Formas de organizar um servidor de Discord:

- **Estrutura Simples (MS-DOS)**: servidor sem cargos nem permissões — qualquer membro pode apagar canais e banir gente. Rapidíssimo de gerir, mas um troll deita tudo abaixo (uma app com um bug crasha a máquina inteira).
- **Monolítico (UNIX/Linux)**: um único mega-servidor onde os admins, os bots de música, de moderação e de memes correm todos com permissões máximas no mesmo sítio. Comunicação instantânea entre eles (performance máxima), mas se o bot de música crashar com privilégios de admin, pode levar o servidor todo (pânico no kernel). O Linux é a versão **modular**: podes adicionar e remover bots (Loadable Kernel Modules) sem recriar o servidor.
- **Microkernel (Minix/L4)**: o dono do servidor guarda para si só o mínimo absoluto (criar canais, entregar mensagens — processos e IPC) e tudo o resto (música, moderação, memes) corre em servidores satélite separados, sem privilégios. Se o bot de música arder, o servidor principal nem treme (fiabilidade máxima) — mas cada pedido tem de saltar entre servidores (overhead de mensagens IPC, mais lento).
- **Híbrido (Windows/macOS)**: conceito de microkernel, mas com os serviços críticos puxados de volta para dentro por causa da velocidade.

**A Explicação Formal**:
A organização do software do kernel e dos drivers divide-se em modelos estruturais clássicos:

- **Simple Structure**: Sem clara divisão de privilégios ou módulos; as aplicações têm acesso direto aos recursos físicos e ao código do sistema (ex: MS-DOS). Baixa modularidade e fiabilidade.
- **Monolithic Kernel**: Todos os serviços do SO correm em modo kernel privilegiado partilhando o mesmo espaço de endereçamento (ex: UNIX clássico). Desempenho muito elevado devido à ausência de barreiras de chamada, mas menor fiabilidade, dado que uma falha num driver afeta todo o sistema.
- **Modular Kernel**: Uma evolução do monolítico onde o core permanece privilegiado, mas o kernel é extensível através de módulos dinamicamente carregados em runtime (como os drivers em Linux).
- **Microkernel**: Remove o máximo de serviços possíveis do espaço de kernel, mantendo apenas a abstração de processos, isolamento de memória e facilidades de comunicação IPC no núcleo privilegiado. Todos os restantes serviços (drivers, filesystems) correm como processos normais em espaço de utilizador. Apresenta altíssima robustez e modularidade, mas sofre penalizações de desempenho devido à sobrecarga das trocas de contexto em chamadas de mensagens IPC.
- **Hybrid Kernel**: Adota a estrutura conceptual do microkernel, mas reintroduz serviços cruciais de alta performance diretamente no espaço de kernel privilegiado para evitar perdas de desempenho (ex: macOS, Windows NT).

*(Mapeado de: SCOMP2526-T2b.pdf)*

---

## 1.10. Servidores Baseados em Processos vs. Baseados em Eventos

**O Acrónimo Conetivo**: **EPIC** (**E**vent-loop **P**rocessa **I**mensas **C**onexões — o segredo do Nginx/Node.js)

**A Analogia Gen Z / Vida Real**:
Dois modelos de apoio ao cliente:

- **Baseado em processos**: por cada cliente que abre o chat, a empresa contrata um funcionário novo só para ele (`fork()` por ligação). O atendimento é impecável e isolado — se o teu funcionário se passar, os outros clientes nem reparam. Mas com 10.000 clientes precisas de 10.000 funcionários: o escritório rebenta (memória) e passam o dia a chocar uns com os outros (context switching).
- **Baseado em eventos**: há UM chatbot ultra-rápido (um único processo com um *Event Loop*). Responde-te num segundo e passa logo ao próximo; quando escreves de volta, toca-lhe uma notificação (`select()`/`poll()` deteta o descritor ativo) e ele retoma a TUA conversa onde estava. Escala para milhões de conversas — mas o código do bot é um pesadelo de máquinas de estados em vez de uma conversa linear.

**A Explicação Formal**:
O modelo de programação concorrente em servidores divide-se em abordagens distintas:

- **Process-Based Servers**: O servidor aceita uma ligação e efetua um `fork()` criando um processo filho exclusivo para gerir a comunicação. O fluxo é síncrono e sequencial, facilitando o desenvolvimento devido ao isolamento perfeito (se um filho falhar, o servidor principal continua ativo). O custo é o elevado consumo de memória (cada processo herda espaço e tabelas) e a perda de desempenho ao gerir milhares de processos ativos na CPU.
- **Event-Driven / Asynchronous Servers**: O servidor opera num único fluxo de controlo lógico (*Event Loop*) utilizando chamadas de sistema não bloqueantes (`select`, `poll` ou `epoll`). O processo adormece até que um ou mais descritores de ficheiro fiquem ativos, gerindo as ligações sequencialmente à medida que os eventos ocorrem. Evita totalmente o overhead de criação de processos e comutações de contexto, sendo a escolha ideal para alta concorrência de E/S. Contudo, introduz uma complexidade de desenvolvimento enorme, pois a concorrência tem de ser controlada manualmente ao nível da aplicação através de máquinas de estados.

*(Mapeado de: SCOMP2526-T3.pdf)*
