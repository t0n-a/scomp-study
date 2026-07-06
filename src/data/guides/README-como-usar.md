<!-- topic: geral | title: Como usar os Guias -->

# Como usar os Guias

Cola aqui os guias do NotebookLM — o Claude converte-os para markdown e
liga-os aos tópicos; as mnemónicas serão integradas nas explicações das
perguntas e flashcards.

## Formato

Cada guia é um ficheiro `.md` dentro de `src/data/guides/`. A primeira linha
pode indicar o tópico e o título:

```
<!-- topic: sync | title: Guia de Semáforos -->
```

Se essa linha faltar, o guia aparece com o tópico `geral` e o título é o
nome do ficheiro.

## O que suportar no texto

- **negrito**, *itálico* e `código inline`
- blocos de código com três crases
- listas com `-` ou `1.`
- citações com `>`
- [links externos](https://example.com)

> Nada de HTML dentro do markdown — é sempre escapado, nunca interpretado.
