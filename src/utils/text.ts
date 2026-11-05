function foldChar(ch: string) {
  if (ch === 'đ') return 'd';
  if (ch === 'Đ') return 'D';
  return ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Lowercase, accent-free text for diacritic-insensitive search ("Đà Nẵng" → "da nang"). */
export function fold(text: string) {
  return Array.from(text).map(foldChar).join('').toLowerCase();
}

/** Splits `text` into [before, match, after] for the first diacritic-insensitive match of `query`. */
export function splitMatch(text: string, query: string): [string, string, string] {
  const q = fold(query.trim());
  if (!q) return [text, '', ''];
  const chars = Array.from(text);
  const folded = chars.map((c) => fold(c)).join('');
  const index = folded.indexOf(q);
  if (index < 0 || folded.length !== chars.length) return [text, '', ''];
  return [
    chars.slice(0, index).join(''),
    chars.slice(index, index + q.length).join(''),
    chars.slice(index + q.length).join(''),
  ];
}
