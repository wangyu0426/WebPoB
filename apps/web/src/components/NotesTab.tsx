import { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Columns2,
  Eye,
  Highlighter,
  ListChecks,
  Pencil,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

type NotesMode = 'edit' | 'preview' | 'split';

const POB_COLOR_SHORTCUTS: Record<string, string> = {
  '0': '#000000',
  '1': '#e63946',
  '2': '#4ade80',
  '3': '#60a5fa',
  '4': '#fbbf24',
  '5': '#22d3ee',
  '6': '#e879f9',
  '7': '#f4f4f5',
  '8': '#9ca3af',
  '9': '#a78bfa',
};

const GOLD_COLOR_SNIPPET = '^xF59E0B';

interface Segment {
  text: string;
  color?: string;
  bold?: boolean;
}

/**
 * Parses one line of PoB-flavoured notes into styled segments.
 * Supports `^xRRGGBB`, `^0`..`^9` shortcuts and a trailing `^7` reset.
 * Everything is emitted as plain React text — no raw HTML — so it is XSS-safe.
 */
function parsePobSegments(line: string, defaultColor?: string): Segment[] {
  const segments: Segment[] = [];
  let color = defaultColor;
  let bold = false;
  let buffer = '';
  const flush = () => {
    if (buffer.length > 0) {
      segments.push({ text: buffer, color, bold });
      buffer = '';
    }
  };

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch !== '^') {
      buffer += ch;
      continue;
    }
    const hexMatch = /^x([0-9a-fA-F]{6})/.exec(line.slice(i + 1));
    if (hexMatch) {
      flush();
      color = `#${hexMatch[1]!.toUpperCase()}`;
      i += 1 + 6;
      continue;
    }
    if (line[i + 1] === 'x') {
      flush();
      color = defaultColor;
      i += 1;
      continue;
    }
    const digit = line[i + 1];
    if (digit && POB_COLOR_SHORTCUTS[digit]) {
      flush();
      color = POB_COLOR_SHORTCUTS[digit];
      i += 1;
      continue;
    }
    if (line[i + 1] === '^') {
      flush();
      bold = !bold;
      i += 1;
      continue;
    }
    buffer += ch;
  }
  flush();
  return segments.length > 0 ? segments : [{ text: '', color, bold }];
}

