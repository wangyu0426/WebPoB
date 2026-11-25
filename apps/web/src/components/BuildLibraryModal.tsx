import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, FolderOpen, Save, Trash2, Upload, X } from 'lucide-react';
import type { GameId } from '@webpob/core';
import { useWebPobStore } from '../store/useWebPobStore';
import {
  deleteSavedBuild,
  exportLibraryJson,
  importLibraryJson,
  listSavedBuilds,
  saveBuildRecord,
  type SavedBuildRecord,
} from '../storage/buildLibrary';

export function BuildLibraryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, build, calc, replaceBuild, ensureOfficialDataLoaded } = useWebPobStore();
  const [records, setRecords] = useState<SavedBuildRecord[]>([]);
  const [filter, setFilter] = useState<'all' | GameId>('all');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const list = await listSavedBuilds();
    setRecords(list);
  }, []);

  useEffect(() => {
    if (open) {
      void refresh();
      setStatusMsg(null);
    }
  }, [open, refresh]);

  if (!open) return null;

  const handleSaveCurrent = async (asNewCopy = false) => {
    const id = asNewCopy
      ? `saved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      : build.id.startsWith('sample-')
        ? `saved_${Date.now()}`
        : build.id;
    const savedBuild = {
      ...build,
      id,
      name: asNewCopy ? `${build.name} (${locale === 'zh-CN' ? '副本' : 'Copy'})` : build.name,
    };
    await saveBuildRecord({
      id,
      name: savedBuild.name,
      game: savedBuild.game,
      classId: savedBuild.classId,
      ascendancyId: savedBuild.ascendancyId,
      level: savedBuild.level,
      dps: Math.round(calc.offence.totalDps),
      life: calc.defence.life,
      energyShield: calc.defence.energyShield,
      updatedAt: Date.now(),
      build: savedBuild,
    });
    await refresh();
    setStatusMsg(
      locale === 'zh-CN'
        ? `已保存「${savedBuild.name}」到本地 IndexedDB 库`
        : `Saved "${savedBuild.name}" to local IndexedDB library`,
    );
  };

  const handleLoad = async (rec: SavedBuildRecord) => {
    await ensureOfficialDataLoaded(rec.game);
    replaceBuild(rec.build);
    onClose();
  };

  const handleDelete = async (id: string) => {
    await deleteSavedBuild(id);
    await refresh();
  };

  const handleExportBackup = async () => {
    const json = await exportLibraryJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webpob-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(
      locale === 'zh-CN'
        ? `已导出 ${records.length} 套 BD 备份 (.json)`
        : `Exported ${records.length} builds backup (.json)`,
    );
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const count = await importLibraryJson(text);
      await refresh();
      setStatusMsg(
        locale === 'zh-CN'
          ? `已从备份文件导入 ${count} 套 BD`
          : `Imported ${count} builds from backup file`,
      );
    } catch {
      setStatusMsg(
        locale === 'zh-CN'
          ? '导入失败：备份 JSON 格式无效'
          : 'Import failed: invalid backup JSON format',
      );
    }
  };

  const filtered = filter === 'all' ? records : records.filter((r) => r.game === filter);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
      <div className="pob-panel rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col border-amber-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#252b3d] flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-2 text-amber-200 font-bold text-sm">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            {locale === 'zh-CN' ? '本地 BD 库 (IndexedDB)' : 'Local Build Library (IndexedDB)'}
            <span className="text-[11px] font-mono text-zinc-400 font-normal">
              ({records.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save Current Bar */}
        <div className="px-4 py-3 border-b border-[#252b3d] bg-[#0e111a] flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-200 truncate">{build.name}</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              {build.game.toUpperCase()} · Lv.{build.level} {build.ascendancyId || build.classId} ·{' '}
              {Math.round(calc.offence.totalDps).toLocaleString()} DPS
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveCurrent(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {locale === 'zh-CN' ? '保存当前 BD' : 'Save Current'}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCurrent(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-300 bg-[#1a1f2e] hover:bg-[#242b3f] border border-[#2c3348] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {locale === 'zh-CN' ? '另存副本' : 'Save Copy'}
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="px-4 py-1.5 bg-emerald-950/40 border-b border-emerald-500/30 text-[11px] text-emerald-300">
            {statusMsg}
          </div>
        )}

        {/* Filter Tabs & Backup Actions */}
        <div className="px-4 pt-2.5 pb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {(['all', 'poe1', 'poe2'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  filter === tab
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {tab === 'all' ? (locale === 'zh-CN' ? '全部' : 'All') : tab === 'poe1' ? 'PoE 1' : 'PoE 2'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportBackup(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-sky-200 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              {locale === 'zh-CN' ? '导出备份' : 'Export JSON'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              {locale === 'zh-CN' ? '导入备份' : 'Import JSON'}
            </button>
          </div>
        </div>

        {/* Saved Builds List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              {locale === 'zh-CN'
                ? '暂无已保存的 BD，点击上方「保存当前 BD」即可离线保存。'
                : 'No saved builds yet. Click "Save Current" above to store builds offline.'}
            </div>
          ) : (
            filtered.map((rec) => (
              <div
                key={rec.id}
                className="rounded-md bg-[#111521] border border-[#252c40] px-3 py-2.5 flex items-center justify-between gap-3 hover:border-amber-500/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        rec.game === 'poe1'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {rec.game}
                    </span>
                    <span className="text-xs font-semibold text-zinc-100 truncate">
                      {rec.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-1 flex flex-wrap gap-3">
                    <span>
                      Lv.{rec.level} {rec.ascendancyId || rec.classId}
                    </span>
                    <span className="text-amber-300">{rec.dps.toLocaleString()} DPS</span>
                    <span className="text-rose-300">{rec.life.toLocaleString()} Life</span>
                    {rec.energyShield > 0 && (
                      <span className="text-sky-300">{rec.energyShield.toLocaleString()} ES</span>
                    )}
                    <span className="text-zinc-500">
                      {new Date(rec.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleLoad(rec)}
                    className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 cursor-pointer"
                  >
                    {locale === 'zh-CN' ? '加载' : 'Load'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(rec.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                    title={locale === 'zh-CN' ? '删除' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
