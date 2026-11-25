import { ModFlag, type Build, type GemDefinition } from '@webpob/core';
import { getGemById, getGemsForGame } from '@webpob/data';
import { calculateBuild } from './engine.js';

export interface RankedSupportRecommendation {
  gem: GemDefinition;
  dpsDelta: number;
  dpsDeltaPct: number;
  newTotalDps: number;
}

function isSupportCompatible(active: GemDefinition, support: GemDefinition): boolean {
  const activeTags = new Set(active.tags.map((t) => t.toLowerCase()));
  const supTags = new Set(support.tags.map((t) => t.toLowerCase()));
  const isMinion = Boolean(active.minionBase) || activeTags.has('minion');
  const isAttack = !isMinion && (active.modFlags & ModFlag.Attack) !== 0;
  const isSpell = !isMinion && (active.modFlags & ModFlag.Spell) !== 0;

  // Exclude incompatible archetype supports
  if (supTags.has('minion') && !isMinion) return false;
  if (isMinion && !supTags.has('minion') && !supTags.has('fire') && !supTags.has('cold') && !supTags.has('lightning') && !supTags.has('physical') && !supTags.has('melee') && !supTags.has('attack')) {
    return false;
  }
  if (supTags.has('trigger') || supTags.has('totem') || supTags.has('trap') || supTags.has('mine')) {
    return false;
  }
  if ((support.modFlags & ModFlag.Attack) !== 0 && isSpell) return false;
  if ((support.modFlags & ModFlag.Spell) !== 0 && isAttack) return false;
  if ((support.modFlags & ModFlag.Bow) !== 0 && !activeTags.has('bow')) return false;
  if (supTags.has('bow') && !activeTags.has('bow')) return false;
  if (supTags.has('melee') && !activeTags.has('melee') && !isMinion) return false;
  if (supTags.has('projectile') && !activeTags.has('projectile')) return false;
  return true;
}

/**
 * Ranks compatible support gems for a target skill group by live simulated Total DPS gain
 * (inspired by desktop Path of Building's "Sort gems by DPS" dropdown).
 */
export function rankSupportGemsForGroup(
  build: Build,
  groupId: string,
  limit = 10,
): RankedSupportRecommendation[] {
  const group = build.skills.find((g) => g.id === groupId);
  if (!group) return [];

  const activeCandidates = group.gems
    .filter((gi) => gi.enabled)
    .map((gi) => getGemById(build.game, gi.gemId))
    .filter((def): def is GemDefinition => Boolean(def && def.category === 'active' && !def.isAuraOrBuff));
  if (activeCandidates.length === 0) return [];

  const pickIdx = Math.max(
    0,
    Math.min(activeCandidates.length - 1, (group.mainActiveSkillIndex ?? 1) - 1),
  );
  const activeDef = activeCandidates[pickIdx]!;
  const existingIds = new Set(group.gems.map((g) => g.gemId));

  // Evaluate baseline with this group set as mainSkillGroupId
  const baseBuild: Build =
    build.mainSkillGroupId === groupId ? build : { ...build, mainSkillGroupId: groupId };
  const baseOut = calculateBuild(baseBuild);
  const baseDps = baseOut.offence.totalDps;

  const candidates = getGemsForGame(build.game).filter(
    (g) =>
      g.category === 'support' &&
      !existingIds.has(g.id) &&
      g.stats.length > 0 &&
      isSupportCompatible(activeDef, g),
  );

  // Deduplicate by display name & cap simulation count for sub-15ms UI responsiveness
  const seenNames = new Set<string>();
  const results: RankedSupportRecommendation[] = [];

  for (const sup of candidates) {
    const normName = sup.name.en.replace(/\s+Support$/i, '').toLowerCase();
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);

    const simBuild: Build = {
      ...baseBuild,
      skills: baseBuild.skills.map((sg) =>
        sg.id === groupId
          ? {
              ...sg,
              gems: [
                ...sg.gems,
                {
                  instanceId: '__sim_sup__',
                  gemId: sup.id,
                  level: 20,
                  quality: 0,
                  enabled: true,
                },
              ],
            }
          : sg,
      ),
    };
    const nextDps = calculateBuild(simBuild).offence.totalDps;
    const dpsDelta = nextDps - baseDps;
    if (dpsDelta <= 0.5) continue;

    const dpsDeltaPct =
      baseDps > 0 ? Math.round((dpsDelta / baseDps) * 1000) / 10 : 100;
    results.push({
      gem: sup,
      dpsDelta: Math.round(dpsDelta * 100) / 100,
      dpsDeltaPct,
      newTotalDps: nextDps,
    });
  }

  results.sort((a, b) => b.dpsDelta - a.dpsDelta);
  return results.slice(0, limit);
}
