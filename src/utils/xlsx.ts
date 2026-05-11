import { read, utils, type WorkBook, type WorkSheet } from 'xlsx'
import type { GisFeature } from '../types/gis'

const LATITUDE_HEADERS = [
  'latitude',
  'lat',
  'y',
  'coordy',
  'ycoord',
  'عرض',
  'عرضجغرافیایی',
]

const LONGITUDE_HEADERS = [
  'longitude',
  'lng',
  'lon',
  'long',
  'x',
  'coordx',
  'xcoord',
  'طول',
  'طولجغرافیایی',
]

const NAME_HEADERS = [
  'name',
  'title',
  'label',
  'site',
  'location',
  'point',
  'نام',
  'عنوان',
]

type SheetRow = Record<string, string>

export type ParsedWorkbook = {
  workbook: WorkBook
  sheetNames: string[]
}

export type ParsedSheet = {
  headers: string[]
  rows: SheetRow[]
  suggestedLatitudeColumn: string | null
  suggestedLongitudeColumn: string | null
  suggestedNameColumn: string | null
}

export type PointImportOptions = {
  rows: SheetRow[]
  latitudeColumn: string
  longitudeColumn: string
  nameColumn?: string
  layerName: string
}

export type BuildPointFeaturesResult = {
  features: GisFeature[]
  skippedRowCount: number
}

export async function loadWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer, { type: 'array', cellDates: false })

  if (!workbook.SheetNames.length) {
    throw new Error('فایل Excel هیچ شیتی ندارد.')
  }

  return {
    workbook,
    sheetNames: workbook.SheetNames,
  }
}

export function readSheet(workbook: WorkBook, sheetName: string): ParsedSheet {
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    throw new Error('شیت انتخاب‌شده پیدا نشد.')
  }

  return parseSheet(sheet)
}

export function buildPointFeatures({
  rows,
  latitudeColumn,
  longitudeColumn,
  nameColumn,
  layerName,
}: PointImportOptions): BuildPointFeaturesResult {
  const features: GisFeature[] = []
  let skippedRowCount = 0
  const baseId = Date.now()

  rows.forEach((row, index) => {
    const latitude = parseCoordinate(row[latitudeColumn])
    const longitude = parseCoordinate(row[longitudeColumn])

    if (
      latitude === null ||
      longitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      skippedRowCount += 1
      return
    }

    const label = nameColumn ? row[nameColumn]?.trim() : ''
    const customFields = Object.entries(row).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalized = value.trim()
        if (normalized) acc[key] = normalized
        return acc
      },
      {},
    )

    features.push({
      type: 'Feature',
      properties: {
        id: `imported-point-${baseId}-${index}`,
        name_local: label || `نقطه ${features.length + 1}`,
        layer: 'custom',
        custom_layer_name: layerName,
        custom_fields: Object.keys(customFields).length ? customFields : undefined,
      },
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    })
  })

  return {
    features,
    skippedRowCount,
  }
}

function parseSheet(sheet: WorkSheet): ParsedSheet {
  const matrix = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  const [headerRow = [], ...dataRows] = matrix
  const headers = makeHeaders(headerRow)

  const rows = dataRows
    .map((values) =>
      headers.reduce<SheetRow>((acc, header, index) => {
        acc[header] = toCellString(values[index])
        return acc
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value.trim().length > 0))

  return {
    headers,
    rows,
    suggestedLatitudeColumn: suggestHeader(headers, LATITUDE_HEADERS),
    suggestedLongitudeColumn: suggestHeader(headers, LONGITUDE_HEADERS),
    suggestedNameColumn: suggestHeader(headers, NAME_HEADERS),
  }
}

function makeHeaders(values: unknown[]): string[] {
  const counts = new Map<string, number>()

  return values.map((value, index) => {
    const raw = toCellString(value).trim() || `column_${index + 1}`
    const seen = counts.get(raw) || 0
    counts.set(raw, seen + 1)
    return seen ? `${raw}_${seen + 1}` : raw
  })
}

function suggestHeader(headers: string[], candidates: string[]): string | null {
  const normalizedHeaders = headers.map((header) => ({
    header,
    normalized: normalizeHeader(header),
  }))

  for (const candidate of candidates) {
    const exact = normalizedHeaders.find(
      (entry) => entry.normalized === normalizeHeader(candidate),
    )

    if (exact) return exact.header
  }

  for (const candidate of candidates) {
    const partial = normalizedHeaders.find((entry) =>
      entry.normalized.includes(normalizeHeader(candidate)),
    )

    if (partial) return partial.header
  }

  return null
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()]+/g, '')
}

function toCellString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function parseCoordinate(value: string): number | null {
  const normalizedDigits = normalizeDigits(value)
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, '')
    .trim()

  const normalized = normalizedDigits.includes('.')
    ? normalizedDigits.replace(/,/g, '')
    : normalizedDigits.replace(/,/g, '.')

  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}
