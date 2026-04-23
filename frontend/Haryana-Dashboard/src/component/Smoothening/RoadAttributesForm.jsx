import { useState, useEffect } from 'react';

const FIELD_STYLE = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  border: '1.5px solid var(--color-divider, #e0e0ea)',
  borderRadius: '7px',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-heading, #1a1a2e)',
  background: 'var(--color-surface, #fff)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const Field = ({ label, children }) => (
  <div className="smo-field-group">
    <label className="smo-label">{label}</label>
    {children}
  </div>
);

/**
 * RoadAttributesForm — styled with smo- design tokens.
 */
const RoadAttributesForm = ({ road, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    road_name: '',
    status: '',
    road_status: '',
    width: '',
    carriage: '',
    crust: '',
    remarks: '',
  });

  useEffect(() => {
    if (road) {
      setFormData({
        road_name:   road.road_name   || '',
        status:      road.status      || '',
        road_status: road.road_status || '',
        width:       road.width       || '',
        carriage:    road.carriage    || '',
        crust:       road.crust       || '',
        remarks:     road.remarks     || '',
      });
    }
  }, [road]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = 'var(--color-primary, #1e6fd9)';
    e.target.style.boxShadow = '0 0 0 3px rgba(30,111,217,.12)';
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = 'var(--color-divider, #e0e0ea)';
    e.target.style.boxShadow = 'none';
  };

  const inputProps = { style: FIELD_STYLE, onFocus: handleFocus, onBlur: handleBlur, onChange: handleChange };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([, v]) => v !== '')
    );
    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

      <Field label="Road Name">
        <input
          type="text"
          name="road_name"
          value={formData.road_name}
          placeholder="e.g. NH-44, MG Road…"
          {...inputProps}
        />
      </Field>

      {/* Status row — 2 selects side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
        <Field label="Status">
          <select name="status" value={formData.status} {...inputProps}>
            <option value="">— Select —</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Repair">Under Repair</option>
          </select>
        </Field>
        <Field label="Road Status">
          <select name="road_status" value={formData.road_status} {...inputProps}>
            <option value="">— Select —</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </Field>
      </div>

      {/* Width / Carriage / Crust row — 3 side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem' }}>
        <Field label="Width (m)">
          <input
            type="number"
            step="0.1"
            name="width"
            value={formData.width}
            placeholder="7.5"
            {...inputProps}
          />
        </Field>
        <Field label="Carriage">
          <input
            type="text"
            name="carriage"
            value={formData.carriage}
            placeholder="Asphalt"
            {...inputProps}
          />
        </Field>
        <Field label="Crust">
          <input
            type="text"
            name="crust"
            value={formData.crust}
            placeholder="Bituminous"
            {...inputProps}
          />
        </Field>
      </div>

      <Field label="Remarks">
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Add notes about this road…"
          rows={3}
          style={{ ...FIELD_STYLE, resize: 'vertical', lineHeight: 1.5 }}
        />
      </Field>

      <button
        type="submit"
        className="smo-btn smo-btn--primary"
        disabled={loading}
        style={{ marginTop: '0.15rem' }}
      >
        {loading
          ? <><span className="smo-spinner" /> Updating…</>
          : '💾 Update Road Attributes'}
      </button>
    </form>
  );
};

export default RoadAttributesForm;
