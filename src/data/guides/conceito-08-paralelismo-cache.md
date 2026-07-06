<!-- topic: threads | title: Conceito 08 — Paralelismo, Coerência de Cache e Barreiras de Memória -->

# Conceito 8 — Paralelismo ao Nível da Thread e Coerência de Cache (Multicore Hardware, Snoopy Caches, Consistência e Barreiras de Memória)

---

## 8.1. Paralelismo ao Nível da Thread (TLP) e Sistemas Multiprocessador Simétricos (SMP)

**O Acrónico Associativo**: **CORES** (**C**oncurrencia **O**ptimizada de **R**ecursos **E**m **S**istemas).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e o teu grupo de amigos estão a organizar uma viagem e criam um grupo no WhatsApp para partilhar tarefas. Se apenas uma pessoa planear tudo (sistema monoprocessador), ela tem de alternar entre reservar o Airbnb, escolher os restaurantes e comprar bilhetes de avião. Para acelerar o processo, vocês decidem dividir o trabalho em **Data-level Parallelism** (cada amigo pesquisa voos de uma companhia diferente em simultâneo para poupar tempo) ou **Task-level Parallelism** (um amigo trata exclusivamente do Airbnb enquanto outro trata dos bilhetes). No final, o grupo de chat do WhatsApp é a vossa **Memória Partilhada Symmetrical (SMP)**: todos os cores (amigos) têm acesso de leitura e escrita ao mesmo feed de dados para colaborar em tempo real.

**A Explicação Formal**:
O **Thread-level Parallelism (TLP)** visa maximizar a utilização dos recursos de computação distribuindo cargas de trabalho por múltiplos cores físicos de processamento. Isto é implementado em hardware através de **Symmetric Shared-Memory Systems (SMP)**, onde múltiplos cores partilham o acesso a uma memória física principal comum através de um barramento de sistema. Para explorar a execução paralela, o programador utiliza duas estratégias principais:

- **Task-level Parallelism (Paralelismo de Tarefas)**: Focado em obter alto rendimento (*throughput*) distribuindo fluxos de execução de controlo lógicos totalmente independentes por diferentes cores.
- **Data-level Parallelism (Paralelismo de Dados)**: Focado em reduzir a latência de uma única tarefa computacional intensiva dividindo uma estrutura de dados massiva em porções menores (*chunks*) que são processadas concorrentemente por múltiplas threads.

*(Mapeado de: SCOMP2526-T10.pdf e ResumoSCOMP.pdf)*

---

## 8.2. Coerência de Cache vs. Consistência de Memória

**O Acrónico Associativo**: **VIEW** (**V**alue **I**ntegrity **E**nsuring **W**riter-order).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e o teu amigo estão a ver a pontuação em tempo real de um jogo de futebol através de duas aplicações de telemóvel diferentes (as vossas caches locais).

- **Coerência de Cache (Cache Coherency)**: Garante que, se o Benfica marcar um golo, ambas as vossas aplicações vão eventualmente atualizar o ecrã para mostrar que o golo aconteceu, impedindo que um telemóvel mostre "1-0" e o outro "0-0" para sempre. Trata-se de uma única variável (a pontuação do jogo).
- **Consistência de Memória (Memory Consistency)**: Garante a ordem cronológica de múltiplos eventos cruzados. Se o árbitro der um cartão vermelho e, logo de seguida, o Benfica marcar um golo de livre, a consistência de memória dita se o teu telemóvel e o do teu amigo mostram os eventos na mesma ordem (Cartão Vermelho → Golo), ou se um de vocês vê o golo antes de ver o cartão vermelho ser mostrado.

**A Explicação Formal**:
Em arquiteturas multiprocessador, onde cada core físico possui a sua própria memória cache privada rápida (L1/L2) para evitar o acesso direto à memória RAM lenta, surgem problemas críticos de sincronização de dados:

- **Coerência de Cache (Cache Coherency)**: Foca-se em manter um estado consistente para **uma única localização de memória específica**. Garante que todos os processadores observam eventualmente o mesmo valor de escrita para essa localização e que todas as operações de escrita nessa morada são serializadas e propagadas de forma idêntica por todos os cores através de protocolos de invalidação ou atualização física.
- **Consistência de Memória (Memory Consistency)**: Foca-se em ditar e definir a **ordem em que operações de leitura e escrita para múltiplas localizações de memória distintas se tornam visíveis** para as outras threads em execução. Determina as regras de reordenamento de instruções entre variáveis cruzadas.

