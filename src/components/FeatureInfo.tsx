import type { SelectedFeature } from '../types/gis'
import { geometryLabel } from '../utils/geometry'

interface Props {
  feature: SelectedFeature
  onClose: () => void
}

export function FeatureInfo({ feature, onClose }: Props) {
  if (!feature) return null

  const { properties, geometryType } = feature

  const rows = Object.entries(properties).filter(
    ([k]) => !['layer', 'custom_layer_id', 'custom_fields'].includes(k),
  )
  const customFieldRows = Object.entries(properties.custom_fields || {})
  const featureLabel = properties.circle_radius_m
    ? 'دایره'
    : geometryLabel(geometryType)

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-nord-border flex-shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-nord-dim tracking-wide">اطلاعات عارضه</h3>
        <button
          onClick={onClose}
          className="text-nord-dim hover:text-nord-red transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      <div className="bg-nord-card rounded-lg border border-nord-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-nord-border bg-nord-hover/30">
          <span className="text-xs text-nord-frost2">{featureLabel}</span>
        </div>
        <div className="divide-y divide-nord-border">
          {rows.map(([key, val]) => (
            <div key={key} className="flex items-center px-3 py-1.5 text-xs">
              <span className="text-nord-dim w-24 flex-shrink-0">{key}</span>
              <span className="text-nord-text truncate">{String(val ?? '—')}</span>
            </div>
          ))}
          {customFieldRows.length > 0 && (
            <div className="px-3 py-2">
              <div className="text-[11px] text-nord-dim mb-2">فیلدهای فایل</div>
              <div className="space-y-1.5">
                {customFieldRows.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="text-nord-dim w-24 flex-shrink-0 truncate">
                      {key}
                    </span>
                    <span className="text-nord-text truncate">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
