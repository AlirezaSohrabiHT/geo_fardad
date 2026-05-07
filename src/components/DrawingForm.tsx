import type { CustomLayer, DrawingMeta } from "../types/gis";

interface Props {
  meta: DrawingMeta;
  onChange: (meta: DrawingMeta) => void;
  customLayers: CustomLayer[];
  error: string | null;
}

export function DrawingForm({ meta, onChange, customLayers, error }: Props) {
  const update = (patch: Partial<DrawingMeta>) =>
    onChange({ ...meta, ...patch });

  const hasTarget = !!meta.targetLayerId;

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-3 p-4 border-t border-nord-border flex-shrink-0"
    >
      {/* header */}
      <div className="flex items-center gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-nord-frost2 flex-shrink-0"
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
        <span className="text-sm font-medium text-nord-dim tracking-wide">
          ترسیم عارضه
        </span>
      </div>

      {/* target layer */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-nord-dim">لایه مقصد</label>
        <select
          value={meta.targetLayerId}
          onChange={(e) => update({ targetLayerId: e.target.value })}
          className="text-sm"
        >
          <option value="">انتخاب لایه مقصد...</option>
          {customLayers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* feature name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-nord-dim">نام عارضه</label>
        <input
          type="text"
          placeholder="مثلاً: پارک ملت"
          value={meta.featureName}
          onChange={(e) => update({ featureName: e.target.value })}
          disabled={!hasTarget}
          className={`text-sm ${!hasTarget ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </div>

      {/* feature fields */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-nord-dim">فیلدهای اضافی</label>
        <input
          type="text"
          placeholder="key:value, key:value, ..."
          value={meta.featureFields}
          onChange={(e) => update({ featureFields: e.target.value })}
          disabled={!hasTarget}
          className={`text-sm font-mono ${!hasTarget ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <p className="text-[11px] text-nord-dim/70 leading-relaxed">
          هر فیلد به صورت کلید:مقدار و با کاما جدا شود
        </p>
      </div>

      {/* error message */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-nord-orange bg-nord-orange/10 rounded-xl px-3 py-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* hint when no layer selected */}
      {!hasTarget && (
        <div className="flex items-start gap-2 text-sm text-nord-frost3 bg-nord-frost4/10 rounded-xl px-3 py-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>ابتدا یک لایه سفارشی بسازید، سپس روی نقشه ترسیم کنید.</span>
        </div>
      )}

      {/* ready indicator */}
      {hasTarget && !error && (
        <div className="flex items-center gap-2 text-sm text-nord-green">
          <span className="w-2 h-2 rounded-full bg-nord-green animate-pulse" />
          آماده ترسیم — روی نقشه رسم کنید
        </div>
      )}
    </div>
  );
}
