<!-- topic: scheduling | title: Conceito 09 — Escalonamento de Processos (NOVO — não estava nos guias) -->
# Conceito 9 — Escalonamento de Processos

Este conceito estava em falta nos guias do NotebookLM, mas é **27% das perguntas do banco de exame** (empatado com processos). Cobre exatamente os temas que caem: dispatcher, preemptivo vs. não-preemptivo, FCFS, SJF/SRTF, Round-Robin e o quantum, prioridades + starvation, inversão de prioridades, MLFQ e o método para resolver os traços de execução.

---

## 9.1. Escalonador (Scheduler) vs. Dispatcher

**O Acrónimo Conetivo**: **MIX** (o scheduler escolhe a **M**úsica, o dispatcher faz a **mIX**agem/crossfade)

**A Analogia Gen Z / Vida Real**:
Numa festa há duas funções distintas na cabine: quem **escolhe a próxima música** (o **scheduler** — pura decisão, pura política) e a **mesa de mistura que executa o crossfade** (o **dispatcher** — o mecanismo que tira a música antiga e mete a nova a tocar). O crossfade não é instantâneo: há um momento em que nenhuma música está realmente a "dar" — é a **latência do dispatcher**, tempo perdido em que a CPU não faz trabalho útil de nenhum processo.

**A Explicação Formal**:
O **escalonador de CPU (scheduler)** seleciona, de entre os processos na *Ready Queue*, qual será o próximo a executar (decisão de **política**). O **dispatcher** é o módulo de **mecanismo** que concretiza essa decisão, e a sua principal responsabilidade é dar o controlo da CPU ao processo escolhido. Isso envolve:

- Realizar a **mudança de contexto (context switch)**: guardar o estado (registos, program counter) do processo que sai no seu PCB e restaurar o estado do processo que entra.
- **Comutar para modo utilizador (user mode)**.
- **Saltar para a localização correta** no programa do utilizador (o program counter restaurado) para retomar a execução.

A **latência do dispatcher** é o tempo que este processo demora — overhead puro, durante o qual nenhum processo de utilizador progride. Mudanças de contexto demasiado frequentes desperdiçam CPU.

*(Baseado em: SCOMP2526-T11.pdf)*

---

## 9.2. Preemptivo vs. Não-Preemptivo e o Temporizador de Hardware

**O Acrónimo Conetivo**: **TIC** (**T**imer **I**nterrompe **C**PU — sem timer não há preempção)

**A Analogia Gen Z / Vida Real**:
Noite de karaoke. No **karaoke não-preemptivo (cooperativo)**, cada pessoa canta até DECIDIR sair do palco — se aparecer um chato que canta 40 músicas seguidas, monopoliza a noite e mais ninguém canta (um processo em ciclo infinito bloqueia o sistema inteiro). No **karaoke preemptivo**, há um relógio na parede e um segurança: ao fim de 3 minutos, o segurança corta o microfone a meio da nota (**interrupção do temporizador de hardware**) e chama o próximo da lista. Ninguém consegue monopolizar o palco, nem que queira.

**A Explicação Formal**:

- **Escalonamento não-preemptivo (cooperativo)**: um processo em execução mantém a CPU até a libertar voluntariamente — ao terminar ou ao bloquear-se numa operação de E/S. **Permite que um processo monopolize o CPU** indefinidamente (ex: um ciclo infinito sem E/S nunca larga a CPU).
- **Escalonamento preemptivo**: o SO pode **retirar a CPU a um processo em execução** contra a vontade dele. **Impede a monopolização** do CPU e garante a partilha justa entre processos.
- **O papel do temporizador de hardware**: a preempção só é possível porque o hardware gera **interrupções periódicas do relógio (timer interrupts)**. A cada interrupção, o controlo passa forçosamente para o kernel (o hardware comuta para modo kernel e salta para o tratador de interrupção), que pode então decidir efetuar uma mudança de contexto para outro processo. Sem este mecanismo, um processo que nunca fizesse system calls nunca devolveria o controlo ao SO.
- Preempção também ocorre quando um processo de **prioridade superior** fica pronto (num escalonador preemptivo por prioridades) ou quando chega um processo com tempo restante menor (SRTF).

*(Baseado em: SCOMP2526-T11.pdf e ResumoSCOMP.pdf)*

---

