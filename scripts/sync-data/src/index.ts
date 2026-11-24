/**
 * WebPoB Upstream Data & Bilingual Dictionary Sync Pipeline (Phase 2 Scaffold)
 *
 * Planned sources:
 *  - PoE 1 Passive Tree & Gems: https://github.com/PathOfBuildingCommunity/PathOfBuilding
 *  - PoE 2 Passive Tree & Gems: https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2
 *  - Chinese Localization Dictionaries: PoEDB / PoeCharm / PobTools-zh open-source JSON catalogs
 *
 * Run with: `pnpm sync:data`
 */

const SOURCES = {
  poe1Tree: 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/master/src/TreeData/3_25/tree.json',
  poe2Tree: 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/TreeData/0_2/tree.json',
};

async function main() {
  console.log('[WebPoB sync-data] Configured upstream sources:');
  for (const [key, url] of Object.entries(SOURCES)) {
    console.log(`  - ${key}: ${url}`);
  }
  console.log('\nPhase 1 uses built-in normalized PoE 1 & PoE 2 datasets in packages/data.');
  console.log('Phase 2 will download, normalize, and merge full 1,500+ node trees & CN dictionaries into packages/data/generated/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
