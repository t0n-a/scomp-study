<!-- track: A | order: 8 | title: Prova final — o enunciado do exame modelo | time: 30 min em papel -->
<!-- section: teoria -->
## Agora sem rede

Já tens todas as peças: fork+wait (A1–A2), pipe com higiene de fecho (A3), structs como mensagens (A4), pipe partilhado com EOF (A5), pipes dedicados (A6) e o padrão completo (A7). A Q1 do exame é sempre uma história em cima do desenho da A7.

O ritual para o dia do exame (25–30 min):

1. **Lê o enunciado e desenha as setas**: quem envia o quê a quem? Isso diz-te quantos pipes e de que tipo (partilhado vs dedicado).
2. **Escreve as structs primeiro** — pedido (com índice do filho!) e resposta.
3. **Esqueleto fixo**: pipes → ciclo de forks → código do filho → código do pai → waits.
4. **Passa a checklist de higiene** no fim, linha a linha: closes do filho, `close(req[1])` no pai, EOF, waits.

Variações que o enunciado pode trazer (e o que mudam):

- "só filho→pai" (Especial 24/25) → é a lição A5, nem precisas dos pipes de resposta
- "preservar a ordem de chegada" → pipes dedicados lidos por ordem (A6)
- "o pai envia trabalho e recolhe resultados" → A7 com os papéis nos dois sentidos
- "termina os filhos que não acabaram" → junta `kill(pid_filho, SIGTERM)` no pai (guarda os PIDs do fork!)

<!-- section: exercicio -->
**(Exame modelo 24/25, Grupo II, pergunta 1 — 5 pts)** Em papel, cronometrado, 30 minutos, sem consultar nada:

Um museu tem N=3 postos de consulta (processos filho). O processo pai gere o catálogo de obras. Cada posto envia pedidos de consulta (código da obra) através de um **pipe partilhado**; o pai responde a cada posto com a informação da obra através de um **pipe dedicado** a esse posto. Cada posto faz 2 consultas e termina. O pai termina quando todos os postos terminarem, esperando por eles.

(Se quiseres o enunciado verbatim, está no separador `./exame` — é o G2 de arquétipo A do exame modelo.)

Quando acabar o tempo: transcreve para o Code Lab **exatamente o que escreveste no papel** (com os erros!), compila, e corrige a partir dos erros do gcc. Anota cada erro que o compilador apanhou — essa lista são os teus pontos cegos.

<!-- section: checklist -->
- Fiz em papel, cronometrado, sem olhar para nada
- As structs têm o índice do filho no pedido
- A higiene de fecho estava certa à primeira (ou sei exatamente o que falhou)
- O pai termina por EOF do pipe de pedidos
- Transcrevi tal e qual e a lista de erros do gcc está anotada
- Tempo total ≤ 30 min

<!-- section: solucao -->
A solução de referência comentada é o **Template A** — abre-a com o botão abaixo ou em `patterns/template-A-pipes.c` no repo. Compara linha a linha com o teu papel e marca as diferenças: cada diferença é ou um erro teu, ou uma escolha equivalente (ex.: `waitpid` vs `wait` em ciclo — ambas valem).

Autoavalia com a rubrica do separador `./exame`: Estrutura 40% (pipes+forks+papéis certos), Sincronização 30% (EOF, ordem de leitura), Limpeza 20% (closes, waits), Estilo 10%.

```c
/* A solução completa está no template do Code Lab: escolhe
   "Esqueleto A — processos + pipes" na lista de templates do ./lab,
   ou vê patterns/template-A-pipes.c no repo para a versão anotada. */
```
