import { useEffect, useState } from "react";
import { fetchRoadDetailsById } from "../../../api/RoadApi";
import "./RoadDetailsDialog.css";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  return String(v).trim();
};
const fmtDate = (ms) => {
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return null; }
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
const Row = ({ label, value, wide, wide2, highlight }) => {
  const display = value ?? "—";
  const isEmpty = value === null || value === undefined;
  return (
    <div className={`rdp-row${wide ? " rdp-row--wide" : ""}${wide2 ? " rdp-row--wide-2" : ""}`}>
      <span className="rdp-key">{label}</span>
      <span className={`rdp-val${highlight ? " rdp-val--highlight" : ""}${isEmpty ? " rdp-val--muted" : ""}`}>
        {display}
      </span>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="rdp-section">
    <p className="rdp-section__title">{title}</p>
    <div className="rdp-grid">{children}</div>
  </div>
);

// ─── Main dialog ──────────────────────────────────────────────────────────────
const RoadDetailsDialog = ({ roadId, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!roadId) return;
    setLoading(true); setError(null); setData(null);
    fetchRoadDetailsById(roadId)
      .then((res) => {
        const d = res?.data ?? res;
        if (d && typeof d === "object") setData(d);
        else setError("No details found for this road.");
      })
      .catch(() => setError("Failed to load road details."))
      .finally(() => setLoading(false));
  }, [roadId]);

  if (!roadId) return null;

  const d = data;
  const roadName = d
    ? (fmt(d.road_name) || "Unnamed Road")
    : "Loading…";

  return (
    <div className="rdp-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rdp-dialog" onClick={(e) => e.stopPropagation()}>

        {/* ── Top accent bar ── */}
        <div className="rdp-accent-bar" />

        {/* ── Header ── */}
        <div className="rdp-header">
          <div className="rdp-header__text">
            <p className="rdp-header__eyebrow">Road Details</p>
            <h2 className="rdp-header__name">{roadName}</h2>
            {d?.r_temp_id && (
              <span className="rdp-header__badge">ID: {d.r_temp_id}</span>
            )}
          </div>
          <button className="rdp-close-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="rdp-body">

          {loading && (
            <div className="rdp-state">
              <div className="rdp-spinner" />
              <p>Fetching road details…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rdp-state rdp-state--error">
              <p>⚠ {error}</p>
            </div>
          )}

          {!loading && !error && d && (
            <>
              {/* ── Identity ── */}
              <Section title="Identity">
                <Row label="Road ID"      value={fmt(d.id) ? `#${fmt(d.id)}` : null} highlight />
                <Row label="GIS ID"       value={fmt(d.gis_id)} />
                <Row label="Object ID"    value={fmt(d.object_id)} />
                <Row label="Temp Road ID" value={fmt(d.r_temp_id)} wide />
                <Row label="Temp ID"      value={fmt(d.temp_road_id)} />
              </Section>

              {/* ── Location ── */}
              <Section title="Location">
                <Row label="Circle"      value={fmt(d.circle)} wide2 />
                <Row label="Division"    value={fmt(d.division)} />
                <Row label="District"    value={fmt(d.district)} />
                <Row label="Ward / Div Code" value={fmt(d.div_code)} />
                <Row label="Circle Code" value={fmt(d.circle_code)} />
                <Row label="Dist Code"   value={fmt(d.dist_code)} />
                <Row label="MLA Const."  value={fmt(d.mla_constituency)} wide />
              </Section>

              {/* ── Road Properties ── */}
              <Section title="Road Properties">
                <Row label="Width"          value={d.width != null ? `${d.width} m` : null} />
                <Row label="Carriage"       value={d.carriage != null ? `${d.carriage} m` : null} />
                <Row label="GIS Length"     value={d.gis_length != null ? `${d.gis_length.toFixed(3)} km` : null} />
                <Row label="Shape Length"   value={d.shape_length != null ? `${d.shape_length.toFixed(2)} m` : null} />
                <Row label="Road Type"      value={fmt(d.road_type)} />
                <Row label="Road Category"  value={fmt(d.road_category)} />
                <Row label="Crust"          value={fmt(d.crust)} />
                <Row label="Length (doc)"   value={fmt(d.length_doc)} />
              </Section>

              {/* ── Route ── */}
              <Section title="Route">
                <Row label="From" value={fmt(d.start_point)} wide />
                <Row label="To"   value={fmt(d.end_point)} wide />
                <Row label="DLP From" value={fmt(d.dlp_from)} />
                <Row label="DLP To"   value={fmt(d.dlp_to)} />
              </Section>

              {/* ── Administration ── */}
              <Section title="Administration">
                <Row label="Status"      value={fmt(d.status)} />
                <Row label="Road Status" value={fmt(d.road_status)} />
                <Row label="Ownership"   value={fmt(d.ownership)} />
                <Row label="Department"  value={fmt(d.department)} />
                <Row label="Source"      value={fmt(d.source)} />
                <Row label="HARSAC"      value={fmt(d.harsac_status)} />
              </Section>

              {/* ── Survey & Engineering ── */}
              <Section title="Survey & Engineering">
                <Row label="Engineer"    value={fmt(d.engineer_name)} wide2 />
                <Row label="Created By"  value={fmt(d.created_user)} />
                <Row label="Created"     value={fmtDate(d.created_date)} />
                <Row label="Last Editor" value={fmt(d.last_edited_user)} />
                <Row label="Edit Date"   value={fmtDate(d.last_edited_date)} />
              </Section>

              {/* ── Remarks ── */}
              {d.remarks && (
                <Section title="Remarks">
                  <Row label="Remarks" value={fmt(d.remarks)} wide />
                </Section>
              )}

              <p className="rdp-global-id">{d.global_id}</p>
            </>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="rdp-footer">
          <span className="rdp-footer__id">
            {d ? `Road #${fmt(d.id) ?? "—"}` : ""}
          </span>
          <button className="rdp-footer-btn rdp-footer-btn--close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoadDetailsDialog;
