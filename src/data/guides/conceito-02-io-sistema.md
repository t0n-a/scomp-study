<!-- topic: pipes | title: Conceito 02 — I/O de Sistema: descritores, dup2 e redirecionamento -->

# Conceito 2 — Entrada/Saída ao Nível do Sistema

Um descritor de ficheiro em sistemas POSIX é um número inteiro que identifica de forma única um ficheiro ou recurso aberto pelo sistema. Toda a comunicação com dispositivos de entrada e saída (I/O) é uniformizada sob este conceito através do Virtual File System (VFS), permitindo usar as mesmas chamadas de sistema quer se trate de um ficheiro em disco, de um terminal, de um pipe ou de um socket de rede.

---

## 2.1. A Abstração "Everything is a File" e os Descritores

**O Acrónimo Conetivo**: **FILE** (**F**low of **I**nformation **L**inking **E**verything)

**A Analogia Gen Z / Vida Real**:
É como o feed universal do teu TikTok. Para ti, utilizador, não interessa se o conteúdo que estás a ver é um vídeo gravado há um ano, uma live stream em direto ou um anúncio interativo. A forma como interages com a app é rigorosamente a mesma: arrastar para cima para ler o próximo conteúdo, ou dar double-tap para reagir (escrever). No Linux, o SO unifica todo o hardware e canais de comunicação para que pareçam "ficheiros". Quer estejas a ler do teclado, a receber dados da placa de rede ou a aceder ao disco, a tua app interage exatamente da mesma maneira.

**A Explicação Formal**:
O sistema operativo UNIX/Linux abstrai as particularidades físicas do hardware através de uma camada intermédia chamada **Virtual File System (VFS)**. Esta camada fornece uma interface uniforme e padronizada (System-Level I/O API) baseada em funções comuns como `open()`, `close()`, `read()` e `write()`. Um **Descritor de Ficheiro (File Descriptor - fd)** é simplesmente um índice inteiro não negativo para uma tabela privada gerida pelo kernel (a Descriptor Table). Por convenção do sistema, os três primeiros descritores de qualquer processo estão predefinidos:

- `0`: Entrada padrão (`stdin`).
- `1`: Saída padrão (`stdout`).
- `2`: Erro padrão (`stderr`).

*(Mapeado de: SCOMP2526-T1b.pdf, SCOMP2425-TP5.pdf e ResumoSCOMP.pdf)*

---

## 2.2. Funções Base de I/O de Sistema (`open`, `read`, `write`, `close`, `lseek`)

**O Acrónimo Conetivo**: **ORWCL** (**O**pen, **R**ead, **W**rite, **C**lose, **L**seek)

**A Analogia Gen Z / Vida Real**:
Pensa em usar a app do Spotify.

- **Open**: Carregas numa playlist para começar a sessão.
- **Read**: Estás a ouvir (reproduzir) os bytes de música que entram no teu telemóvel.
- **Write**: Adicionas músicas novas à tua playlist colaborativa.
- **Lseek**: Arrastas o slider da barra de progresso da música para saltar diretamente para a frente ou para trás, procurando o "drop" da música.
- **Close**: Fechas a app para libertar a memória do teu telemóvel e poupar bateria.

**A Explicação Formal**:
As operações básicas ao nível do sistema para manipulação de recursos de E/S assentam nas seguintes chamadas de sistema:

- `int open(const char *pathname, int flags, mode_t mode)`: Abre o recurso e retorna um novo descritor de ficheiro livre. Recebe flags de controlo de acesso (ex: `O_RDONLY`, `O_WRONLY`, `O_CREAT`) e permissões físicas de criação.
- `size_t read(int fd, void *buf, size_t count)`: Copia até `count` bytes do recurso referenciado pelo descritor `fd` para a área de memória apontada por `buf`. Retorna o número de bytes lidos, `0` em caso de End-Of-File (EOF), ou `-1` em erro.
- `size_t write(int fd, const void *buf, size_t count)`: Copia `count` bytes do buffer `buf` para o recurso do descritor `fd`.
- `off_t lseek(int fd, off_t offset, int whence)`: Altera a posição de leitura/escrita (*current file position*) do ficheiro para um novo desvio baseado no ponto de referência `whence` (início, posição atual, ou fim).
- `int close(int fd)`: Desassocia o descritor `fd` do recurso correspondente, libertando o índice na tabela de descritores do processo para reutilização futura.

*(Mapeado de: SCOMP2526-T1b.pdf, SCOMP2425-TP5.pdf e SCOMP2425-TP6.pdf)*

---

## 2.3. A Representação de Ficheiros Abertos pelo Kernel

