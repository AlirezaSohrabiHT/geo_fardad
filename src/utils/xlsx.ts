import { read, utils, type WorkBook, type WorkSheet } from 'xlsx'
import type { FeatureProperties, GisFeature, GisGeometry } from '../types/gis'

const LATITUDE_HEADERS = [
  'latitude',
  'lat',
  'y',
  'coordy',
  'ycoord',
  'centerlatitude',
  'centerlat',
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
  'centerlongitude',
  'centerlng',
  'centerlon',
  'طول',
  'طولجغرافیایی',
]

const WKT_HEADERS = [
  'geometrywkt',
  'wkt',
  'geometry',
  'geom',
]

const RADIUS_HEADERS = [
  'radiusm',
  'radius',
  'buffer',
  'distance',
  'meters',
  'meter',
  'شعاع',
  'شعاعمتر',
]

const GEOMETRY_TYPE_HEADERS = [
  'geometrytype',
  'geometrykind',
  'featuretype',
  'نوعهندسه',
  'نوععارضه',
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

export type ImportGeometryKind =
  | 'point'
  | 'line'
  | 'polygon'
  | 'circle'
  | 'mixed'
  | 'unknown'

export type ParsedWorkbook = {
  workbook: WorkBook
  sheetNames: string[]
}

export type ParsedSheet = {
  headers: string[]
  rows: SheetRow[]
  suggestedLatitudeColumn: string | null
  suggestedLongitudeColumn: string | null
  suggestedWktColumn: string | null
  suggestedRadiusColumn: string | null
  suggestedGeometryTypeColumn: string | null
  suggestedNameColumn: string | null
  suggestedGeometryKind: ImportGeometryKind
}

export type PointImportOptions = {
  rows: SheetRow[]
  latitudeColumn: string
  longitudeColumn: string
  nameColumn?: string
  layerName: string
}

export type WktImportOptions = {
  rows: SheetRow[]
  wktColumn: string
  nameColumn?: string
  layerName: string
  geometryKind: 'line' | 'polygon'
}

export type CircleImportOptions = {
  rows: SheetRow[]
  latitudeColumn: string
  longitudeColumn: string
  radiusColumn: string
  nameColumn?: string
  layerName: string
}

export type MixedImportOptions = {
  rows: SheetRow[]
  geometryTypeColumn: string
  latitudeColumn?: string
  longitudeColumn?: string
  wktColumn?: string
  radiusColumn?: string
  nameColumn?: string
  layerName: string
}

export type BuildFeatureResult = {
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

  return parseSheet(sheet, sheetName)
}

export function buildPointFeatures({
  rows,
  latitudeColumn,
  longitudeColumn,
  nameColumn,
  layerName,
}: PointImportOptions): BuildFeatureResult {
  const features: GisFeature[] = []
  let skippedRowCount = 0
  const baseId = Date.now()

  rows.forEach((row, index) => {
    const geometry = parsePointGeometry(row, latitudeColumn, longitudeColumn)

    if (!geometry) {
      skippedRowCount += 1
      return
    }

    features.push({
      type: 'Feature',
      properties: buildProperties({
        id: `imported-point-${baseId}-${index}`,
        name: resolveFeatureName(row, nameColumn, `نقطه ${features.length + 1}`),
        layerName,
        row,
      }),
      geometry,
    })
  })

  return {
    features,
    skippedRowCount,
  }
}

export function buildWktFeatures({
  rows,
  wktColumn,
  nameColumn,
  layerName,
  geometryKind,
}: WktImportOptions): BuildFeatureResult {
  const features: GisFeature[] = []
  let skippedRowCount = 0
  const baseId = Date.now()
  const fallbackName = geometryKind === 'line' ? 'خط' : 'چندضلعی'

  rows.forEach((row, index) => {
    const geometry = parseWktGeometry(row[wktColumn], geometryKind)

    if (!geometry) {
      skippedRowCount += 1
      return
    }

    features.push({
      type: 'Feature',
      properties: buildProperties({
        id: `imported-${geometryKind}-${baseId}-${index}`,
        name: resolveFeatureName(
          row,
          nameColumn,
          `${fallbackName} ${features.length + 1}`,
        ),
        layerName,
        row,
      }),
      geometry,
    })
  })

  return {
    features,
    skippedRowCount,
  }
}

export function buildCircleFeatures({
  rows,
  latitudeColumn,
  longitudeColumn,
  radiusColumn,
  nameColumn,
  layerName,
}: CircleImportOptions): BuildFeatureResult {
  const features: GisFeature[] = []
  let skippedRowCount = 0
  const baseId = Date.now()

  rows.forEach((row, index) => {
    const circle = parseCircleGeometry(
      row,
      latitudeColumn,
      longitudeColumn,
      radiusColumn,
    )

    if (!circle) {
      skippedRowCount += 1
      return
    }

    features.push({
      type: 'Feature',
      properties: buildProperties({
        id: `imported-circle-${baseId}-${index}`,
        name: resolveFeatureName(row, nameColumn, `دایره ${features.length + 1}`),
        layerName,
        row,
        circleRadiusM: circle.radius,
      }),
      geometry: circle.geometry,
    })
  })

  return {
    features,
    skippedRowCount,
  }
}

export function buildMixedFeatures({
  rows,
  geometryTypeColumn,
  latitudeColumn,
  longitudeColumn,
  wktColumn,
  radiusColumn,
  nameColumn,
  layerName,
}: MixedImportOptions): BuildFeatureResult {
  const features: GisFeature[] = []
  let skippedRowCount = 0
  const baseId = Date.now()

  rows.forEach((row, index) => {
    const rowGeometryKind = resolveRowGeometryKind(row[geometryTypeColumn])

    if (!rowGeometryKind) {
      skippedRowCount += 1
      return
    }

    let geometry: GisGeometry | null = null
    let circleRadiusM: number | undefined
    let fallbackName = `عارضه ${features.length + 1}`

    if (rowGeometryKind === 'point') {
      geometry = parsePointGeometry(row, latitudeColumn, longitudeColumn)
      fallbackName = `نقطه ${features.length + 1}`
    } else if (rowGeometryKind === 'circle') {
      const circle = parseCircleGeometry(
        row,
        latitudeColumn,
        longitudeColumn,
        radiusColumn,
      )

      if (circle) {
        geometry = circle.geometry
        circleRadiusM = circle.radius
      }
      fallbackName = `دایره ${features.length + 1}`
    } else if (rowGeometryKind === 'line') {
      geometry = wktColumn ? parseWktGeometry(row[wktColumn], 'line') : null
      fallbackName = `خط ${features.length + 1}`
    } else if (rowGeometryKind === 'polygon') {
      geometry = wktColumn ? parseWktGeometry(row[wktColumn], 'polygon') : null
      fallbackName = `چندضلعی ${features.length + 1}`
    }

    if (!geometry) {
      skippedRowCount += 1
      return
    }

    features.push({
      type: 'Feature',
      properties: buildProperties({
        id: `imported-mixed-${baseId}-${index}`,
        name: resolveFeatureName(row, nameColumn, fallbackName),
        layerName,
        row,
        circleRadiusM,
      }),
      geometry,
    })
  })

  return {
    features,
    skippedRowCount,
  }
}

function parseSheet(sheet: WorkSheet, sheetName: string): ParsedSheet {
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

  const suggestedLatitudeColumn = suggestHeader(headers, LATITUDE_HEADERS)
  const suggestedLongitudeColumn = suggestHeader(headers, LONGITUDE_HEADERS)
  const suggestedWktColumn = suggestHeader(headers, WKT_HEADERS)
  const suggestedRadiusColumn = suggestHeader(headers, RADIUS_HEADERS)
  const suggestedGeometryTypeColumn = suggestHeader(headers, GEOMETRY_TYPE_HEADERS)
  const suggestedNameColumn = suggestHeader(headers, NAME_HEADERS)

  return {
    headers,
    rows,
    suggestedLatitudeColumn,
    suggestedLongitudeColumn,
    suggestedWktColumn,
    suggestedRadiusColumn,
    suggestedGeometryTypeColumn,
    suggestedNameColumn,
    suggestedGeometryKind: detectGeometryKind({
      sheetName,
      rows,
      suggestedLatitudeColumn,
      suggestedLongitudeColumn,
      suggestedWktColumn,
      suggestedRadiusColumn,
      suggestedGeometryTypeColumn,
    }),
  }
}

function buildProperties({
  id,
  name,
  layerName,
  row,
  circleRadiusM,
}: {
  id: string
  name: string
  layerName: string
  row: SheetRow
  circleRadiusM?: number
}): FeatureProperties {
  const customFields = Object.entries(row).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const normalized = value.trim()
      if (normalized) acc[key] = normalized
      return acc
    },
    {},
  )

  return {
    id,
    name_local: name,
    layer: 'custom',
    custom_layer_name: layerName,
    custom_fields: Object.keys(customFields).length ? customFields : undefined,
    circle_radius_m: circleRadiusM,
  }
}

