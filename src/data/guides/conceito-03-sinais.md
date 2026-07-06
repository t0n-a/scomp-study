<!-- topic: signals | title: Conceito 03 — Sinais e o seu Tratamento -->

# Conceito 3 — Sinais e o seu Tratamento

A jornada de SCOMP prossegue com o estudo aprofundado dos **Sinais**, o mecanismo de interrupção de software que dita como os processos reagem a eventos assíncronos no sistema operativo.

---

## 3.1. Sinais como ECF (Exceptional Control Flow) e Notificação Assíncrona

**O Acrónimo Conetivo**: **PING** (**P**rocess **I**nterrupt **N**otifying **G**lobally)

**A Analogia Gen Z / Vida Real**:
Imagina que estás ultra concentrado a jogar um *match* competitivo de *Valorant* ou *League of Legends* no teu computador (o fluxo de execução normal do teu programa). De repente, o teu telemóvel ao lado vibra com uma notificação da Uber Eats a dizer que o teu pedido chegou à porta. Tu não consegues prever o segundo exato em que o estafeta vai tocar à campainha (comportamento totalmente assíncrono). Tens de largar o rato por alguns segundos (pausa na CPU), ir abrir a porta e receber o jantar (executar o handler do sinal) e, em seguida, voltar imediatamente ao teu jogo exatamente no mesmo milésimo de segundo em que tinhas parado.

**A Explicação Formal**:
Um sinal é uma notificação de software assíncrona, enviada a um processo para o alertar sobre a ocorrência de um evento específico do sistema. Trata-se de uma forma extremamente leve de comunicação interprocesso (IPC) que implementa a abstração de Exceptional Control Flow (ECF) ao nível do utilizador. Uma vez que os eventos são assíncronos e imprevisíveis, o programa interrompe a sua sequência linear lógica habitual para desviar a execução para um bloco de código especializado (tratador de sinal) antes de retomar a execução.

*(Mapeado de: ResumoSCOMP.pdf, SCOMP2425-TP3.pdf e SCOMP2526-T5.pdf)*

---

## 3.2. Taxonomia de Exceções: Síncronas (Traps, Faults, Aborts) vs. Assíncronas (Interrupts, Signals)

**O Acrónimo Conetivo**: **FAST** (**F**aults, **A**borts, **S**ignals, **T**raps)

**A Analogia Gen Z / Vida Real**:
Pensa na tua vida diária como estudante universitário:

- **Interrupt (Assíncrona)**: O alarme de incêndio do edifício começa a tocar a meio de uma aula. Obriga-te a parar o que estás a fazer devido a um estímulo externo físico.
- **Trap (Síncrona)**: Estás a fazer compras online e carregas ativamente no botão "Finalizar Encomenda". Tu próprio desencadeaste essa transição síncrona para obter um serviço do site.
- **Fault (Síncrona)**: Entras num site de streaming de anime e bates contra um ecrã de CAPTCHA de segurança (uma *Page Fault* de memória). O sistema bloqueia-te, mas dá-te a oportunidade de resolver o CAPTCHA (recuperar do erro) e continuar como se nada tivesse acontecido.
- **Abort (Síncrona)**: O teu telemóvel aquece excessivamente ao sol até que o hardware desliga instantaneamente o circuito para não queimar a bateria. Não há recuperação possível; a sessão morreu ali.

**A Explicação Formal**:
A fluxo físico de controlo de uma CPU é interrompido por exceções, classificadas pelo kernel e hardware em quatro categorias baseadas na sua origem e sincronismo:

- **Asynchronous Exceptions (Interrupts)**: Causadas por eventos externos e físicos ao processador (ex: sinais de relógio do sistema, término de DMA ou periféricos de I/O).
- **Synchronous Exceptions (Traps)**: Intencionais e causadas pela execução direta de uma instrução (ex: chamadas de sistema efetuadas através da instrução assembly `syscall` ou `int 0x80` para alterar o privilégio da CPU).
- **Synchronous Exceptions (Faults)**: Não intencionais mas potencialmente recuperáveis (ex: falha de página em memória virtual - *Page Fault*, onde o SO resolve o mapeamento e repete a mesma instrução falhada).
- **Synchronous Exceptions (Aborts)**: Não intencionais e irrecuperáveis devido a erros graves de hardware (ex: erros de paridade).