**O Acrónimo Conetivo**: **DOV** (**D**escriptor, **O**pen file, **V**-node)

**A Analogia Gen Z / Vida Real**:
Imagina que pedes um Uber.

- A **Descriptor Table** (privada do teu telemóvel) contém os teus identificadores locais de apps abertas. O teu ecrã diz "Corrida Ativa #3". No telemóvel de outra pessoa, a app dela pode dizer "Corrida Ativa #1", mas ambas as referências apontam para a mesma viagem física real.
- A **Open File Table** (partilhada globalmente nos servidores da Uber) guarda o estado ativo da corrida: a posição GPS atual do carro no mapa (file position) e quantas pessoas estão juntas a partilhar o mesmo carro (reference count).
- A **v-node Table** (partilhada globalmente) representa o veículo físico no mundo real: a matrícula, a cor do carro, o modelo e as propriedades estruturais (file size, file type e metadados).

**A Explicação Formal**:
O kernel do Linux representa os ficheiros abertos através de três estruturas de dados distintas e interligadas:

1. **Descriptor Table**: Uma tabela exclusiva para cada processo. Cada entrada aponta para um registo na tabela global de ficheiros abertos.
2. **Open File Table**: Uma tabela global partilhada por todos os processos. Cada entrada nesta tabela representa a sessão ativa de abertura do ficheiro, contendo o estado de acesso, o **Current File Position (desvio do cursor)** e o **Reference Count (refcnt)** (um contador que indica quantos descritores em todo o sistema apontam para esta sessão de abertura).
3. **v-node Table**: Uma tabela global partilhada que contém as informações permanentes do ficheiro físico (metadata obtido pela estrutura `stat`), incluindo o tipo de ficheiro, tamanho e ponteiros para os blocos de disco físico.

Se o mesmo processo (ou processos diferentes) abrir o mesmo ficheiro físico duas vezes de forma independente através da chamada `open()`, serão criados descritores diferentes apontando para entradas diferentes na *Open File Table* (tendo cursores de leitura/escrita independentes), mas ambas as entradas apontarão para o mesmo registo único na *v-node Table*.

*(Mapeado de: SCOMP2526-T1b.pdf)*

---

## 2.4. Partilha de Ficheiros e Comportamento em `fork()` e `exec()`

**O Acrónimo Conetivo**: **COF** (**C**opied **O**ffsets in **F**ork)

**A Analogia Gen Z / Vida Real**:
Tu e o teu amigo estão a ver juntos a mesma série no Netflix, mas partilhando o mesmo ecrã e a mesma conta. Se o teu amigo carregar no botão de recuar 10 segundos (altera a posição atual), a tua série também recua 10 segundos, porque vocês estão sincronizados no mesmo exato fluxo. É isto que acontece no `fork()`: o teu processo filho herda os teus descritores de ficheiro. Se o filho ler os primeiros 50 bytes de um ficheiro, o cursor avança para o pai também, porque eles partilham a mesma sessão física de leitura (mesma entrada na *Open File Table*). Já o `exec()` é como se trocasses a imagem da app que estás a ver na TV por outra completamente nova (muda o programa), mas os cabos HDMI ligados atrás da televisão (os descritores de ficheiro abertos no SO) permanecem rigorosamente ligados e ativos no mesmo sítio.

**A Explicação Formal**:

- **Comportamento no `fork()`**: O processo filho herda uma **cópia idêntica da Descriptor Table do pai**. No entanto, esta duplicação apenas copia as referências locais; o filho não abre sessões novas. Como resultado, as entradas correspondentes na tabela global de ficheiros abertos têm o seu **Reference Count incrementado por 1** (`refcnt=2`). Pai e filho partilham o mesmo descritor de ficheiro aberto e a mesma posição de cursor (*File pos*). Qualquer leitura, escrita ou reposicionamento de cursor (`lseek()`) efetuado por um dos processos altera instantaneamente a posição de trabalho do outro.
- **Comportamento no `exec()`**: Ao substituir o código do processo por um novo executável, os descritores de ficheiros abertos **permanecem abertos e preservados** ao longo da chamada, a menos que tenham sido explicitamente configurados com o bit de fecho em execução (*close-on-exec* usando `fcntl()`). O novo código não tem acesso às variáveis antigas que continham os números dos descritores, mas os descritores mantêm-se ativos nas mesmas posições da Descriptor Table (ex: 0, 1, 2, 3...).

*(Mapeado de: SCOMP2526-T1b.pdf e SCOMP2425-TP6.pdf)*

---

## 2.5. Redirecionamento de Fluxos com `dup()` e `dup2()`

**O Acrónimo Conetivo**: **DUP** (**D**uplicate **U**tility for **P**aths)

