export interface PositionFormDefaults {
  themeId: string;
  fen: string;
  userSide: string;
  expectedResult: string;
  judgeType: string;
  lineMovesText: string;
  titleFr: string;
  introFr: string;
  goalFr: string;
  titleEn: string;
  introEn: string;
  goalEn: string;
  source: string;
  rating: number;
  ratingDeviation: number;
  free: boolean;
}

const inputClass =
  "rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Formulaire admin de position (création + édition), entièrement rendu serveur : les boutons
 * "Enregistrer brouillon / Publier / Archiver" envoient leur propre `name="intent"`, lu par la
 * server action de la page appelante — aucun JS client nécessaire.
 */
export function PositionForm({
  themes,
  defaults,
  action,
  labels,
  showPublishButtons,
}: {
  themes: Array<{ id: string; slug: string; family: string }>;
  defaults: PositionFormDefaults;
  action: (formData: FormData) => void;
  labels: Record<string, string>;
  showPublishButtons: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {labels.theme}
        <select name="themeId" defaultValue={defaults.themeId} required className={inputClass}>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.family} / {theme.slug}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {labels.fen}
        <input type="text" name="fen" defaultValue={defaults.fen} required className={`${inputClass} font-mono text-xs`} />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {labels.userSide}
          <select name="userSide" defaultValue={defaults.userSide} className={inputClass}>
            <option value="white">white</option>
            <option value="black">black</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {labels.expectedResult}
          <select name="expectedResult" defaultValue={defaults.expectedResult} className={inputClass}>
            <option value="white">white</option>
            <option value="draw">draw</option>
            <option value="black">black</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {labels.judgeType}
          <select name="judgeType" defaultValue={defaults.judgeType} className={inputClass}>
            <option value="kpk">kpk</option>
            <option value="syzygy">syzygy</option>
            <option value="stockfish">stockfish</option>
            <option value="line">line</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {labels.lineMoves}
        <textarea
          name="lineMovesText"
          defaultValue={defaults.lineMovesText}
          rows={5}
          placeholder="Rf1+ | Coupe la ligne de défense | Cuts the defense line"
          className={`${inputClass} font-mono text-xs`}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <legend className="text-xs font-semibold uppercase">FR</legend>
          <input type="text" name="titleFr" defaultValue={defaults.titleFr} placeholder={labels.title} className={inputClass} />
          <textarea name="introFr" defaultValue={defaults.introFr} placeholder={labels.intro} rows={2} className={inputClass} />
          <textarea name="goalFr" defaultValue={defaults.goalFr} placeholder={labels.goal} rows={2} className={inputClass} />
        </fieldset>
        <fieldset className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <legend className="text-xs font-semibold uppercase">EN</legend>
          <input type="text" name="titleEn" defaultValue={defaults.titleEn} placeholder={labels.title} className={inputClass} />
          <textarea name="introEn" defaultValue={defaults.introEn} placeholder={labels.intro} rows={2} className={inputClass} />
          <textarea name="goalEn" defaultValue={defaults.goalEn} placeholder={labels.goal} rows={2} className={inputClass} />
        </fieldset>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {labels.rating}
          <input type="number" name="rating" defaultValue={defaults.rating} className={`w-24 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {labels.ratingDeviation}
          <input type="number" name="ratingDeviation" defaultValue={defaults.ratingDeviation} className={`w-24 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {labels.source}
          <input type="text" name="source" defaultValue={defaults.source} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input type="checkbox" name="free" defaultChecked={defaults.free} />
          {labels.free}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" name="intent" value="draft" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          {labels.saveDraft}
        </button>
        {showPublishButtons && (
          <>
            <button type="submit" name="intent" value="published" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
              {labels.publish}
            </button>
            <button type="submit" name="intent" value="archived" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
              {labels.archive}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
