import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Command as CommandIcon,
  CornerDownLeft,
  Globe,
  Keyboard,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { encodeBuildToPobCode } from '@webpob/codec';
import { getClassesForGame } from '@webpob/data';
import { localizeText, uiText } from '@webpob/i18n';
import { useWebPobStore, type ActiveTab } from '../store/useWebPobStore';
import { buildSummaryToMarkdown, downloadBuildSummaryPng } from '../utils/exportBuildCard';

export type CommandPaletteMode = 'command' | 'shortcuts';

interface CommandPaletteModalProps {
  open: boolean;
  initialMode?: CommandPaletteMode;
  onClose: () => void;
}

type CommandGroup = 'Navigation' | 'Build Actions' | 'Export & Share' | 'Language & Help';

interface PaletteCommand {
  id: string;
  group: CommandGroup;
  labelEn: string;
  labelZh: string;
  keywords: string[];
  shortcut?: string;
  disabled?: boolean;
  keepOpen?: boolean;
  feedbackEn?: string;
  feedbackZh?: string;
  run: () => void | Promise<void>;
}

const GROUP_ORDER: CommandGroup[] = ['Navigation', 'Build Actions', 'Export & Share', 'Language & Help'];

const GROUP_LABELS: Record<CommandGroup, { en: string; zh: string }> = {
  Navigation: { en: 'Navigation', zh: '导航' },
  'Build Actions': { en: 'Build Actions', zh: '构筑操作' },
  'Export & Share': { en: 'Export & Share', zh: '导出与分享' },
  'Language & Help': { en: 'Language & Help', zh: '语言与帮助' },
};

const NAV_TABS: Array<{ id: ActiveTab; en: string; zh: string; key: string; keywords: string[] }> = [
  { id: 'tree', en: 'Passive Tree', zh: '天赋树', key: '1', keywords: ['tree', 'passive', 'skill tree', '天赋', '树'] },
  { id: 'skills', en: 'Skills & Gems', zh: '技能与宝石', key: '2', keywords: ['skills', 'gems', '技能', '宝石'] },
  { id: 'items', en: 'Items & Flasks', zh: '装备与药剂', key: '3', keywords: ['items', 'gear', 'flasks', '装备', '药剂'] },
  { id: 'calcs', en: 'Calcs & Breakdown', zh: '计算明细', key: '4', keywords: ['calcs', 'damage', 'defence', '计算', '伤害', '防御'] },
  { id: 'config', en: 'Configuration', zh: '配置', key: '5', keywords: ['config', 'settings', '配置', '设置'] },
  { id: 'import', en: 'Import / Export', zh: '导入 / 导出', key: '6', keywords: ['import', 'export', 'pob', '导入', '导出'] },
  { id: 'notes', en: 'Notes', zh: '笔记', key: '7', keywords: ['notes', 'notes tab', '笔记'] },
];

const SHORTCUTS: Array<{ groupEn: string; groupZh: string; rows: Array<{ keys: string; en: string; zh: string }> }> = [
  {
    groupEn: 'Global',
    groupZh: '全局',
    rows: [
      { keys: 'Ctrl/Cmd + K', en: 'Open Command Palette', zh: '打开命令面板' },
      { keys: '?', en: 'Open Shortcuts Cheat Sheet', zh: '打开快捷键速查表' },
      { keys: '1 – 7', en: 'Switch navigation tabs', zh: '切换导航标签页' },
      { keys: 'Ctrl/Cmd + Z', en: 'Undo last build change', zh: '撤销上一步构筑修改' },
      { keys: 'Ctrl/Cmd + Y', en: 'Redo last build change', zh: '重做上一步构筑修改' },
      { keys: 'Ctrl/Cmd + Shift + Z', en: 'Redo (alternate)', zh: '重做（替代快捷键）' },
      { keys: 'Esc', en: 'Close modal / command palette', zh: '关闭弹窗 / 命令面板' },
      { keys: 'Enter', en: 'Execute highlighted command', zh: '执行高亮命令' },
    ],
  },
  {
    groupEn: 'Passive Tree Canvas',
    groupZh: '天赋树画布',
    rows: [
      { keys: 'Drag', en: 'Pan the tree canvas', zh: '拖拽平移天赋树' },
      { keys: 'Mouse wheel', en: 'Zoom at cursor position', zh: '以光标为中心缩放' },
      { keys: 'Search field', en: 'Highlight matching passives', zh: '高亮匹配的天赋节点' },
      { keys: 'Enter in search', en: 'Jump to next match', zh: '跳转到下一个匹配项' },
      { keys: 'Fit All', en: 'Frame the whole passive tree', zh: '框选整棵天赋树' },
      { keys: 'Fit Allocated', en: 'Frame allocated passives', zh: '框选已点天赋' },
      { keys: 'Hover node', en: 'Preview DPS/EHP delta & per-point efficiency', zh: '预览 DPS/EHP 增益与每点效率' },
      { keys: 'Click node', en: 'Allocate / unallocate passive', zh: '点选 / 取消天赋节点' },
    ],
  },
];

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function matchesQuery(command: PaletteCommand, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const haystack = [command.labelEn, command.labelZh, ...command.keywords].join(' ').toLowerCase();
  if (haystack.includes(query)) return true;
  let queryIndex = 0;
  for (const char of haystack) {
    if (char === query[queryIndex]) {
      queryIndex++;
      if (queryIndex === query.length) return true;
    }
  }
  return false;
}

