import type { BaseLayerId, FeatureCollection } from '../types/gis'
import { iranCityLayer, iranStateLayer } from '../data/iranBoundaries'

export const DEFAULT_IRAN_CENTER: [number, number] = [32.4279, 53.688]
export const DRAW_CREATED_EVENT = 'draw:created'

export const BASE_LAYER_DATA: Record<BaseLayerId, FeatureCollection> = {
  city: iranCityLayer,
  state: iranStateLayer,
}

export const BASE_LAYER_STYLE: Record<BaseLayerId, Record<string, string | number>> = {
  city: {
    color: '#de5d25',
    fillColor: '#de5d25',
    fillOpacity: 0.17,
    weight: 2,
  },
  state: {
    color: '#1f6da8',
    fillColor: '#1f6da8',
    fillOpacity: 0.12,
    weight: 2.2,
  },
}

export const BASE_LAYER_LABEL: Record<BaseLayerId, string> = {
  city: 'شهر',
  state: 'استان',
}
