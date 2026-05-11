import gadmLevel1 from "./gadm41_IRN_1.json";
import gadmLevel2 from "./gadm41_IRN_2.json";

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

type GisGeometry = PolygonGeometry | MultiPolygonGeometry;

type FeatureProperties = {
  id: string;
  name_local: string;
  layer: "city" | "state" | "custom";
  province?: string;
  city_code?: number;
  province_code?: number;
  city_count?: number;
  custom_layer_id?: string;
  custom_layer_name?: string;
  custom_fields?: Record<string, string>;
};

type GisFeature = {
  type: "Feature";
  properties: FeatureProperties;
  geometry: GisGeometry;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GisFeature[];
};

// ===================== Province (State) Layer — GADM Level 1 =====================

const level1 = gadmLevel1 as unknown as GeoJSON.FeatureCollection;

export const iranStateLayer: FeatureCollection = {
  type: "FeatureCollection",
  features: level1.features.map((f, i) => ({
    type: "Feature" as const,
    properties: {
      id: `state-${i}`,
      name_local: f.properties?.NL_NAME_1 || f.properties?.NAME_1 || "",
      layer: "state" as const,
      province_code: i + 1,
    },
    geometry: f.geometry as GisGeometry,
  })),
};

// ===================== City (County) Layer — GADM Level 2 =====================

const level2 = gadmLevel2 as unknown as GeoJSON.FeatureCollection;

export const iranCityLayer: FeatureCollection = {
  type: "FeatureCollection",
  features: level2.features.map((f, i) => ({
    type: "Feature" as const,
    properties: {
      id: `city-${i}`,
      name_local: f.properties?.NL_NAME_2 || f.properties?.NAME_2 || "",
      layer: "city" as const,
      province: f.properties?.NL_NAME_1 || f.properties?.NAME_1 || "",
      city_code: i + 1,
    },
    geometry: f.geometry as GisGeometry,
  })),
};