*(Mapeado de: SCOMP2526-T10.pdf)*

---

## 8.3. Consistência Sequencial vs. Modelos de Consistência Relaxados

**O Acrónico Associativo**: **BASE** (**B**aseline **A**greement for **S**equential **E**xecution).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a escrever um e-mail formal de candidatura de emprego e envias uma mensagem no chat do WhatsApp ao teu colega de grupo a dizer: "Enviei o e-mail (Variável A)" e depois "Podes rever as notas de SCOMP (Variável B)".

- **Consistência Sequencial**: É o "Gold Standard" lógico e intuitivo. O teu colega recebe as mensagens rigorosamente na mesma ordem em que tu as escreveste. É impossível ele receber o teu pedido para rever as notas sem antes saber que o e-mail foi enviado.
- **Modelos de Consistência Relaxados**: Para carregar o feed do Instagram o mais rapidamente possível, a aplicação envia os dados por caminhos alternativos mais rápidos. Às vezes, o comentário de resposta do teu amigo (segundo evento) aparece impresso no teu ecrã antes de aparecer a publicação original que ele comentou (primeiro evento). O hardware fez uma otimização de velocidade de rede à custa da ordem lógica estrita.

**A Explicação Formal**:

- **Consistência Sequencial (Sequential Consistency)**: É o modelo conceptual de referência para os programadores de concorrência. Sob este modelo, o resultado de qualquer execução concorrente deve parecer idêntico a uma intercalação global e sequencial única de todas as operações, respeitando rigorosamente a ordem lógica com que as instruções de cada thread individual foram declaradas no programa (*program order*). Trata-se de um modelo estritamente lógico e previsível, mas que **não é implementado diretamente pelo hardware moderno** devido às severas penalizações de performance que imporia ao processador.
- **Modelos de Consistência Relaxados (Relaxed Consistency Models)**: Implementados por arquiteturas modernas de CPU (como ARM, RISC-V e, em menor grau, x86) para maximizar o rendimento computacional. Estes modelos permitem a reordenamento de operações de memória e o buffering local de escritas, fazendo com que as operações de escrita efetuadas por um core possam ser observadas em ordens diferentes por outros cores concorrentes.

*(Mapeado de: SCOMP2526-T10.pdf e SCOMP2526-T6.pdf)*

---

## 8.4. Reordenação de Instruções e Buffers de Escrita (Out-of-Order CPUs)

**O Acrónico Associativo**: **OOO** (**O**ut-**O**f-**O**rder execution).

**A Analogia Gen Z / Vida Real**:
Imagina que tens de fazer três tarefas em casa: colocar a roupa a lavar na máquina (operação demorada de escrita), ir buscar uma garrafa de água à mesa (operação rápida de leitura) e ler uma notificação no telemóvel (operação rápida de leitura).
Se fores sequencial, inicias a máquina de lavar e ficas especado à frente dela à espera que ela acabe antes de ires beber a água (bloqueio ineficiente). Em vez disso, o teu cérebro opera **Out-of-Order**: colocas a roupa na máquina (deixas a operação pendente no **Write Buffer** da cozinha), e enquanto a máquina trabalha de forma lenta, tu vais imediatamente beber a água e ler a notificação (as leituras rápidos "ultrapassam" a escrita lenta). O resultado final é o mesmo, mas poupaste imenso tempo.

**A Explicação Formal**:
Para evitar que a CPU fique bloqueada em estado de espera passiva (*stalled*) devido à elevada latência dos acessos à memória física, os processadores modernos utilizam execução **Out-of-Order (fora de ordem)** e **Write Buffers** locais:

- **Write Buffers (Buffers de Escrita)**: Quando uma instrução de escrita é executada (`Wa: a = 2`), os dados não são enviados de imediato para a memória RAM ou barramento de cache física. O valor é guardado temporariamente num buffer local rápido em espaço de hardware privado.
- **Reordenação de Instruções**: O processador converte o código sequencial num fluxo dinâmico de operações paralelas. Como as operações de leitura (`Rb: print(b)`) são tipicamente muito mais rápidas do que propagar escritas, o hardware permite que as leituras "ultrapassem" as instruções de escrita anteriores pendentes no Write Buffer.
- *A consequência na Concorrência*: Sem mecanismos explícitos de controlo, se duas threads em dois cores distintos executarem de forma cruzada, a reordenação local pode fazer com que ambos os cores leiam valores antigos de variáveis partilhadas antes que as escritas do outro core tenham sido retiradas do Write Buffer, quebrando a consistência lógica do programa.

