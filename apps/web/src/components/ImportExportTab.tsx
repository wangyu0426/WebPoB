import { useMemo, useState } from 'react';
import { Check, Copy, Download, Globe, Link2, Upload } from 'lucide-react';
import {
  buildToPobXml,
  encodeBuildToPobCode,
  fetchCharacterProfileBuild,
  fetchRemoteBuildCode,
  importBuildFromCode,
  parseCharacterJsonToBuild,
  type PoeRealm,
} from '@webpob/codec';
import { t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

export function ImportExportTab() {
  const { locale, build, corsProxyUrl, setCorsProxyUrl, replaceBuild, loadSampleBuild } =
    useWebPobStore();

  const [importInput, setImportInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Character Profile Importer (GGG International / Tencent CN + Zero-Proxy JSON)
  const [realm, setRealm] = useState<PoeRealm>('pc');
  const [accountName, setAccountName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [passivesJsonInput, setPassivesJsonInput] = useState('');
  const [itemsJsonInput, setItemsJsonInput] = useState('');
  const [charMsg, setCharMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [charLoading, setCharLoading] = useState(false);

  const shareCode = useMemo(() => encodeBuildToPobCode(build), [build]);
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `#pob=${shareCode}`;
    return `${window.location.origin}${window.location.pathname}#pob=${shareCode}`;
  }, [shareCode]);
  const xmlPreview = useMemo(() => buildToPobXml(build), [build]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors in restricted contexts
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleImport = async () => {
    const raw = importInput.trim();
    if (!raw) return;
    setLoading(true);
    setMessage(null);
    try {
      let code = raw;
      if (/^https?:\/\//i.test(raw)) {
        code = await fetchRemoteBuildCode(raw, corsProxyUrl);
      }
      const { build: imported } = importBuildFromCode(code);
      replaceBuild(imported);
      setMessage({ ok: true, text: `${t(locale, 'import.success')} (${imported.name})` });
      setImportInput('');
    } catch (err) {
      setMessage({
        ok: false,
        text: `${t(locale, 'import.error')} ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-5xl">
      <h2 className="text-base font-bold text-amber-200">{t(locale, 'import.title')}</h2>

      {/* Export Share Code */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            {t(locale, 'import.shareCode')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link2 className="w-3.5 h-3.5" />}
              {copiedLink
                ? t(locale, 'import.copied')
                : locale === 'zh-CN'
                  ? '复制直达链接'
                  : 'Copy Share URL'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t(locale, 'import.copied') : t(locale, 'import.copy')}
            </button>
          </div>
        </div>
        <textarea
          readOnly
          rows={3}
          value={shareCode}
          className="pob-input w-full rounded p-2.5 text-[11px] font-mono text-zinc-300 break-all"
        />
      </div>

      {/* Import Code / URL */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <Download className="w-4 h-4" />
          {t(locale, 'import.importBtn')}
        </h3>
        <textarea
          rows={3}
          value={importInput}
          onChange={(e) => setImportInput(e.target.value)}
          placeholder={t(locale, 'import.pasteCodePlaceholder')}
          className="pob-input w-full rounded p-2.5 text-xs font-mono"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <label className="text-[11px] text-zinc-400 shrink-0">
              {t(locale, 'import.proxyUrl')}:
            </label>
            <input
              type="text"
              value={corsProxyUrl}
              onChange={(e) => setCorsProxyUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
              className="pob-input rounded px-2 py-1 text-xs flex-1"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleImport}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 cursor-pointer disabled:opacity-50"
          >
            {loading ? '...' : t(locale, 'import.importBtn')}
          </button>
        </div>
        {message && (
          <div className={`text-xs ${message.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Character Profile Importer (GGG International & Tencent CN + Zero-Proxy JSON) */}
      <div className="pob-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            {locale === 'zh-CN'
              ? '官方角色导入 (GGG 国际服 / 腾讯国服 / 免代理 JSON 导入)'
              : 'Import Character Profile (GGG International / Tencent CN / Direct JSON)'}
          </h3>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setRealm('pc')}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                realm === 'pc'
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-[#121623] border-[#252c40] text-zinc-400'
              }`}
            >
              {locale === 'zh-CN' ? '国际服 (pathofexile.com)' : 'International (GGG)'}
            </button>
            <button
              type="button"
              onClick={() => setRealm('tencent')}
              className={`px-2 py-0.5 rounded border cursor-pointer ${
                realm === 'tencent'
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-[#121623] border-[#252c40] text-zinc-400'
              }`}
            >
              {locale === 'zh-CN' ? '国服 (poe.game.qq.com)' : 'Tencent CN'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder={locale === 'zh-CN' ? '账号名 (如 Player#1234)' : 'Account Name (e.g. Player#1234)'}
            className="pob-input rounded px-2.5 py-1.5 text-xs"
          />
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder={locale === 'zh-CN' ? '角色名 (Character Name)' : 'Character Name'}
            className="pob-input rounded px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={charLoading || !accountName.trim() || !characterName.trim()}
            onClick={async () => {
              setCharLoading(true);
              setCharMsg(null);
              try {
                const imported = await fetchCharacterProfileBuild({
                  realm,
                  accountName,
                  characterName,
                  game: build.game,
                  corsProxyBase: corsProxyUrl,
                });
                replaceBuild(imported);
                setCharMsg({
                  ok: true,
                  text:
                    locale === 'zh-CN'
                      ? `已导入角色 ${imported.name} (${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 件装备)`
                      : `Imported ${imported.name} (${imported.tree.allocatedNodeIds.length} passives, ${Object.keys(imported.equipped).length} items)`,
                });
              } catch (err) {
                setCharMsg({
                  ok: false,
                  text: err instanceof Error ? err.message : String(err),
                });
              } finally {
                setCharLoading(false);
              }
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/50 cursor-pointer disabled:opacity-50"
          >
            {charLoading
              ? '...'
              : locale === 'zh-CN'
                ? '在线拉取角色 (需代理)'
                : 'Fetch Character (via Proxy)'}
          </button>
        </div>

        <details className="rounded bg-[#0b0e15] border border-[#22283a] p-3 space-y-2">
          <summary className="text-[11px] font-semibold text-zinc-300 cursor-pointer">
            {locale === 'zh-CN'
              ? '免代理直连：粘贴官网 get-passive-skills / get-items JSON 导入'
              : 'Zero-Proxy Mode: Paste get-passive-skills / get-items JSON directly'}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <textarea
              rows={3}
              value={passivesJsonInput}
              onChange={(e) => setPassivesJsonInput(e.target.value)}
              placeholder='{"hashes":[54447,57264,...]} (get-passive-skills JSON)'
              className="pob-input rounded p-2 text-[11px] font-mono"
            />
            <textarea
              rows={3}
              value={itemsJsonInput}
              onChange={(e) => setItemsJsonInput(e.target.value)}
              placeholder='{"character":{"name":"...","class":"Elementalist","level":95},"items":[...]} (get-items JSON)'
              className="pob-input rounded p-2 text-[11px] font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!passivesJsonInput.trim() && !itemsJsonInput.trim()}
              onClick={() => {
                setCharMsg(null);
                try {
                  const imported = parseCharacterJsonToBuild({
                    game: build.game,
                    characterName: characterName.trim() || undefined,
                    passivesJson: passivesJsonInput.trim() || undefined,
                    itemsJson: itemsJsonInput.trim() || undefined,
                  });
                  replaceBuild(imported);
                  setPassivesJsonInput('');
                  setItemsJsonInput('');
                  setCharMsg({
                    ok: true,
                    text:
                      locale === 'zh-CN'
                        ? `JSON 导入成功：${imported.name} (${imported.tree.allocatedNodeIds.length} 天赋点 / ${Object.keys(imported.equipped).length} 装备)`
                        : `Imported from JSON: ${imported.name} (${imported.tree.allocatedNodeIds.length} passives, ${Object.keys(imported.equipped).length} items)`,
                  });
                } catch (err) {
                  setCharMsg({
                    ok: false,
                    text: `JSON Error: ${err instanceof Error ? err.message : String(err)}`,
                  });
                }
              }}
              className="px-3 py-1 rounded text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 cursor-pointer disabled:opacity-50"
            >
              {locale === 'zh-CN' ? '解析 JSON 并导入角色' : 'Parse & Import Character JSON'}
            </button>
          </div>
        </details>

        {charMsg && (
          <div className={`text-xs ${charMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {charMsg.text}
          </div>
        )}
      </div>

      {/* Quick Sample Builds */}
      <div className="pob-panel rounded-lg p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-amber-300">{t(locale, 'import.sampleBuilds')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadSampleBuild('poe1')}
            className="px-3 py-1.5 rounded text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40 cursor-pointer"
          >
            PoE 1 — Elementalist Arc (女巫元素使电弧)
          </button>
          <button
            type="button"
            onClick={() => loadSampleBuild('poe2')}
            className="px-3 py-1.5 rounded text-xs bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 border border-sky-500/40 cursor-pointer"
          >
            PoE 2 — Stormweaver Archmage Spark (魔巫大法师电球)
          </button>
        </div>
      </div>

      {/* Decoded XML Preview */}
      <details className="pob-panel rounded-lg p-4">
        <summary className="text-xs font-bold text-zinc-300 cursor-pointer">
          {t(locale, 'import.xmlPreview')}
        </summary>
        <pre className="mt-3 p-3 rounded bg-[#0a0c12] border border-[#222838] text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-72">
          {xmlPreview}
        </pre>
      </details>
    </div>
  );
}
