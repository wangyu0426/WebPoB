import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Calculator,
  FileText,
  GitBranch,
  Import,
  Loader2,
  Shield,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { decodePobCodeToXml, fetchRemoteBuildCode, importBuildFromCode } from '@webpob/codec';
import { t, type MessageKey } from '@webpob/i18n';
import { useWebPobStore, type ActiveTab } from './store/useWebPobStore';
import { TopBar } from './components/TopBar';
import { SidebarStats } from './components/SidebarStats';
import { PassiveTreeCanvas } from './components/PassiveTreeCanvas';
import {
  CommandPaletteModal,
  type CommandPaletteMode,
} from './components/CommandPaletteModal';

const SkillsTab = lazy(() => import('./components/SkillsTab').then((m) => ({ default: m.SkillsTab })));
const ItemsTab = lazy(() => import('./components/ItemsTab').then((m) => ({ default: m.ItemsTab })));
const CalcsTab = lazy(() => import('./components/CalcsTab').then((m) => ({ default: m.CalcsTab })));
const ConfigTab = lazy(() => import('./components/ConfigTab').then((m) => ({ default: m.ConfigTab })));
const ImportExportTab = lazy(() =>
  import('./components/ImportExportTab').then((m) => ({ default: m.ImportExportTab })),
);
const NotesTab = lazy(() => import('./components/NotesTab').then((m) => ({ default: m.NotesTab })));

const NAV_TABS: Array<{ id: ActiveTab; labelKey: MessageKey; icon: typeof GitBranch }> = [
  { id: 'tree', labelKey: 'nav.tree', icon: GitBranch },
  { id: 'skills', labelKey: 'nav.skills', icon: Sparkles },
  { id: 'items', labelKey: 'nav.items', icon: Shield },
  { id: 'calcs', labelKey: 'nav.calcs', icon: Calculator },
  { id: 'config', labelKey: 'nav.config', icon: Sliders },
  { id: 'import', labelKey: 'nav.import', icon: Import },
  { id: 'notes', labelKey: 'nav.notes', icon: FileText },
];

export function App() {
  const { locale, activeTab, setActiveTab, build, calc, ensureOfficialDataLoaded, replaceBuild, undo, redo } =
    useWebPobStore();
  const [hashToast, setHashToast] = useState<string | null>(null);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<CommandPaletteMode>('command');

  const openCommandPalette = useCallback((mode: CommandPaletteMode = 'command') => {
    setCommandPaletteMode(mode);
    setCommandPaletteOpen(true);
  }, []);

  useEffect(() => {
    void ensureOfficialDataLoaded(build.game);
  }, [build.game, ensureOfficialDataLoaded]);

  // Global keyboard shortcuts (Ctrl/Cmd+K palette, ? cheatsheet, Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Shift+Z redo, 1-7 switch tabs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((wasOpen) => {
          if (!wasOpen) setCommandPaletteMode('command');
          return !wasOpen;
        });
        return;
      }
      if (commandPaletteOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        return;
      }
      if (e.altKey) return;
      if (e.key === '?') {
        e.preventDefault();
        openCommandPalette('shortcuts');
        return;
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < NAV_TABS.length) {
        setActiveTab(NAV_TABS[idx]!.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen, setActiveTab, undo, redo]);

  // Auto-load shared build from URL query (?import=https://pobb.in/... or poe.ninja/poe2/pob/...) or hash (#pob=...)
  useEffect(() => {
    let cancelled = false;
    const loadFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const importUrl = params.get('import')?.trim();
      if (importUrl) {
        try {
          const proxy = useWebPobStore.getState().corsProxyUrl;
          const code = await fetchRemoteBuildCode(importUrl, proxy);
          if (cancelled || !code) return;
          const xml = code.startsWith('<') ? code : decodePobCodeToXml(code);
          const game = /<PathOfBuilding2\b/i.test(xml) ? 'poe2' : 'poe1';
          await ensureOfficialDataLoaded(game);
          if (cancelled) return;
          const { build: imported } = importBuildFromCode(code);
          replaceBuild(imported);
          setHashToast(imported.name);
          setTimeout(() => setHashToast(null), 4500);
          return;
        } catch (err) {
          console.warn('[WebPoB] Failed to load ?import URL build:', err);
        }
      }
      const hash = window.location.hash;
      if (!hash.startsWith('#pob=')) return;
      const code = hash.slice(5).trim();
      if (!code) return;
      try {
        const xml = decodePobCodeToXml(code);
        const game = /<PathOfBuilding2\b/i.test(xml) ? 'poe2' : 'poe1';
        await ensureOfficialDataLoaded(game);
        if (cancelled) return;
        const { build: imported } = importBuildFromCode(code);
        replaceBuild(imported);
        setHashToast(imported.name);
        setTimeout(() => setHashToast(null), 4000);
      } catch (err) {
        console.warn('[WebPoB] Failed to load #pob URL hash build:', err);
      }
    };
    void loadFromUrl();
    const onHashChange = () => {
      void loadFromUrl();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHashChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0d12] text-zinc-100 overflow-hidden">
      <TopBar onOpenCommandPalette={() => openCommandPalette('command')} />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop fixed sidebar */}
        <div className="hidden md:flex shrink-0 h-full">
          <SidebarStats />
        </div>

        {/* Mobile slide-over stats drawer */}
        {mobileStatsOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="relative z-10 h-full shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileStatsOpen(false)}
                className="absolute top-2 right-2 z-20 p-1 rounded bg-[#181e2f] border border-[#2d354d] text-zinc-300 cursor-pointer"
                aria-label="Close stats drawer"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarStats />
            </div>
            <div
              className="flex-1 bg-black/60 backdrop-blur-[1px]"
              onClick={() => setMobileStatsOpen(false)}
            />
          </div>
        )}

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* PoB Navigation Tab Strip */}
          <nav className="h-10 shrink-0 border-b border-[#232838] bg-[#10131c] px-3 flex items-center gap-1 overflow-x-auto select-none">
            <button
              type="button"
              onClick={() => setMobileStatsOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 mr-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-mono font-semibold shrink-0 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{Math.round(calc.offence.fullDps ?? calc.offence.totalDps).toLocaleString()}</span>
            </button>
            {NAV_TABS.map(({ id, labelKey, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition border-b-2 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-amber-400 text-amber-200 bg-[#171c29]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#141824]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(locale, labelKey)}
                </button>
              );
            })}
          </nav>

          {/* Active Workspace View */}
          <div className="flex-1 min-h-0 overflow-hidden relative bg-[#0b0d12]">
            {hashToast && (
              <div className="absolute top-3 right-3 z-50 rounded-md bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 text-xs text-emerald-200 shadow-lg">
                {locale === 'zh-CN' ? `已从分享链接加载：${hashToast}` : `Loaded shared build: ${hashToast}`}
              </div>
            )}
            {activeTab === 'tree' && <PassiveTreeCanvas />}
            {activeTab !== 'tree' && (
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{locale === 'zh-CN' ? '加载面板中...' : 'Loading panel...'}</span>
                  </div>
                }
              >
                {activeTab === 'skills' && <SkillsTab />}
                {activeTab === 'items' && <ItemsTab />}
                {activeTab === 'calcs' && <CalcsTab />}
                {activeTab === 'config' && <ConfigTab />}
                {activeTab === 'import' && <ImportExportTab />}
                {activeTab === 'notes' && <NotesTab />}
              </Suspense>
            )}
          </div>
        </main>
      </div>
      <CommandPaletteModal
        open={commandPaletteOpen}
        initialMode={commandPaletteMode}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