*(Mapeado de: SCOMP2526-T5.pdf e ResumoSCOMP.pdf)*

---

## 3.3. Ciclo de Vida de um Sinal: Envio, Receção, Pendente e Bloqueado

**O Acrónimo Conetivo**: **SEND** (**S**ent, **E**xecuted, **N**otified, **D**elivered)

**A Analogia Gen Z / Vida Real**:
É o equivalente perfeito a gerires as mensagens diretas (DMs) no teu Instagram:

- **Enviado (Sent)**: Alguém carrega em enviar na DM para a tua conta.
- **Pendente (Pending)**: Recebes um balão de notificação no ecrã bloqueado do teu telemóvel. O sinal está lá desenhado, mas ainda não abriste a app para reagir ao conteúdo.
- **Bloqueado (Blocked)**: Ativas o modo "Não Incomodar" (Do Not Disturb) do telemóvel. As DMs continuam a acumular-se nos servidores em estado pendente, mas o teu ecrã não acende nem te incomoda até que desatives esse modo de bloqueio.
- **Recebido/Entregue (Delivered/Received)**: Abres finalmente a aplicação e geres a mensagem de forma ativa (o teu *handler* é ativado).

**A Explicação Formal**:
O ciclo de vida de um sinal processa-se em duas fases geridas pelo kernel do sistema operativo:

1. **Sending (Envio)**: O kernel envia um sinal ao processo-alvo devido a uma alteração de estado no hardware (ex: divisão por zero) ou porque outro processo invocou a chamada de sistema `kill()`.
2. **Delivering / Receiving (Entrega/Receção)**: O kernel força o processo a processar o sinal pendente.

- **Pending (Pendente)**: Um sinal que foi gerado pelo sistema mas ainda não foi entregue ao processo. O sistema mantém apenas **um único bit** na tabela de processos para registar sinais pendentes de cada tipo.
- **Blocked (Bloqueado)**: Um processo pode adiar a entrega de um sinal adicionando-o à sua máscara de sinais bloqueados (`sa_mask`). O sinal permanece pendente e só será entregue no instante em que for removido da máscara de bloqueio.

*(Mapeado de: SCOMP2526-T5.pdf, SCOMP2425-TP4.pdf e ResumoSCOMP.pdf)*

---

## 3.4. Tratamento de Sinais (Signal Handlers) e Disposição (SIG_DFL, SIG_IGN)

**O Acrónimo Conetivo**: **ACTS** (**A**ction, **C**ustom, **T**erminate, **S**ignal)

**A Analogia Gen Z / Vida Real**:
Imagina que estás a programar as reações do teu despertador inteligente de manhã:

- **SIG_DFL (Default)**: O toque padrão de fábrica super estridente do despertador que te obriga a levantar imediatamente (a ação predefinida do SO, que costuma terminar a aplicação).
- **SIG_IGN (Ignore)**: Decidir silenciar (fazer *mute*) aquele despertador secundário. O alarme toca silenciosamente nos servidores do telemóvel, mas tu ignoras totalmente a sua existência de forma automática.
- **Custom Handler**: Definir um atalho de automação inteligente em que, no momento em que o alarme toca, o teu quarto acende as luzes de forma gradual e começa a passar a tua playlist favorita. Tu programaste a reação personalizada àquele sinal.

**A Explicação Formal**:
Cada sinal tem uma disposição padrão definida pelo kernel (ex: terminar com ou sem core dump, parar ou simplesmente ignorar). Através da estrutura POSIX `sigaction`, o programador em C pode associar três tipos de ações a um determinado sinal:

- `SIG_DFL`: Restaura a ação por omissão do sistema operativo para esse sinal específico.
- `SIG_IGN`: Força o sistema a descartar e a ignorar o sinal sempre que este for gerado (com exceção de dois sinais críticos).
- **Custom Handler**: Associa um ponteiro de função do utilizador (`sa_handler` ou `sa_sigaction`) ao tratamento do sinal. Quando o sinal é entregue, o kernel suspende o fluxo normal de controlo, salvaguarda os registos da CPU na stack do processo, transfere a execução para a função de tratamento e, após o término desta, repõe o contexto original do processo.

*(Mapeado de: ResumoSCOMP.pdf e SCOMP2425-TP3.pdf)*

---

## 3.5. Sinais Não Ignoráveis: SIGKILL e SIGSTOP