## 9.3. Métricas de Escalonamento

**O Acrónimo Conetivo**: **TWR** (**T**urnaround, **W**aiting, **R**esponse — as três esperas)

**A Analogia Gen Z / Vida Real**:
Pedes um menu no McDonald's da praxe:

- **Turnaround time**: desde que entras na porta até saíres com a comida na mão (chegada → conclusão total).
- **Waiting time**: o tempo total que passaste especado na fila sem ninguém a tratar de ti (tempo na *Ready Queue* — não conta o tempo em que o teu pedido está a ser preparado).
- **Response time**: desde que entras até ao primeiro "boa tarde, o que vai ser?" (chegada → **primeira** vez que tens CPU). Para apps interativas, é esta que interessa.

**A Explicação Formal**:

- **Tempo de turnaround** = instante de conclusão − instante de chegada (inclui espera + execução + E/S).
- **Tempo de espera (waiting)** = soma de todos os períodos passados na *Ready Queue*. Equivalente: turnaround − tempo de execução (burst) − tempo de E/S.
- **Tempo de resposta (response)** = instante do primeiro acesso à CPU − instante de chegada.
- Objetivos típicos: maximizar a **utilização da CPU** e o **throughput** (processos concluídos por unidade de tempo); minimizar turnaround, espera e resposta. Algoritmos diferentes otimizam métricas diferentes — SJF minimiza a espera média, RR dá boa resposta à custa de mais turnaround.

*(Baseado em: SCOMP2526-T11.pdf)*

---

## 9.4. FCFS (First-Come, First-Served) e o Efeito Comboio

**O Acrónimo Conetivo**: **FIFO** (First In, First Out — a fila da pastelaria)

**A Analogia Gen Z / Vida Real**:
Uma fila com UM único balcão e sem senhas prioritárias: atende-se rigorosamente por ordem de chegada, e uma vez ao balcão ninguém te tira de lá (não-preemptivo). O problema clássico: a pessoa à tua frente pede 47 bolos de arroz individualmente embrulhados e tu, que só queres um café, ficas 20 minutos à espera. Isto é o **efeito comboio (convoy effect)**: um processo CPU-bound longo à frente atrasa todos os processos curtos atrás dele.

**A Explicação Formal**:

- O FCFS atribui a CPU por **ordem de chegada** à Ready Queue e é **não-preemptivo**: o processo executa até terminar ou bloquear em E/S.
- Simples e justo na ordem, mas produz **tempos de espera médios elevados e muito sensíveis à ordem de chegada**: se um burst longo chega primeiro, todos os curtos esperam (**convoy effect**).
- Mau para sistemas interativos ou de tempo partilhado, precisamente por não haver preempção.

*(Baseado em: SCOMP2526-T11.pdf)*

---

## 9.5. SJF vs. SRTF (Shortest Job First / Shortest Remaining Time First)

**O Acrónimo Conetivo**: **SRTF = SJF + Interrupções** (a versão preemptiva do mesmo critério)

**A Analogia Gen Z / Vida Real**:
O **SJF** é a caixa expresso do supermercado: quando o caixa fica livre, chama sempre a pessoa com **menos artigos** no cesto — mas quem já está a passar os artigos acaba as compras em paz (não-preemptivo). O **SRTF** é a versão sem piedade: estás a meio de passar os teus 20 artigos e chega alguém com 1 artigo? O caixa **suspende-te a ti** e atende primeiro o outro (preemptivo — compara com o tempo *restante*, não o total). E em ambos há o mesmo drama: se estiver sempre a chegar gente com cestos pequenos, o senhor do carrinho cheio **nunca mais é atendido** (starvation dos processos longos).

**A Explicação Formal**:

- **SJF (não-preemptivo)**: quando a CPU fica livre, escolhe o processo da Ready Queue com o **menor burst de CPU previsto**. Uma vez a executar, o processo não é interrompido por chegadas de processos mais curtos.
- **SRTF (preemptivo)**: a decisão é reavaliada **sempre que chega um novo processo**: se o recém-chegado tem tempo de execução menor que o **tempo restante** do processo em execução, há preempção imediata.
- O SJF é **provadamente ótimo** para minimizar o tempo de espera médio (com bursts conhecidos); o SRTF melhora ainda o turnaround médio em cargas com chegadas dinâmicas.
- **Limitações**: exige **prever a duração dos bursts** (na prática estima-se por média exponencial do passado); pode causar **starvation** de processos longos se continuarem a chegar processos curtos.

