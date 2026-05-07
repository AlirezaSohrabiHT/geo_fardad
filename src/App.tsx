import { useState, useCallback } from "react";
import type {
  BaseLayerId,
  CustomLayer,
  DrawingMeta,
  GisFeature,
  SelectedFeature,
} from "./types/gis";
import { Toolbar } from "./components/Toolbar";
import { MapView } from "./components/MapView";
import { FeatureInfo } from "./components/FeatureInfo";
import { LayerCreator } from "./components/LayerCreator";
import { DrawingForm } from "./components/DrawingForm";
import "./index.css";

function App() {
  const [baseLayerActive, setBaseLayerActive] = useState<
    Record<BaseLayerId, boolean>
  >({
    city: true,
    state: false,
  });
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature>(null);
  const [drawingMeta, setDrawingMeta] = useState<DrawingMeta>({
    targetLayerId: "",
    featureName: "",
    featureFields: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [layerCreatorOpen, setLayerCreatorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleDrawCreated = useCallback(
    (feature: GisFeature, layerId: string, _layerName: string) => {
      setCustomLayers((prev) =>
        prev.map((l) =>
          l.id === layerId
            ? { ...l, visible: true, features: [...l.features, feature] }
            : l
        )
      );
      setSelectedFeature({
        properties: feature.properties,
        geometryType: feature.geometry.type,
      });
      setDrawingMeta((prev) => ({
        ...prev,
        featureName: "",
        featureFields: "",
      }));
      setFormError(null);
    },
    []
  );

  const handleToggleBase = (id: BaseLayerId) => {
    setBaseLayerActive((prev) => ({ ...prev, [id]: !prev[id] }));
    setSelectedFeature((prev) =>
      prev?.properties.layer === id ? null : prev
    );
  };

  const handleToggleCustom = (id: string) => {
    setCustomLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleRemoveCustom = (id: string) => {
    setCustomLayers((prev) => prev.filter((l) => l.id !== id));
    if (drawingMeta.targetLayerId === id) {
      setDrawingMeta((prev) => ({ ...prev, targetLayerId: "" }));
    }
  };

  const handleCreateLayer = (name: string, color: string) => {
    if (customLayers.some((l) => l.name === name)) {
      setFormError("لایه با این نام از قبل وجود دارد.");
      return;
    }
    const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCustomLayers((prev) => [
      ...prev,
      { id, name, color, visible: true, features: [] },
    ]);
    setDrawingMeta((prev) => ({ ...prev, targetLayerId: id }));
    setFormError(null);
    setLayerCreatorOpen(false);
  };

  return (
    <div dir="rtl" className="flex h-screen w-screen overflow-hidden bg-nord-bg">
      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col bg-nord-sidebar border-l border-nord-border
          transition-all duration-300 ease-in-out z-20 order-2 flex-shrink-0
          ${sidebarOpen ? "w-80" : "w-0 overflow-hidden"}
        `}
      >
        <Toolbar
          baseLayerActive={baseLayerActive}
          onToggleBase={handleToggleBase}
          customLayers={customLayers}
          onToggleCustom={handleToggleCustom}
          onRemoveCustom={handleRemoveCustom}
          onOpenCreate={() => setLayerCreatorOpen(true)}
        />
        <DrawingForm
          meta={drawingMeta}
          onChange={setDrawingMeta}
          customLayers={customLayers}
          error={formError}
        />
        {selectedFeature && (
          <FeatureInfo
            feature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 order-1 min-w-0">
        {/* Topbar */}
        <header
          className="flex items-center justify-between h-14 px-5 bg-nord-sidebar
                      border-b border-nord-border z-10 flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            {/* logo / brand */}
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-nord-frost3/20 to-nord-frost4/20
                          flex items-center justify-center"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-nord-frost2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-nord-text leading-tight">
                سامانه GIS
              </h1>
              {/* <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-nord-green animate-pulse" />
                <span className="text-xs text-nord-dim">آنلاین</span>
              </div> */}
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center gap-2">
            {/* coordinates badge */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg
                          bg-nord-card/60 border border-nord-border/50 text-xs text-nord-dim font-mono"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-nord-frost3"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              35.70°N, 51.40°E
            </div>

            {/* toggle sidebar */}
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-nord-muted
                         hover:bg-nord-hover hover:text-nord-text transition-all duration-200
                         border border-transparent hover:border-nord-border/50 cursor-pointer"
            >
              {sidebarOpen ? "بستن پنل" : "باز کردن پنل"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {sidebarOpen ? (
                  <path d="M15 18l-6-6 6-6" />
                ) : (
                  <path d="M9 18l6-6-6-6" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapView
            baseLayerActive={baseLayerActive}
            customLayers={customLayers}
            drawingMeta={drawingMeta}
            onSelectFeature={setSelectedFeature}
            onDrawCreated={handleDrawCreated}
            onDrawError={setFormError}
          />
        </div>
      </div>

      {/* ── Layer Creator Modal — uses Portal, rendered outside this DOM tree ── */}
      <LayerCreator
        open={layerCreatorOpen}
        onClose={() => setLayerCreatorOpen(false)}
        onCreate={handleCreateLayer}
      />
    </div>
  );
}

export default App;
