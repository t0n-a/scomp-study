# Treino do Grupo II com as fichas PL — seleção curada

As PLs têm ~80 exercícios; para o exame interessam **estes 14**, por esta ordem.
Critério: cada exercício escolhido ou é um enunciado de exame disfarçado, ou treina
exatamente uma mutação que já caiu. Tudo o resto das fichas é ruído para o objetivo
(nota mínima). Escreve sempre primeiro em papel, depois verifica no Code Lab.

Legenda: ⭐ = obrigatório · ➕ = se houver tempo · A/B/C = arquétipo do exame.

---

## Q1 — processos + pipes (arquétipo A, 5 pts, cai SEMPRE)

### Aquecimento (30 min, só para destravar a mão)

- ⭐ **PL3.2b** — pai lê um inteiro + nome do teclado e envia ao filho **numa só
  `write` com struct**. É o gesto mais importante do exame: structs inteiras no
  pipe, nunca campos soltos.
- ➕ **PL1.2** — 2 filhos, pai faz `wait` pelos dois e imprime os exit values com
  `WIFEXITED`/`WEXITSTATUS`. Treina o fecho do programa, que vale pontos fáceis.

### Núcleo (é aqui que se ganha a Q1)

- ⭐ **PL3.5** — 5 filhos somam parciais de 2 arrays e enviam ao pai por **UM pipe
  partilhado**; pai lê as 5 respostas. É o exame Especial 24/25 quase palavra por
  palavra. Bónus teórico do enunciado: porque é que escritas concorrentes < PIPE_BUF
  não se misturam (atomicidade) — já foi pergunta de Grupo I.
- ⭐ **PL3.6** — o mesmo problema mas com **5 pipes, um por filho**, e o resultado
  tem de ficar ordenado no array final. Treina a decisão-chave do exame: pipe
  partilhado vs pipe por filho, e porquê.
- ⭐ **PL3.11** — leitores de código de barras: **pipe de pedidos partilhado (o pedido
  leva o PID/índice do filho) + pipe de resposta exclusivo por filho**. Isto É o
  Template A completo — o exame modelo (museu) e o Normal 24/25 (fatoriais) são
  este exercício com outra história. Se só fizeres um da lista toda, é este.
- ⭐ **PL3.9** — jogo de apostas com **2 pipes bidirecionais** e protocolo
  pedido→resposta em ciclo com condição de paragem. Treina o "conversar" pai↔filho
  que os enunciados adoram (twist do Recurso 24/25).

### Esticão (mutações que já caíram)

- ➕ **PL2.4** — 5 filhos procuram num array; quem encontra sai com exit code ≠ 0 e
  o pai **termina os restantes com sinais**. Híbrido A+sinais — o twist "termina os
  filhos que ainda não acabaram" já apareceu (assistência automóvel, PL2.8 idem).
- ➕ **PL3.13/3.14** — pipe + `dup2` + `exec` (cat/sort). Só se sobrar tempo: caiu em
  MCQ, nunca no Grupo II, mas fixa a mecânica redirecionar-e-exec.

---

## Q2 — threads + sincronização (7 pts)

### Prioridade máxima: produtor-consumidor (C — o mais frequente)

- ⭐ **PL6.14** — buffer circular de 10 inteiros, **2 produtores + 1 consumidor,
  30 valores**, mutex + not_full/not_empty. É o Template C e é o exame Normal
  24/25 (sensores+logger) sem a história. Escreve-o de memória até sair sozinho:
  `while` à volta do `cond_wait`, signal da condvar certa, terminação por total
  conhecido.
- ⭐ **PL6.13** — as notas de SCOMP: T1 gera → **sinaliza** T2/T3 que calculam →
  sinalizam T4/T5 que contam. É a família "fases/controlador" (Recurso 24/25 =
  semáforo rodoviário com thread controladora). Treina condvars como notificação
  entre estágios, não só buffer.
- ⭐ **PL6.4** — 5 threads procuram num array, devolvem o nº da thread via
  `pthread_exit`/`pthread_join`. Mecânica pura: passar args por array (nunca `&i`!),
  joins, valores de retorno. 20 minutos bem gastos antes dos grandes.

### Segundo pilar: leitores-escritores (B — foi o do exame modelo!)

- ⭐ **PL6.15** — readers-writers **com prioridade aos leitores** na heap:
  read_count protegido por mutex, 1.º leitor tranca a sala, último destranca,
  escritor exclusivo escreve TID+hora. É o Template B e o Grupo II do exame modelo
  E do Especial 23/24, tal e qual.
- ➕ **PL5.13/5.14** — a mesma coisa mas com **processos + semáforos + shm**. O 5.14
  acrescenta os twists (máx. 5 leitores concorrentes; leitores bloqueados se >2
  escritores à espera) — é exatamente o tipo de alínea extra que distingue o 5 do 7.

### Mutações com semáforos (o plano B se o enunciado proibir condvars)

- ⭐ **PL5.6** — pai e filho alternam 10 mensagens em **ping-pong estrito com 2
  semáforos**. O Recurso 23/24 foi literalmente isto (300 atletas). 30 minutos.
- ➕ **PL5.12** — produtor-consumidor com processos+semáforos (empty/full/mutex).
  A versão "sem condvars" do PL6.14 — ler as notas do Template C sobre a
  equivalência antes de o fazer.
- ➕ **PL5.7** — 3 filhos imprimem "Sistemas de Computadores is the best!" na ordem
  certa só com semáforos. Drill de ordenação puro, ótimo para papel no dia 8.

---

## Encaixe no calendário (exame dia 9)

| Dia | Manhã | Tarde |
|---|---|---|
| **7** | PL3.2b + PL3.5 + PL3.6 | PL3.11 (a sério, em papel) + PL6.4 |
| **8** | PL6.14 + PL5.6 | PL6.15 + PL3.9 + simulação completa na app |
| **9** | Reler templates A/C/B + notas; PL6.13 em pseudo-código | — |

Os ➕ só entram se os ⭐ desse bloco saírem limpos à primeira. Não faças a PL4:
espera ativa está explicitamente desencorajada nas próprias fichas 5/6 e nunca
caiu no Grupo II — ler o enunciado do 4.2 (race condition) chega, é matéria de MCQ.
