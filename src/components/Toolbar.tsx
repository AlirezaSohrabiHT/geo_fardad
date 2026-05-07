import { useState } from "react";
import type { BaseLayerId, CustomLayer } from "../types/gis";

interface Props {
  baseLayerActive: Record<BaseLayerId, boolean>;
  onToggleBase: (id: BaseLayerId) => void;
  customLayers: CustomLayer[];
  onToggleCustom: (id: string) => void;
  onRemoveCustom: (id: string) => void;
  onOpenCreate: () => void;
}

const baseLayersMeta: { id: BaseLayerId; label: string; icon: string }[] = [
  { id: "city", label: "شهرها", icon: "🏙" },
  { id: "state", label: "استان‌ها", icon: "🗺" },
];

export function Toolbar({
  baseLayerActive,
  onToggleBase,
  customLayers,
  onToggleCustom,
  onRemoveCustom,
  onOpenCreate,
}: Props) {
  const [hoveredCustom, setHoveredCustom] = useState<string | null>(null);

  return (
    <div dir="rtl" className="flex flex-col gap-1.5 p-3 overflow-y-auto flex-1">
      {/* ── Base Layers ── */}
      <div className="mb-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-px flex-1 bg-nord-border/50" />
          <span className="text-sm text-nord-dim tracking-wide select-none">
            لایه‌های پایه
          </span>
          <div className="h-px flex-1 bg-nord-border/50" />
        </div>

        <div className="flex flex-col gap-0.5 mt-1">
          {baseLayersMeta.map(({ id, label, icon }) => {
            const active = baseLayerActive[id];
            return (
              <button
                key={id}
                onClick={() => onToggleBase(id)}
                className={`
                  group relative flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base
                  transition-all duration-200 cursor-pointer
                  ${
                    active
                      ? "bg-gradient-to-l from-nord-frost4/20 to-nord-frost3/10 text-nord-frost2"
                      : "text-nord-muted hover:bg-nord-hover/60"
                  }
                `}
              >
                <span
                  className={`
                  absolute right-0 top-1/2 -translate-y-1/2 w-[3px] rounded-l-full
                  transition-all duration-300
                  ${active ? "h-5 bg-nord-frost2" : "h-0 bg-transparent"}
                `}
                />

                <span className="text-lg leading-none">{icon}</span>
                <span className="flex-1 text-right">{label}</span>

                <span
                  className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-300
                  ${
                    active
                      ? "bg-nord-frost2 shadow-[0_0_6px_rgba(136,192,208,0.5)]"
                      : "bg-nord-border group-hover:bg-nord-dim"
                  }
                `}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Custom Layers ── */}
      <div>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-px flex-1 bg-nord-border/50" />
          <span className="text-sm text-nord-dim tracking-wide select-none">
            لایه‌های سفارشی
          </span>
          <div className="h-px flex-1 bg-nord-border/50" />
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center justify-center gap-2 w-full mt-1.5 px-3 py-2.5 rounded-xl
                     border border-dashed border-nord-border text-sm text-nord-dim
                     hover:border-nord-frost2 hover:text-nord-frost2 hover:bg-nord-frost4/5
                     transition-all duration-200 cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          ایجاد لایه جدید
        </button>

        {customLayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-nord-border"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-nord-dim">هنوز لایه‌ای نساختید</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 mt-2">
            {customLayers.map((layer) => {
              const isHovered = hoveredCustom === layer.id;
              return (
                <div
                  key={layer.id}
                  onMouseEnter={() => setHoveredCustom(layer.id)}
                  onMouseLeave={() => setHoveredCustom(null)}
                  className={`
                    relative flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base
                    transition-all duration-200
                    ${
                      layer.visible
                        ? "bg-nord-card/80 text-nord-text"
                        : "text-nord-dim"
                    }
                    hover:bg-nord-hover/60
                  `}
                >
                  <span
                    className={`
                      w-3.5 h-3.5 rounded transition-all duration-200 flex-shrink-0
                      ${layer.visible ? "opacity-100" : "opacity-40"}
                    `}
                    style={{
                      backgroundColor: layer.color,
                      boxShadow: layer.visible
                        ? `0 0 8px ${layer.color}40`
                        : "none",
                    }}
                  />

                  <button
                    onClick={() => onToggleCustom(layer.id)}
                    className="flex-1 text-right truncate transition-colors hover:text-nord-frost2"
                  >
                    {layer.name}
                    <span className="text-xs text-nord-dim mr-2 tabular-nums">
                      ({layer.features.length})
                    </span>
                  </button>

                  <button
                    onClick={() => onRemoveCustom(layer.id)}
                    className={`
                      flex items-center justify-center w-7 h-7 rounded-lg
                      text-nord-red/70 hover:text-nord-red hover:bg-nord-red/10
                      transition-all duration-200 cursor-pointer
                      ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"}
                    `}
                    title="حذف لایه"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
