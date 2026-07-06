<!-- topic: memory | title: Conceito 05 — Memória Virtual e Partilhada (paginação, TLB, shm/mmap) -->

# Conceito 5 — Memória Virtual e Partilhada (shm_open, mmap, paginação e isolamento)

A memória virtual (VM) é o mecanismo que desacopla os programas da memória física. Permite que cada processo seja executado como se possuísse um espaço de endereçamento linear, contínuo e privado, começando no endereço zero, independentemente de como a memória está estruturada fisicamente na RAM. Esta abstração é fundamental para garantir o isolamento entre processos e a segurança no multitasking concorrente.

---

## 5.1. Tradução de Endereços (Lógico para Físico)

**O Acrónimo Associativo**: **MMU** (**M**apeamento de **M**emória **U**niversal).

**A Analogia Gen Z / Vida Real**:
Imagina que queres partilhar o teu carrinho de compras ou a tua Wishlist da *Shein* ou da *Amazon* com os teus amigos. No ecrã da aplicação, o link partilhado diz apenas "/minha-lista-favorita" (este é o **endereço lógico ou virtual**, idêntico na interface de qualquer utilizador). No entanto, os servidores da plataforma não guardam as listas de toda a gente na mesma gaveta física. Quando os teus amigos clicam no link, o sistema traduz instantaneamente essa morada universal para o teu ID de conta único e real na base de dados física da empresa (o **endereço físico**). A **MMU** é o tradutor ultra-rápido que faz este trabalho nos bastidores do teu telemóvel para garantir que ninguém acede à lista errada.

**A Explicação Formal**:
Os programas em execução geram endereços lógicos (ou virtuais) que não correspondem diretamente a localizações físicas na RAM. A **MMU (Memory Management Unit)** é um dispositivo de hardware integrado no processador que interceta todas as referências de memória feitas pela CPU e traduz esses endereços virtuais para endereços físicos reais na memória principal (DRAM). Em sistemas de realocação contígua simples, a MMU faz isto adicionando o valor de um registo de realocação (ou registo base) ao endereço lógico para obter o endereço físico. Adicionalmente, a MMU é responsável por realizar verificações de permissão em tempo de execução para cada acesso.

*(Grounded in:)*

---

## 5.2. Paginação de Memória (Páginas, Frames, Tabelas de Páginas e TLB)

**O Acrónimo Associativo**: **PTE** (**P**ágina de **T**radução de **E**ndereços).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a ouvir uma playlist gigante com 10.000 músicas no teu *Spotify*, mas a memória RAM do teu telemóvel está tão cheia que só consegue carregar 5 músicas de cada vez. O sistema divide a tua playlist em blocos de tamanho fixo chamados **páginas** (pages) e a RAM do telemóvel tem espaços físicos de tamanho idêntico chamados **molduras** (frames). Para saber exatamente que página de música está guardada em que espaço físico da memória, o Spotify usa um índice de consulta: a **Tabela de Páginas**. Para não teres de pesquisar no índice completo de cada vez que o leitor salta um segundo de música (o que tornaria a reprodução lenta), o processador guarda os atalhos das músicas que estás a ouvir agora numa memória cache ultra-rápida chamada **TLB** (como as tuas "Músicas Recém-Ouvidas"). Um acerto (*hit*) na TLB dá-te a música instantaneamente; uma falha (*miss*) obriga o sistema a ir ler a tabela inteira à RAM lenta.

**A Explicação Formal**:
A **paginação** é um método de gestão de memória que elimina a fragmentação externa ao dividir a memória física em blocos de tamanho fixo chamados *frames* (cujo tamanho é uma potência de 2) e a memória lógica em blocos de igual dimensão chamados páginas (*pages*).

- **Tabelas de Páginas**: O kernel do sistema operativo mantém uma tabela de páginas para cada processo ativo na DRAM. Cada entrada na tabela de páginas (**PTE - Page Table Entry**) mapeia uma página virtual para um frame físico e contém metadados de controlo, como o bit de validade (que indica se a página está na memória RAM ou no disco) e as permissões de acesso físico (permissões de leitura, escrita, execução e privilégios de utilizador/supervisor).
- **Registo PTBR e TLB**: O registo base da tabela de páginas (**PTBR**, ou **CR3** no x86) aponta para a localização da tabela ativa em memória. Como qualquer acesso a instruções virtuais requer dois acessos à RAM física (um para obter a PTE e outro para ler os dados reais), o processador recorre à **TLB (Translation Lookaside Buffer)**, uma cache de hardware associativa rápida que armazena as PTEs traduzidas recentemente. Um acerto na TLB permite que a tradução de endereços ocorra num único ciclo de CPU.

*(Grounded in:)*

---

## 5.3. Falha de Página (Page Fault) e Gestão de Exceções

