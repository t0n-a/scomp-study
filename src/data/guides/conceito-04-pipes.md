<!-- topic: pipes | title: Conceito 04 — Pipes: unnamed, named (FIFOs) e redirecionamento -->

# Conceito 4 — Pipes (Unnamed & Named Pipes, Fluxo de Bytes, Redirecionamento e Sincronização)

---

## 4.1. O que é um Pipe e a sua Unidirecionalidade

**O Acrónimo Conetivo**: **PIPE** (**P**ortal de **I**nformação de **P**ortagem **E**xclusiva)

**A Analogia Gen Z / Vida Real**:
Imagina que estás a usar um canal de transmissão de mensagens de uma só via (como um canal de difusão do Instagram ou um canal do Telegram onde apenas o administrador pode publicar). O administrador está numa ponta a escrever conteúdo (a escrever bytes) e todos os subscritores estão na outra ponta apenas a ler o feed. É impossível os leitores responderem pelo mesmo canal; a informação viaja estritamente numa única direção. Se os subscritores quiserem falar de volta com o administrador, têm de criar um canal de difusão secundário no sentido oposto.

**A Explicação Formal**:
Um **pipe** é um canal de comunicação unidirecional partilhado, gerido diretamente no espaço de kernel do sistema operativo através de um buffer FIFO (First-In, First-Out). A nível de programação em C, o pipe é criado através da chamada de sistema `int pipe(int fd)`, que preenche um array de dois descritores de ficheiros:

- `fd`: Reservado exclusivamente para **leitura** (extração de bytes do buffer).
- `fd`: Reservado exclusivamente para **escrita** (inserção de bytes no buffer).

Como a interface do pipe mapeia diretamente a interface de ficheiros do sistema, a leitura e a escrita utilizam as chamadas padrão `read()` e `write()`.

*(Mapeado de: ResumoSCOMP.pdf, SCOMP2425-TP5.pdf e SCOMP2425-TP6.pdf)*

---

## 4.2. Unnamed Pipes (Parent-Child) vs. Named Pipes (FIFOs)

**O Acrónimo Conetivo**: **KIND** (**K**ernel **I**nterface **N**amed **D**ivision)

**A Analogia Gen Z / Vida Real**:

- **Unnamed Pipe**: É como uma chamada de grupo temporária no FaceTime. Só as pessoas que já estavam convidadas a partir do início da chamada (os processos com ligação hierárquica direta através de `fork()`) é que conseguem ouvir e falar. No momento em que todos desligam a chamada (os processos terminam), o FaceTime de grupo desaparece do mapa de forma permanente.
- **Named Pipe**: É como um servidor de Discord público com um convite fixo na bio do teu perfil de redes sociais. Qualquer pessoa, mesmo um desconhecido que não tenha relação de amizade contigo (processos totalmente sem relação hierárquica), pode clicar no link (o caminho do ficheiro no disco) e aceder ao canal para comunicar. O servidor de Discord continua a existir de forma persistente na Internet, mesmo que toda a gente saia e feche a app.

**A Explicação Formal**:
O sistema operativo disponibiliza duas variantes de pipes para atender a diferentes cenários de comunicação:

- **Unnamed Pipes (Pipes Anónimos)**: Não possuem representação física ou nome no sistema de ficheiros. Dependem estritamente da herança da tabela de descritores de ficheiros através de uma chamada `fork()`. Por esta razão, exigem obrigatoriamente uma **relação hierárquica** (pai/filho ou irmãos) entre os processos comunicantes. Os dados mantidos no buffer do kernel perdem-se e a estrutura é destruída assim que todos os descritores associados em ambos os processos forem fechados.
- **Named Pipes (FIFOs)**: Possuem uma entrada física e explícita no sistema de ficheiros (criados com `mkfifo()`), funcionando como um ponto de encontro persistente. Permitem a comunicação entre **processos totalmente não relacionados** que apenas necessitam de abrir o ficheiro pelo seu caminho (pathname). Persistem no disco mesmo após o fecho de todos os processos associados, até serem removidos manualmente.

*(Mapeado de: SCOMP2425-TP5.pdf e SCOMP2425-TP6.pdf)*

---

## 4.3. Sincronização, Atomicidade de Escrita e Fecho de Descritores

**O Acrónimo Conetivo**: **SYNC** (**S**ynchronized **Y**ielding **N**otifying **C**hannel)

**A Analogia Gen Z / Vida Real**:
Imagina que estás a encomendar um item numa edição super limitada da tua marca de roupa favorita na Internet:

