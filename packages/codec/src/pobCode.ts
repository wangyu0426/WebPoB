import { deflate, inflate } from 'pako';
import type { Build, EquipmentSlotId, GameId, GemInstance, Item, SkillGroup, WeaponSetId } from '@webpob/core';
import { createDefaultConfig, getClassesForGame, getGemsForGame, getRuleset, getTreeForGame } from '@webpob/data';
import { formatItemToPobText, parseItemText } from './itemParser.js';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);

  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function parseAttributes(tagHeader: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tagHeader)) !== null) {
    attrs[match[1]!] = unescapeXml(match[2]!);
  }
  return attrs;
}

const POE1_CLASS_TO_NUM: Record<string, number> = {
  Scion: 0,
  Marauder: 1,
  Ranger: 2,
  Witch: 3,
  Duelist: 4,
  Templar: 5,
  Shadow: 6,
};

const POE2_CLASS_TO_NUM: Record<string, number> = {
  Witch: 1,
  Ranger: 2,
  Warrior: 6,
  Sorceress: 7,
  Huntress: 8,
  Mercenary: 9,
  Monk: 10,
  Druid: 11,
};

/**
 * Serializes a WebPoB `Build` into official Path of Building XML format
 * (`<PathOfBuilding>` for PoE 1, `<PathOfBuilding2>` for PoE 2).
 */