function resolveFeatureName(
  row: SheetRow,
  nameColumn: string | undefined,
  fallback: string,
): string {
  const label = nameColumn ? row[nameColumn]?.trim() : ''
  return label || fallback
}

function detectGeometryKind({
  sheetName,
  rows,
  suggestedLatitudeColumn,
  suggestedLongitudeColumn,
  suggestedWktColumn,
  suggestedRadiusColumn,
  suggestedGeometryTypeColumn,
}: {
  sheetName: string
  rows: SheetRow[]
  suggestedLatitudeColumn: string | null
  suggestedLongitudeColumn: string | null
  suggestedWktColumn: string | null
  suggestedRadiusColumn: string | null
  suggestedGeometryTypeColumn: string | null
}): ImportGeometryKind {
  if (suggestedGeometryTypeColumn) {
    return 'mixed'
  }

  if (
    suggestedRadiusColumn &&
    suggestedLatitudeColumn &&
    suggestedLongitudeColumn
  ) {
    return 'circle'
  }

  if (suggestedWktColumn) {
    const sample = rows
      .map((row) => row[suggestedWktColumn].trim())
      .find(Boolean)

    if (sample) {
      const sampleKind = detectWktKind(sample)
      if (sampleKind) return sampleKind
    }

    const normalizedSheet = normalizeHeader(sheetName)
    if (
      normalizedSheet.includes('polygon') ||
      normalizedSheet.includes('area') ||
      normalizedSheet.includes('zone') ||
      normalizedSheet.includes('ناحیه') ||
      normalizedSheet.includes('چندضلعی')
    ) {
      return 'polygon'
    }

    return 'line'
  }

  if (suggestedLatitudeColumn && suggestedLongitudeColumn) {
    return 'point'
  }

  return 'unknown'
}

