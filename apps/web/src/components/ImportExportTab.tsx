import { useMemo, useState } from 'react';
import { Check, Copy, Download, Upload } from 'lucide-react';
import {
  buildToPobXml,
  encodeBuildToPobCode,
  fetchRemoteBuildCode,
  importBuildFromCode,
} from '@webpob/codec';
import { t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

export function ImportExportTab() {
  const { locale, build, corsProxyUrl, setCorsProxyUrl, replaceBuild, loadSampleBuild } =
    useWebPobStore();

  const [importInput, setImportInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const shareCode = useMemo(() => encodeBuildToPobCode(build), [build]);
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
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            {t(locale, 'import.shareCode')}
          </h3>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t(locale, 'import.copied') : t(locale, 'import.copy')}
          </button>
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
