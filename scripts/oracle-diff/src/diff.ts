import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hydrateCompactTree,
  registerBaseItems,
  registerClusterNotables,
  registerGemsData,
  registerTreeData,
  type CompactBaseItemsPayload,
  type CompactClusterNotablesPayload,
  type CompactGemsPayload,
  type CompactTreePayload,
} from '@webpob/data';
import { xmlToBuild } from '@webpob/codec';
import { calculateBuild } from '@webpob/calc';
import type { OracleGoldenSnapshot } from './generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');

interface MetricComparison {
  metric: string;
  oracle: number;
  webpob: number;
  absDiff: number;
  relDiffPct: number;
}

function compareMetric(metric: string, oracle: number, webpob: number): MetricComparison {
  const absDiff = webpob - oracle;
  const denom = Math.max(1, Math.abs(oracle));
  const relDiffPct = Math.round((Math.abs(absDiff) / denom) * 10000) / 100;
  return { metric, oracle: Math.round(oracle * 100) / 100, webpob: Math.round(webpob * 100) / 100, absDiff: Math.round(absDiff * 100) / 100, relDiffPct };
}

async function loadLocalDatasets() {
  const dataDir = path.join(ROOT_DIR, 'apps/web/public/data');
  const poe1Tree = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-tree-3_30.json'), 'utf-8')) as CompactTreePayload;
  const poe2Tree = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-tree-0_5.json'), 'utf-8')) as CompactTreePayload;
  const poe1Gems = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-gems.json'), 'utf-8')) as CompactGemsPayload;
  const poe2Gems = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-gems.json'), 'utf-8')) as CompactGemsPayload;
  const poe1Bases = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
  const poe2Bases = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
  const poe1Clusters = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-clusters.json'), 'utf-8')) as CompactClusterNotablesPayload;
  registerTreeData(hydrateCompactTree(poe1Tree));
  registerTreeData(hydrateCompactTree(poe2Tree));
  registerGemsData('poe1', poe1Gems);
  registerGemsData('poe2', poe2Gems);
  registerBaseItems(poe1Bases);
  registerBaseItems(poe2Bases);
  registerClusterNotables(poe1Clusters);
}

async function main() {
  await loadLocalDatasets();
  const snapPath = path.join(ROOT_DIR, 'fixtures/oracle/snapshots.json');
  const data = JSON.parse(await fs.readFile(snapPath, 'utf-8')) as { snapshots: OracleGoldenSnapshot[] };

  console.log('=== WebPoB vs Official PathOfBuilding Differential Report ===\n');

  for (const snap of data.snapshots) {
    const build = xmlToBuild(snap.xml);
    const out = calculateBuild(build);
    const o = snap.oracle;

    // PoB stores CritMultiplier as ratio (e.g. 1.5 = 150%)
    const oracleCritMultiPct = o.CritMultiplier > 10 ? o.CritMultiplier : o.CritMultiplier * 100;

    const rows: MetricComparison[] = [
      compareMetric('Str', o.Str, out.defence.str),
      compareMetric('Dex', o.Dex, out.defence.dex),
      compareMetric('Int', o.Int, out.defence.int),
      compareMetric('Life', o.Life, out.defence.life),
      compareMetric('EnergyShield', o.EnergyShield, out.defence.energyShield),
      ...(o.Ward ? [compareMetric('Ward', o.Ward, out.defence.ward ?? 0)] : []),
      compareMetric('Mana', o.Mana, out.defence.mana),
      compareMetric('Armour', o.Armour, out.defence.armour),
      compareMetric('Evasion', o.Evasion, out.defence.evasion),
      compareMetric('FireResist', o.FireResist, out.defence.fireResist),
      compareMetric('ColdResist', o.ColdResist, out.defence.coldResist),
      compareMetric('LightningResist', o.LightningResist, out.defence.lightningResist),
      compareMetric('ChaosResist', o.ChaosResist, out.defence.chaosResist),
      compareMetric('Speed', o.Speed, out.offence.speed),
      compareMetric('CritChance', o.CritChance, out.offence.critChance),
      compareMetric('CritMulti%', oracleCritMultiPct, out.offence.critMultiplier),
      compareMetric('HitChance', o.HitChance, out.offence.hitChance),
      compareMetric(
        'AverageDamage',
        o.AverageDamage || o.AverageHit,
        out.offence.averageHit * (out.offence.hitChance / 100),
      ),
      compareMetric('HitDPS', o.TotalDPS, out.offence.hitDps),
      ...(o.ImpaleDPS ? [compareMetric('ImpaleDPS', o.ImpaleDPS, out.offence.impaleDps ?? 0)] : []),
      compareMetric('CombinedDPS', o.CombinedDPS, out.offence.totalDps),
    ];

    console.log(`\n[${snap.id}] ${snap.title} (PoB @ ${snap.pobCommit})`);
    console.log('  Metric            |   Official PoB |        WebPoB |      Diff |   Err%');
    console.log('  ------------------+----------------+---------------+-----------+--------');
    for (const r of rows) {
      const flag = r.relDiffPct <= 0.5 || Math.abs(r.absDiff) <= 1 ? '✓' : r.relDiffPct <= 5 ? '~' : '✗';
      console.log(
        `  ${flag} ${r.metric.padEnd(15)} | ${String(r.oracle).padStart(14)} | ${String(r.webpob).padStart(13)} | ${String(r.absDiff).padStart(9)} | ${String(r.relDiffPct).padStart(5)}%`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
