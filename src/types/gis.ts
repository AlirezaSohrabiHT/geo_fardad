export type BaseLayerId = "city" | "state";
export type LayerId = BaseLayerId | "custom";

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

export type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type LineGeometry = {
  type: "LineString";
  coordinates: number[][];
};

export type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type GisGeometry =
  | PointGeometry
  | PolygonGeometry
  | MultiPolygonGeometry
  | LineGeometry;

export type FeatureProperties = {
  id: string;
  name_local: string;
  layer: LayerId;
  province?: string;
  city_code?: number;
  province_code?: number;
  city_count?: number;
  custom_layer_id?: string;
  custom_layer_name?: string;
  custom_fields?: Record<string, string>;
  circle_radius_m?: number;
};

export type GisFeature = {
  type: "Feature";
  properties: FeatureProperties;
  geometry: GisGeometry;
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: GisFeature[];
};

export type SelectedFeature = {
  properties: FeatureProperties;
  geometryType: GisGeometry["type"];
} | null;

export type CustomLayer = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  features: GisFeature[];
};

export type DrawingMeta = {
  targetLayerId: string;
  featureName: string;
  featureFields: string;
};

// Leaflet abstraction types
export type LeafletClickLayer = {
  bindPopup: (content: string) => void;
  on: (eventName: "click", handler: () => void) => void;
};

export type LeafletGeoJsonLayer = {
  addTo: (map: LeafletMapInstance) => LeafletGeoJsonLayer;
  remove: () => void;
  getBounds?: () => unknown;
};

export type LeafletFeatureGroup = {
  addTo: (map: LeafletMapInstance) => LeafletFeatureGroup;
  clearLayers: () => void;
};

export type LeafletDrawControl = Record<string, unknown>;

export type LeafletMapInstance = {
  setView: (center: [number, number], zoom: number) => LeafletMapInstance;
  fitBounds: (bounds: unknown, options?: { padding: [number, number] }) => void;
  addControl: (control: LeafletDrawControl) => void;
  removeControl: (control: LeafletDrawControl) => void;
  on: (eventName: string, handler: (event: unknown) => void) => void;
  off: (eventName: string, handler: (event: unknown) => void) => void;
  remove: () => void;
};

export type LeafletCreatedLayer = {
  toGeoJSON: () => {
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  };
};

export type LeafletDrawCreatedEvent = {
  layerType?: string;
  layer?: LeafletCreatedLayer;
};

export type LeafletNamespace = {
  map: (
    container: HTMLElement,
    options?: { zoomControl?: boolean },
  ) => LeafletMapInstance;
  tileLayer: (
    urlTemplate: string,
    options: { attribution: string; maxZoom: number },
  ) => { addTo: (map: LeafletMapInstance) => void };
  geoJSON: (
    data: FeatureCollection,
    options: {
      style: (feature: GisFeature) => Record<string, string | number>;
      onEachFeature: (feature: GisFeature, layer: LeafletClickLayer) => void;
    },
  ) => LeafletGeoJsonLayer;
  featureGroup: () => LeafletFeatureGroup;
  Control: {
    Draw: new (options: {
      position?: "topleft" | "topright" | "bottomleft" | "bottomright";
      draw: {
        polygon: boolean;
        polyline: boolean;
        rectangle: boolean;
        circle: boolean;
        marker: boolean;
        circlemarker: boolean;
      };
      edit: {
        featureGroup: LeafletFeatureGroup;
        edit: boolean;
        remove: boolean;
      };
    }) => LeafletDrawControl;
  };
};

declare global {
  interface Window {
    L: LeafletNamespace;
  }
}