**A Analogia Gen Z / Vida Real**:
Imagina que estás a reproduzir música no altifalante do teu telemóvel (Saída padrão / `stdout` / descritor 1). De repente, ligas os teus fones de ouvido Bluetooth (descritor de ficheiro do dispositivo 4). Ao fazeres isso, o telemóvel executa uma espécie de `dup2(fones, altifalante)`. Agora, todo o áudio que as tuas apps continuam a enviar ingenuamente para o altifalante (descritor 1) é desviado de forma automática e silenciosa para os teus fones de ouvido (descritor 4). A app do Spotify não precisa de saber que o hardware mudou; ela apenas continua a enviar música para a saída padrão.

**A Explicação Formal**:
O redirecionamento de fluxos baseia-se na duplicação de registos na tabela de descritores de ficheiros de um processo, permitindo que múltiplos descritores apontem para o mesmo ficheiro aberto:

- `int dup(int oldfd)`: Encontra a **primeira posição livre** na tabela de descritores e copia para lá o conteúdo de `oldfd`. Ambas as posições da tabela passam a apontar para a mesma entrada na tabela global de ficheiros abertos.
- `int dup2(int oldfd, int newfd)`: Copia o descritor de `oldfd` diretamente para a posição específica `newfd`. Se `newfd` já estivesse associado a um ficheiro aberto, o sistema operativo executa o fecho prévio de `newfd` e a atribuição da nova referência de forma **atómica (indivisível)**.

O redirecionamento clássico efetuado pela consola UNIX (ex: `ls > foo.txt`) baseia-se no facto de o processo filho criar um ficheiro `foo.txt` (obtendo o descritor `4`), efetuar a chamada `dup2(4, 1)` (redirecionando a saída padrão `1` para o ficheiro), fechar o descritor `4` que já não é necessário, e finalmente invocar o `exec()` do comando `ls`.

*(Mapeado de: SCOMP2526-T1b.pdf e SCOMP2425-TP6.pdf)*

---

## 2.6. Standard I/O (Bufferizado) vs. System-Level I/O

**O Acrónimo Conetivo**: **BIO** (**B**uffered **I**ntermediate **O**perations)

**A Analogia Gen Z / Vida Real**:
Imagina que queres comer um pacote grande de batatas fritas enquanto jogas computador.

- **System-Level I/O (sem buffer)**: Cada vez que queres comer uma batata, levantas-te da cadeira, corres até à cozinha, tiras uma única batata frita do pacote, comes e voltas para o quarto para continuar a jogar. Se fizeres isto para comer 200 batatas, vais cansar-te imenso e perder imenso tempo (fazer uma chamada de sistema `read()` ou `write()` que exige um context switch do kernel que demora mais de 10.000 ciclos de CPU de cada vez).
- **Standard I/O (com buffer)**: Vais à cozinha apenas uma vez, levas uma taça gigante, enches a taça com as batatas todas (uma única chamada de sistema `read()` em bloco grande) e colocas a taça na tua secretária. Agora, podes comer as batatas uma a uma diretamente da taça ao teu lado sem teres de te levantar (operações rápidas em espaço de utilizador).

**A Explicação Formal**:
As chamadas de sistema diretas (`read`, `write`) exigem a intervenção do kernel através de traps, o que acarreta uma sobrecarga de desempenho elevada (superior a **10.000 ciclos de CPU por chamada**). Para mitigar este problema, a biblioteca padrão C (`stdio.h`) fornece a abstração de **Streams (Standard I/O)** através da estrutura `FILE`:

- **Mecanismo de Buffering**: Em vez de fazer uma chamada ao SO para ler ou escrever um byte de cada vez, as funções como `getc()` ou `printf()` operam sobre um **buffer em espaço de utilizador (User Space)**. Um `read()` robusto lê antecipadamente um bloco grande de bytes do disco para o buffer. A aplicação consome os dados diretamente desse buffer rápido em espaço de utilizador.
- **Descarregamento do Buffer (Flush)**: O buffer de escrita é acumulado em memória e apenas descarregado física e efetivamente no disco (através de uma chamada `write()` do kernel) quando encontra um caráter de quebra de linha `\n`, quando o buffer fica cheio, quando é invocada explicitamente a função `fflush()`, ou quando o programa termina normalmente através de `exit()`.
- **Limitações**: Funções de Standard I/O não são assíncronas e **não são seguras contra sinais (async-signal-safe)**. Por esta razão, nunca devem ser utilizadas dentro de rotinas de tratamento de sinais, sob o risco de corrupção de estado interno e bloqueios.

*(Mapeado de: SCOMP2526-T1b.pdf)*