*(Mapeado de: SCOMP2526-T10.pdf)*

---

## 8.5. Barreiras de Memória / Fences (Acquire, Release, Full)

**O Acrónico Associativo**: **GATE** (**G**uaranteeing **A**ccurate **T**ransactions **E**verywhere).

**A Analogia Gen Z / Vida Real**:
Imagina um estaleiro de entrega de encomendas online da DHL com regras estritas:

- **Acquire Barrier**: É como o portão de entrada do camião. Nenhuma encomenda nova pode ser descarregada ou processada antes de as portas de segurança do camião de entrada estarem totalmente abertas e trancadas no cais. Garante que o que vem a seguir lê dados atualizados.
- **Release Barrier**: É o camião de expedição de saída. O camião não pode arrancar de SCOMP e fechar a porta (a tua escrita de alteração de dados) antes de todas as caixas de verificação do inventário anterior estarem devidamente assinadas e colocadas dentro do camião. Garante que as tuas alterações anteriores estão salvas e visíveis para o mundo antes de continuares.
- **Full Barrier / Fence**: É o fecho completo do estaleiro para balanço de stock. Ninguém entra, ninguém sai, e nenhuma operação avança até que todos os registos pendentes de ambos os lados estejam rigorosamente reconciliados.

**A Explicação Formal**:
Como os processadores e compiladores executam e otimizam código de forma relaxada, os programadores de sistemas concorrentes devem introduzir instruções especiais de sincronização de hardware chamadas **Memory Barriers (Barreiras de Memória) ou Fences** para impor ordem e visibilidade física:

- **Acquire Barrier (Barreira de Aquisição)**: Impede que qualquer operação de leitura ou escrita subsequente na ordem do programa seja reordenada para antes da barreira. Garante que todas as leituras posteriores verão os valores mais recentes de memória atualizados por outras threads.
- **Release Barrier (Barreira de Libertação)**: Impede que qualquer operação de leitura ou escrita anterior na ordem do programa seja reordenada para depois da barreira. Garante que todas as escritas pendentes efetuadas pela thread corrente se tornam globalmente visíveis a todas as outras caches antes que o processador execute qualquer instrução subsequente à barreira.
- **Full Barrier (Barreira Total)**: Bloqueia qualquer tipo de reordenação de operações de leitura ou escrita através da linha da barreira (ex: instrução `MFENCE` no x86).

As primitivas de sincronização de alto nível (como `pthread_mutex_lock` e `sem_wait`) são implementadas internamente com recurso a instruções de barreira de memória combinadas com instruções atómicas de hardware para garantir a consistência sequencial em software.

*(Mapeado de: SCOMP2526-T10.pdf)*

---

## 8.6. O Custo da Partilha: Partilha Falsa (False Sharing) e Alinhamento de Cache

**O Acrónico Associativo**: **LINE** (**L**ocations **I**ncurring **N**eedless **E**xclusions).

**A Analogia Gen Z / Vida Real**:
Imagina que tu e o teu colega de grupo de SCOMP estão a fazer testes em papel e partilham a mesma folha física de rascunho de tamanho fixo (a **linha de cache / cache line**).
Tu estás a escrever num canto da folha (Variável A) e o teu colega está a escrever noutro canto da folha (Variável B). Embora as vossas contas sejam totalmente independentes e vocês não usem os números um do outro, como vocês partilham a mesma folha física, de cada vez que um de vocês quer escrever uma linha, tem de puxar a folha inteira para si de forma exclusiva (invalidação física da cache do outro core). A folha anda constantemente de um lado para o outro da mesa, vocês perdem imenso tempo e não conseguem trabalhar em paralelo.
A solução? Tu escreves na tua própria folha e o teu amigo na folha dele (**Spaced-Apart Memory** com alinhamento e espaçamento de 64 bytes).

