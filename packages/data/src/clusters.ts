export interface ClusterNotableDef {
  en: string;
  zh?: string;
  zhTw?: string;
  st: string[];
  sz?: string[];
  szTw?: string[];
}

export interface CompactClusterNotablesPayload {
  game: 'poe1';
  count: number;
  notables: Record<string, ClusterNotableDef>;
}

const registeredClusterNotables: Record<string, ClusterNotableDef> = {};
let clusterNotablesLoaded = false;

export const OFFICIAL_CLUSTERS_FILE = 'poe1-clusters.json';

export function registerClusterNotables(payload: CompactClusterNotablesPayload): number {
  let count = 0;
  for (const [key, def] of Object.entries(payload.notables)) {
    registeredClusterNotables[key.toLowerCase()] = def;
    count++;
  }
  clusterNotablesLoaded = true;
  return count;
}

export async function loadOfficialClusterNotables(basePath = '/data'): Promise<number> {
  if (clusterNotablesLoaded) return Object.keys(registeredClusterNotables).length;
  const url = `${basePath.replace(/\/+$/, '')}/${OFFICIAL_CLUSTERS_FILE}`;
  const res = await fetch(url);
  if (!res.ok) return 0;
  const payload = (await res.json()) as CompactClusterNotablesPayload;
  return registerClusterNotables(payload);
}

export function getClusterNotable(name: string): ClusterNotableDef | undefined {
  return registeredClusterNotables[name.toLowerCase().trim()];
}

export function getAllClusterNotables(): ClusterNotableDef[] {
  return Object.values(registeredClusterNotables);
}
