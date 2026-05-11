import type { GisGeometry } from '../types/gis'

const numberFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 2,
})

export function formatValue(value: number | string | undefined): string {
  if (typeof value === 'number') return numberFormatter.format(value)
  return value || 'نامشخص'
}

export function parseFieldLines(value: string): Record<string, string> {
  const fields: Record<string, string> = {}
  value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const sep = line.includes(':') ? line.indexOf(':') : line.indexOf('=')
      if (sep < 1) return
      const key = line.slice(0, sep).trim()
      const val = line.slice(sep + 1).trim()
      if (key) fields[key] = val || '---'
    })
  return fields
}

function isPointTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

export function normalizeLineCoordinates(value: unknown): number[][] | null {
  if (!Array.isArray(value)) return null
  const coords = value.filter(isPointTuple).map((p) => [p[0], p[1]])
  return coords.length >= 2 ? coords : null
}

export function normalizePolygonCoordinates(value: unknown): number[][][] | null {
  if (!Array.isArray(value) || !value.length) return null
  const raw = value[0]
  if (!Array.isArray(raw)) return null
  const ring = raw.filter(isPointTuple).map((p) => [p[0], p[1]])
  if (ring.length < 3) return null
  const [first, last] = [ring[0], ring[ring.length - 1]]
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]])
  return [ring]
}

export function geometryLabel(type: GisGeometry['type']): string {
  if (type === 'Point') return 'نقطه'
  if (type === 'LineString') return 'خط'
  return 'چندضلعی'
}