**A Explicação Formal**:
As caches de processador não gerem memória física ao nível de bytes ou palavras individuais, mas sim em blocos contíguos de tamanho fixo chamados **Cache Lines (Linhas de Cache)**, tipicamente de **64 bytes** em hardware x86 e ARM moderno.

- **False Sharing (Partilha Falsa)**: Ocorre quando múltiplas threads correm concorrentemente em cores de CPU diferentes e modificam variáveis independentes que, por azar de alocação de memória do compilador, residem dentro da mesma linha física de cache de 64 bytes.
- *O Conflito de Hardware*: Para atualizar uma variável na sua cache L1, o core físico necessita de adquirir exclusividade sobre a linha de cache inteira que contém a variável. Isto força o protocolo de coerência de cache a invalidar continuamente essa mesma linha em todas as caches L1 de todos os outros cores concorrentes.
- *O Custo de Performance*: Este fenómeno gera uma quantidade maciça de tráfego de controlo de coerência no barramento do processador, forçando os cores a ler e escrever repetidamente os dados a partir de níveis de cache lentos ou da RAM principal, eliminando os benefícios do processamento paralelo. É evitado adicionando espaçamento (*padding*) às estruturas de dados de modo a garantir que variáveis independentes modificadas por threads concorrentes fiquem em linhas de cache fisicamente distintas (pelo menos 64 bytes de distância).

*(Mapeado de: SCOMP2526-T10.pdf)*

---

## 8.7. Otimização de Performance: Acumulação em Registos vs. Memória

**O Acrónico Associativo**: **REG** (**R**egister **E**xecution **G**uarantee).

**A Analogia Gen Z / Vida Real**:
Imagina que és um caixa num supermercado muito movimentado a registar as compras dos clientes:

- **Acumulação em Memória (com partilha falsa)**: De cada vez que passas o código de barras de um artigo (um incremento), tu escreves a caneta o novo subtotal no livro de registo central que está no escritório das traseiras, corres de volta, registas o artigo seguinte, e corres outra vez para as traseiras para atualizar o livro (acesso lento a memória partilhada DRAM por cada passo de ciclo). Se houver 10 caixas a fazer o mesmo ao mesmo tempo no mesmo livro, o supermercado colapsa em filas de espera.
- **Acumulação em Registos (Register Accumulation)**: Tu calculas a soma de cabeça ou usas a calculadora rápida que tens pousada na tua mesa de trabalho (as variáveis locais em **registos de CPU**). Só no final do teu turno de trabalho, depois de teres somado os subtotais de 1.000 clientes, é que vais apenas uma única vez ao escritório escrever o total final no livro de registos das traseiras (escrever o resultado acumulado apenas uma vez na memória principal). É infinitamente mais rápido.

**A Explicação Formal**:
Ao projetar algoritmos paralelos de elevado desempenho, o desenho do fluxo de dados e a localização do armazenamento temporário de dados ditam a escalabilidade real da aplicação:

- **Abordagem Baseada em Memória (psum[i] local)**: Cada thread atualiza o seu acumulador privado localizado na memória RAM ou cache (ex: `psum[myid*spacing] += i`) em cada iteração de um ciclo intensivo. Embora o espaçamento previna o *false sharing* físico, o facto de a CPU ter de aceder repetidamente à hierarquia de cache para ler, atualizar e escrever o valor de memória gera uma sobrecarga computacional de largura de banda desnecessária.
- **Abordagem Baseada em Registos (Register Accumulation)**: Cada thread realiza toda a computação de acumulação intensiva em memória interna ultra-rápida de registos locais privados à CPU (ex: uma variável local de ciclo C como `data_t sum = 0`). Desta forma, o processador executa apenas instruções de ciclo interno atómicas sem efetuar acessos ao sistema de memória partilhada de barramento. A thread apenas efetua uma única operação de escrita final no segmento de memória partilhada global após a conclusão do processamento de todo o seu bloco local de dados.
- *Resultados de Benchmarks*: Nos testes experimentais realizados com arquiteturas modernas de processadores com 16 threads (como o Core i9), a otimização de acumulação em registos locais revelou-se **mais de duas vezes mais rápida em termos absolutos** em comparação com a melhor abordagem de memória espaçada, provando que evitar totalmente a partilha e manter o processamento puramente local é o padrão de desenho de software paralelo ideal.

*(Mapeado de: SCOMP2526-T10.pdf)*
