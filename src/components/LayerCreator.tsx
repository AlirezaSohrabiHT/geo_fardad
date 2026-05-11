import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CUSTOM_LAYER_PALETTE } from "../constants/layers";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

const palette = CUSTOM_LAYER_PALETTE;

export function LayerCreator({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(palette[0]);
  const [shake, setShake] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setName("");
      setColor(palette[0]);
      setShake(false);
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = () => {
    if (!name.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onCreate(name.trim(), color);
    setName("");
    setColor(palette[0]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") onClose();
  };

  const modal = (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onKeyDown={handleKeyDown}
    >
      {/* backdrop — only covers map area visually */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
      />

      {/* modal card */}
      <div
        className={`
          relative bg-nord-sidebar border border-nord-border rounded-2xl p-6 w-[340px]
          shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col gap-4
          animate-in fade-in zoom-in-95 duration-200
          ${shake ? "animate-shake" : ""}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center
                     text-nord-dim hover:text-nord-text hover:bg-nord-hover transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* header */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-nord-frost4/15 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-nord-frost2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-nord-text">ایجاد لایه جدید</h3>
            <p className="text-xs text-nord-dim mt-0.5">نام و رنگ لایه را مشخص کنید</p>
          </div>
        </div>

        {/* name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-nord-dim">نام لایه</label>
          <input
            type="text"
            placeholder="مثلاً: پارک‌ها"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm"
            autoFocus
          />
        </div>

        {/* color picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-nord-dim">رنگ لایه</label>
          <div className="flex flex-wrap gap-2.5">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`
                  w-8 h-8 rounded-xl transition-all duration-150 flex-shrink-0 cursor-pointer
                  ${
                    color === c
                      ? "ring-2 ring-nord-frost2 ring-offset-2 ring-offset-nord-sidebar scale-110 shadow-md"
                      : "hover:scale-105 hover:shadow-sm"
                  }
                `}
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 4px 12px ${c}40` : undefined,
                }}
                aria-label={`انتخاب رنگ ${c}`}
              />
            ))}
          </div>
        </div>

        {/* preview */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-nord-card/60 border border-nord-border/50">
          <span
            className="w-4 h-4 rounded-md flex-shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}30`,
            }}
          />
          <span className="text-sm text-nord-text truncate">
            {name.trim() || "پیش‌نمایش لایه"}
          </span>
          <span className="text-xs text-nord-dim mr-auto">(0)</span>
        </div>

        {/* actions */}
        <div className="flex gap-2.5 mt-1">
          <button
            onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-nord-frost4 text-white
                       hover:bg-nord-frost3 active:scale-[0.98] transition-all duration-150
                       shadow-sm hover:shadow-md cursor-pointer"
          >
            ایجاد لایه
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-nord-muted border border-nord-border
                       hover:bg-nord-hover hover:text-nord-text active:scale-[0.98]
                       transition-all duration-150 cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );

  // Portal: render outside the component tree to avoid z-index/backdrop issues
  return createPortal(modal, document.body);
}