**O Acrónimo Associativo**: **TRAP** (**T**ransferência de **R**ecurso **A**pós **P**endência).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a fazer scroll infinito no teu feed do *Instagram* ou do *Google Photos* para ver fotos de 2020. Ao clicares numa miniatura (endereço lógico), o teu telemóvel deteta que a foto original não está guardada localmente na RAM rápida. O ecrã fica com o círculo cinzento a carregar: isto é uma **Falha de Página (Page Fault)**. O hardware do telemóvel gera um **trap** (interrupção síncrona), pausando a aplicação e chamando o sistema operativo. O SO vai buscar a foto original ao servidor na Cloud (disco/swap), coloca-a na memória física, atualiza o índice e manda re-executar a renderização da imagem. Tu vês a imagem aparecer e continuas o scroll sem perceber o que se passou. No entanto, se tentares aceder de forma forçada a uma foto apagada ou de uma conta privada à qual não tens acesso, o sistema de segurança deteta um endereço inválido e fecha a aplicação com um erro de sistema (**SIGSEGV** / Segmentation Fault).

**A Explicação Formal**:
Quando a CPU tenta aceder a uma palavra de memória virtual cujo bit de validade na PTE é zero (a página não está carregada na RAM física) ou cujas permissões de acesso são violadas, o hardware gera um *trap* síncrono para o sistema operativo, conhecido como **Page Fault** (falha de página).

1. O processador desvia o controlo para a rotina de interrupção do kernel.
2. O sistema operativo valida o endereço. Se o endereço for válido mas estiver no disco (memória secundária), o kernel localiza um frame físico livre, copia a página do disco para a DRAM, atualiza a PTE correspondente para válida (bit a `1`) e instrui a CPU a re-executar exatamente a mesma instrução que falhou originalmente.
3. Se a MMU detetar que o endereço virtual é inválido ou excede os limites de proteção (por exemplo, desreferenciação de ponteiro nulo), o kernel envia o sinal **SIGSEGV** (Segmentation Violation) para o processo-alvo, provocando a sua terminação imediata e ordenada com gravação de *core dump*.

*(Grounded in:)*

---

## 5.4. Memória Partilhada (Shared Memory) como Mecanismo IPC

**O Acrónimo Associativo**: **SHM** (**S**egmento de **H**iper **M**emória).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e os teus colegas de grupo têm de escrever o relatório de um projeto de SCOMP. Se usarem o método tradicional, tu escreves a tua parte num documento de texto, salvas e mandas o ficheiro por e-mail ao colega, que faz as suas alterações e volta a anexar o ficheiro para mandar ao próximo (isto é o equivalente a usar **Pipes** ou mensagens, onde o sistema operativo atua de intermediário copiando fisicamente os bytes de um lado para o outro, gerando sobrecarga lenta). Em vez disso, vocês criam um **Google Doc partilhado** (Memória Partilhada). Todos têm acesso ao mesmo ecrã e escrevem diretamente e ao mesmo tempo no mesmo ficheiro (acesso direto e aleatório). É o método mais rápido e eficiente possível. O problema surge se dois de vocês tentarem reescrever a mesma frase ao mesmo tempo: o texto vai ficar corrompido (**Race Condition**). Para que isso não aconteça, vocês precisam de falar pelo chat de grupo para se coordenarem (sincronização externa com semáforos).

**A Explicação Formal**:
A **Memoria Partilhada** é o mecanismo de comunicação interprocesso (IPC) mais eficiente em termos de latência e débito de dados. O sistema operativo quebra o princípio de isolamento padrão ao configurar as tabelas de páginas de dois ou mais processos independentes para que apontem para os mesmos frames físicos na DRAM.

- **Vantagens**: Acesso de latência ultra-baixa e de leitura/escrita aleatória. Os processos comunicam escrevendo e lendo diretamente na RAM partilhada sem a necessidade de intervenção do kernel ou de chamadas de sistema síncronas para transferir dados após a fase de inicialização.
- **Desvantagens**: Complexidade de coordenação. Como o sistema operativo não fornece sincronização implícita de escrita na memória física, os programadores devem implementar manualmente mecanismos de sincronização (como semáforos ou mutexes) para proteger as secções críticas e evitar a inconsistência ou corrupção de dados devido a condições de corrida (*race conditions*). Adicionalmente, os ponteiros (endereços lógicos) de um processo podem referenciar posições inválidas noutro processo, o que dificulta o mapeamento de estruturas dinâmicas complexas.

*(Grounded in:)*

---

## 5.5. API de Memória Partilhada POSIX em C (`shm_open`, `ftruncate`, `mmap`)

**O Acrónimo Associativo**: **MAP** (**M**apeamento de **A**rea **P**artilhada).

**A Analogia Gen Z / Vida Real**:
É exatamente igual a alugares e gerires um cacifo eletrónico com o teu grupo de amigos num festival de música (como o *MEO Sudoeste* ou o *Rock in Rio*):