*(Baseado em: SCOMP2526-T11.pdf)*

---

## 9.6. Round-Robin e o Dilema do Quantum

**O Acrónimo Conetivo**: **RR = Roda e Repete** (quantum pequeno → roda demais; quantum grande → vira FCFS)

**A Analogia Gen Z / Vida Real**:
Uma consola, quatro amigos, e a regra "cada um joga X minutos e passa o comando". O **quantum** é o X:

- **Quantum minúsculo (30 segundos)**: super justo e toda a gente "joga" quase em simultâneo — mas passa-se mais tempo a passar o comando, sentar, ajustar o sofá (**context switches**) do que a jogar. O overhead come o tempo útil.
- **Quantum gigante (3 horas)**: quase nunca se passa o comando — na prática é "joga até te fartares", ou seja, **degenera em FCFS**, com todos os problemas de espera do FCFS.
- O ponto ideal: um quantum **grande em relação ao custo do context switch** (para o overhead ser desprezável), mas pequeno o suficiente para dar boa interatividade — tipicamente 10–100 ms.

**A Explicação Formal**:

- O **Round-Robin** é o FCFS com **preempção por quantum de tempo (time slice)**: cada processo executa no máximo um quantum; ao esgotá-lo, é interrompido pelo timer e vai para o **fim** da Ready Queue.
- Com *n* processos e quantum *q*, nenhum processo espera mais do que *(n−1)×q* pela sua vez — bom **tempo de resposta**, ideal para sistemas interativos/time-sharing.
- **Quantum demasiado pequeno**: o número de mudanças de contexto dispara e o overhead do dispatcher passa a consumir uma fração significativa da CPU (degradação de desempenho).
- **Quantum demasiado grande**: o comportamento **aproxima-se do FCFS** (a maioria dos bursts termina dentro do quantum e a preempção quase nunca atua), piorando a resposta.
- O turnaround médio do RR é geralmente **pior** que o do SJF, mas a resposta é melhor.

*(Baseado em: SCOMP2526-T11.pdf e ResumoSCOMP.pdf)*

---

## 9.7. Prioridades, Starvation e Aging

**O Acrónimo Conetivo**: **AGE** (**A**ntiguidade **G**arante **E**xecução — aging cura a starvation)

**A Analogia Gen Z / Vida Real**:
Embarque de avião por grupos: o grupo 1 entra sempre primeiro. Se estiver constantemente a chegar gente de grupo 1 ao portão, quem tem grupo 5 **nunca embarca** — fica em **starvation (inanição)**. A solução é o **aging (envelhecimento)**: por cada 10 minutos de espera no portão, sobes automaticamente um grupo. Mais tarde ou mais cedo, até o grupo 5 chega a grupo 1 e embarca garantidamente.

**A Explicação Formal**:

- No **escalonamento por prioridades**, a CPU é atribuída ao processo pronto com maior prioridade (número tipicamente menor = prioridade maior). Pode ser **preemptivo** (a chegada de um processo mais prioritário retira imediatamente a CPU ao atual) ou não-preemptivo (o mais prioritário só entra na próxima decisão).
- **Starvation (inanição)**: processos de baixa prioridade podem esperar indefinidamente se houver um fluxo contínuo de processos mais prioritários. É o problema clássico deste algoritmo (e também do SJF/SRTF).
- **Aging (envelhecimento)**: técnica que **aumenta gradualmente a prioridade** de um processo à medida que o seu tempo de espera cresce, garantindo que acabará por executar. É a solução standard para a starvation.
- Num sistema preemptivo de **prioridades fixas** (como nos traços de exame): em cada instante executa SEMPRE o processo pronto de maior prioridade; um processo só larga a CPU quando termina, bloqueia, ou chega/desbloqueia alguém mais prioritário.

*(Baseado em: SCOMP2526-T11.pdf e SCOMP2526-T12.pdf)*

---

## 9.8. Inversão de Prioridades e Herança de Prioridade

**O Acrónimo Conetivo**: **HERDA** (**H**igh **E**mpresta **R**anking **D**urante o **A**perto — herança de prioridade)

