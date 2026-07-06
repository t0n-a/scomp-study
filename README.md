# scomp — sala de estudo

Web app local para estudar para o exame de **SCOMP** (Sistemas de Computadores, ISEP).
Perguntas reais de exames anteriores, simulação com a cotação verdadeira, flashcards,
guias de teoria com analogias, e um Code Lab que compila e corre C de verdade no WSL.

> Feito para estudo entre colegas. As perguntas vêm do exame modelo 24/25 e de 6 exames
> de épocas anteriores (23/24 e 24/25), em português, como no exame.

## O que tem

| Separador | O que faz |
|---|---|
| `~` (home) | Progresso por tema, temas fracos, histórico de simulações |
| `./drill` | Perguntas de escolha múltipla com feedback imediato, filtráveis por tema. Errar abre um popup de estudo: explicação, link para o slide exato da teoria e o guia do tema |
| `./exame` | Simulação completa: Grupo I (10 MCQ, +0.8 / −0.8÷3 / 0) + Grupo II (2 enunciados práticos reais, autoavaliados por rubrica) → nota /20 |
| `./flashcards` | 53 cartões com repetição pesada no que erras (Outra vez / Sei esta). Muitos terminam com a mnemónica 🧠 do guia correspondente |
| `./lab` | Editor de C no browser; compila com `gcc -Wall -pthread` dentro do WSL e corre com timeout de 5 s, com stdin opcional |
| `./guias` | 10 conceitos de teoria no formato acrónimo → analogia → explicação formal |

Todo o progresso (tentativas, notas de simulação, pesos dos flashcards) fica no
`localStorage` do browser — cada pessoa tem o seu, nada sai da máquina.

## Requisitos

- **Node.js 20+** (com npm)
- **Windows + WSL com gcc** — só para o Code Lab. Sem WSL, tudo o resto funciona;
  o Code Lab devolve um erro simpático.
  ```powershell
  wsl --install -d Ubuntu        # se ainda não tens WSL
  wsl sudo apt update; wsl sudo apt install -y gcc
  ```
Os PDFs das teóricas e das TPs já vêm no repo (`public/pdfs/`) — os links "Teoria:"
funcionam logo a seguir ao clone. Por serem material da cadeira, **mantém o repo privado**.

## Como correr

```bash
git clone <url-deste-repo>
cd scomp-study
npm install
npm run dev
```

Abre http://localhost:5173. É isto.

> **Nota de segurança**: o Code Lab compila e executa qualquer C que escrevas,
> no TEU WSL, sem sandbox. O servidor dev só escuta em localhost por omissão —
> não corras `vite --host` numa rede em que não confies.

## Estrutura

```
src/
  App.jsx                  # barra de terminal (tabs) + estado partilhado; tabs ficam montadas
  index.css                # stylesheet único; tema claro/escuro via prefers-color-scheme
  pages/                   # um ficheiro por separador (Home, Drill, Exam, Flashcards, CodeLab, Guides)
  components/              # QuestionView, WrongAnswerModal, TheoryRefs, Markdown (renderer próprio)
  utils/                   # storage.js (localStorage), guides.js (carrega guias), misc.js
  data/
    questions.json         # 100 MCQs {id, topic, question, options, correctIndex, explanation, theoryRefs}
    flashcards.json        # 53 cartões {id, topic, front, back, theoryRefs}
    grupo2.json            # 12 enunciados práticos reais {id, archetype A|B|C, statement, hints}
    labTemplates.json      # templates do Code Lab (esqueletos com TODOs, de propósito)
    guides/*.md            # guias de teoria; 1.ª linha: <!-- topic: X | title: Y -->
vite.config.js             # plugin /api/compile: escreve .lab/prog.c e chama wsl gcc
patterns/                  # soluções-ouro comentadas dos 3 arquétipos de Grupo II + notas + plano de treino
docs/theory-map.md         # mapa slides→temas→páginas usado nas referências de teoria
```

### Adicionar conteúdo

- **Pergunta nova**: acrescenta um objeto a `src/data/questions.json`. `topic` tem de ser
  um de `processes|pipes|signals|threads|sync|memory|scheduling`; `correctIndex` é 0-based;
  `theoryRefs` é `[{pdf, page, label}]`.
- **Guia novo**: cria `src/data/guides/o-teu-guia.md` começando com
  `<!-- topic: sync | title: O meu guia -->`. Aparece em `./guias` e nos popups
  do drill desse tema, sem mais nada.
- **Flashcard / enunciado de Grupo II**: mesmo padrão, em `flashcards.json` / `grupo2.json`.

## Estratégia de estudo (a parte importante)

A distribuição histórica do Grupo II está em [`patterns/EXAM-HISTORY.md`](patterns/EXAM-HISTORY.md):

1. **Q1 é sempre processos+pipes** (arquétipo A, master/slave) — 5 pts.
2. **Q2 é threads+sincronização**, com produtor-consumidor (C) a sair mais vezes
   que leitores-escritores (B) — 7 pts.

Ordem de treino sugerida: template **A → C → B**, escritos à mão em papel e depois
verificados no Code Lab. O protocolo completo está em [`patterns/DRILL.md`](patterns/DRILL.md).
No Grupo I, os temas com mais perguntas no banco são sincronização (31), escalonamento (27)
e processos (27) — o drill com esses filtros rende mais pontos por hora.

## Notas sobre os dados

- As perguntas e enunciados foram extraídos dos PDFs oficiais e auditados à mão;
  cada resposta traz explicação e referência ao slide.
- `recurso2324-19` (traço de escalonamento): o enunciado original tem uma gralha na
  opção correta; o traço certo é `3311131332222-2` (confirmado contra o exame modelo).
- Os guias de teoria (conceitos 1–10) seguem o formato acrónimo + analogia + formal;
  o conceito 9 (escalonamento) foi escrito de raiz porque faltava no export original.

Bom estudo. 📟
