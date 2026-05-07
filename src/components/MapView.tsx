import { useMap } from '../hooks/useMap'
import type { UseMapParams } from '../hooks/useMap'

export function MapView(props: UseMapParams) {
  const containerRef = useMap(props)

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    />
  )
}