**A Analogia Gen Z / Vida Real**:
História verídica: aconteceu à NASA com o rover *Mars Pathfinder* em 1997. Versão de escritório: o **estagiário** (prioridade baixa) tem a única chave da sala de reuniões (**o mutex/recurso partilhado**). O **CEO** (prioridade alta) precisa da sala e fica à porta, bloqueado. Até aqui é normal — o CEO espera que o estagiário saia. O problema é quando o **gestor intermédio** (prioridade média, que nem quer a sala) aparece e põe o estagiário a fazer fotocópias: agora o CEO está **indiretamente bloqueado por alguém de prioridade média** que nem sequer usa o recurso. Isto é a **inversão de prioridades**. A cura: **herança de prioridade** — enquanto o estagiário tiver a chave que o CEO quer, é temporariamente **promovido a prioridade de CEO** (ninguém de prioridade média o pode interromper), devolve a chave rápido e volta a ser estagiário.

**A Explicação Formal**:

- **Inversão de prioridades**: situação em que um processo de **alta prioridade fica bloqueado à espera de um recurso detido por um processo de baixa prioridade**, e este, por sua vez, é preemptido por processos de **prioridade intermédia** — na prática, o processo de alta prioridade fica a executar "atrás" de processos menos prioritários. Ocorre em sistemas preemptivos por prioridades com recursos partilhados protegidos por exclusão mútua (mutexes/semáforos).
- **Protocolo de herança de prioridade (priority inheritance)**: enquanto um processo detém um recurso pelo qual um processo mais prioritário espera, o detentor **herda temporariamente a prioridade mais alta** dos processos que bloqueia. Assim, não pode ser preemptido pelos processos intermédios; liberta o recurso o mais depressa possível e a sua prioridade regressa então ao valor original.
- É um tema típico de **sistemas de tempo real**, onde o incumprimento de prazos por causa da inversão pode ser catastrófico.

*(Baseado em: SCOMP2526-T12.pdf)*

---

## 9.9. MLFQ — Filas Multinível com Feedback

**O Acrónimo Conetivo**: **RANK** (**R**ebaixa quem **A**busa, **N**ão precisa de **K**onhecimento prévio)

**A Analogia Gen Z / Vida Real**:
É o sistema de ranked/ligas de um jogo competitivo, mas ao contrário: **toda a gente começa na liga máxima**. Se gastas o teu tempo de jogo todo até ao fim (esgotas o quantum = comportamento CPU-bound), o sistema assume que és um "farmer" e **desces de liga** (fila de prioridade inferior, com quantum maior mas menos vezes). Se largas o jogo cedo para responder ao chat (largas a CPU para fazer E/S = comportamento interativo), **manténs-te na liga de topo**. O génio do sistema: **ninguém declara o seu estilo de jogo à entrada — o rank descobre-o sozinho observando o comportamento**. E para os que caíram ao fundo não apodrecerem lá (starvation), há um **reset de season**: periodicamente todos sobem ao topo outra vez (boost/aging).

**A Explicação Formal**:

- O **Multilevel Feedback Queue (MLFQ)** usa várias filas de prioridades diferentes (tipicamente com quanta crescentes nas filas inferiores); executa sempre primeiro as filas de prioridade superior.
- **Feedback** = os processos **movem-se entre filas** consoante o seu comportamento observado: quem **esgota o quantum** (CPU-bound) desce de prioridade; quem **liberta a CPU antes do fim do quantum** (I/O-bound/interativo) mantém-se ou sobe.
- **Principal benefício**: **não exige qualquer conhecimento prévio sobre o comportamento ou duração dos processos** — adapta-se dinamicamente, aproximando o SJF sem precisar de prever bursts. Favorece automaticamente os processos interativos (resposta rápida) sem penalizar em definitivo os longos.
- Para evitar **starvation** nas filas inferiores, aplica-se **aging/boost periódico**: de tempos a tempos, os processos são promovidos (ex: todos de volta à fila de topo).
- É a resposta certa a perguntas do tipo "**sem assumir qualquer conhecimento do comportamento dos processos**, que algoritmo se adapta e favorece os interativos?" — MLFQ.

*(Baseado em: SCOMP2526-T11.pdf e SCOMP2526-T12.pdf)*

---

## 9.10. Processos CPU-bound vs. I/O-bound

**O Acrónimo Conetivo**: **BURST** (o que define o tipo é o tamanho dos **bursts** de CPU)

