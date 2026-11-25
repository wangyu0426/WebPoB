import type { Mod, ModType } from '@webpob/core';

export interface EvaluatedStat {
  base: number;
  incPct: number;
  moreMultiplier: number;
  total: number;
  sources: Array<{ source: string; type: ModType; value: number | string }>;
}

/**
 * Pure-TypeScript port of Path of Building's `ModDB`.
 * Stores modifiers keyed by canonical stat name and evaluates them against
 * bitmask `ModFlag` & `KeywordFlag` contexts.
 */
export class ModDB {
  private readonly store = new Map<string, Mod[]>();

  addMod(mod: Mod): void {
    let bucket = this.store.get(mod.name);
    if (!bucket) {
      bucket = [];
      this.store.set(mod.name, bucket);
    }
    bucket.push(mod);
  }

  addMods(mods: readonly Mod[]): void {
    for (const mod of mods) {
      this.addMod(mod);
    }
  }

  clone(): ModDB {
    const copy = new ModDB();
    for (const [key, list] of this.store.entries()) {
      copy.store.set(key, [...list]);
    }
    return copy;
  }

  entriesByPrefix(prefix: string): Array<[string, Mod[]]> {
    const out: Array<[string, Mod[]]> = [];
    for (const [key, list] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        out.push([key, list]);
      }
    }
    return out;
  }

  private matches(mod: Mod, flags: number, keywordFlags: number): boolean {
    if (mod.flags !== 0 && (mod.flags & flags) !== mod.flags) {
      return false;
    }
    if (mod.keywordFlags !== 0 && (mod.keywordFlags & keywordFlags) !== mod.keywordFlags) {
      return false;
    }
    return true;
  }

  private collect(
    names: string | readonly string[],
    flags = 0,
    keywordFlags = 0,
  ): Mod[] {
    const nameList = typeof names === 'string' ? [names] : names;
    const result: Mod[] = [];
    for (const name of nameList) {
      const bucket = this.store.get(name);
      if (!bucket) continue;
      for (const mod of bucket) {
        if (this.matches(mod, flags, keywordFlags)) {
          result.push(mod);
        }
      }
    }
    return result;
  }

  sum(
    modType: 'BASE' | 'INC',
    names: string | readonly string[],
    flags = 0,
    keywordFlags = 0,
  ): number {
    let total = 0;
    for (const mod of this.collect(names, flags, keywordFlags)) {
      if (mod.type === modType && typeof mod.value === 'number') {
        total += mod.value;
      }
    }
    return total;
  }

  more(
    names: string | readonly string[],
    flags = 0,
    keywordFlags = 0,
  ): number {
    // Matches official PoB ModList:MoreInternal — each stat bucket's product is rounded to the nearest percent
    const nameList = typeof names === 'string' ? [names] : names;
    let result = 1;
    for (const name of nameList) {
      const bucket = this.store.get(name);
      if (!bucket) continue;
      let modResult = 1;
      for (const mod of bucket) {
        if (
          mod.type === 'MORE' &&
          typeof mod.value === 'number' &&
          this.matches(mod, flags, keywordFlags)
        ) {
          modResult *= 1 + mod.value / 100;
        }
      }
      result *= Math.floor(modResult * 100 + 0.5) / 100;
    }
    return Math.max(0, result);
  }

  flag(name: string, flags = 0, keywordFlags = 0): boolean {
    for (const mod of this.collect(name, flags, keywordFlags)) {
      if (mod.type === 'FLAG' && mod.value === true) {
        return true;
      }
    }
    return false;
  }

  override(name: string, flags = 0, keywordFlags = 0): number | null {
    let value: number | null = null;
    for (const mod of this.collect(name, flags, keywordFlags)) {
      if (mod.type === 'OVERRIDE' && typeof mod.value === 'number') {
        value = mod.value;
      }
    }
    return value;
  }

  /**
   * Computes `base * (1 + incPct / 100) * moreMultiplier`, respecting OVERRIDE if present,
   * and returns full source attribution for the Calcs breakdown panel.
   */
  calcStat(
    names: string | readonly string[],
    flags = 0,
    keywordFlags = 0,
  ): EvaluatedStat {
    const matched = this.collect(names, flags, keywordFlags);
    let base = 0;
    let incPct = 0;
    let moreMultiplier = 1;
    let overrideVal: number | null = null;
    const sources: EvaluatedStat['sources'] = [];

    for (const mod of matched) {
      if (mod.type === 'BASE' && typeof mod.value === 'number') {
        base += mod.value;
        sources.push({ source: mod.source, type: 'BASE', value: mod.value });
      } else if (mod.type === 'INC' && typeof mod.value === 'number') {
        incPct += mod.value;
        sources.push({ source: mod.source, type: 'INC', value: mod.value });
      } else if (mod.type === 'MORE' && typeof mod.value === 'number') {
        moreMultiplier *= 1 + mod.value / 100;
        sources.push({ source: mod.source, type: 'MORE', value: mod.value });
      } else if (mod.type === 'OVERRIDE' && typeof mod.value === 'number') {
        overrideVal = mod.value;
        sources.push({ source: mod.source, type: 'OVERRIDE', value: mod.value });
      }
    }

    moreMultiplier = Math.max(0, moreMultiplier);
    const total =
      overrideVal !== null
        ? overrideVal
        : Math.max(0, base * (1 + incPct / 100) * moreMultiplier);

    return { base, incPct, moreMultiplier, total, sources };
  }
}