**O Acrónimo Conetivo**: **UNGO** (**U**nstoppable **N**on-ignorable **G**lobal **O**perations)

**A Analogia Gen Z / Vida Real**:

- **SIGKILL**: É o equivalente físico a puxares o cabo de alimentação da tomada do teu computador a meio de um jogo. Não interessa o que o teu jogo está a processar, a tentar guardar ou a pedir; a quebra de energia é física, imediata e irresistível.
- **SIGSTOP**: É como fechares a tampa do teu portátil a meio de um vídeo no YouTube. O sistema operativo entra em suspensão instantânea, congelando o vídeo no frame exato onde estava, impedindo-o de progredir até que a tampa seja aberta novamente (**SIGCONT**).

**A Explicação Formal**:
O kernel do Linux/UNIX reserva dois sinais cujos comportamentos não podem ser alterados pelas aplicações de utilizador de forma a garantir a segurança e o controlo do sistema operativo. Estes sinais **não podem ser ignorados, bloqueados ou redefinidos com tratadores personalizados**:

- **SIGKILL (Sinal 9)**: Provoca a terminação imediata e abrupta do processo pelo kernel do sistema operativo. O processo não tem hipótese de executar código de término ou de limpeza de recursos.
- **SIGSTOP (Sinal 19)**: Suspende a execução do processo na CPU de forma imediata, colocando-o em estado parado (*stopped*). O escalonador remove-o da *Ready Queue* até que o processo receba o sinal **SIGCONT** para retomar a sua operação.

*(Mapeado de: ResumoSCOMP.pdf e SCOMP2526-T5.pdf)*

---

## 3.6. Limitações Concorrentes: Sinais Não Acumuláveis e Async-Signal-Safety

**O Acrónimo Conetivo**: **ASAP** (**A**sync-**S**ignal **A**voiding **P**itfalls)

**A Analogia Gen Z / Vida Real**:

- *Sinais não acumuláveis*: Imagina que o teu telemóvel tem apenas um LED azul físico de notificação. Se receberes 1 DM pendente ou 100 DMs pendentes de uma vez, o LED azul pisca exatamente da mesma maneira. O teu ecrã apenas sinaliza "tens DM pendente". Não consegues contar quantas mensagens recebeste olhando apenas para o LED azul.
- *Async-Signal-Safety*: Imagina que estás a preencher em papel a caneta um formulário oficial de candidatura a um emprego. A meio de uma frase, toca o alarme de incêndio e tens de fugir do edifício. No corredor, alguém te dá outro papel igual e obriga-te a escrever de imediato com a mesma caneta (um handler de sinal concorrente). Se usares a caneta e o teu cérebro no corredor, vais estragar o estado e o progresso de ambos os papéis e corromper a escrita. Usar funções com buffers partilhados como `printf()` dentro de um handler de sinal assíncrono é exatamente o mesmo erro que estragar os dois formulários em simultâneo.

**A Explicação Formal**:

- **Sinais Não Acumuláveis**: Uma vez que a pendência de um sinal é mapeada por um único bit na tabela de processos do kernel, o SO não consegue manter um registo do número de vezes que um determinado sinal foi enviado enquanto estava pendente. Se um sinal de tipo idêntico chegar antes de o anterior ser tratado, os envios adicionais são simplesmente **descartados**. Por esta razão, **nunca se devem utilizar sinais para contar eventos** (como monitorizar o término exato de 50 processos filhos).
- **Async-Signal-Safety**: Uma vez que os tratadores de sinal correm assincronamente e interrompem o fluxo principal do processo a qualquer momento, o código interna do tratador deve ser totalmente **reentrante**. Funções da biblioteca padrão que gerem buffers globais partilhados ou acedem a memória estática de runtime (ex: `printf()`, `malloc()`, `fopen()`, `fread()`) **não são assíncronas e seguras contra sinais (non-async-signal-safe)**. A sua invocação dentro de um handler sob concorrência pode causar impasses (*deadlocks*) e corrupção irreversível de buffers internos da biblioteca. Por segurança extrema, os handlers devem limitar as suas ações a alterar variáveis globais atómicas e voláteis da estrutura `volatile sig_atomic_t`.

*(Mapeado de: SCOMP2425-TP4.pdf, SCOMP2526-T5.pdf, SCOMP2526-T1b.pdf e SCOMP2526-T9.pdf)*