- **`shm_open()`**: Vão ao ecrã digital dos cacifos, registam um cacifo específico com o nome "/cacifo_grupo" e recebem um talão com um ID (o descriptor).
- **`ftruncate()`**: Definem no ecrã o tamanho do cacifo para caberem exatamente 4 mochilas (tamanho da área em bytes).
- **`mmap()`**: Cada um abre a app do festival no telemóvel e mapeia digitalmente o cacifo. Agora, qualquer objeto físico colocado no cacifo real reflete-se e pode ser visto/alterado instantaneamente no ecrã do telemóvel de qualquer amigo do grupo.
- **`munmap()`**: Quando decides ir embora do festival, desligas a tua aplicação de telemóvel do cacifo.
- **`shm_unlink()`**: Quando o festival termina e o último amigo recolhe as suas coisas, o cacifo é limpo e o identificador "/cacifo_grupo" é desassociado do sistema.

**A Explicação Formal**:
A nível de código em C, os segmentos de memória partilhada POSIX (mapeados no Linux sob a pasta virtual `/dev/shm`) são criados e manipulados com as seguintes chamadas de sistema:

1. `int shm_open(const char *name, int oflag, mode_t mode)`: Cria ou abre um objeto de memória partilhada mapeado em ficheiro, identificado por uma string que deve começar com `/`. As flags de controlo `oflag` incluem `O_CREAT` (criar), `O_EXCL` (dar erro caso já exista) e permissões de acesso `O_RDONLY` ou `O_RDWR`. O argumento `mode` especifica as permissões usuais do Linux (ex: `S_IRUSR | S_IWUSR` para leitura/escrita do utilizador). Retorna um descritor de ficheiro (`fd`).
2. `int ftruncate(int fd, off_t length)`: Define ou redimensiona o tamanho em bytes do objeto referenciado pelo descriptor. Retorna `0` em caso de sucesso e `-1` se falhar.
3. `void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset)`: Mapeia o objeto de memória partilhada associado ao descritor `fd` para o espaço de endereçamento virtual do processo. Retorna um ponteiro genérico (`void*`) para o início do bloco mapeado. Para memória partilhada, o argumento `prot` deve conter `PROT_READ | PROT_WRITE` e as `flags` devem incluir obrigatoriamente `MAP_SHARED`.
4. `int munmap(void *addr, size_t length)`: Remove o mapeamento do segmento na morada virtual `addr` do processo.
5. `int shm_unlink(const char *name)`: Elimina o nome associado ao objeto no sistema. O segmento físico real só é destruído pelo kernel quando todos os processos com mapeamentos ativos executarem o fecho do recurso.

*(Grounded in:)*

---

## 5.6. Sincronização em Memória Partilhada (Espera Ativa vs. Espera Passiva)

**O Acrónimo Associativo**: **SPIN** (**S**em **P**rogresso **I**ncursa em **N**ada).

**A Analogia Gen Z / Vida Real**:
Imagina que estás à espera que saia a tua nota final do exame de SCOMP no portal académico da faculdade:

- **Espera Ativa (Active/Busy Waiting / Spinning)**: Ficas em frente ao ecrã do portátil a carregar no botão de *Refresh (F5)* a cada meio segundo. O teu cérebro (a CPU) está a gastar energia ao máximo (100% de uso de CPU), ficas cansado muito rápido e não consegues fazer nada útil enquanto a nota não for publicada.
- **Espera Passiva (Passive Waiting)**: Fechas o portátil e vais dormir uma sesta (o teu processo entra em estado de bloqueio passivo, libertando a CPU). Pedes ao teu colega para te enviar uma notificação de SMS ou WhatsApp quando a nota sair. Assim que o telemóvel vibrar (**notificação** de sinal), acordas e vais ver a nota com a tua energia totalmente fresca.

**A Explicação Formal**:

- **Espera Ativa (Active/Busy Waiting)**: Um processo executa continuamente um loop lógico de verificação de variáveis em memória (ex: `while(cb->producer_index == cb->consumer_index)`) aguardando que o valor mude. Este método é altamente ineficiente porque consome e monopoliza ciclos de relógio da CPU sem realizar qualquer progresso útil, aumentando o consumo energético e degradando a performance geral.
- **Espera Passiva (Passive Waiting)**: O processo executa uma chamada de sistema bloqueante (como `sem_wait()`). Se o recurso não estiver disponível, o planeador do kernel suspende o processo, alterando o seu estado para *Waiting/Blocked* e removendo-o da fila de prontos (*Ready Queue*), o que liberta a CPU para outras tarefas. Quando outro processo liberta o recurso utilizando `sem_post()`, o kernel acorda o processo de forma assíncrona, recolocando-o na *Ready Queue*.

*(Grounded in:)*