**A Analogia Gen Z / Vida Real**:
O **CPU-bound** é o render de um vídeo 4K: mete a CPU a 100% durante horas seguidas, sem parar para nada (bursts de CPU longos, quase sem E/S). O **I/O-bound** é um streamer a responder ao chat: usa a CPU dois segundos, depois fica à espera que o chat escreva (bursts de CPU curtíssimos, intercalados com longas esperas de E/S). Num bom escalonador, o streamer deve ter prioridade quando quer a CPU — usa-a pouco tempo e larga-a logo, e assim o chat (o utilizador!) tem resposta imediata; o render vai avançando nos tempos mortos, e a CPU **e** os dispositivos de E/S ficam ambos ocupados.

**A Explicação Formal**:

- **Processo CPU-bound**: passa a maior parte do tempo a executar cálculo; caracteriza-se por **bursts de CPU longos** e pouca E/S.
- **Processo I/O-bound**: passa a maior parte do tempo bloqueado à espera de operações de E/S; caracteriza-se por **muitos bursts de CPU curtos**.
- Um bom escalonador **favorece os I/O-bound**: como estes usam a CPU por pouco tempo e voltam a bloquear-se depressa, dar-lhes prioridade mantém os dispositivos de E/S ocupados e melhora a resposta interativa, praticamente sem atrasar os CPU-bound (que ficam com a CPU nos longos períodos em que os I/O-bound estão bloqueados). É exatamente o que o MLFQ faz automaticamente.
- Em algoritmos preemptivos, o processo I/O-bound que acaba de desbloquear volta à Ready Queue e, tendo prioridade, pode **preemptar** o CPU-bound em execução.

*(Baseado em: SCOMP2526-T11.pdf e ResumoSCOMP.pdf)*

---

## 9.11. Como resolver os traços de execução no exame (método TICK)

**O Acrónimo Conetivo**: **TICK** (**T**abela, **I**nstante a instante, **C**hegadas primeiro, **K**ontinua o mais prioritário)

**A Analogia Gen Z / Vida Real**:
No exame aparece sempre uma pergunta do tipo "3 processos, prioridades fixas, preemptivo, quem executa em cada unidade de tempo?" — e a resposta é uma string tipo `3311131332222-2`. Não tentes fazer de cabeça: é um jogo de gestão por turnos, e ganhas se fores burocrata. Faz a tabela e avança **um tick de cada vez**.

**A Explicação Formal** (o método, passo a passo):

1. **Tabela**: uma linha por processo com chegada, perfil (ex: "2 CPU, 3 E/S, 4 CPU") e prioridade. Colunas = instantes 0, 1, 2, ...
2. **Em cada tick, por esta ordem**: primeiro regista **chegadas** e **fins de E/S** (processos que voltam a Ready); depois escolhe para a CPU **o processo Ready com maior prioridade** (no RR, o da frente da fila).
3. **Preempção**: se chegou/desbloqueou alguém mais prioritário do que quem está na CPU, troca **já neste tick** — o que estava a executar volta a Ready (não perde o progresso).
4. **E/S em paralelo**: um processo em E/S avança o seu contador de E/S em todos os ticks, mesmo sem CPU — E/S e CPU andam em simultâneo. Vários processos podem estar em E/S ao mesmo tempo.
5. **CPU vazia**: se ninguém está Ready (todos em E/S ou por chegar), escreve `-` nesse tick.
6. **Contadores**: mantém para cada processo quanto falta da fase atual; quando chega a zero, passa à fase seguinte (CPU→E/S: sai da CPU nesse instante; E/S→CPU: volta a Ready e compete).
7. **Verificação final**: a soma de todos os ticks de CPU de cada processo tem de bater certo com o perfil dado. Se não bater, enganaste-te num desbloqueio.

Erros clássicos: esquecer que a E/S corre em paralelo (é o erro nº 1), não preemptar no instante exato do desbloqueio, e esquecer o `-` quando todos estão bloqueados. Nota: no exame de recurso 23/24 a opção correta desta pergunta vinha com uma gralha no enunciado original — o traço correto do exercício-modelo é `3311131332222-2`.

*(Baseado em: SCOMP2526-T11.pdf e nos exercícios dos exames Modelo 24/25 e Recurso 23/24)*