export function CommandPaletteModal({ open, initialMode = 'command', onClose }: CommandPaletteModalProps) {
  const {
    locale,
    build,
    calc,
    canUndo,
    canRedo,
    undo,
    redo,
    setLocale,
    setActiveTab,
    switchGame,
    setBuildMeta,
    loadSampleBuild,
    createNewBuild,
  } = useWebPobStore();

  const [mode, setMode] = useState<CommandPaletteMode>(initialMode);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setQuery('');
    setActiveIndex(0);
    setFeedback(null);
  }, [open, initialMode]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || mode !== 'command') return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const showFeedback = useCallback(
    (message: string) => {
      setFeedback(message);
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 750);
    },
    [onClose],
  );

  const oneLineStats = useTelemetryOneLiner(locale, build, calc);

  const commands = useMemo<PaletteCommand[]>(() => {
    const navigate = (tab: ActiveTab) => () => setActiveTab(tab);
    const shareCode = () => encodeBuildToPobCode(build);
    const shareUrl = () => {
      const code = shareCode();
      return `${window.location.origin}${window.location.pathname}#pob=${code}`;
    };

    const list: PaletteCommand[] = NAV_TABS.map((tab) => ({
      id: `nav.${tab.id}`,
      group: 'Navigation',
      labelEn: `Jump to ${tab.en}`,
      labelZh: `跳转到${tab.zh}`,
      keywords: [tab.en, tab.zh, tab.id, ...tab.keywords],
      shortcut: tab.key,
      run: navigate(tab.id),
    }));

    list.push(
      {
        id: 'build.undo',
        group: 'Build Actions',
        labelEn: 'Undo Last Change',
        labelZh: '撤销上一步修改',
        keywords: ['undo', 'revert', '撤销', '回退'],
        shortcut: 'Ctrl/Cmd + Z',
        disabled: !canUndo,
        run: undo,
      },
      {
        id: 'build.redo',
        group: 'Build Actions',
        labelEn: 'Redo Last Change',
        labelZh: '重做上一步修改',
        keywords: ['redo', '重做', '恢复'],
        shortcut: 'Ctrl/Cmd + Y',
        disabled: !canRedo,
        run: redo,
      },
      {
        id: 'build.poe1',
        group: 'Build Actions',
        labelEn: 'Switch to PoE 1 (3.30)',
        labelZh: '切换到 PoE 1 (3.30)',
        keywords: ['poe1', 'path of exile 1', '3.30', '一代', '切换'],
        shortcut: '3.30',
        disabled: build.game === 'poe1',
        run: () => switchGame('poe1'),
      },
      {
        id: 'build.poe2',
        group: 'Build Actions',
        labelEn: 'Switch to PoE 2 (0.5)',
        labelZh: '切换到 PoE 2 (0.5)',
        keywords: ['poe2', 'path of exile 2', '0.5', '二代', '切换'],
        shortcut: '0.5',
        disabled: build.game === 'poe2',
        run: () => switchGame('poe2'),
      },
    );

    if (build.game === 'poe2') {
      list.push(
        {
          id: 'build.weapon1',
          group: 'Build Actions',
          labelEn: 'Switch Weapon Set I',
          labelZh: '切换武器组 I',
          keywords: ['weapon', 'set', 'weapon set 1', '武器组', '武器'],
          shortcut: 'I',
          disabled: build.activeWeaponSet === 1,
          run: () => setBuildMeta({ activeWeaponSet: 1 }),
        },
        {
          id: 'build.weapon2',
          group: 'Build Actions',
          labelEn: 'Switch Weapon Set II',
          labelZh: '切换武器组 II',
          keywords: ['weapon', 'set', 'weapon set 2', '武器组', '武器'],
          shortcut: 'II',
          disabled: build.activeWeaponSet === 2,
          run: () => setBuildMeta({ activeWeaponSet: 2 }),
        },
      );
    }

    list.push(
      {
        id: 'build.sample',
        group: 'Build Actions',
        labelEn: 'Load Sample Build',
        labelZh: '载入示例构筑',
        keywords: ['sample', 'example', 'preset', '示例', '预设'],
        run: () => loadSampleBuild(build.game),
      },
      {
        id: 'build.new',
        group: 'Build Actions',
        labelEn: 'Create New Blank Build',
        labelZh: '新建空白构筑',
        keywords: ['new', 'blank', 'create', '新建', '空白'],
        run: () => createNewBuild(build.game),
      },
      {
        id: 'share.url',
        group: 'Export & Share',
        labelEn: 'Copy Shareable URL',
        labelZh: '复制分享链接',
        keywords: ['share', 'url', 'link', 'pob', '分享', '链接', '复制'],
        shortcut: '#pob=',
        feedbackEn: 'Shareable URL copied',
        feedbackZh: '分享链接已复制',
        run: async () => {
          const code = shareCode();
          const url = shareUrl();
          window.history.replaceState(null, '', `#pob=${code}`);
          await writeClipboard(url);
        },
      },
      {
        id: 'share.png',
        group: 'Export & Share',
        labelEn: 'Download PNG Build Card',
        labelZh: '下载 PNG 构筑卡片',
        keywords: ['png', 'image', 'card', 'download', '图片', '卡片', '下载'],
        shortcut: 'PNG',
        feedbackEn: 'PNG build card downloaded',
        feedbackZh: 'PNG 构筑卡片已下载',
        run: () => downloadBuildSummaryPng(build, calc, locale),
      },
      {
        id: 'share.markdown',
        group: 'Export & Share',
        labelEn: 'Copy Markdown Build Summary',
        labelZh: '复制 Markdown 构筑摘要',
        keywords: ['markdown', 'md', 'summary', '摘要', '复制'],
        shortcut: 'MD',
        feedbackEn: 'Markdown summary copied',
        feedbackZh: 'Markdown 摘要已复制',
        run: async () => {
          const md = buildSummaryToMarkdown(build, calc, locale, shareUrl());
          await writeClipboard(md);
        },
      },
      {
        id: 'share.oneline',
        group: 'Export & Share',
        labelEn: 'Copy One-Line Stats Summary',
        labelZh: '复制一行战绩摘要',
        keywords: ['one line', 'stats', 'summary', 'dps', '战绩', '摘要', '复制'],
        shortcut: '1L',
        feedbackEn: 'One-line stats copied',
        feedbackZh: '一行战绩已复制',
        run: async () => {
          await writeClipboard(oneLineStats);
        },
      },
      {
        id: 'help.language',
        group: 'Language & Help',
        labelEn: 'Cycle Language (简体中文 → 繁體中文 → EN)',
        labelZh: '切换语言（国服简中 → 國際服繁中 → EN）',
        keywords: ['language', 'locale', 'english', 'chinese', 'traditional', '语言', '中文', '英文', '繁體', '国际服'],
        shortcut: 'LANG',
        run: () => setLocale(locale === 'zh-CN' ? 'zh-TW' : locale === 'zh-TW' ? 'en' : 'zh-CN'),
      },
      {
        id: 'help.shortcuts',
        group: 'Language & Help',
        labelEn: 'Open Keyboard Shortcuts Cheat Sheet',
        labelZh: '打开快捷键速查表',
        keywords: ['keyboard', 'shortcuts', 'help', 'cheat sheet', '快捷键', '帮助'],
        shortcut: '?',
        keepOpen: true,
        run: () => setMode('shortcuts'),
      },
    );

    return list;
  }, [
    build,
    calc,
    canUndo,
    canRedo,
    createNewBuild,
    loadSampleBuild,
    locale,
    oneLineStats,
    redo,
    setActiveTab,
    setBuildMeta,
    setLocale,
    switchGame,
    undo,
  ]);

  const filteredCommands = useMemo(
    () => commands.filter((command) => matchesQuery(command, query)),
    [commands, query],
  );

  const groupedCommands = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: filteredCommands.filter((command) => command.group === group),
      })).filter((entry) => entry.items.length > 0),
    [filteredCommands],
  );

  const flatCommands = useMemo(() => groupedCommands.flatMap((entry) => entry.items), [groupedCommands]);
  const commandIndexById = useMemo(
    () => new Map(flatCommands.map((command, index) => [command.id, index])),
    [flatCommands],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, mode]);

  useEffect(() => {
    const active = flatCommands[activeIndex];
    if (!active) return;
    itemRefs.current.get(active.id)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, flatCommands]);

  const executeCommand = useCallback(
    async (command: PaletteCommand) => {
      if (command.disabled) return;
      try {
        await command.run();
        if (command.keepOpen) return;
        if (command.feedbackEn || command.feedbackZh) {
          showFeedback(
            uiText(
              locale,
              command.feedbackZh ?? command.feedbackEn ?? '',
              command.feedbackEn ?? command.feedbackZh ?? '',
            ),
          );
          return;
        }
        onClose();
      } catch {
        setFeedback(uiText(locale, '操作失败，请重试', 'Action failed, please retry'));
        if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 1600);
      }
    },
    [locale, onClose, showFeedback],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (mode !== 'command') return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => {
          if (flatCommands.length === 0) return 0;
          for (let step = 1; step <= flatCommands.length; step++) {
            const next = (index + step) % flatCommands.length;
            if (!flatCommands[next]?.disabled) return next;
          }
          return index;
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => {
          if (flatCommands.length === 0) return 0;
          for (let step = 1; step <= flatCommands.length; step++) {
            const next = (index - step + flatCommands.length) % flatCommands.length;
            if (!flatCommands[next]?.disabled) return next;
          }
          return index;
        });
        return;
      }
      if (event.key === 'Enter') {
        const active = flatCommands[activeIndex];
        if (active) {
          event.preventDefault();
          void executeCommand(active);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, executeCommand, flatCommands, mode, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 backdrop-blur-sm px-4 pt-[9vh] pb-4 select-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#2c3550] bg-[#0d111b]/98 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Header: mode tabs + close */}
        <div className="flex items-center justify-between gap-3 px-3 pt-3">
          <div className="flex items-center gap-1 rounded-lg bg-[#080b12] p-0.5 border border-[#252c40]">
            <button
              type="button"
              onClick={() => setMode('command')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition ${
                mode === 'command'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/45'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <CommandIcon className="w-3.5 h-3.5" />
              {uiText(locale, '命令面板', 'Command Palette')}
            </button>
            <button
              type="button"
              onClick={() => setMode('shortcuts')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition ${
                mode === 'shortcuts'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/45'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              {uiText(locale, '快捷键', 'Shortcuts')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#1a2030] cursor-pointer"
            title={uiText(locale, '关闭 (Esc)', 'Close (Esc)')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'command' ? (
          <>
            <div className="p-3 border-b border-[#242b3e]">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    uiText(locale, '输入命令、页面或操作…（支持英文与中文）', 'Type a command, tab, or action… (EN & 中文)')
                  }
                  className="w-full rounded-lg bg-[#080b12] border border-[#2a3248] focus:border-amber-500/55 focus:ring-1 focus:ring-amber-500/25 outline-none pl-9 pr-16 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#333c55] bg-[#121724] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="max-h-[54vh] overflow-y-auto px-1.5 py-1.5">
              {groupedCommands.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  {uiText(locale, '没有匹配的命令', 'No matching commands')}
                </div>
              ) : (
                groupedCommands.map(({ group, items }) => (
                  <div key={group} className="mb-1">
                    <div className="px-2 pt-1.5 pb-1 text-[9px] uppercase tracking-wider font-semibold text-zinc-500">
                      {uiText(locale, GROUP_LABELS[group].zh, GROUP_LABELS[group].en)}
                    </div>
                    <div className="space-y-0.5">
                      {items.map((command) => {
                        const index = commandIndexById.get(command.id) ?? -1;
                        const isActive = index === activeIndex;
                        return (
                          <button
                            key={command.id}
                            ref={(element) => {
                              if (element) itemRefs.current.set(command.id, element);
                              else itemRefs.current.delete(command.id);
                            }}
                            type="button"
                            disabled={command.disabled}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => void executeCommand(command)}
                            className={`w-full flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left transition cursor-pointer ${
                              command.disabled
                                ? 'opacity-40 cursor-not-allowed'
                                : isActive
                                  ? 'bg-amber-500/15 border border-amber-500/35'
                                  : 'border border-transparent hover:bg-[#161c2a]'
                            }`}
                          >
                            <span className="min-w-0 flex items-center gap-2">
                              <span
                                className={`w-1 h-1 rounded-full shrink-0 ${
                                  isActive ? 'bg-amber-300' : 'bg-zinc-700'
                                }`}
                              />
                              <span className="truncate text-xs text-zinc-100">
                                {uiText(locale, command.labelZh, command.labelEn)}
                              </span>
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              {command.shortcut && (
                                <kbd className="rounded border border-[#333c55] bg-[#121724] px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                                  {command.shortcut}
                                </kbd>
                              )}
                              {isActive && (
                                <CornerDownLeft className="w-3 h-3 text-amber-300/80" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#242b3e] px-3 py-1.5 text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-2">
                <span><kbd className="text-zinc-400">↑↓</kbd> {uiText(locale, '选择', 'Navigate')}</span>
                <span><kbd className="text-zinc-400">Enter</kbd> {uiText(locale, '执行', 'Run')}</span>
                <span><kbd className="text-zinc-400">Esc</kbd> {uiText(locale, '关闭', 'Close')}</span>
              </span>
              {feedback ? (
                <span className="inline-flex items-center gap-1 text-emerald-300 font-sans font-semibold">
                  <Check className="w-3 h-3" />
                  {feedback}
                </span>
              ) : (
                <span>{commands.length} {uiText(locale, '条命令', 'commands')}</span>
              )}
            </div>
          </>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#242b3e]">
              <BookOpen className="w-4 h-4 text-sky-300" />
              <div>
                <div className="text-sm font-bold text-zinc-100">
                  {uiText(locale, '键盘快捷键速查表', 'Keyboard Shortcuts')}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {uiText(locale, '全局导航、构筑操作与天赋树画布手势', 'Global navigation, build actions & passive tree canvas gestures')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 max-h-[58vh] overflow-y-auto">
              {SHORTCUTS.map((section) => (
                <div key={section.groupEn} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-sky-300">
                    {section.groupEn === 'Global' ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {uiText(locale, section.groupZh, section.groupEn)}
                  </div>
                  <div className="space-y-1">
                    {section.rows.map((row) => (
                      <div
                        key={`${section.groupEn}-${row.en}`}
                        className="flex items-center justify-between gap-2 rounded-md bg-[#0a0e17] border border-[#1f2638] px-2.5 py-1.5"
                      >
                        <span className="text-[11px] text-zinc-300 leading-snug">
                          {uiText(locale, row.zh, row.en)}
                        </span>
                        <kbd className="shrink-0 rounded border border-[#333c55] bg-[#121724] px-1.5 py-0.5 text-[9px] font-mono text-amber-200 whitespace-nowrap">
                          {row.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[#242b3e] pt-2 mt-3 text-[10px] text-zinc-500">
              <span>{uiText(locale, '按 Esc 关闭', 'Press Esc to close')}</span>
              <button
                type="button"
                onClick={() => setMode('command')}
                className="inline-flex items-center gap-1 rounded border border-[#2e364f] bg-[#121724] px-2 py-0.5 text-[10px] text-zinc-300 hover:text-amber-200 cursor-pointer"
              >
                <CommandIcon className="w-3 h-3" />
                {uiText(locale, '返回命令面板', 'Back to Palette')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function useTelemetryOneLiner(
  locale: 'en' | 'zh-CN' | 'zh-TW',
  build: ReturnType<typeof useWebPobStore.getState>['build'],
  calc: ReturnType<typeof useWebPobStore.getState>['calc'],
): string {
  return useMemo(() => {
    const classes = getClassesForGame(build.game);
    const currentClass = classes.find((entry) => entry.id === build.classId) ?? classes[0];
    const ascendancy = currentClass?.ascendancies.find((entry) => entry.id === build.ascendancyId);
    const buildTitle = ascendancy
      ? localizeText(ascendancy.name, locale)
      : currentClass
        ? localizeText(currentClass.name, locale)
        : build.classId;
    const resLine = [
      calc.defence.fireResist,
      calc.defence.coldResist,
      calc.defence.lightningResist,
      calc.defence.chaosResist,
    ].join('/');
    return `${buildTitle} ${localizeText(calc.offence.mainSkillName, locale)} (Lv.${build.level}) | ${formatNumber(calc.offence.totalDps)} DPS | ${formatNumber(calc.defence.life)} Life / ${formatNumber(calc.defence.energyShield)} ES | ${formatNumber(calc.defence.effectiveHitPool)} EHP | ${resLine}% Res`;
  }, [build, calc, locale]);
}
