import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import InputDropdown from '../../component/InputDropdown/InputDropdown';
import RoadAttributesForm from '../../component/Smoothening/RoadAttributesForm';
import SmoothingForm from '../../component/Smoothening/SmoothingForm';
import { filterRoads, fetchRoadDetailsById, fetchAllRoadsCached } from '../../api/RoadApi';
import { updateRoadAttributes, updateRoadGeometry, smoothRoadGeometry } from '../../api/smootheningApi';
import {
  extractUniqueCities,
  extractUniqueMunicipalCouncils,
  extractUniqueRoads,
  isValidGeoJSON,
} from '../Dashboard/utils';
import { City, Muncipal, Ward, Road } from '../../assets/svgs';
import './Smoothening.css';

// ─── Debounce helper ──────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Step dot ─────────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div className="smo-step-item">
    <div className={`smo-step-dot ${active ? 'smo-step-dot--active' : ''} ${done ? 'smo-step-dot--done' : ''}`}>
      {done ? '✓' : n}
    </div>
    <span className="smo-step-label">{label}</span>
  </div>
);

// ─── Geometry layer manager (inside MapContainer) ─────────────────────────────
// Uses useMap() — the correct react-leaflet way to access the map instance.
const GeomLayer = ({ geometry, editMode, smoothedGeometry, onChange }) => {
  const map = useMap();                 // ← direct access, no DOM hacking
  const layerRef = useRef(null);
  const previewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const coordsToLatLngs = useCallback((geo) => {
    if (!geo) return null;
    const type = geo.type;
    if (type === 'MultiLineString') return geo.coordinates.map(l => l.map(([x, y]) => [y, x]));
    if (type === 'LineString') return [geo.coordinates.map(([x, y]) => [y, x])];
    if (type === 'Feature') return coordsToLatLngs(geo.geometry);
    return null;
  }, []);

  const layerToMultiLine = useCallback((layer) => {
    const gj = layer.toGeoJSON();
    const t = gj.geometry?.type || gj.type;
    const c = gj.geometry?.coordinates || gj.coordinates;
    return { type: 'MultiLineString', coordinates: t === 'LineString' ? [c] : c };
  }, []);

  // ── Main geometry effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !geometry) return;

    // Cleanup previous layer
    if (layerRef.current) {
      layerRef.current.pm?.disable?.();
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    map.pm?.disableDraw?.();
    map.off('pm:create');

    const groups = coordsToLatLngs(geometry);
    if (!groups || groups.length === 0) return;

    if (editMode === 'draw') {
      // Show original as faint reference while user draws new line
      const ref = L.layerGroup(
        groups.map(pts => L.polyline(pts, { color: '#94a3b8', weight: 3, opacity: 0.45, dashArray: '6 4' }))
      ).addTo(map);
      layerRef.current = ref;

      map.pm.enableDraw('Line', { snappable: true, snapDistance: 20 });
      map.once('pm:create', (e) => {
        const nl = e.layer;
        const geo = nl.toGeoJSON();
        onChangeRef.current({ type: 'MultiLineString', coordinates: [geo.geometry.coordinates] });
        map.pm.disableDraw();
        map.removeLayer(ref);
        nl.setStyle({ color: '#3b82f6', weight: 5 });
        layerRef.current = nl;
      });
    } else {
      // Edit mode — render line(s) with Geoman vertex editing enabled
      const lines = groups.map(pts =>
        L.polyline(pts, { color: '#3b82f6', weight: 5, opacity: 0.9 })
      );
      const group = L.layerGroup(lines).addTo(map);
      layerRef.current = group;

      // Fly to road bounds
      try {
        const bounds = lines.reduce((b, l) => b.extend(l.getBounds()), lines[0].getBounds());
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
      } catch { /* noop */ }

      // Enable Geoman vertex editing
      lines.forEach(l => {
        l.pm.enable({ allowSelfIntersection: true });
        ['pm:edit', 'pm:dragend', 'pm:vertexadded', 'pm:vertexremoved'].forEach(evt => {
          l.on(evt, () => onChangeRef.current(layerToMultiLine(l)));
        });
      });
    }

    return () => {
      if (layerRef.current) {
        layerRef.current.pm?.disable?.();
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      map.pm?.disableDraw?.();
      map.off('pm:create');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, geometry, editMode]);

  // ── Smoothed preview layer ──────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    if (previewRef.current) { map.removeLayer(previewRef.current); previewRef.current = null; }
    if (!smoothedGeometry) return;
    const groups = coordsToLatLngs(smoothedGeometry);
    if (!groups) return;
    previewRef.current = L.layerGroup(
      groups.map(pts => L.polyline(pts, { color: '#22c55e', weight: 4, opacity: 0.95, dashArray: '9 5' }))
    ).addTo(map);
    return () => {
      if (previewRef.current && map) { map.removeLayer(previewRef.current); previewRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, smoothedGeometry]);

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Smoothening Page
// ═══════════════════════════════════════════════════════════════════════════════
const Smoothening = () => {
  // ── Cascade filter state ───────────────────────────────────────────────────
  const [cityOptions, setCityOptions]   = useState([]);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [wardGeoJson, setWardGeoJson]   = useState(null);

  const [selectedCity, setSelectedCity]         = useState(null);
  const [circleOptions, setCircleOptions]         = useState([]);
  const [selectedCircle, setSelectedCircle]       = useState('');
  const [isLoadingCircle, setIsLoadingCircle]     = useState(false);

  const [wardOptions, setWardOptions]             = useState([]);
  const [selectedWard, setSelectedWard]           = useState('');
  const [selectedWardLabel, setSelectedWardLabel] = useState('');
  const [isLoadingWard, setIsLoadingWard]         = useState(false);

  const [roadOptions, setRoadOptions]                 = useState([]);
  const [selectedRoadOption, setSelectedRoadOption]   = useState(null);
  const [isLoadingRoad, setIsLoadingRoad]             = useState(false);

  // ── Road data ──────────────────────────────────────────────────────────────
  const [roadDetail, setRoadDetail]       = useState(null);
  const [roadGeometry, setRoadGeometry]   = useState(null);
  const [editedGeometry, setEditedGeometry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel]     = useState('geometry');
  const [editMode, setEditMode]           = useState('edit');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage]             = useState({ type: '', text: '' });
  const [smoothedGeometry, setSmoothedGeometry] = useState(null);
  const [mapKey, setMapKey]               = useState(0);

  // ── Show flash message ─────────────────────────────────────────────────────
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // ── STEP 1: Load all data → city options ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoadingAll(true);
      try {
        // Use module-level cache shared with Dashboard — 0 extra API hits
        const geo = await fetchAllRoadsCached();
        if (isValidGeoJSON(geo)) setCityOptions(extractUniqueCities(geo));
      } catch { /* silent */ }
      finally { setIsLoadingAll(false); }
    };
    load();
  }, []);

  // ── STEP 2: City → circles ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCity) {
      setCircleOptions([]); setSelectedCircle('');
      setWardOptions([]); setSelectedWard(''); setSelectedWardLabel('');
      setRoadOptions([]); setSelectedRoadOption(null);
      setRoadDetail(null); setRoadGeometry(null); setWardGeoJson(null);
      return;
    }
    const fetch = async () => {
      setIsLoadingCircle(true);
      setSelectedCircle(''); setWardOptions([]); setSelectedWard('');
      setSelectedWardLabel(''); setRoadOptions([]); setSelectedRoadOption(null);
      setRoadDetail(null); setRoadGeometry(null); setWardGeoJson(null);
      try {
        const geo = await filterRoads({ city_id: selectedCity.value });
        if (isValidGeoJSON(geo)) setCircleOptions(extractUniqueMunicipalCouncils(geo));
      } catch { setCircleOptions([]); }
      finally { setIsLoadingCircle(false); }
    };
    fetch();
  }, [selectedCity]);

  // ── STEP 3: Circle → wards ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCircle || !selectedCity) {
      setWardOptions([]); setSelectedWard(''); setSelectedWardLabel('');
      setRoadOptions([]); setSelectedRoadOption(null);
      setRoadDetail(null); setRoadGeometry(null); setWardGeoJson(null);
      return;
    }
    const fetch = async () => {
      setIsLoadingWard(true);
      setSelectedWard(''); setSelectedWardLabel('');
      setRoadOptions([]); setSelectedRoadOption(null);
      setRoadDetail(null); setRoadGeometry(null); setWardGeoJson(null);
      try {
        const geo = await filterRoads({ city_id: selectedCity.value, circle: selectedCircle });
        if (isValidGeoJSON(geo)) {
          const wardSet = new Set();
          geo.features.forEach(f => {
            const w = f.properties?.ward ?? f.properties?.div_code;
            if (w != null) wardSet.add(w);
          });
          setWardOptions(
            Array.from(wardSet).sort((a, b) => Number(a) - Number(b))
              .map(w => ({ label: `Ward ${w}`, value: String(w) }))
          );
        }
      } catch { setWardOptions([]); }
      finally { setIsLoadingWard(false); }
    };
    fetch();
  }, [selectedCircle, selectedCity]);

  // ── STEP 4: Ward → roads ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedWard || !selectedCity || !selectedCircle) {
      setRoadOptions([]); setSelectedRoadOption(null);
      setRoadDetail(null); setRoadGeometry(null); setWardGeoJson(null);
      return;
    }
    const fetch = async () => {
      setIsLoadingRoad(true);
      setSelectedRoadOption(null); setRoadDetail(null); setRoadGeometry(null);
      try {
        const geo = await filterRoads({
          city_id: selectedCity.value,
          circle: selectedCircle,
          ward: Number(selectedWard),
        });
        if (isValidGeoJSON(geo)) {
          setWardGeoJson(geo);
          setRoadOptions(extractUniqueRoads(geo));
        }
      } catch { setRoadOptions([]); }
      finally { setIsLoadingRoad(false); }
    };
    fetch();
  }, [selectedWard, selectedCity, selectedCircle]);

  // ── STEP 5: Road → detail + geometry ──────────────────────────────────────
  useEffect(() => {
    if (!selectedRoadOption) { setRoadDetail(null); setRoadGeometry(null); setEditedGeometry(null); return; }
    const fetch = async () => {
      setDetailLoading(true);
      setActivePanel('geometry');
      setSmoothedGeometry(null);
      setEditedGeometry(null);
      // Extract geometry from already-fetched wardGeoJson (zero extra API call)
      const rid = String(selectedRoadOption.value);
      const feat = wardGeoJson?.features?.find(f => String(f.properties?.road_id ?? f.properties?.id) === rid);
      const geom = feat?.geometry ?? null;
      setRoadGeometry(geom);
      setEditedGeometry(geom);
      setMapKey(k => k + 1); // remount map to fit new road
      try {
        const res = await fetchRoadDetailsById(Number(selectedRoadOption.value));
        const d = res?.data ?? res;
        setRoadDetail({
          id: d?.id ?? selectedRoadOption.value,
          road_name: d?.road_name ?? selectedRoadOption.label,
          road_status: d?.road_status ?? '',
          status: d?.status ?? '',
          width: d?.width ?? '',
          carriage: d?.carriage ?? '',
          crust: d?.crust ?? '',
          circle: d?.circle ?? selectedCircle,
          remarks: d?.remarks ?? '',
          ...d,
        });
      } catch {
        setRoadDetail({ id: selectedRoadOption.value, road_name: selectedRoadOption.label });
      } finally {
        setDetailLoading(false);
      }
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoadOption]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedCity(null);
    setSelectedCircle(''); setSelectedWard(''); setSelectedWardLabel('');
    setSelectedRoadOption(null);
    setRoadDetail(null); setRoadGeometry(null); setEditedGeometry(null);
    setSmoothedGeometry(null);
  };

  const handleSaveGeometry = async () => {
    if (!editedGeometry || !roadDetail?.id) return;
    try {
      setActionLoading(true);
      await updateRoadGeometry(roadDetail.id, editedGeometry);
      setRoadGeometry(editedGeometry);
      setSmoothedGeometry(null);
      showMessage('success', '✅ Geometry saved successfully!');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to save geometry');
    } finally { setActionLoading(false); }
  };

  const handleSmoothGeometry = async (options) => {
    try {
      setActionLoading(true);
      setSmoothedGeometry(null);
      const result = await smoothRoadGeometry(roadDetail.id, options);

      // Extract geometry from various possible response shapes
      const rawGeo =
        result?.smoothed_geometry ??
        result?.geometry ??
        result?.data?.smoothed_geometry ??
        result?.data?.geometry ??
        null;

      // Unwrap Feature wrapper if needed
      const geo = rawGeo?.type === 'Feature' ? rawGeo.geometry : rawGeo;

      if (!geo) {
        showMessage('error', 'API returned no geometry. Check backend response.');
        return result;
      }

      setSmoothedGeometry(geo);

      if (!options.preview) {
        setRoadGeometry(geo);
        setEditedGeometry(geo);
        showMessage('success', result?.message || '✅ Smoothing applied and saved!');
      } else {
        showMessage('success', '🟢 Preview shown on map — green dashed line');
      }
      return result;
    } catch (err) {
      const msg = err?.response?.data?.error
        ?? err?.response?.data?.detail
        ?? err?.message
        ?? 'Smoothing failed — check backend logs.';
      showMessage('error', msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptSmoothPreview = async () => {
    if (!smoothedGeometry || !roadDetail?.id) return;
    try {
      setActionLoading(true);
      await updateRoadGeometry(roadDetail.id, smoothedGeometry);
      setRoadGeometry(smoothedGeometry);
      setEditedGeometry(smoothedGeometry);
      setSmoothedGeometry(null);
      showMessage('success', '✅ Smoothed geometry saved!');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to save');
    } finally { setActionLoading(false); }
  };

  const handleUpdateAttributes = async (formData) => {
    try {
      setActionLoading(true);
      await updateRoadAttributes(roadDetail.id, formData);
      showMessage('success', '✅ Road attributes updated!');
      const res = await fetchRoadDetailsById(Number(roadDetail.id));
      const d = res?.data ?? res;
      setRoadDetail(prev => ({ ...prev, ...d }));
    } catch (err) {
      showMessage('error', err.response?.data?.errors || 'Update failed');
    } finally { setActionLoading(false); }
  };

  const step = selectedRoadOption ? 4 : selectedWard ? 3 : selectedCircle ? 2 : selectedCity ? 1 : 0;
  const isAnyLoading = isLoadingAll || isLoadingCircle || isLoadingWard || isLoadingRoad;
  const hasRoad = !!selectedRoadOption;

  const STEPS = ['City', 'Circle', 'Ward', 'Road'];

  return (
    <div className="smo-page">

      {/* ── Header ── */}
      <header className="smo-header">
        <div className="smo-header__brand">
          <span className="smo-header__icon">🛣️</span>
          <div>
            <h1 className="smo-header__title">Road Geometry Editor</h1>
            <p className="smo-header__sub">City → Circle → Ward → Road — then drag, draw, or smooth</p>
          </div>
        </div>
        {step > 0 && (
          <button className="smo-btn smo-btn--reset" onClick={handleReset} type="button">✕ Reset</button>
        )}
      </header>

      {/* ── Filter Bar ── */}
      <div className="smo-filter-bar">
        {/* Step progress */}
        <div className="smo-steps-row">
          {STEPS.map((label, i) => (
            <StepDot key={label} n={i + 1} label={label} active={step === i} done={step > i} />
          ))}
          <div className="smo-steps-track">
            <div className="smo-steps-fill" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="smo-filter-row">
          <InputDropdown
            label="City" name="smo-city" icon={<City width={16} />} width="100%" isSearchable
            value={selectedCity?.label ?? ''}
            onChange={e => setSelectedCity(e.selectedItem)}
            onClear={() => setSelectedCity(null)}
            optionList={cityOptions}
            placeholder={isLoadingAll ? 'Loading…' : 'Select City'}
            disabled={isLoadingAll}
          />
          <InputDropdown
            label="Municipal Council" name="smo-circle" icon={<Muncipal width={16} />} width="100%" isSearchable
            value={selectedCircle}
            onChange={e => setSelectedCircle(e.selectedItem.value)}
            optionList={circleOptions}
            placeholder={isLoadingCircle ? 'Loading…' : (selectedCity ? 'Select Circle' : '—')}
            disabled={!selectedCity || isLoadingCircle}
          />
          <InputDropdown
            label="Ward" name="smo-ward" icon={<Ward width={16} />} width="100%" isSearchable
            value={selectedWardLabel}
            onChange={e => { setSelectedWard(e.selectedItem.value); setSelectedWardLabel(e.selectedItem.label); }}
            optionList={wardOptions}
            placeholder={isLoadingWard ? 'Loading…' : (selectedCircle ? 'Select Ward' : '—')}
            disabled={!selectedCircle || isLoadingWard}
          />
          <InputDropdown
            label="Road" name="smo-road" icon={<Road width={16} />} width="100%" isSearchable
            value={selectedRoadOption?.label ?? ''}
            onChange={e => setSelectedRoadOption(e.selectedItem)}
            optionList={roadOptions}
            placeholder={isLoadingRoad ? 'Loading…' : (selectedWard ? 'Select Road' : '—')}
            disabled={!selectedWard || isLoadingRoad}
          />
        </div>

        {/* Loading / guide hint */}
        {isAnyLoading ? (
          <div className="smo-hint"><span className="smo-spinner" />
            {isLoadingAll ? 'Loading cities…' : isLoadingCircle ? 'Loading circles…' : isLoadingWard ? 'Loading wards…' : 'Loading roads…'}
          </div>
        ) : !hasRoad && (
          <div className="smo-hint smo-hint--blue">
            {step === 0 && '👆 Start by selecting a City'}
            {step === 1 && '👆 Select a Municipal Circle'}
            {step === 2 && '👆 Select a Ward'}
            {step === 3 && '👆 Finally select a Road to edit on the map'}
          </div>
        )}
      </div>

      {/* ── Flash message ── */}
      {message.text && (
        <div className={`smo-alert smo-alert--${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      {/* ── Main workspace ── */}
      {hasRoad ? (
        <div className="smo-workspace">

          {/* ── Map ── */}
          <div className="smo-map-panel">
            {/* Legend pill */}
            <div className="smo-map-legend">
              <span className="smo-dot smo-dot--blue" /> Original
              {smoothedGeometry && <><span className="smo-dot smo-dot--green" /> Smoothed preview</>}
            </div>

            {detailLoading ? (
              <div className="smo-map-loading">
                <span className="smo-spinner smo-spinner--lg" /> Loading road…
              </div>
            ) : (
              <MapContainer
                key={`${mapKey}_${selectedRoadOption?.value}`}
                center={[29.05, 75.85]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                className="smo-leaflet-map"
                zoomControl
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                <GeomLayer
                  geometry={roadGeometry}
                  editMode={editMode}
                  smoothedGeometry={smoothedGeometry}
                  onChange={setEditedGeometry}
                />
              </MapContainer>
            )}

            {/* Map instruction ribbon */}
            {!detailLoading && editMode === 'edit' && (
              <div className="smo-map-ribbon">
                💡 <strong>Drag</strong> white vertex circles to reshape · <strong>Click midpoint</strong> to add vertex · <strong>Right-click</strong> to remove
              </div>
            )}
            {!detailLoading && editMode === 'draw' && (
              <div className="smo-map-ribbon smo-map-ribbon--amber">
                ✏️ Click to draw a new line · <strong>Double-click</strong> to finish · Original shown as dashed reference
              </div>
            )}
          </div>

          {/* ── Controls sidebar ── */}
          <div className="smo-controls">

            {/* Road info banner */}
            <div className="smo-road-banner">
              <div className="smo-road-banner__bar" />
              <div className="smo-road-banner__body">
                <h2 className="smo-road-banner__name">
                  {roadDetail?.road_name || selectedRoadOption?.label}
                </h2>
                <div className="smo-road-banner__chips">
                  {[
                    { k: 'Road ID', v: roadDetail?.id ?? selectedRoadOption?.value },
                    { k: 'Status',  v: roadDetail?.road_status || '—' },
                    { k: 'Width',   v: roadDetail?.width ? `${roadDetail.width} m` : '—' },
                    { k: 'Circle',  v: roadDetail?.circle || selectedCircle || '—' },
                    { k: 'Ward',    v: selectedWardLabel || '—' },
                  ].map(({ k, v }) => (
                    <div key={k} className="smo-chip">
                      <span className="smo-chip__key">{k}</span>
                      <span className="smo-chip__val">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="smo-tabs">
              {[
                { key: 'geometry',   label: '🗺️ Geometry' },
                { key: 'smooth',     label: '✨ Smooth' },
                { key: 'attributes', label: '📝 Attributes' },
              ].map(({ key, label }) => (
                <button key={key} type="button"
                  className={`smo-tab ${activePanel === key ? 'smo-tab--active' : ''}`}
                  onClick={() => setActivePanel(key)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── GEOMETRY TAB ── */}
            {activePanel === 'geometry' && (
              <div className="smo-panel">
                <p className="smo-panel__desc">
                  Edit road vertices directly on the map, or draw a brand-new line to replace the geometry.
                </p>

                <div className="smo-field-group">
                  <label className="smo-label">Edit mode</label>
                  <div className="smo-pills">
                    {[{ k: 'edit', l: '✏️ Edit vertices' }, { k: 'draw', l: '✏️ Draw new' }].map(({ k, l }) => (
                      <button key={k} type="button"
                        className={`smo-pill ${editMode === k ? 'smo-pill--active' : ''}`}
                        onClick={() => { setEditMode(k); setSmoothedGeometry(null); }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {editedGeometry && (
                  <details className="smo-details">
                    <summary>View GeoJSON</summary>
                    <pre className="smo-pre">{JSON.stringify(editedGeometry, null, 2)}</pre>
                  </details>
                )}

                <button className="smo-btn smo-btn--primary" type="button"
                  onClick={handleSaveGeometry} disabled={actionLoading || !editedGeometry}>
                  {actionLoading ? <><span className="smo-spinner" /> Saving…</> : '💾 Save Geometry'}
                </button>
              </div>
            )}

            {/* ── SMOOTH TAB ── */}
            {activePanel === 'smooth' && (
              <div className="smo-panel">
                <SmoothingForm
                  roadId={roadDetail?.id}
                  onSmooth={handleSmoothGeometry}
                  loading={actionLoading}
                />
                {smoothedGeometry && (
                  <div className="smo-preview-box">
                    <p className="smo-preview-box__note">
                      <span className="smo-dot smo-dot--green smo-dot--inline" />
                      Green dashed line = smoothed preview
                    </p>
                    <div className="smo-preview-box__btns">
                      <button type="button" className="smo-btn smo-btn--accept"
                        onClick={handleAcceptSmoothPreview} disabled={actionLoading}>
                        ✅ Accept &amp; Save
                      </button>
                      <button type="button" className="smo-btn smo-btn--ghost"
                        onClick={() => setSmoothedGeometry(null)}>
                        ✕ Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ATTRIBUTES TAB ── */}
            {activePanel === 'attributes' && (
              <div className="smo-panel">
                <RoadAttributesForm
                  road={roadDetail}
                  onSubmit={handleUpdateAttributes}
                  loading={actionLoading}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="smo-empty">
          <div className="smo-empty__art">🗺️</div>
          <h3>No Road Selected</h3>
          <p>Use the filter cascade above to navigate to a road. Once selected, it appears on an interactive map where you can drag vertices, draw new geometry, or apply smoothing algorithms.</p>
        </div>
      )}
    </div>
  );
};

export default Smoothening;
