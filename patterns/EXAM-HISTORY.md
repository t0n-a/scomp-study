# Grupo II em exames anteriores — que padrão calhou?

Fonte: exames 2023/24 e 2024/25 + exame modelo. Detalhe completo em `staging/grupo2-*.md`.

| Exame | Q1 (processos+pipes) | Q2 (threads+sync) |
|---|---|---|
| **Modelo 24/25** | **A** — museu: pipe partilhado de pedidos + pipe de resposta por filho | **B** — leitores/escritores, prioridade leitores |
| Normal 24/25 | **A** — master/slave: fatoriais distribuídos por N slaves | **C** — produtor-consumidor: 2 sensores + 1 logger, buffer circular 10 |
| Recurso 24/25 | **A** — encomendas distribuídas por N workers | C-variante — semáforo rodoviário: fases alternadas por thread controladora |
| Especial 24/25 | **A** — pesquisa paralela em array (só filho→pai, ler até EOF) | **C** — 3 sensores + 2 consumidores (logger + alertas) |
| Normal 23/24 | — (não teve) | **C** — fila de impressão: 5 produtores + 3 impressoras, buffer 4, condvars |
| Recurso 23/24 | — | C-variante — ping-pong estrito entre 2 threads (300 atletas) |
| Especial 23/24 | — | **B** — leitores/escritores prioridade leitores (≡ modelo!) |
| Normal 22/23 | — | variante B/C — corrida de carros: barreira/rendezvous |

## Conclusão estratégica

1. **Q1 = sempre Template A.** Master/slave com pipes: distribuir trabalho, recolher resultados. Variações pequenas: às vezes só filho→pai (ler até EOF), às vezes é preciso preservar a ordem de entrada.
2. **Q2 = família threads+sync, com produtor-consumidor (Template C) a aparecer MAIS vezes que leitores-escritores (Template B).** Ordem de estudo: C primeiro, B segundo, e ler os sketches de alternância/fase nas notas do C.
3. O exame modelo (a referência que os docentes indicaram) usa A + B — por isso B continua obrigatório.
