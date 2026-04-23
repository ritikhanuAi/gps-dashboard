import { useState } from 'react';
import './Forms.css';

const GeometryForm = ({ roadId, onSubmit, loading }) => {
  const [geometryInput, setGeometryInput] = useState('');
  const [inputType, setInputType] = useState('geojson');

  const handleSubmit = (e) => {
    e.preventDefault();

    try {
      let geometry;

      if (inputType === 'geojson') {
        geometry = JSON.parse(geometryInput);
      } else if (inputType === 'coordinates') {
        // Parse comma/space-separated coordinates: "lng,lat lng,lat ..."
        const coordString = geometryInput.trim();
        const coordPairs = coordString.split(/\s+/).map((pair) => {
          const [lng, lat] = pair.split(',').map(Number);
          return [lng, lat];
        });
        geometry = {
          type: 'MultiLineString',
          coordinates: [coordPairs],
        };
      }

      if (!geometry || geometry.type !== 'MultiLineString') {
        throw new Error('Geometry must be MultiLineString');
      }

      onSubmit(geometry);
      setGeometryInput('');
    } catch (error) {
      alert(`Invalid input: ${error.message}`);
    }
  };

  return (
    <form className="form form--geometry" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="input-type">Input Format:</label>
        <select
          id="input-type"
          value={inputType}
          onChange={(e) => setInputType(e.target.value)}
        >
          <option value="geojson">GeoJSON</option>
          <option value="coordinates">Coordinates (lng,lat format)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="geometry-input">
          {inputType === 'geojson' ? 'GeoJSON Geometry' : 'Coordinates (one pair per line)'}:
        </label>
        <textarea
          id="geometry-input"
          value={geometryInput}
          onChange={(e) => setGeometryInput(e.target.value)}
          placeholder={
            inputType === 'geojson'
              ? '{"type": "MultiLineString", "coordinates": [[[lng, lat], ...]]}'
              : 'Format: longitude,latitude\n76.8,28.6\n76.9,28.7\n77.0,28.8'
          }
          rows="6"
          required
        />
      </div>

      <p className="form-hint">
        Replace the current geometry with new coordinates. Must be a valid MultiLineString.
      </p>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? 'Updating...' : 'Update Geometry'}
      </button>
    </form>
  );
};

export default GeometryForm;
