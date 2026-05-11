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
import {
  buildCircleFeatures,
  buildMixedFeatures,
  buildPointFeatures,
  buildWktFeatures,
  loadWorkbook,
  readSheet,
  type ImportGeometryKind,
  type ParsedSheet,
} from "../utils/xlsx";

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

type GeometryKind = Exclude<ImportGeometryKind, "unknown">;

const defaultColor = CUSTOM_LAYER_PALETTE[5] || CUSTOM_LAYER_PALETTE[0];
const templateHref = "/templates/layer-geometries-template.xlsx";

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
  const [geometryKind, setGeometryKind] = useState<GeometryKind>("point");
  const [detectedGeometryKind, setDetectedGeometryKind] =
    useState<ImportGeometryKind>("unknown");
  const [latitudeColumn, setLatitudeColumn] = useState("");
  const [longitudeColumn, setLongitudeColumn] = useState("");
  const [wktColumn, setWktColumn] = useState("");
  const [radiusColumn, setRadiusColumn] = useState("");
  const [geometryTypeColumn, setGeometryTypeColumn] = useState("");
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
    setGeometryKind("point");
    setDetectedGeometryKind("unknown");
    setLatitudeColumn("");
    setLongitudeColumn("");
    setWktColumn("");
    setRadiusColumn("");
    setGeometryTypeColumn("");
    setNameColumn("");
    setBusy(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const applySheet = (workbook: WorkBook, sheetName: string) => {
    const parsed = readSheet(workbook, sheetName);
    const initialGeometryKind = getInitialGeometryKind(parsed);

    setSelectedSheet(sheetName);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setDetectedGeometryKind(parsed.suggestedGeometryKind);
    setGeometryKind(initialGeometryKind);
    setLatitudeColumn(parsed.suggestedLatitudeColumn || "");
    setLongitudeColumn(parsed.suggestedLongitudeColumn || "");
    setWktColumn(parsed.suggestedWktColumn || "");
    setRadiusColumn(parsed.suggestedRadiusColumn || "");
    setGeometryTypeColumn(parsed.suggestedGeometryTypeColumn || "");
    setNameColumn(parsed.suggestedNameColumn || "");

    if (!parsed.rows.length) {
      setError("شیت انتخاب‌شده ردیف قابل استفاده ندارد.");
      return;
    }

    if (parsed.suggestedGeometryKind === "unknown") {
      setError(
        "نوع هندسه به صورت خودکار تشخیص داده نشد؛ از پایین نوع و ستون‌ها را مشخص کنید.",
      );
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
      setGeometryKind("point");
      setDetectedGeometryKind("unknown");
      setLatitudeColumn("");
      setLongitudeColumn("");
      setWktColumn("");
      setRadiusColumn("");
      setGeometryTypeColumn("");
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

    let result;

    if (geometryKind === "mixed") {
      if (!geometryTypeColumn) {
        setError("در حالت ترکیبی باید ستون نوع هندسه را مشخص کنید.");
        return;
      }

      result = buildMixedFeatures({
        rows,
        geometryTypeColumn,
        latitudeColumn: latitudeColumn || undefined,
        longitudeColumn: longitudeColumn || undefined,
        wktColumn: wktColumn || undefined,
        radiusColumn: radiusColumn || undefined,
        nameColumn: nameColumn || undefined,
        layerName: normalizedName,
      });
    } else if (geometryKind === "point") {
      if (!latitudeColumn || !longitudeColumn) {
        setError("ستون‌های عرض و طول جغرافیایی را مشخص کنید.");
        return;
      }

      result = buildPointFeatures({
        rows,
        latitudeColumn,
        longitudeColumn,
        nameColumn: nameColumn || undefined,
        layerName: normalizedName,
      });
    } else if (geometryKind === "circle") {
      if (!latitudeColumn || !longitudeColumn || !radiusColumn) {
        setError("برای دایره باید ستون‌های مرکز و شعاع را مشخص کنید.");
        return;
      }

      result = buildCircleFeatures({
        rows,
        latitudeColumn,
        longitudeColumn,
        radiusColumn,
        nameColumn: nameColumn || undefined,
        layerName: normalizedName,
      });
    } else {
      if (!wktColumn) {
        setError("ستون WKT را مشخص کنید.");
        return;
      }

      result = buildWktFeatures({
        rows,
        wktColumn,
        nameColumn: nameColumn || undefined,
        layerName: normalizedName,
        geometryKind,
      });
    }

    if (!result.features.length) {
      setError(
        `هیچ ${getGeometryLabel(geometryKind)} معتبری برای نمایش روی نقشه پیدا نشد.`,
      );
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

  const showCoordinateSelectors =
    geometryKind === "point" || geometryKind === "circle" || geometryKind === "mixed";
  const showWktSelector =
    geometryKind === "line" || geometryKind === "polygon" || geometryKind === "mixed";
  const showRadiusSelector =
    geometryKind === "circle" || geometryKind === "mixed";

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
                   w-[460px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto
                   shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col gap-4
                   animate-in fade-in zoom-in-95 duration-200"
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
              می‌توانید همه هندسه‌ها را در یک شیت با ستون نوع هندسه وارد کنید
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-nord-dim">فایل Excel</label>
            <a
              href={templateHref}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-nord-border
                         px-2.5 py-1.5 text-[11px] text-nord-dim hover:border-nord-frost2
                         hover:text-nord-frost2 hover:bg-nord-frost4/5 transition-all duration-200"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              دانلود قالب
            </a>
          </div>

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
            <span className="truncate">{fileName || "انتخاب فایل .xlsx"}</span>
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
            placeholder="مثلاً: لایه ترکیبی"
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
                      boxShadow:
                        color === tone ? `0 4px 12px ${tone}40` : undefined,
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-nord-dim">حالت ورود</label>
              <select
                value={geometryKind}
                onChange={(event) => {
                  setGeometryKind(event.target.value as GeometryKind);
                  if (error) setError(null);
                }}
                className="text-sm"
              >
                <option value="mixed">ترکیبی با ستون نوع هندسه</option>
                <option value="point">فقط نقطه</option>
                <option value="line">فقط خط</option>
                <option value="polygon">فقط چندضلعی</option>
                <option value="circle">فقط دایره</option>
              </select>
            </div>

            {geometryKind === "mixed" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-nord-dim">ستون نوع هندسه</label>
                <select
                  value={geometryTypeColumn}
                  onChange={(event) => {
                    setGeometryTypeColumn(event.target.value);
                    if (error) setError(null);
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
            )}

            {showCoordinateSelectors && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-nord-dim">
                    {geometryKind === "circle"
                      ? "ستون عرض مرکز"
                      : geometryKind === "mixed"
                        ? "ستون عرض/عرض مرکز"
                        : "ستون عرض"}
                  </label>
                  <select
                    value={latitudeColumn}
                    onChange={(event) => {
                      setLatitudeColumn(event.target.value);
                      if (error) setError(null);
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
                  <label className="text-xs text-nord-dim">
                    {geometryKind === "circle"
                      ? "ستون طول مرکز"
                      : geometryKind === "mixed"
                        ? "ستون طول/طول مرکز"
                        : "ستون طول"}
                  </label>
                  <select
                    value={longitudeColumn}
                    onChange={(event) => {
                      setLongitudeColumn(event.target.value);
                      if (error) setError(null);
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
            )}

            {showWktSelector && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-nord-dim">
                  {geometryKind === "mixed"
                    ? "ستون WKT برای خط/چندضلعی"
                    : "ستون WKT"}
                </label>
                <select
                  value={wktColumn}
                  onChange={(event) => {
                    setWktColumn(event.target.value);
                    if (error) setError(null);
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
            )}

            {showRadiusSelector && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-nord-dim">
                  {geometryKind === "mixed"
                    ? "ستون شعاع برای دایره (متر)"
                    : "ستون شعاع (متر)"}
                </label>
                <select
                  value={radiusColumn}
                  onChange={(event) => {
                    setRadiusColumn(event.target.value);
                    if (error) setError(null);
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
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-nord-dim">ستون نام (اختیاری)</label>
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
                <span>تشخیص خودکار</span>
                <span className="text-nord-text">
                  {getGeometryLabel(detectedGeometryKind)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span>حالت انتخاب‌شده</span>
                <span className="text-nord-text">{getGeometryLabel(geometryKind)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span>ردیف‌های خوانده‌شده</span>
                <span className="text-nord-text tabular-nums">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span>تعداد ستون‌ها</span>
                <span className="text-nord-text tabular-nums">{headers.length}</span>
              </div>
              <p className="mt-2 leading-relaxed text-[11px]">
                {geometryKind === "mixed" &&
                  "در حالت ترکیبی، هر ردیف با مقدار ستون نوع هندسه مثل point، line، polygon یا circle تفسیر می‌شود. point و circle از مختصات، line و polygon از WKT استفاده می‌کنند."}
                {geometryKind === "point" &&
                  "برای نقطه، مختصات باید بر اساس WGS84 و به صورت عرض/طول جغرافیایی باشند."}
                {geometryKind === "line" &&
                  "برای خط از WKT با فرمت LINESTRING(...) استفاده کنید و در هر جفت مختصات، ابتدا طول سپس عرض را بنویسید."}
                {geometryKind === "polygon" &&
                  "برای چندضلعی از WKT با فرمت POLYGON((...)) استفاده کنید و حلقه بیرونی را بسته نگه دارید."}
                {geometryKind === "circle" &&
                  "برای دایره، مرکز را با عرض/طول جغرافیایی و شعاع را به متر وارد کنید. دایره در فرانت‌اند با Point + radius رندر می‌شود."}
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

function getInitialGeometryKind(parsed: ParsedSheet): GeometryKind {
  if (parsed.suggestedGeometryKind !== "unknown") {
    return parsed.suggestedGeometryKind;
  }

  if (parsed.suggestedGeometryTypeColumn) return "mixed";
  if (parsed.suggestedRadiusColumn) return "circle";
  if (parsed.suggestedWktColumn) return "line";
  return "point";
}

function getGeometryLabel(kind: ImportGeometryKind) {
  if (kind === "mixed") return "ترکیبی";
  if (kind === "point") return "نقطه";
  if (kind === "line") return "خط";
  if (kind === "polygon") return "چندضلعی";
  if (kind === "circle") return "دایره";
  return "نامشخص";
}
