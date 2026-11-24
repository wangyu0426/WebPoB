/**
 * Parses PoeCharm-style 2-column CSV translation tables (`"English","中文"` or `English,中文`)
 * into a fast `Map<string, string>`.
 */
export function parseTranslationCsv(csvText: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = csvText.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);

    const en = cols[0]?.trim();
    const zh = cols[1]?.trim();
    if (en && zh && en !== zh) {
      map.set(en, zh);
    }
  }

  return map;
}