export function buildToPobXml(build: Build): string {
  const rootTag = build.game === 'poe2' ? 'PathOfBuilding2' : 'PathOfBuilding';
  const mainIdx = Math.max(
    1,
    build.skills.findIndex((s) => s.id === build.mainSkillGroupId) + 1,
  );
  const classNum =
    build.game === 'poe2'
      ? (POE2_CLASS_TO_NUM[build.classId] ?? 6)
      : (POE1_CLASS_TO_NUM[build.classId] ?? 3);
  const gemsCatalog = getGemsForGame(build.game);

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<${rootTag}>`);

  // <Build>
  lines.push(
    `  <Build level="${build.level}" targetVersion="3_0" className="${escapeXml(build.classId)}" ascendClassName="${escapeXml(build.ascendancyId)}" ascendancyName="${escapeXml(build.ascendancyId)}" mainSocketGroup="${mainIdx}" activeWeaponSet="${build.activeWeaponSet}" bandit="${escapeXml(build.bandit ?? 'None')}" buildName="${escapeXml(build.name)}" />`,
  );

  // Pre-assign numeric item IDs so both <Tree><Spec><Sockets> and <Items> share exact IDs
  const itemEntries = Object.values(build.items);
  const idToNum = new Map<string, number>();
  itemEntries.forEach((item, index) => {
    idToNum.set(item.id, index + 1);
  });

  // <Tree>
  const allNodesSet = new Set<number>(build.tree.allocatedNodeIds);
  if (build.game === 'poe2') {
    for (const id of build.tree.weaponSet1NodeIds) allNodesSet.add(id);
    for (const id of build.tree.weaponSet2NodeIds) allNodesSet.add(id);
  }
  const nodesStr = [...allNodesSet].join(',');
  const ws1Str = build.tree.weaponSet1NodeIds.join(',');
  const ws2Str = build.tree.weaponSet2NodeIds.join(',');
  const wsAttrs =
    build.game === 'poe2'
      ? ` weaponSet1Nodes="${ws1Str}" weaponSet2Nodes="${ws2Str}"`
      : '';
  const jewelSockets = Object.entries(build.tree.socketedJewels ?? {})
    .map(([nodeId, itemId]) => ({ nodeId, numId: idToNum.get(itemId) }))
    .filter((s): s is { nodeId: string; numId: number } => Boolean(s.numId));
  const hasWsChildren =
    build.game === 'poe2' && (build.tree.weaponSet1NodeIds.length > 0 || build.tree.weaponSet2NodeIds.length > 0);

  lines.push(`  <Tree activeSpec="1">`);
  if (jewelSockets.length > 0 || hasWsChildren) {
    lines.push(
      `    <Spec title="${escapeXml(build.tree.title)}" treeVersion="${escapeXml(build.tree.treeVersion)}" classId="${classNum}" ascendClassId="0" nodes="${nodesStr}"${wsAttrs}>`,
    );
    if (build.game === 'poe2' && build.tree.weaponSet1NodeIds.length > 0) {
      lines.push(`      <WeaponSet1 nodes="${ws1Str}" />`);
    }
    if (build.game === 'poe2' && build.tree.weaponSet2NodeIds.length > 0) {
      lines.push(`      <WeaponSet2 nodes="${ws2Str}" />`);
    }
    if (jewelSockets.length > 0) {
      lines.push(`      <Sockets>`);
      for (const s of jewelSockets) {
        lines.push(`        <Socket nodeId="${s.nodeId}" itemId="${s.numId}" />`);
      }
      lines.push(`      </Sockets>`);
    }
    lines.push(`    </Spec>`);
  } else {
    lines.push(
      `    <Spec title="${escapeXml(build.tree.title)}" treeVersion="${escapeXml(build.tree.treeVersion)}" classId="${classNum}" ascendClassId="0" nodes="${nodesStr}"${wsAttrs} />`,
    );
  }
  lines.push(`  </Tree>`);

  // <Skills>
  lines.push(`  <Skills activeSkillSet="1" defaultGemQuality="0">`);
  lines.push(`    <SkillSet id="1">`);
  for (const group of build.skills) {
    const slotAttr = group.slot ? ` slot="${escapeXml(group.slot)}"` : '';
    const wsAttr =
      group.weaponSets && group.weaponSets.length > 0
        ? ` weaponSets="${group.weaponSets.join(',')}"`
        : '';
    const mainActive = group.mainActiveSkillIndex ?? 1;
    lines.push(
      `      <Skill enabled="${group.enabled}" mainActiveSkill="${mainActive}" mainActiveSkillCalcs="${mainActive}" label="${escapeXml(group.label)}"${slotAttr}${wsAttr}>`,
    );
    for (const gem of group.gems) {
      const def = gemsCatalog.find((g) => g.id === gem.gemId);
      const nameSpec = def ? def.name.en.replace(/\s+Support$/i, '') : gem.gemId;
      lines.push(
        `        <Gem gemId="${escapeXml(gem.gemId)}" nameSpec="${escapeXml(nameSpec)}" level="${gem.level}" quality="${gem.quality}" enabled="${gem.enabled}" />`,
      );
    }
    lines.push(`      </Skill>`);
  }
  lines.push(`    </SkillSet>`);
  lines.push(`  </Skills>`);

  // <Items>
  lines.push(`  <Items activeItemSet="1">`);
  itemEntries.forEach((item, index) => {
    const numId = index + 1;
    const body = escapeXml(formatItemToPobText(item));
    lines.push(`    <Item id="${numId}">\n${body}\n    </Item>`);
  });
  const itemSetWsAttr = build.game === 'poe2' && build.activeWeaponSet === 2 ? ' useSecondWeaponSet="true"' : '';
  lines.push(`    <ItemSet id="1"${itemSetWsAttr}>`);
  for (const [slot, itemId] of Object.entries(build.equipped)) {
    if (!itemId) continue;
    const numId = idToNum.get(itemId);
    if (numId) {
      const isActiveFlask =
        slot.startsWith('Flask ') && build.activeFlaskSlots?.[slot as EquipmentSlotId];
      lines.push(
        `      <Slot name="${escapeXml(slot)}" itemId="${numId}"${isActiveFlask ? ' active="true"' : ''} />`,
      );
    }
  }
  lines.push(`    </ItemSet>`);
  lines.push(`  </Items>`);

  // <Config>
  const cfg = build.config;
  lines.push(`  <Config activeConfigSet="1">`);
  lines.push(`    <ConfigSet id="1">`);
  lines.push(`      <Input name="enemyLevel" number="${cfg.enemyLevel}" />`);
  lines.push(`      <Input name="enemyIsBoss" string="${escapeXml(cfg.enemyIsBoss)}" />`);
  lines.push(`      <Input name="usePowerCharges" boolean="${cfg.usePowerCharges}" />`);
  lines.push(`      <Input name="powerCharges" number="${cfg.powerCharges}" />`);
  lines.push(`      <Input name="useFrenzyCharges" boolean="${cfg.useFrenzyCharges}" />`);
  lines.push(`      <Input name="frenzyCharges" number="${cfg.frenzyCharges}" />`);
  lines.push(`      <Input name="useEnduranceCharges" boolean="${cfg.useEnduranceCharges}" />`);
  lines.push(`      <Input name="enduranceCharges" number="${cfg.enduranceCharges}" />`);
  lines.push(`      <Input name="onslaught" boolean="${cfg.onslaught}" />`);
  lines.push(`      <Input name="enemyShocked" boolean="${cfg.enemyShocked}" />`);
  lines.push(`      <Input name="shockValue" number="${cfg.shockValue}" />`);
  if (cfg.conditionLowLife) lines.push(`      <Input name="conditionLowLife" boolean="true" />`);
  if (cfg.buffArcaneSurge) lines.push(`      <Input name="buffArcaneSurge" boolean="true" />`);
  if (cfg.buffTailwind) lines.push(`      <Input name="buffTailwind" boolean="true" />`);
  if (cfg.enemyIntimidated) lines.push(`      <Input name="conditionEnemyIntimidated" boolean="true" />`);
  if (cfg.enemyUnnerved) lines.push(`      <Input name="conditionEnemyUnnerved" boolean="true" />`);
  if (cfg.witheredStacks) lines.push(`      <Input name="multiplierWitheredStackCount" number="${cfg.witheredStacks}" />`);
  if (cfg.enemyFireExposure) lines.push(`      <Input name="conditionEnemyFireExposure" boolean="true" />`);
  if (cfg.enemyColdExposure) lines.push(`      <Input name="conditionEnemyColdExposure" boolean="true" />`);
  if (cfg.enemyLightningExposure) lines.push(`      <Input name="conditionEnemyLightningExposure" boolean="true" />`);
  if (cfg.customMods.trim()) {
    lines.push(`      <Placeholder name="customMods" string="${escapeXml(cfg.customMods)}" />`);
  }
  lines.push(`    </ConfigSet>`);
  lines.push(`  </Config>`);

  // <Notes>
  lines.push(`  <Notes>${escapeXml(build.notes)}</Notes>`);
  lines.push(`</${rootTag}>`);
  return lines.join('\n');
}

/**
 * Compresses and Base64URL-encodes a `Build` into a standard Path of Building share code.
 */
export function encodeBuildToPobCode(build: Build): string {
  const xml = buildToPobXml(build);
  const compressed = deflate(new TextEncoder().encode(xml));
  return bytesToBase64Url(compressed);
}

/**
 * Decodes a Path of Building share code (Base64URL + zlib) back into raw XML string.
 */
export function decodePobCodeToXml(code: string): string {
  const bytes = base64UrlToBytes(code);
  const inflated = inflate(bytes);
  return new TextDecoder('utf-8').decode(inflated);
}

function parseNodeList(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function matchGemId(game: GameId, rawGemId?: string, rawNameSpec?: string, rawSkillId?: string): string | null {
  const gems = getGemsForGame(game);
  if (rawGemId) {
    const exact = gems.find((g) => g.id === rawGemId);
    if (exact) return exact.id;
  }
  const candidates = [rawNameSpec, rawSkillId, rawGemId]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase().trim());

  for (const needle of candidates) {
    const exactName = gems.find(
      (g) =>
        g.name.en.toLowerCase() === needle ||
        g.name.en.toLowerCase() === `${needle} support` ||
        g.name.zh.toLowerCase() === needle,
    );
    if (exactName) return exactName.id;
  }
  for (const needle of candidates) {
    const fuzzy = gems.find(
      (g) =>
        needle.includes(g.name.en.toLowerCase()) ||
        g.name.en.toLowerCase().replace(/\s+support$/i, '') === needle,
    );
    if (fuzzy) return fuzzy.id;
  }
  return null;
}

/**
 * Parses official Path of Building XML (PoE 1 or PoE 2) into a WebPoB `Build` object.
 */
export function xmlToBuild(xml: string): Build {
  const isPoe2 =
    /<PathOfBuilding2\b/i.test(xml) ||
    /className="(?:Sorceress|Monk|Warrior|Mercenary|Huntress|Druid)"/i.test(xml) ||
    /weaponSet1Nodes="/i.test(xml);
  const game: GameId = isPoe2 ? 'poe2' : 'poe1';

  const buildTag = xml.match(/<Build\b([^>]*)\/?>/i);
  const buildAttrs = buildTag ? parseAttributes(buildTag[1]!) : {};

  const classes = getClassesForGame(game);
  const classDef =
    classes.find((c) => c.id.toLowerCase() === (buildAttrs.className ?? '').toLowerCase()) ??
    classes[0]!;
  const level = Math.max(1, Math.min(100, Number(buildAttrs.level ?? 90) || 90));
  const ascendancyId = buildAttrs.ascendClassName || buildAttrs.ascendancyName || '';
  const itemSetTag = xml.match(/<ItemSet\b([^>]*)\/?>/i);
  const itemSetAttrs = itemSetTag ? parseAttributes(itemSetTag[1]!) : {};
  const activeWeaponSet: WeaponSetId =
    buildAttrs.activeWeaponSet === '2' || itemSetAttrs.useSecondWeaponSet === 'true' ? 2 : 1;
  const mainSocketGroupIdx = Math.max(1, Number(buildAttrs.mainSocketGroup ?? 1) || 1);

  // Parse <Spec> (supports both WebPoB weaponSet1Nodes attributes AND official PoB2 <WeaponSet1 nodes="..."/> children)
  const tree = getTreeForGame(game);
  const specTag = xml.match(/<Spec\b([^>]*)\/?>/i);
  const specAttrs = specTag ? parseAttributes(specTag[1]!) : {};
  const ws1ChildMatch = xml.match(/<WeaponSet1\b[^>]*\bnodes="([^"]*)"/i);
  const ws2ChildMatch = xml.match(/<WeaponSet2\b[^>]*\bnodes="([^"]*)"/i);
  const weaponSet1NodeIds = parseNodeList(ws1ChildMatch?.[1] ?? specAttrs.weaponSet1Nodes).filter((id) =>
    Boolean(tree.nodes[id]),
  );
  const weaponSet2NodeIds = parseNodeList(ws2ChildMatch?.[1] ?? specAttrs.weaponSet2Nodes).filter((id) =>
    Boolean(tree.nodes[id]),
  );
  const wsExclusiveSet = new Set<number>([...weaponSet1NodeIds, ...weaponSet2NodeIds]);
  let allocatedNodeIds = parseNodeList(specAttrs.nodes).filter(
    (id) => Boolean(tree.nodes[id]) && !wsExclusiveSet.has(id),
  );
  const startNodeId = tree.classStartNodeIds[classDef.id];
  if (startNodeId && !allocatedNodeIds.includes(startNodeId)) {
    allocatedNodeIds = [startNodeId, ...allocatedNodeIds];
  }

  // Parse <Skill> groups
  const skills: SkillGroup[] = [];
  const skillRegex = /<Skill\b([^>]*)>([\s\S]*?)<\/Skill>/gi;
  let skillMatch: RegExpExecArray | null;
  let groupCounter = 1;
  while ((skillMatch = skillRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(skillMatch[1]!);
    const inner = skillMatch[2]!;
    const gems: GemInstance[] = [];
    const gemRegex = /<Gem\b([^>]*)\/?>/gi;
    let gemMatch: RegExpExecArray | null;
    let gemCounter = 1;
    while ((gemMatch = gemRegex.exec(inner)) !== null) {
      const gAttrs = parseAttributes(gemMatch[1]!);
      const matchedId = matchGemId(game, gAttrs.gemId, gAttrs.nameSpec, gAttrs.skillId);
      if (matchedId) {
        gems.push({
          instanceId: `imp_g_${groupCounter}_${gemCounter++}`,
          gemId: matchedId,
          level: Number(gAttrs.level ?? 20) || 20,
          quality: Number(gAttrs.quality ?? 0) || 0,
          enabled: gAttrs.enabled !== 'false',
        });
      }
    }
    if (gems.length > 0) {
      const weaponSets = attrs.weaponSets
        ? (attrs.weaponSets
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v): v is WeaponSetId => v === 1 || v === 2))
        : undefined;
      const mainActiveRaw = Number(attrs.mainActiveSkill ?? attrs.mainActiveSkillCalcs ?? 1);
      skills.push({
        id: `imp_sg_${groupCounter}`,
        label: attrs.label || `Skill Group ${groupCounter}`,
        enabled: attrs.enabled !== 'false',
        slot: attrs.slot as EquipmentSlotId | undefined,
        weaponSets: weaponSets && weaponSets.length > 0 ? weaponSets : game === 'poe2' ? [1, 2] : undefined,
        ...(Number.isFinite(mainActiveRaw) && mainActiveRaw > 1 ? { mainActiveSkillIndex: mainActiveRaw } : {}),
        gems,
      });
      groupCounter++;
    }
  }

  // Fallback skill group if XML had custom gems not yet in MVP catalog
  if (skills.length === 0) {
    const fallbackGem = getGemsForGame(game)[0]!;
    skills.push({
      id: 'imp_sg_1',
      label: 'Main Skill',
      enabled: true,
      slot: game === 'poe1' ? 'Body Armour' : undefined,
      weaponSets: game === 'poe2' ? [1, 2] : undefined,
      gems: [{ instanceId: 'imp_g_1', gemId: fallbackGem.id, level: 20, quality: 20, enabled: true }],
    });
  }

  const mainSkillGroupId = skills[mainSocketGroupIdx - 1]?.id ?? skills[0]!.id;

  // Parse <Item> elements and <Slot> mappings
  const items: Record<string, Item> = {};
  const numIdToItemId = new Map<string, string>();
  const itemRegex = /<Item\b([^>]*)>([\s\S]*?)<\/Item>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(itemMatch[1]!);
    const numId = attrs.id ?? String(numIdToItemId.size + 1);
    const body = unescapeXml(itemMatch[2] ?? '').trim();
    const itemId = `imp_item_${numId}`;
    const parsed = parseItemText(body, itemId, game);
    if (parsed) {
      items[itemId] = parsed;
      numIdToItemId.set(numId, itemId);
    }
  }

  const equipped: Partial<Record<EquipmentSlotId, string>> = {};
  const activeFlaskSlots: Partial<Record<EquipmentSlotId, boolean>> = {};
  const slotRegex = /<Slot\b([^>]*)\/?>/gi;
  let slotMatch: RegExpExecArray | null;
  while ((slotMatch = slotRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(slotMatch[1]!);
    const slotName = attrs.name as EquipmentSlotId | undefined;
    const itemId = attrs.itemId ? numIdToItemId.get(attrs.itemId) : undefined;
    if (slotName && itemId) {
      equipped[slotName] = itemId;
      if (slotName.startsWith('Flask ') && attrs.active === 'true') {
        activeFlaskSlots[slotName] = true;
      }
    }
  }

  // Parse passive tree <Socket nodeId="..." itemId="..."/> jewel assignments
  const socketedJewels: Record<number, string> = {};
  const jewelSocketRegex = /<Socket\b([^>]*)\/?>/gi;
  let jsMatch: RegExpExecArray | null;
  while ((jsMatch = jewelSocketRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(jsMatch[1]!);
    const nodeId = Number(attrs.nodeId);
    const itemId = attrs.itemId ? numIdToItemId.get(attrs.itemId) : undefined;
    if (Number.isFinite(nodeId) && nodeId > 0 && itemId) {
      socketedJewels[nodeId] = itemId;
    }
  }

  // Parse <Config> inputs using clean official PoB defaults (all optional buffs OFF unless specified in XML)
  const ruleset = getRuleset(game);
  const config: Build['config'] = {
    ...createDefaultConfig(),
    enemyLevel: 84,
    enemyIsBoss: 'None',
    enemyFireResist: ruleset.defaultEnemyEleResist,
    enemyColdResist: ruleset.defaultEnemyEleResist,
    enemyLightningResist: ruleset.defaultEnemyEleResist,
    enemyChaosResist: game === 'poe1' ? 30 : 0,
    enemyArmour: game === 'poe1' ? 61989 : 8063,
    enemyEvasion: game === 'poe1' ? 10143 : 1175,
    usePowerCharges: false,
    useFrenzyCharges: false,
    useEnduranceCharges: false,
    onslaught: false,
    enemyShocked: false,
    shockValue: 0,
    enemyChilled: false,
  };
  let banditFromConfig: Build['bandit'] | undefined;
  const inputRegex = /<(?:Input|Placeholder)\b([^>]*)\/?>/gi;
  let inputMatch: RegExpExecArray | null;
  while ((inputMatch = inputRegex.exec(xml)) !== null) {
    const attrs = parseAttributes(inputMatch[1]!);
    const key = attrs.name;
    if (key === 'bandit' && attrs.string) {
      if (attrs.string === 'None' || attrs.string === 'Alira' || attrs.string === 'Kraityn' || attrs.string === 'Oak') {
        banditFromConfig = attrs.string;
      }
    }
    if (key === 'enemyLevel' && attrs.number) config.enemyLevel = Number(attrs.number);
    if (key === 'enemyIsBoss' && attrs.string) {
      if (attrs.string === 'None' || attrs.string === 'Guardian' || attrs.string === 'Pinnacle') {
        config.enemyIsBoss = attrs.string;
      }
    }
    if (key === 'usePowerCharges' && attrs.boolean) config.usePowerCharges = attrs.boolean === 'true';
    if (key === 'powerCharges' && attrs.number) config.powerCharges = Number(attrs.number);
    if (key === 'useFrenzyCharges' && attrs.boolean) config.useFrenzyCharges = attrs.boolean === 'true';
    if (key === 'frenzyCharges' && attrs.number) config.frenzyCharges = Number(attrs.number);
    if (key === 'useEnduranceCharges' && attrs.boolean) config.useEnduranceCharges = attrs.boolean === 'true';
    if (key === 'enduranceCharges' && attrs.number) config.enduranceCharges = Number(attrs.number);
    if (key === 'onslaught' && attrs.boolean) config.onslaught = attrs.boolean === 'true';
    if (key === 'enemyShocked' && attrs.boolean) config.enemyShocked = attrs.boolean === 'true';
    if (key === 'shockValue' && attrs.number) config.shockValue = Number(attrs.number);
    if (key === 'conditionLowLife' && attrs.boolean) config.conditionLowLife = attrs.boolean === 'true';
    if (key === 'buffArcaneSurge' && attrs.boolean) config.buffArcaneSurge = attrs.boolean === 'true';
    if (key === 'buffTailwind' && attrs.boolean) config.buffTailwind = attrs.boolean === 'true';
    if (key === 'conditionEnemyIntimidated' && attrs.boolean) config.enemyIntimidated = attrs.boolean === 'true';
    if (key === 'conditionEnemyUnnerved' && attrs.boolean) config.enemyUnnerved = attrs.boolean === 'true';
    if (key === 'multiplierWitheredStackCount' && attrs.number) config.witheredStacks = Number(attrs.number);
    if (key === 'conditionEnemyFireExposure' && attrs.boolean) config.enemyFireExposure = attrs.boolean === 'true';
    if (key === 'conditionEnemyColdExposure' && attrs.boolean) config.enemyColdExposure = attrs.boolean === 'true';
    if (key === 'conditionEnemyLightningExposure' && attrs.boolean) config.enemyLightningExposure = attrs.boolean === 'true';
    if (key === 'customMods' && attrs.string) config.customMods = attrs.string;
  }

  // Parse <Notes>
  const notesMatch = xml.match(/<Notes>([\s\S]*?)<\/Notes>/i);
  const notes = notesMatch ? unescapeXml(notesMatch[1]!).trim() : '';

  return {
    id: `imported_${Date.now()}`,
    name: buildAttrs.buildName || `${classDef.name.en} (Lv.${level})`,
    game,
    level,
    classId: classDef.id,
    ascendancyId,
    activeWeaponSet,
    bandit: banditFromConfig ?? (buildAttrs.bandit as Build['bandit']) ?? 'None',
    tree: {
      title: specAttrs.title || 'Imported Tree',
      treeVersion: specAttrs.treeVersion || tree.version,
      allocatedNodeIds,
      weaponSet1NodeIds,
      weaponSet2NodeIds,
      masteryEffects: {},
      ...(Object.keys(socketedJewels).length > 0 ? { socketedJewels } : {}),
    },
    skills,
    mainSkillGroupId,
    items,
    equipped,
    ...(Object.keys(activeFlaskSlots).length > 0 ? { activeFlaskSlots } : {}),
    config,
    notes,
  };
}

/**
 * Convenience function: decodes a PoB share code (or raw XML) directly into a `Build`.
 */
export function importBuildFromCode(input: string): { build: Build; xml: string } {
  const trimmed = input.trim();
  const xml = trimmed.startsWith('<') ? trimmed : decodePobCodeToXml(trimmed);
  const build = xmlToBuild(xml);
  return { build, xml };
}

/**
 * Resolves `pobb.in` and `pastebin.com` share URLs to their raw PoB code endpoints.
 */
export function resolveShareUrl(inputUrl: string): string | null {
  const trimmed = inputUrl.trim();
  const pobbin = trimmed.match(/^https?:\/\/(?:www\.)?pobb\.in\/([A-Za-z0-9_-]+)/i);
  if (pobbin) {
    return `https://pobb.in/${pobbin[1]}/raw`;
  }
  const pastebin = trimmed.match(/^https?:\/\/(?:www\.)?pastebin\.com\/(?:raw\/)?([A-Za-z0-9]+)/i);
  if (pastebin) {
    return `https://pastebin.com/raw/${pastebin[1]}`;
  }
  return null;
}

/**
 * Fetches a PoB code from a `pobb.in` or `pastebin.com` URL, optionally routing through
 * a lightweight CORS proxy (e.g. `https://proxy.example.workers.dev/?url=...`).
 */
export async function fetchRemoteBuildCode(url: string, corsProxyBase?: string): Promise<string> {
  const rawEndpoint = resolveShareUrl(url) ?? url.trim();
  const target = corsProxyBase?.trim()
    ? `${corsProxyBase.replace(/\/+$/, '')}/?url=${encodeURIComponent(rawEndpoint)}`
    : rawEndpoint;
  const response = await fetch(target);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${rawEndpoint}`);
  }
  return (await response.text()).trim();
}
