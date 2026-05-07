import { useEffect, useRef } from 'react'
// @ts-ignore
import L from 'leaflet'
import 'leaflet-draw'
import type {
  BaseLayerId,
  CustomLayer,
  DrawingMeta,
  GisFeature,
  GisGeometry,
  SelectedFeature,
} from '../types/gis'
import {
  BASE_LAYER_DATA,
  BASE_LAYER_STYLE,
  DEFAULT_IRAN_CENTER,
  DRAW_CREATED_EVENT,
} from '../constants/map'
import { normalizeLineCoordinates, normalizePolygonCoordinates, parseFieldLines } from '../utils/geometry'

export type UseMapParams = {
  baseLayerActive: Record<BaseLayerId, boolean>
  customLayers: CustomLayer[]
  drawingMeta: DrawingMeta
  onSelectFeature: (feature: SelectedFeature) => void
  onDrawCreated: (feature: GisFeature, layerId: string, layerName: string) => void
  onDrawError: (message: string) => void
}

export function useMap({
  baseLayerActive,
  customLayers,
  drawingMeta,
  onSelectFeature,
  onDrawCreated,
  onDrawError,
}: UseMapParams) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseLayerRef = useRef<Record<BaseLayerId, L.GeoJSON | null>>({
    city: null,
    state: null,
  })
  const customLayerRef = useRef<Record<string, L.GeoJSON>>({})
  const drawGroupRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)

  const metaRef = useRef(drawingMeta)
  const layersRef = useRef(customLayers)
  useEffect(() => { metaRef.current = drawingMeta }, [drawingMeta])
  useEffect(() => { layersRef.current = customLayers }, [customLayers])

  // stable callback refs to avoid stale closures
  const onSelectRef = useRef(onSelectFeature)
  const onDrawCreatedRef = useRef(onDrawCreated)
  const onDrawErrorRef = useRef(onDrawError)
  useEffect(() => { onSelectRef.current = onSelectFeature }, [onSelectFeature])
  useEffect(() => { onDrawCreatedRef.current = onDrawCreated }, [onDrawCreated])
  useEffect(() => { onDrawErrorRef.current = onDrawError }, [onDrawError])

  // init map — runs once
  useEffect(() => {
    if (!containerRef.current) return

    // guard against double-init in Strict Mode
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, { zoomControl: true }).setView(DEFAULT_IRAN_CENTER, 5)
    const drawGroup = L.featureGroup().addTo(map)
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {},
        polyline: {},
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: { featureGroup: drawGroup, edit: false, remove: false },
    })

    L.tileLayer('https://map.exirfirm.com/tile/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.addControl(drawControl)

    const handleDraw = (e: L.LeafletEvent) => {
      const event = e as unknown as { layer?: L.Layer }
      const created = event.layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature } | undefined
      const meta = metaRef.current
      const snapshot = layersRef.current

      if (!created) { onDrawErrorRef.current('خطا در دریافت هندسه.'); return }
      if (!meta.targetLayerId) {
        onDrawErrorRef.current('ابتدا لایه مقصد را انتخاب کنید.')
        drawGroup.clearLayers()
        return
      }

      const target = snapshot.find((l) => l.id === meta.targetLayerId)
      if (!target) { onDrawErrorRef.current('لایه مقصد یافت نشد.'); drawGroup.clearLayers(); return }

      const geo = created.toGeoJSON().geometry
      if (!geo?.type) { onDrawErrorRef.current('هندسه معتبر نیست.'); drawGroup.clearLayers(); return }

      let geometry: GisGeometry | null = null
      if (geo.type === 'Polygon') {
        const c = normalizePolygonCoordinates((geo as GeoJSON.Polygon).coordinates)
        if (c) geometry = { type: 'Polygon', coordinates: c }
      } else if (geo.type === 'LineString') {
        const c = normalizeLineCoordinates((geo as GeoJSON.LineString).coordinates)
        if (c) geometry = { type: 'LineString', coordinates: c }
      }

      if (!geometry) {
        onDrawErrorRef.current('فقط Polygon و Polyline پشتیبانی می‌شود.')
        drawGroup.clearLayers()
        return
      }

      const fields = parseFieldLines(meta.featureFields)
      const label = meta.featureName.trim() || `مختصات${target.features.length + 1}`
      const feature: GisFeature = {
        type: 'Feature',
        properties: {
          id: `custom-feature-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name_local: label,
          layer: 'custom',
          custom_layer_id: target.id,
          custom_layer_name: target.name,
          custom_fields: fields,
        },
        geometry,
      }

      onDrawCreatedRef.current(feature, target.id, target.name)
      drawGroup.clearLayers()
    }

    map.on(DRAW_CREATED_EVENT, handleDraw)
    mapRef.current = map
    drawGroupRef.current = drawGroup
    drawControlRef.current = drawControl

    return () => {
      map.off(DRAW_CREATED_EVENT, handleDraw)
      if (drawControlRef.current) map.removeControl(drawControlRef.current)
      drawGroup.clearLayers()
      baseLayerRef.current.city?.remove()
      baseLayerRef.current.state?.remove()
      baseLayerRef.current = { city: null, state: null }
      Object.values(customLayerRef.current).forEach((l) => l.remove())
      customLayerRef.current = {}
      map.remove()
      mapRef.current = null
    }
  }, [])

  // sync base layers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    ;(['city', 'state'] as BaseLayerId[]).forEach((id) => {
      const active = baseLayerActive[id]
      const existing = baseLayerRef.current[id]

      if (active && !existing) {
        const layer = L.geoJSON(BASE_LAYER_DATA[id] as unknown as GeoJSON.FeatureCollection, {
          style: () => BASE_LAYER_STYLE[id],
          onEachFeature: (feature, lyr) => {
            const props = feature.properties as GisFeature['properties']
            const geoType = feature.geometry.type as GisGeometry['type']
            lyr.bindPopup(`<strong>${props.name_local}</strong>`)
            lyr.on('click', () =>
              onSelectRef.current({ properties: props, geometryType: geoType }),
            )
          },
        })
        layer.addTo(map)
        baseLayerRef.current[id] = layer
        map.fitBounds(layer.getBounds(), { padding: [18, 18] })
      }

      if (!active && existing) {
        existing.remove()
        baseLayerRef.current[id] = null
      }
    })
  }, [baseLayerActive])

  // sync custom layers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const store = customLayerRef.current
    Object.values(store).forEach((l) => l.remove())
    Object.keys(store).forEach((k) => delete store[k])

    customLayers.forEach((cl) => {
      if (!cl.visible || !cl.features.length) return

      const fc = { type: 'FeatureCollection' as const, features: cl.features }
      const layer = L.geoJSON(fc as unknown as GeoJSON.FeatureCollection, {
        style: (feature) => ({
          color: cl.color,
          fillColor: cl.color,
          fillOpacity: feature?.geometry.type === 'LineString' ? 0 : 0.2,
          weight: feature?.geometry.type === 'LineString' ? 3 : 2,
        }),
        onEachFeature: (feature, lyr) => {
          const props = feature.properties as GisFeature['properties']
          const geoType = feature.geometry.type as GisGeometry['type']
          lyr.bindPopup(`<strong>${props.name_local}</strong>`)
          lyr.on('click', () =>
            onSelectRef.current({ properties: props, geometryType: geoType }),
          )
        },
      })
      layer.addTo(map)
      store[cl.id] = layer
    })
  }, [customLayers])

  return containerRef
}