- *Pipe Vazio / Bloqueio*: Se o site diz "Esgotado", tu ficas bloqueado a carregar no *refresh* (o teu processo adormece de forma passiva) até que a marca reponha stock (escreva bytes no canal).
- *Pipe Cheio / Bloqueio*: Se o teu carrinho de compras físico estiver lotado e não couber mais nada, tens de esperar que o sistema processe o pagamento e retire itens dali para poderes meter mais caixas lá dentro.
- *All Writers Closed (EOF)*: Se a loja de roupa fechar permanentemente e retirar todos os produtos (fecho de todos os descritores de escrita), tu ficas a saber que já não há mais nada a receber (a leitura retorna `0` de imediato).
- *All Readers Closed (SIGPIPE)*: Se todos os clientes apagarem a app e ninguém estiver lá para ver (fecho de todos os leitores), no momento em que a marca tentar enviar uma notificação de promoção, o servidor rejeita o envio com um erro crítico instantâneo (o SO manda um sinal de crash `SIGPIPE`).

**A Explicação Formal**:
A sincronização de leitura e escrita num pipe é gerida de forma automática e passiva pelo kernel do sistema operativo através de regras estritas:

1. **Bloqueio de Leitura**: Se um processo invoca `read(fd)` e o buffer do pipe estiver **vazio**, a chamada bloqueia o processo de forma passiva, colocando-o em estado *waiting/blocked* até que dados sejam escritos.
2. **Bloqueio de Escrita**: Se um processo invoca `write(fd)` e o buffer do pipe estiver **cheio**, o processo bloqueia passivamente até que o leitor retire dados suficientes.
3. **Comportamento de Fecho (Writers)**: Uma leitura (`read()`) sobre um pipe onde **todos os descritores de escrita foram fechados** retorna de imediato o valor **`0`**, sinalizando o fim de ficheiro (End-Of-File - EOF).
4. **Comportamento de Fecho (Readers)**: Uma escrita (`write()`) sobre um pipe onde **todos os descritores de leitura foram fechados** falha imediatamente, e o kernel envia o sinal de sistema **`SIGPIPE`** ao processo para terminar a execução.

- **Atomicidade de Escrita**: De forma a evitar interferências cruzadas de bytes quando múltiplos processos escrevem em simultâneo, o sistema garante que qualquer operação de escrita cujo tamanho em bytes seja **menor do que a constante de sistema `PIPE_BUF`** é executada de forma **atómica (indivisível)** no buffer.

*(Mapeado de: ResumoSCOMP.pdf, SCOMP2425-TP5.pdf e SCOMP2425-TP6.pdf)*

---

## 4.4. Redirecionamento de Fluxos com Exec e dup2

**O Acrónimo Conetivo**: **FLOW** (**F**orwarding **L**ogical **O**utput **W**orkspace)

**A Analogia Gen Z / Vida Real**:
Estás a fazer uma live stream na Twitch a partir do teu telemóvel usando o altifalante integrado (a tua saída padrão, descritor 1). De repente, ligas um microfone profissional USB-C externo (a ponta de escrita de um pipe, descritor 4). Ao usares o comando `dup2(4, 1)`, estás a dizer ao telemóvel: "Desvia tudo o que ia para o altifalante padrão e envia para o microfone externo". A tua app de stream não tem de reconfigurar nada; ela continua a mandar áudio para o canal de saída 1, mas o hardware desviou o fluxo fisicamente.

**A Explicação Formal**:
Uma vez que os descritores de ficheiro são copiados num `fork()` e **preservados** ao longo de uma chamada `exec()`, é possível interligar processos através de pipes redirecionando as suas saídas e entradas padrão:

- **Passo 1 (Criação)**: O processo pai cria o pipe com `pipe(fd)` e faz o `fork()`. Ambas as partes possuem agora acessos redundantes à leitura e à escrita.
- **Passo 2 (Limpeza de Descritores)**: É uma boa prática de programação fechar imediatamente as pontas do pipe que não serão utilizadas em cada processo (por exemplo, se o filho escreve, deve fechar `fd` de leitura; se o pai lê, fecha `fd` de escrita).
- **Passo 3 (Redirecionamento)**: O processo que vai executar o novo programa faz o redirecionamento com `dup2()`. Para redirecionar a saída padrão (`stdout` que tem descritor `1`) para a ponta de escrita do pipe (`fd`), o processo executa `dup2(fd, STDOUT_FILENO)`.
- **Passo 4 (Execução)**: O processo executa `exec()`. Embora o array local de C que continha as variáveis `fd` e `fd` seja destruído na substituição da imagem de memória, o descritor `1` da tabela local do kernel continua a apontar de forma transparente para o canal do pipe, permitindo que qualquer `printf()` ou `write(1)` do novo programa escreva diretamente para o processo parceiro.

*(Mapeado de: SCOMP2526-T1b.pdf, SCOMP2425-TP6.pdf e ResumoSCOMP.pdf)*
