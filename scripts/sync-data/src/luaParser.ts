/**
 * Fast, dependency-free Lua table literal parser for PathOfBuilding generated data files
 * (e.g. `src/TreeData/3_30/tree.lua`, `src/Data/Gems.lua`).
 */
export function parseLuaTable(source: string): unknown {
  // Strip leading comments and find `return`
  let pos = 0;
  const len = source.length;

  const skipWhitespaceAndComments = () => {
    while (pos < len) {
      const ch = source.charCodeAt(pos);
      // space, tab, cr, lf
      if (ch === 32 || ch === 9 || ch === 13 || ch === 10) {
        pos++;
        continue;
      }
      // -- comment
      if (ch === 45 && source.charCodeAt(pos + 1) === 45) {
        pos += 2;
        if (source.charCodeAt(pos) === 91 && source.charCodeAt(pos + 1) === 91) {
          pos += 2;
          const end = source.indexOf(']]', pos);
          pos = end === -1 ? len : end + 2;
        } else {
          while (pos < len && source.charCodeAt(pos) !== 10) pos++;
        }
        continue;
      }
      break;
    }
  };

  skipWhitespaceAndComments();
  if (source.startsWith('return', pos)) {
    pos += 6;
    skipWhitespaceAndComments();
  }

  const parseString = (): string => {
    const quote = source.charCodeAt(pos);
    // Long bracket string [[ ... ]]
    if (quote === 91 && source.charCodeAt(pos + 1) === 91) {
      pos += 2;
      const end = source.indexOf(']]', pos);
      const val = end === -1 ? source.slice(pos) : source.slice(pos, end);
      pos = end === -1 ? len : end + 2;
      return val;
    }

    pos++; // skip opening quote
    let out = '';
    while (pos < len) {
      const ch = source.charCodeAt(pos);
      if (ch === quote) {
        pos++;
        return out;
      }
      if (ch === 92) {
        // backslash escape
        pos++;
        const esc = source.charCodeAt(pos);
        pos++;
        if (esc === 110) out += '\n';
        else if (esc === 114) out += '\r';
        else if (esc === 116) out += '\t';
        else if (esc === 10) out += '\n'; // Lua escaped literal newline
        else if (esc === 13) {
          if (source.charCodeAt(pos) === 10) pos++;
          out += '\n';
        } else {
          out += String.fromCharCode(esc);
        }
      } else {
        out += String.fromCharCode(ch);
        pos++;
      }
    }
    return out;
  };

  const parseNumber = (): number => {
    const start = pos;
    if (source.charCodeAt(pos) === 45) pos++;
    while (pos < len) {
      const c = source.charCodeAt(pos);
      if (
        (c >= 48 && c <= 57) ||
        c === 46 ||
        c === 101 ||
        c === 69 ||
        c === 43 ||
        c === 45 ||
        c === 120 ||
        c === 88 ||
        (c >= 97 && c <= 102) ||
        (c >= 65 && c <= 70)
      ) {
        pos++;
      } else {
        break;
      }
    }
    const raw = source.slice(start, pos);
    return Number(raw);
  };

  const parseIdentifier = (): string => {
    const start = pos;
    while (pos < len) {
      const c = source.charCodeAt(pos);
      if (
        (c >= 65 && c <= 90) ||
        (c >= 97 && c <= 122) ||
        (c >= 48 && c <= 57) ||
        c === 95
      ) {
        pos++;
      } else {
        break;
      }
    }
    return source.slice(start, pos);
  };

  const parseValue = (): unknown => {
    skipWhitespaceAndComments();
    if (pos >= len) return null;
    const ch = source.charCodeAt(pos);

    if (ch === 123) return parseTable(); // {
    if (ch === 34 || ch === 39 || (ch === 91 && source.charCodeAt(pos + 1) === 91)) {
      return parseString();
    }
    if (ch === 45 || (ch >= 48 && ch <= 57)) {
      return parseNumber();
    }
    const ident = parseIdentifier();
    if (ident === 'true') return true;
    if (ident === 'false') return false;
    if (ident === 'nil') return null;
    if (ident === 'math') {
      // Handle math.huge etc.
      if (source.charCodeAt(pos) === 46) {
        pos++;
        parseIdentifier();
      }
      return 0;
    }
    return ident;
  };

  const parseTable = (): unknown => {
    pos++; // skip '{'
    skipWhitespaceAndComments();
    if (source.charCodeAt(pos) === 125) {
      pos++;
      return {};
    }

    const arrayItems: unknown[] = [];
    const obj: Record<string, unknown> = {};
    let hasNamedKeys = false;
    let hasArrayItems = false;

    while (pos < len) {
      skipWhitespaceAndComments();
      if (source.charCodeAt(pos) === 125) {
        pos++;
        break;
      }

      if (source.charCodeAt(pos) === 91) {
        // [key] = value
        pos++; // skip '['
        skipWhitespaceAndComments();
        const key = parseValue();
        skipWhitespaceAndComments();
        if (source.charCodeAt(pos) === 93) pos++; // skip ']'
        skipWhitespaceAndComments();
        if (source.charCodeAt(pos) === 61) pos++; // skip '='
        const val = parseValue();
        obj[String(key)] = val;
        hasNamedKeys = true;
      } else {
        // Lookahead to distinguish `ident = value` vs array element
        const savedPos = pos;
        const firstCh = source.charCodeAt(pos);
        const couldBeIdent =
          (firstCh >= 65 && firstCh <= 90) ||
          (firstCh >= 97 && firstCh <= 122) ||
          firstCh === 95;
        let isKeyValue = false;
        let keyName = '';
        if (couldBeIdent) {
          keyName = parseIdentifier();
          skipWhitespaceAndComments();
          if (source.charCodeAt(pos) === 61) {
            isKeyValue = true;
            pos++; // skip '='
          } else {
            pos = savedPos;
          }
        }

        if (isKeyValue) {
          const val = parseValue();
          obj[keyName] = val;
          hasNamedKeys = true;
        } else {
          const val = parseValue();
          arrayItems.push(val);
          hasArrayItems = true;
        }
      }

      skipWhitespaceAndComments();
      const sep = source.charCodeAt(pos);
      if (sep === 44 || sep === 59) {
        pos++; // skip ',' or ';'
      }
    }

    if (hasArrayItems && !hasNamedKeys) {
      return arrayItems;
    }
    if (hasArrayItems && hasNamedKeys) {
      arrayItems.forEach((v, idx) => {
        obj[String(idx + 1)] = v;
      });
    }
    return obj;
  };

  return parseValue();
}
