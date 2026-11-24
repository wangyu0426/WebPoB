import { useState } from 'react';
import { Check, FolderOpen, Globe, Link2, PlusCircle, RotateCcw, Swords } from 'lucide-react';
import { getClassesForGame } from '@webpob/data';
import { encodeBuildToPobCode } from '@webpob/codec';
import { localizeText, t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';
import { BuildLibraryModal } from './BuildLibraryModal';

export function TopBar() {
  const {
    locale,
    build,
    setLocale,
    switchGame,
    setBuildMeta,
    loadSampleBuild,
    createNewBuild,
  } = useWebPobStore();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const classes = getClassesForGame(build.game);
  const currentClass = classes.find((c) => c.id === build.classId) ?? classes[0]!;

  const handleCopyShareUrl = async () => {
    try {
      const code = encodeBuildToPobCode(build);
      const url = `${window.location.origin}${window.location.pathname}#pob=${code}`;
      window.history.replaceState(null, '', `#pob=${code}`);
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <header className="h-14 shrink-0 border-b border-[#252b3d] bg-[#10131c] px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand & Game Selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-amber-500/30 to-amber-900/50 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Swords className="w-4 h-4" />
          </div>
          <div className="whitespace-nowrap">
            <div className="text-sm font-bold tracking-wide text-amber-200 leading-tight">
              {t(locale, 'app.title')}
            </div>
            <div className="text-[10px] text-zinc-400 leading-tight hidden 2xl:block">
              {t(locale, 'app.subtitle')}
            </div>
          </div>
        </div>

        {/* PoE 1 / PoE 2 Dual-Game Toggle */}
        <div className="flex items-center rounded-md bg-[#0a0c12] p-0.5 border border-[#252b3d] shrink-0">
          <button
            type="button"
            onClick={() => switchGame('poe1')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer whitespace-nowrap ${
              build.game === 'poe1'
                ? 'bg-amber-600/25 text-amber-200 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {locale === 'zh-CN' ? 'PoE 1' : 'PoE 1'}
          </button>
          <button
            type="button"
            onClick={() => switchGame('poe2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer whitespace-nowrap ${
              build.game === 'poe2'
                ? 'bg-sky-600/25 text-sky-200 border border-sky-500/40'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {locale === 'zh-CN' ? 'PoE 2' : 'PoE 2'}
          </button>
        </div>
      </div>

      {/* Center: Build Meta (Name, Class, Ascendancy, Level, PoE 2 Weapon Set) */}
      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
        <input
          type="text"
          value={build.name}
          onChange={(e) => setBuildMeta({ name: e.target.value })}
          className="pob-input rounded px-2.5 py-1 text-xs font-medium w-40 lg:w-48 shrink-0"
          aria-label="Build Name"
        />

        <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
          <span className="text-zinc-400">{t(locale, 'topbar.class')}</span>
          <select
            value={build.classId}
            onChange={(e) => setBuildMeta({ classId: e.target.value })}
            className="pob-input rounded px-2 py-1 text-xs"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {localizeText(c.name, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
          <span className="text-zinc-400">{t(locale, 'topbar.ascendancy')}</span>
          <select
            value={build.ascendancyId}
            onChange={(e) => setBuildMeta({ ascendancyId: e.target.value })}
            className="pob-input rounded px-2 py-1 text-xs"
          >
            <option value="">{t(locale, 'topbar.none')}</option>
            {currentClass.ascendancies.map((a) => (
              <option key={a.id} value={a.id}>
                {localizeText(a.name, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs shrink-0 whitespace-nowrap">
          <span className="text-zinc-400">{t(locale, 'topbar.level')}</span>
          <input
            type="number"
            min={1}
            max={100}
            value={build.level}
            onChange={(e) =>
              setBuildMeta({ level: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })
            }
            className="pob-input rounded px-2 py-1 text-xs w-14 text-center"
          />
        </div>

        {build.game === 'poe2' && (
          <div className="flex items-center gap-1 ml-1 bg-[#0a0c12] p-0.5 rounded border border-[#252b3d] shrink-0 whitespace-nowrap">
            <span className="text-[11px] text-zinc-400 px-1.5">{t(locale, 'topbar.weaponSet')}</span>
            <button
              type="button"
              onClick={() => setBuildMeta({ activeWeaponSet: 1 })}
              className={`px-2 py-0.5 text-xs rounded font-semibold cursor-pointer ${
                build.activeWeaponSet === 1
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              I
            </button>
            <button
              type="button"
              onClick={() => setBuildMeta({ activeWeaponSet: 2 })}
              className={`px-2 py-0.5 text-xs rounded font-semibold cursor-pointer ${
                build.activeWeaponSet === 2
                  ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              II
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions & Bilingual Language Switch */}
      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          title={locale === 'zh-CN' ? '本地 BD 库' : 'Saved Builds'}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-200 bg-[#1a1f2e] hover:bg-[#242b3f] border border-[#2c3348] transition cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden lg:inline">{locale === 'zh-CN' ? 'BD库' : 'Builds'}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleCopyShareUrl()}
          title={locale === 'zh-CN' ? '复制直达分享链接 (#pob=...)' : 'Copy Shareable URL (#pob=...)'}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-sky-200 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 transition cursor-pointer"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline">
            {copiedUrl
              ? locale === 'zh-CN'
                ? '已复制'
                : 'Copied'
              : locale === 'zh-CN'
                ? '分享'
                : 'Share'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => loadSampleBuild(build.game)}
          title={t(locale, 'topbar.resetSample')}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-300 bg-[#1a1f2e] hover:bg-[#242b3f] border border-[#2c3348] transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{t(locale, 'topbar.resetSample')}</span>
        </button>
        <button
          type="button"
          onClick={() => createNewBuild(build.game)}
          title={t(locale, 'topbar.newBuild')}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-300 bg-[#1a1f2e] hover:bg-[#242b3f] border border-[#2c3348] transition cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{t(locale, 'topbar.newBuild')}</span>
        </button>

        <button
          type="button"
          onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 transition cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          {locale === 'zh-CN' ? '中文 / EN' : 'EN / 中文'}
        </button>
      </div>
      <BuildLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </header>
  );
}
