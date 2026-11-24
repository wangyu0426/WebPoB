import { useEffect } from 'react';
import {
  Calculator,
  FileText,
  GitBranch,
  Import,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { t, type MessageKey } from '@webpob/i18n';
import { useWebPobStore, type ActiveTab } from './store/useWebPobStore';
import { TopBar } from './components/TopBar';
import { SidebarStats } from './components/SidebarStats';
import { PassiveTreeCanvas } from './components/PassiveTreeCanvas';
import { SkillsTab } from './components/SkillsTab';
import { ItemsTab } from './components/ItemsTab';
import { CalcsTab } from './components/CalcsTab';
import { ConfigTab } from './components/ConfigTab';
import { ImportExportTab } from './components/ImportExportTab';
import { NotesTab } from './components/NotesTab';

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
  const { locale, activeTab, setActiveTab, build, ensureOfficialDataLoaded } = useWebPobStore();

  useEffect(() => {
    void ensureOfficialDataLoaded(build.game);
  }, [build.game, ensureOfficialDataLoaded]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0d12] text-zinc-100 overflow-hidden">
      <TopBar />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidebarStats />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* PoB Navigation Tab Strip */}
          <nav className="h-10 shrink-0 border-b border-[#232838] bg-[#10131c] px-3 flex items-center gap-1 overflow-x-auto select-none">
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
            {activeTab === 'tree' && <PassiveTreeCanvas />}
            {activeTab === 'skills' && <SkillsTab />}
            {activeTab === 'items' && <ItemsTab />}
            {activeTab === 'calcs' && <CalcsTab />}
            {activeTab === 'config' && <ConfigTab />}
            {activeTab === 'import' && <ImportExportTab />}
            {activeTab === 'notes' && <NotesTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
