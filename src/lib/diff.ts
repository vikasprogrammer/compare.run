export type DiffPart = { type: 'same' | 'add' | 'del'; text: string }

/**
 * Word-level diff via longest common subsequence. Prompts are short enough
 * that the O(n·m) table is free, and word granularity is what a person reading
 * "what did I change?" actually wants — character diffs shred the sentence.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before)
  const b = tokenize(after)

  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:]
  const width = b.length + 1
  const lcs = new Int32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i].trim() === b[j].trim()
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }

  const parts: DiffPart[] = []
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.type === type) last.text += text
    else parts.push({ type, text })
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i].trim() === b[j].trim()) {
      push('same', b[j])
      i++
      j++
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      push('del', a[i])
      i++
    } else {
      push('add', b[j])
      j++
    }
  }
  while (i < a.length) push('del', a[i++])
  while (j < b.length) push('add', b[j++])

  return parts
}

/** Words carrying their trailing whitespace, so joins reproduce the original. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? []
}