function RenderLine({ line, keyPrefix }: { line: string; keyPrefix: string }) {
  const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
  if (headingMatch) {
    const level = headingMatch[1]!.length;
    const text = headingMatch[2]!;
    const sizeClass =
      level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
    return (
      <div className={`${sizeClass} font-bold text-amber-200 mt-2 mb-0.5`}>
        {parsePobSegments(text).map((seg, i) => (
          <span key={`${keyPrefix}-h-${i}`} style={seg.color ? { color: seg.color } : undefined}>
            {seg.text}
          </span>
        ))}
      </div>
    );
  }

  const bulletMatch = /^\s*-\s+(.*)$/.exec(line);
  if (bulletMatch) {
    return (
      <div className="flex gap-1.5 items-start text-sm text-zinc-200">
        <span className="text-amber-400/80 select-none">•</span>
        <span className="flex-1">
          {parsePobSegments(bulletMatch[1]!).map((seg, i) => (
            <span
              key={`${keyPrefix}-b-${i}`}
              style={seg.color ? { color: seg.color } : undefined}
              className={seg.bold ? 'font-semibold' : undefined}
            >
              {seg.text}
            </span>
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed text-zinc-200 min-h-[1.1rem]">
      {parsePobSegments(line).map((seg, i) => (
        <span
          key={`${keyPrefix}-p-${i}`}
          style={seg.color ? { color: seg.color } : undefined}
          className={seg.bold ? 'font-semibold' : undefined}
        >
          {seg.text}
        </span>
      ))}
    </div>
  );
}

function NotesPreview({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, idx) => (
        <RenderLine key={`line-${idx}`} line={line} keyPrefix={`l${idx}`} />
      ))}
    </div>
  );
}

export function NotesTab() {
  const { locale, build, calc, setBuildMeta } = useWebPobStore();
  const cn = locale === 'zh-CN';
  const [mode, setMode] = useState<NotesMode>('split');
  const [insertedToast, setInsertedToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const appendNotes = (block: string) => {
    const current = build.notes;
    const trimmed = current.replace(/\s+$/, '');
    const next = trimmed.length > 0 ? `${trimmed}\n\n${block}` : block;
    setBuildMeta({ notes: next });
    const toast = cn ? '已插入到笔记末尾' : 'Appended to notes';
    setInsertedToast(toast);
    setTimeout(() => setInsertedToast(null), 1600);
  };

  const buildSummaryBlock = useMemo(() => {
    const dps = Math.round(calc.offence.fullDps ?? calc.offence.totalDps);
    const ehp = calc.defence.effectiveHitPool;
    const res = `${calc.defence.fireResist}/${calc.defence.coldResist}/${calc.defence.lightningResist}/${calc.defence.chaosResist}`;
    const title = cn ? '## 当前 BD 概要' : '## Current Build Summary';
    const lines = [
      title,
      `^4${build.name}^7${cn ? ` · ${build.classId}${build.ascendancyId ? ` / ${build.ascendancyId}` : ''} · Lv.${build.level}` : ` · ${build.classId}${build.ascendancyId ? ` / ${build.ascendancyId}` : ''} · Lv.${build.level}`}`,
      `- ^2${cn ? '总 DPS' : 'Total DPS'}^7: ${dps.toLocaleString()}`,
      `- ^1${cn ? '生命' : 'Life'}^7: ${calc.defence.life.toLocaleString()}`,
      `- ^3${cn ? '能量护盾' : 'Energy Shield'}^7: ${calc.defence.energyShield.toLocaleString()}`,
      `- ^5${cn ? '有效生命池 (EHP)' : 'Effective Hit Pool (EHP)'}^7: ${ehp.toLocaleString()}`,
      `- ^6${cn ? '抗性 (火/冰/电/混)' : 'Resistances (F/C/L/Chaos)'}^7: ${res}%`,
      `- ^8${cn ? '生成时间' : 'Generated'}^7: ${new Date().toLocaleString()}`,
    ];
    return lines.join('\n');
  }, [build.name, build.classId, build.ascendancyId, build.level, calc, cn]);

  const levelingBlock = useMemo(() => {
    const title = cn ? '## 开荒路线模板' : '## Leveling Checklist';
    const acts = cn
      ? [
          ['第一章 Act 1', '怒焰之殿 → 海岸 → 泥沼 → 海妖巢穴（拿传送点）'],
          ['第二章 Act 2', '森林营地 → 古代遗迹 → 瓦尔废墟 → 金字塔'],
          ['第三章 Act 3', '城镇 → 城塞 → 下水道 → 月影神殿'],
          ['第四章 Act 4', '矿坑 → 水晶矿脉 → 大教堂 → 玛拉凯'],
          ['第五章 Act 5', '奥瑞亚 → 广场 → 大教堂 → 圣堂实验室'],
          ['第六章 Act 6', '海岸 → 海妖巢穴 → 卡鲁伊堡垒 → 薛朗之塔'],
          ['第七章 Act 7', '十字路口 → 兽穴 → 玛拉凯之塔 → 苍白庭院'],
          ['第八章 Act 8', '帝国平原 → 日耀神殿 → 月耀神殿 → 血沟'],
          ['第九章 Act 9', '血沟 → 绿洲 → 隧道 → 卡塔琳娜'],
          ['第十章 Act 10', '卡鲁伊堡垒 → 海妖巢穴 → 奥瑞亚 → 玛拉凯'],
        ]
      : [
          ['Act 1', 'Ogham → Twilight Strand → Mud Flats → Tidal Island'],
          ['Act 2', 'Forest Encampment → Ancient Pyramid → Vaal Ruins'],
          ['Act 3', 'Town → Docks → Sewers → Lunaris Temple'],
          ['Act 4', 'Mines → Crystal Veins → Grand Cathedral → Malachai'],
          ['Act 5', 'Overseer → Square → Cathedral → Sanctum Lab'],
          ['Act 6', 'Coast → Tidal Island → Karui Fortress → Shavronne'],
          ['Act 7', 'Crossroads → Beast Den → Malachai Tower → Pale Court'],
          ['Act 8', 'Imperial Fields → Solaris → Lunaris → Blood Aqueduct'],
          ['Act 9', 'Blood Aqueduct → Oasis → Tunnel → Catarina'],
          ['Act 10', 'Karui Fortress → Tidal Island → Oriath → Kitava'],
        ];
    const lines = [title, `- ^4${cn ? '每章完成后检查抗性 -30%/' : 'Check -30% resistances per act /'} ^8${cn ? '升级宝石与药剂' : 'upgrade gems & flasks'}^7`];
    for (const [act, route] of acts) {
      lines.push(`- ^3${act}^7: ${route}`);
    }
    lines.push(cn ? '## 终局 Endgame' : '## Endgame');
    lines.push(cn ? '- ^4地图进阶^7: 白图 → 黄图 → 红图，优先 T16 守望石' : '- ^4Atlas progression^7: white → yellow → red maps, prioritise T16 watchstones');
    lines.push(cn ? '- ^4大师任务^7: 每日完成女王、扎娜、艾瓦任务' : '- ^4Master missions^7: complete Jun, Zana & Alva dailies');
    lines.push(cn ? '- ^4升华试炼^7: 四大迷宫 (Normal / Cruel / Merciless / Eternal)' : '- ^4Ascendancy trials^7: Normal / Cruel / Merciless / Eternal labyrinths');
    lines.push(cn ? '- ^4装备替换^7: 6L 胸甲 → 双持 → 传奇核心件' : '- ^4Gear milestones^7: 6L body → dual wield → core uniques');
    return lines.join('\n');
  }, [cn]);

  const insertBuildSummary = () => appendNotes(buildSummaryBlock);
  const insertLevelingTemplate = () => appendNotes(levelingBlock);
  const insertGoldSnippet = () => {
    const block = cn
      ? `${GOLD_COLOR_SNIPPET}高亮提示^7: ${GOLD_COLOR_SNIPPET}在此写入重点^7`
      : `${GOLD_COLOR_SNIPPET}Highlight^7: ${GOLD_COLOR_SNIPPET}write your key takeaway here^7`;
    appendNotes(block);
    const el = textareaRef.current;
    if (el) {
      el.focus();
    }
  };

  const modeButtons: Array<{ id: NotesMode; labelZh: string; labelEn: string; icon: typeof Pencil }> = [
    { id: 'edit', labelZh: '编辑', labelEn: 'Edit', icon: Pencil },
    { id: 'preview', labelZh: '预览', labelEn: 'Preview', icon: Eye },
    { id: 'split', labelZh: '分屏', labelEn: 'Split', icon: Columns2 },
  ];

  const editor = (
    <textarea
      ref={textareaRef}
      value={build.notes}
      onChange={(e) => setBuildMeta({ notes: e.target.value })}
      placeholder={t(locale, 'notes.placeholder')}
      spellCheck={false}
      className="pob-input flex-1 w-full rounded-lg p-4 text-sm leading-relaxed resize-none font-mono min-h-[260px]"
    />
  );

  const preview = (
    <div className="flex-1 w-full rounded-lg p-4 bg-[#0b0e16] border border-[#22283a] overflow-y-auto min-h-[260px]">
      {build.notes.trim().length > 0 ? (
        <NotesPreview text={build.notes} />
      ) : (
        <div className="text-sm text-zinc-500 italic">
          {cn ? '预览为空，先在左侧输入内容或插入模板。' : 'Preview is empty. Type on the left or insert a template.'}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col p-5 gap-3 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-bold text-amber-200">{t(locale, 'notes.title')}</h2>
        <div className="flex items-center gap-1 rounded-md border border-[#2a3147] bg-[#0f131e] p-0.5">
          {modeButtons.map(({ id, labelZh, labelEn, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition ${
                mode === id
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cn ? labelZh : labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={insertBuildSummary}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {cn ? '插入当前 BD 概要' : 'Insert Build Summary'}
        </button>
        <button
          type="button"
          onClick={insertLevelingTemplate}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/40 cursor-pointer"
        >
          <ListChecks className="w-3.5 h-3.5" />
          {cn ? '插入开荒路线模板' : 'Insert Leveling Template'}
        </button>
        <button
          type="button"
          onClick={insertGoldSnippet}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 cursor-pointer"
        >
          <Highlighter className="w-3.5 h-3.5" />
          {cn ? `插入高亮色标 (${GOLD_COLOR_SNIPPET})` : `Insert Highlight (${GOLD_COLOR_SNIPPET})`}
        </button>
        {insertedToast && (
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {insertedToast}
          </span>
        )}
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {mode === 'edit' && (
          <div className="flex-1 flex flex-col min-h-0">{editor}</div>
        )}
        {mode === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">{preview}</div>
        )}
        {mode === 'split' && (
          <>
            <div className="flex-1 flex flex-col min-h-0">{editor}</div>
            <div className="flex-1 flex flex-col min-h-0">{preview}</div>
          </>
        )}
      </div>

      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
        <ScrollText className="w-3 h-3" />
        {cn
          ? '支持 PoB 颜色代码：^xRRGGBB 十六进制，^0 黑 ^1 红 ^2 绿 ^3 蓝 ^4 黄 ^5 青 ^6 品红 ^7 白/重置 ^8 灰 ^9 紫；另支持 # 标题与 - 列表，全部安全渲染为纯文本。'
          : 'PoB colour codes supported: ^xRRGGBB hex, ^0 black ^1 red ^2 green ^3 blue ^4 yellow ^5 cyan ^6 magenta ^7 white/reset ^8 gray ^9 violet; # headings and - bullets render as safe plain text.'}
      </div>
    </div>
  );
}