function resolveRowGeometryKind(value: string): ImportGeometryKind | null {
  const normalized = normalizeHeader(value)

  if (!normalized) return null

  if (POINT_TYPE_VALUES.includes(normalized)) return 'point'
  if (LINE_TYPE_VALUES.includes(normalized)) return 'line'
  if (POLYGON_TYPE_VALUES.includes(normalized)) return 'polygon'
  if (CIRCLE_TYPE_VALUES.includes(normalized)) return 'circle'

  return null
}

const POINT_TYPE_VALUES = [
  'point',
  'points',
  'pt',
  'marker',
  'pin',
  'نقطه',
]

const LINE_TYPE_VALUES = [
  'line',
  'lines',
  'linestring',
  'polyline',
  'path',
  'route',
  'خط',
]

const POLYGON_TYPE_VALUES = [
  'polygon',
  'polygons',
  'multipolygon',
  'area',
  'zone',
  'boundary',
  'محدوده',
  'ناحیه',
  'چندضلعی',
]

const CIRCLE_TYPE_VALUES = [
  'circle',
  'circles',
  'buffer',
  'radius',
  'دایره',
]

function detectWktKind(value: string): 'line' | 'polygon' | null {
  const normalized = normalizeDigits(value).trim()

  if (/^LINESTRING\s*\(/i.test(normalized)) return 'line'
  if (/^POLYGON\s*\(\(/i.test(normalized)) return 'polygon'
  return null
}

function parsePointGeometry(
  row: SheetRow,
  latitudeColumn?: string,
  longitudeColumn?: string,
): GisGeometry | null {
  if (!latitudeColumn || !longitudeColumn) return null

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
    return null
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  }
}

function parseCircleGeometry(
  row: SheetRow,
  latitudeColumn?: string,
  longitudeColumn?: string,
  radiusColumn?: string,
): { geometry: GisGeometry; radius: number } | null {
  if (!radiusColumn) return null

  const geometry = parsePointGeometry(row, latitudeColumn, longitudeColumn)
  const radius = parseRadius(row[radiusColumn])

  if (!geometry || radius === null || radius <= 0) {
    return null
  }

  return {
    geometry,
    radius,
  }
}

function parseWktGeometry(
  value: string,
  geometryKind: 'line' | 'polygon',
): GisGeometry | null {
  const normalized = normalizeDigits(value).trim()

  if (geometryKind === 'line') {
    const coordinates = parseLineStringWkt(normalized)
    return coordinates ? { type: 'LineString', coordinates } : null
  }

  const coordinates = parsePolygonWkt(normalized)
  return coordinates ? { type: 'Polygon', coordinates } : null
}

function parseLineStringWkt(value: string): number[][] | null {
  if (!/^LINESTRING\s*\(/i.test(value)) return null

  const body = value
    .replace(/^LINESTRING\s*\(/i, '')
    .replace(/\)\s*$/i, '')

  const coordinates = parseWktPointList(body)
  return coordinates && coordinates.length >= 2 ? coordinates : null
}

function parsePolygonWkt(value: string): number[][][] | null {
  if (!/^POLYGON\s*\(\(/i.test(value)) return null

  const body = value
    .replace(/^POLYGON\s*\(\(/i, '')
    .replace(/\)\)\s*$/i, '')

  const rings = body
    .split(/\)\s*,\s*\(/)
    .map(parseWktPointList)
    .map((ring) => normalizeRing(ring))

  if (!rings.length || rings.some((ring) => ring === null)) return null
  return rings as number[][][]
}

function parseWktPointList(value: string): number[][] | null {
  const pairs = value
    .split(/\s*,\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (!pairs.length) return null

  const coordinates: number[][] = []

  for (const pair of pairs) {
    const [longitudeRaw, latitudeRaw] = pair.split(/\s+/)

    if (!longitudeRaw || !latitudeRaw) return null

    const longitude = parseCoordinate(longitudeRaw)
    const latitude = parseCoordinate(latitudeRaw)

    if (
      longitude === null ||
      latitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null
    }

    coordinates.push([longitude, latitude])
  }

  return coordinates
}

function normalizeRing(ring: number[][] | null): number[][] | null {
  if (!ring || ring.length < 3) return null

  const normalized = ring.map(([longitude, latitude]) => [longitude, latitude])
  const [first, last] = [normalized[0], normalized[normalized.length - 1]]

  if (first[0] !== last[0] || first[1] !== last[1]) {
    normalized.push([first[0], first[1]])
  }

  return normalized
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
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .trim()

  const normalized = normalizedDigits.includes('.')
    ? normalizedDigits.replace(/,/g, '')
    : normalizedDigits.replace(/,/g, '.')

  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRadius(value: string): number | null {
  const normalizedDigits = normalizeDigits(value)
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .trim()

  if (!normalizedDigits) return null

  let normalized = normalizedDigits

  if (normalizedDigits.includes('.') && normalizedDigits.includes(',')) {
    normalized = normalizedDigits.replace(/,/g, '')
  } else if (normalizedDigits.includes(',')) {
    const parts = normalizedDigits.split(',')
    const lastPart = parts[parts.length - 1] || ''
    normalized = /^\d{3}$/.test(lastPart)
      ? parts.join('')
      : normalizedDigits.replace(/,/g, '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}
