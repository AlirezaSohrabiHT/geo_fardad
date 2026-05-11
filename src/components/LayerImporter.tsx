import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { WorkBook } from "xlsx";
import type { GisFeature } from "../types/gis";
import { CUSTOM_LAYER_PALETTE } from "../constants/layers";
import { buildPointFeatures, loadWorkbook, readSheet } from "../utils/xlsx";

type ImportPayload = {
  name: string;
  color: string;
  features: GisFeature[];
  skippedRowCount: number;
  sourceFileName: string;
};

interface Props {
  open: boolean;
  existingLayerNames: string[];
  onClose: () => void;
  onImport: (payload: ImportPayload) => { ok: boolean; message?: string };
}

const defaultColor = CUSTOM_LAYER_PALETTE[5] || CUSTOM_LAYER_PALETTE[0];

export function LayerImporter({
  open,
  existingLayerNames,
  onClose,
  onImport,
}: Props) {
  const workbookRef = useRef<WorkBook | null>(null);
  const [color, setColor] = useState(defaultColor);
  const [layerName, setLayerName] = useState("");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [latitudeColumn, setLatitudeColumn] = useState("");
  const [longitudeColumn, setLongitudeColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    workbookRef.current = null;
    setColor(defaultColor);
    setLayerName("");
    setFileName("");
    setSheetNames([]);
    setSelectedSheet("");
    setHeaders([]);
    setRows([]);
    setLatitudeColumn("");
    setLongitudeColumn("");
    setNameColumn("");
    setBusy(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const applySheet = (workbook: WorkBook, sheetName: string) => {
    const parsed = readSheet(workbook, sheetName);

    setSelectedSheet(sheetName);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setLatitudeColumn(parsed.suggestedLatitudeColumn || "");
    setLongitudeColumn(parsed.suggestedLongitudeColumn || "");
    setNameColumn(parsed.suggestedNameColumn || "");

    if (!parsed.rows.length) {
      setError("شیت انتخاب‌شده ردیف قابل استفاده ندارد.");
      return;
    }

    if (!parsed.suggestedLatitudeColumn || !parsed.suggestedLongitudeColumn) {
      setError("ستون‌های طول و عرض جغرافیایی را از لیست پایین مشخص کنید.");
      return;
    }

    setError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const { workbook, sheetNames: nextSheetNames } = await loadWorkbook(file);
      const initialSheet = nextSheetNames[0];

      workbookRef.current = workbook;
      setFileName(file.name);
      setLayerName(getLayerNameFromFile(file.name));
      setSheetNames(nextSheetNames);

      applySheet(workbook, initialSheet);
    } catch (err) {
      workbookRef.current = null;
      setSheetNames([]);
      setHeaders([]);
      setRows([]);
      setSelectedSheet("");
      setLatitudeColumn("");
      setLongitudeColumn("");
      setNameColumn("");
      setError(
        err instanceof Error ? err.message : "خواندن فایل Excel ناموفق بود.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const handleSheetChange = (sheetName: string) => {
    const workbook = workbookRef.current;
    if (!workbook) return;
    applySheet(workbook, sheetName);
  };

  const handleImport = () => {
    const normalizedName = layerName.trim();

    if (!normalizedName) {
      setError("برای لایه یک نام وارد کنید.");
      return;
    }

    if (existingLayerNames.some((name) => name === normalizedName)) {
      setError("لایه‌ای با این نام از قبل وجود دارد.");
      return;
    }

    if (!rows.length) {
      setError("ابتدا فایل Excel را انتخاب کنید.");
      return;
    }

    if (!latitudeColumn || !longitudeColumn) {
      setError("ستون‌های مختصات را مشخص کنید.");
      return;
    }

    const result = buildPointFeatures({
      rows,
      latitudeColumn,
      longitudeColumn,
      nameColumn: nameColumn || undefined,
      layerName: normalizedName,
    });

    if (!result.features.length) {
      setError("هیچ نقطه معتبری برای نمایش روی نقشه پیدا نشد.");
      return;
    }

    const response = onImport({
      name: normalizedName,
      color,
      features: result.features,
      skippedRowCount: result.skippedRowCount,
      sourceFileName: fileName,
    });

    if (!response.ok) {
      setError(response.message || "ورود لایه انجام نشد.");
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") handleImport();
    if (event.key === "Escape") onClose();
  };

  const modal = (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
      />

      <div
        className="relative bg-nord-sidebar border border-nord-border rounded-2xl p-6
                   w-[420px] max-w-[calc(100vw-2rem)] shadow-[0_20px_60px_rgba(0,0,0,0.15)]
                   flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
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
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-nord-text">
              ورود لایه از Excel
            </h3>
            <p className="text-xs text-nord-dim mt-0.5">
              فایل بايد شامل نقاط با ستون‌های طول و عرض جغرافيايی باشد
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-nord-dim">فایل Excel</label>
          <label
            className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl
                       border border-dashed border-nord-border bg-nord-card/35
                       text-sm text-nord-muted hover:border-nord-frost2 hover:text-nord-text
                       transition-all duration-200 cursor-pointer"
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={busy}
            />
            <span className="truncate">
              {fileName || "انتخاب فایل .xlsx"}
            </span>
            <span className="text-xs text-nord-frost3">
              {busy ? "در حال خواندن..." : "مرور"}
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-nord-dim">نام لایه</label>
          <input
            type="text"
            value={layerName}
            onChange={(event) => {
              setLayerName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="مثلاً: شعب فروش"
            className="w-full text-sm"
          />
        </div>

        {sheetNames.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-nord-dim">شیت</label>
              <select
                value={selectedSheet}
                onChange={(event) => handleSheetChange(event.target.value)}
                className="text-sm"
              >
                {sheetNames.map((sheetName) => (
                  <option key={sheetName} value={sheetName}>
                    {sheetName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-nord-dim">رنگ لایه</label>
              <div className="flex flex-wrap gap-2.5 rounded-xl border border-nord-border bg-nord-card/35 px-3 py-2.5">
                {CUSTOM_LAYER_PALETTE.map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setColor(tone)}
                    className={`w-7 h-7 rounded-lg transition-all duration-150 cursor-pointer ${
                      color === tone
                        ? "ring-2 ring-nord-frost2 ring-offset-2 ring-offset-nord-sidebar scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{
                      backgroundColor: tone,
                      boxShadow: color === tone ? `0 4px 12px ${tone}40` : undefined,
                    }}
                    aria-label={`انتخاب رنگ ${tone}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {headers.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-nord-dim">ستون عرض</label>
                <select
                  value={latitudeColumn}
                  onChange={(event) => {
                    setLatitudeColumn(event.target.value);
                    if (event.target.value && longitudeColumn) setError(null);
                  }}
                  className="text-sm"
                >
                  <option value="">انتخاب ستون...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-nord-dim">ستون طول</label>
                <select
                  value={longitudeColumn}
                  onChange={(event) => {
                    setLongitudeColumn(event.target.value);
                    if (event.target.value && latitudeColumn) setError(null);
                  }}
                  className="text-sm"
                >
                  <option value="">انتخاب ستون...</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-nord-dim">ستون نام (اختياری)</label>
              <select
                value={nameColumn}
                onChange={(event) => {
                  setNameColumn(event.target.value);
                  if (error) setError(null);
                }}
                className="text-sm"
              >
                <option value="">بدون ستون نام</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-nord-border/60 bg-nord-card/50 px-3 py-2.5 text-xs text-nord-dim">
              <div className="flex items-center justify-between gap-3">
                <span>ردیف‌های خوانده‌شده</span>
                <span className="text-nord-text tabular-nums">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span>تعداد ستون‌ها</span>
                <span className="text-nord-text tabular-nums">{headers.length}</span>
              </div>
              <p className="mt-2 leading-relaxed text-[11px]">
                برای نمايش روی نقشه، مختصات بايد بر اساس WGS84 و در بازه طول/عرض جغرافيايی معمول باشد.
              </p>
            </div>
          </>
        )}

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

        <div className="flex gap-2.5 mt-1">
          <button
            onClick={handleImport}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-nord-frost4 text-white
                       hover:bg-nord-frost3 active:scale-[0.98] transition-all duration-150
                       shadow-sm hover:shadow-md cursor-pointer"
          >
            ورود لایه
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

  return createPortal(modal, document.body);
}

function getLayerNameFromFile(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "لایه واردشده";
}
