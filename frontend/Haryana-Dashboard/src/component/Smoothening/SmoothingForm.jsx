import { useState } from 'react';

/**
 * SmoothingForm — styled with smo- design tokens.
 * Parent (Smoothening.jsx) owns smoothedGeometry state.
 * This form just collects options and calls onSmooth().
 */
const SmoothingForm = ({ roadId, onSmooth, loading }) => {
  const [algorithm, setAlgorithm] = useState('chaikin');
  const [iterations, setIterations] = useState(3);
  const [tolerance, setTolerance] = useState(0.0001);
  const [preview, setPreview] = useState(true);

  const handleSmooth = async (e) => {
    e.preventDefault();
    const options = {
      algorithm,
      preview,
      ...(algorithm === 'chaikin'
        ? { iterations: parseInt(iterations, 10) }
        : { tolerance: parseFloat(tolerance) }),
    };
    await onSmooth(options);
  };

  return (
    <form onSubmit={handleSmooth} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

      {/* ── Algorithm picker ── */}
      <div className="smo-field-group">
        <label className="smo-label">Algorithm</label>
        <div className="smo-pills">
          {[
            { k: 'chaikin', l: '〰 Chaikin', hint: 'Adds points, rounds corners' },
            { k: 'douglas_peucker', l: '📐 Douglas-Peucker', hint: 'Removes redundant points' },
          ].map(({ k, l }) => (
            <button
              key={k}
              type="button"
              className={`smo-pill${algorithm === k ? ' smo-pill--active' : ''}`}
              onClick={() => setAlgorithm(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="smo-hint" style={{ marginTop: '0.3rem' }}>
          {algorithm === 'chaikin'
            ? '〰 Adds intermediate points and rounds corners — best for display quality.'
            : '📐 Removes redundant vertices while preserving shape — best for data cleanup.'}
        </p>
      </div>

      {/* ── Chaikin: iterations ── */}
      {algorithm === 'chaikin' && (
        <div className="smo-field-group">
          <label className="smo-label">
            Iterations
            <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '0.4rem', textTransform: 'none', letterSpacing: 0 }}>
              ({iterations} pass{iterations > 1 ? 'es' : ''})
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="range"
              min="1" max="6"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              style={{ flex: 1, accentColor: 'var(--color-primary, #1e6fd9)', cursor: 'pointer' }}
            />
            <span style={{
              minWidth: '2rem', textAlign: 'center',
              fontWeight: 700, color: 'var(--color-primary, #1e6fd9)',
              fontSize: '1rem',
            }}>
              {iterations}
            </span>
          </div>
          <p className="smo-hint">More iterations = smoother result (but slower). 3–4 is usually ideal.</p>
        </div>
      )}

      {/* ── Douglas-Peucker: tolerance ── */}
      {algorithm === 'douglas_peucker' && (
        <div className="smo-field-group">
          <label className="smo-label">Tolerance (degrees)</label>
          <div className="smo-pills" style={{ flexWrap: 'nowrap', gap: '0.4rem' }}>
            {[
              { v: 0.00001, l: '0.00001', hint: 'Very fine' },
              { v: 0.0001,  l: '0.0001',  hint: 'Fine' },
              { v: 0.001,   l: '0.001',   hint: 'Medium' },
              { v: 0.01,    l: '0.01',    hint: 'Coarse' },
            ].map(({ v, l, hint }) => (
              <button
                key={v}
                type="button"
                className={`smo-pill${tolerance === v ? ' smo-pill--active' : ''}`}
                style={{ flex: 1, fontSize: '0.7rem' }}
                onClick={() => setTolerance(v)}
                title={hint}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="smo-hint" style={{ marginTop: '0.35rem' }}>
            Higher = more points removed. For GPS data (°) use 0.00001–0.0001.
          </p>
        </div>
      )}

      {/* ── Preview toggle ── */}
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          cursor: 'pointer', userSelect: 'none',
          background: preview ? '#eff6ff' : '#f8fafc',
          border: `1.5px solid ${preview ? '#bfdbfe' : 'var(--color-divider, #e0e0ea)'}`,
          borderRadius: '8px', padding: '0.6rem 0.8rem',
          transition: 'all 0.15s',
        }}
      >
        {/* Custom toggle */}
        <div
          style={{
            width: '36px', height: '20px', borderRadius: '10px',
            background: preview ? 'var(--color-primary, #1e6fd9)' : '#cbd5e1',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: '3px',
            left: preview ? '18px' : '3px',
            width: '14px', height: '14px',
            borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left 0.2s',
          }} />
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => setPreview(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: preview ? '#1d4ed8' : '#64748b' }}>
            Preview mode
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
            {preview ? 'Shows result on map without saving' : 'Will save immediately on submit'}
          </div>
        </div>
      </label>

      {/* ── Submit ── */}
      <button
        type="submit"
        className="smo-btn smo-btn--primary"
        disabled={loading || !roadId}
        style={{ gap: '0.5rem' }}
      >
        {loading
          ? <><span className="smo-spinner" /> Smoothing…</>
          : `✨ ${preview ? 'Preview' : 'Apply & Save'} Smoothing`}
      </button>
    </form>
  );
};

export default SmoothingForm;
