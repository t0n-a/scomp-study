// Diff de linhas simples (LCS) — sem dependências.
//
// Casos verificados à mão:
//   diffLines('a\nb\nc', 'a\nx\nc')
//     -> [same a/a, mod b/x, same c/c]
//   diffLines('a\nb', 'a\nb\nc')
//     -> [same a/a, same b/b, add null/c]
//   diffLines('a\nb\nc', 'a\nc')
//     -> [same a/a, del b/null, same c/c]
//   diffLines('a \nb', 'a\nb')
//     -> [same a/a, same b/b]  (trailing whitespace ignorado)
//   diffLines('  a', 'a')
//     -> [mod "  a"/"a"]  (indentação inicial CONTA — não é ignorada)

// Remove só o espaço em branco no FIM de cada linha; mantém a indentação inicial.
function normalizeLines(text) {
  return text.split('\n').map((line) => line.replace(/[ \t]+$/, ''))
}

// LCS clássico (tabela O(n*m)) para encontrar o alinhamento ótimo entre A e B.
function lcsTable(a, b) {
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return dp
}

// Junta pares consecutivos del+add em linhas 'mod' (mesma posição, conteúdo diferente).
function mergeModifications(rows) {
  const out = []
  let k = 0
  while (k < rows.length) {
    const row = rows[k]
    if (row.type !== 'del') {
      out.push(row)
      k++
      continue
    }
    let delEnd = k
    while (delEnd < rows.length && rows[delEnd].type === 'del') delEnd++
    let addEnd = delEnd
    while (addEnd < rows.length && rows[addEnd].type === 'add') addEnd++

    const dels = rows.slice(k, delEnd)
    const adds = rows.slice(delEnd, addEnd)
    const pairs = Math.min(dels.length, adds.length)
    for (let p = 0; p < pairs; p++) {
      out.push({ left: dels[p].left, right: adds[p].right, type: 'mod' })
    }
    for (let p = pairs; p < dels.length; p++) out.push(dels[p])
    for (let p = pairs; p < adds.length; p++) out.push(adds[p])
    k = addEnd
  }
  return out
}

export function diffLines(a, b) {
  const A = normalizeLines(a)
  const B = normalizeLines(b)
  const dp = lcsTable(A, B)

  const rows = []
  let i = 0
  let j = 0
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      rows.push({ left: A[i], right: B[j], type: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ left: A[i], right: null, type: 'del' })
      i++
    } else {
      rows.push({ left: null, right: B[j], type: 'add' })
      j++
    }
  }
  while (i < A.length) {
    rows.push({ left: A[i], right: null, type: 'del' })
    i++
  }
  while (j < B.length) {
    rows.push({ left: null, right: B[j], type: 'add' })
    j++
  }

  return mergeModifications(rows)
}
