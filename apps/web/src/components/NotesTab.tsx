import { t } from '@webpob/i18n';
import { useWebPobStore } from '../store/useWebPobStore';

export function NotesTab() {
  const { locale, build, setBuildMeta } = useWebPobStore();

  return (
    <div className="h-full flex flex-col p-5 gap-3 max-w-4xl">
      <h2 className="text-base font-bold text-amber-200">{t(locale, 'notes.title')}</h2>
      <textarea
        value={build.notes}
        onChange={(e) => setBuildMeta({ notes: e.target.value })}
        placeholder={t(locale, 'notes.placeholder')}
        className="pob-input flex-1 w-full rounded-lg p-4 text-sm leading-relaxed resize-none"
      />
    </div>
  );
}
