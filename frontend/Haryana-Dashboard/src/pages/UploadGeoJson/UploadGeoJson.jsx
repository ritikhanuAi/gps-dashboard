import { useRef, useState, useCallback, useEffect } from "react";
import { uploadGeoJsonFiles, getCities } from "../../api/uploadApi";
import { invalidateRoadsCache } from "../../api/RoadApi";
import "./UploadGeoJson.css";

// ── Icons ─────────────────────────────────────────────────────────────────
const GeoJsonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15z"/>
    <path d="M8 12h2v2H8zm0 3h2v2H8zm3-3h2v2h-2zm0 3h2v2h-2zm3-3h2v2h-2zm0 3h2v2h-2z" opacity=".6"/>
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
  </svg>
);

const CheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const ErrorCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const AddFileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isValidGeoFile = (file) =>
  file.name.endsWith(".geojson") || file.name.endsWith(".json");

// ── File status type: 'pending' | 'uploading' | 'success' | 'error'
const mkEntry = (file) => ({ file, status: "pending", error: null });

// ── Component ──────────────────────────────────────────────────────────────
const UploadGeoJson = () => {
  const fileInputRef = useRef(null);
  const [uploadMode, setUploadMode] = useState(null); // 'new' | 'update' | null
  const [entries, setEntries]     = useState([]); // { file, status, error }[]
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary]     = useState(null); // { succeeded, failed }
  const [globalError, setGlobalError] = useState(null);

  // City selection state
  const [cities, setCities] = useState([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState("");

  useEffect(() => {
    if (uploadMode === 'update' && cities.length === 0) {
      const fetchCities = async () => {
        setIsLoadingCities(true);
        setGlobalError(null);
        try {
          const data = await getCities();
          if (data && data.success && data.cities) {
            setCities(data.cities);
          } else {
            setGlobalError("Failed to fetch cities: Unexpected response format.");
          }
        } catch (error) {
          console.error("Failed to fetch cities:", error);
          setGlobalError("Failed to fetch cities. Please check your connection.");
        } finally {
          setIsLoadingCities(false);
        }
      };
      fetchCities();
    }
  }, [uploadMode, cities.length]);

  // ── Add files (merge, skip dupes by name) ──────────────────────────────
  const addFiles = useCallback((rawFiles) => {
    const valid   = [];
    const invalid = [];
    Array.from(rawFiles).forEach((f) => {
      if (isValidGeoFile(f)) valid.push(f);
      else invalid.push(f.name);
    });

    if (invalid.length) {
      setGlobalError(`Skipped ${invalid.length} file(s) with unsupported formats. Only .json or .geojson allowed.`);
      setTimeout(() => setGlobalError(null), 6000);
    } else {
      setGlobalError(null);
    }

    setEntries((prev) => {
      const existingNames = new Set(prev.map((e) => e.file.name));
      const newEntries = valid
        .filter((f) => !existingNames.has(f.name))
        .map(mkEntry);
      return [...prev, ...newEntries];
    });
    setSummary(null);
  }, []);

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = ""; // allow re-selecting same files
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ── Remove a single file ───────────────────────────────────────────────
  const removeEntry = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Clear all ─────────────────────────────────────────────────────────
  const clearAll = () => {
    setEntries([]);
    setSummary(null);
    setGlobalError(null);
  };

  // ── Upload all pending files ───────────────────────────────────────────
  const handleUpload = async () => {
    const pendingIndices = entries
      .map((e, i) => (e.status === "pending" || e.status === "error" ? i : null))
      .filter((i) => i !== null);

    if (pendingIndices.length === 0) return;

    setIsUploading(true);
    setSummary(null);

    // Mark all pending as uploading
    setEntries((prev) =>
      prev.map((e, i) =>
        pendingIndices.includes(i) ? { ...e, status: "uploading", error: null } : e
      )
    );

    const filesToUpload = pendingIndices.map((i) => entries[i].file);

    const { succeeded, failed } = await uploadGeoJsonFiles(
      filesToUpload,
      (localIdx, status, error) => {
        const globalIdx = pendingIndices[localIdx];
        setEntries((prev) =>
          prev.map((e, i) =>
            i === globalIdx ? { ...e, status, error: error || null } : e
          )
        );
      },
      uploadMode === 'update' ? selectedCityId : null
    );

    setSummary({ succeeded, failed });
    setIsUploading(false);

    if (succeeded > 0) {
      // Invalidate the cache so the map dashboard refetches the roads data
      invalidateRoadsCache();
    }
  };

  // ── Retry failed files ────────────────────────────────────────────────
  const retryFailed = () => {
    setEntries((prev) =>
      prev.map((e) => (e.status === "error" ? { ...e, status: "pending", error: null } : e))
    );
    setSummary(null);
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const pendingCount   = entries.filter((e) => e.status === "pending").length;
  const errorCount     = entries.filter((e) => e.status === "error").length;
  const successCount   = entries.filter((e) => e.status === "success").length;
  const uploadableCount = pendingCount + errorCount;
  const hasFiles = entries.length > 0;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="upage">
      {/* ── Header ── */}
      <header className="upage__header">
        <div>
          <h1 className="upage__title">Upload GeoJSON</h1>
          <p className="upage__subtitle">
            Import road network data — supports multiple <code>.geojson</code> / <code>.json</code> files at once
          </p>
        </div>
        {hasFiles && (
          <div className="upage__header-badges">
            {successCount > 0 && (
              <span className="ubadge ubadge--success">{successCount} done</span>
            )}
            {pendingCount > 0 && (
              <span className="ubadge ubadge--pending">{pendingCount} pending</span>
            )}
            {errorCount > 0 && (
              <span className="ubadge ubadge--error">{errorCount} failed</span>
            )}
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="upage__body">
        <div className="ucard">
          {!uploadMode ? (
            <div className="umode-selector">
              <h2 className="umode-selector__title">Select Upload Type</h2>
              <p className="umode-selector__subtitle">Choose whether you are adding a new city or updating an existing one before uploading files.</p>
              
              <div className="umode-cards">
                <button className="umode-card" onClick={() => setUploadMode('new')}>
                  <div className="umode-card__icon"><AddFileIcon /></div>
                  <div className="umode-card__content">
                    <h3>Upload New City</h3>
                    <p>Add a completely new city road network to the system.</p>
                  </div>
                </button>
                <button className="umode-card" onClick={() => setUploadMode('update')}>
                  <div className="umode-card__icon"><UploadIcon /></div>
                  <div className="umode-card__content">
                    <h3>Update Existing City</h3>
                    <p>Append or replace data in an existing city network.</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="umode-header">
                <button className="ulink" onClick={() => {
                  setUploadMode(null);
                  setSelectedCityId("");
                  clearAll();
                }}>
                  ← Back to selection
                </button>
                <span className={`ubadge ${uploadMode === 'new' ? 'ubadge--success' : 'ubadge--pending'}`}>
                  {uploadMode === 'new' ? 'New City Mode' : 'Update City Mode'}
                </span>
              </div>

              {uploadMode === 'update' && (
                <div className="ucity-selector">
                  <label htmlFor="city-select" className="ucity-selector__label">
                    Select City to Update
                  </label>
                  {isLoadingCities ? (
                    <div className="ucity-selector__loading">Loading cities...</div>
                  ) : (
                    <select
                      id="city-select"
                      className="ucity-selector__select"
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                    >
                      <option value="" disabled>-- Choose a city --</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {globalError && (
                <div className="uglobal-error">
                  <ErrorCircle /> {globalError}
                </div>
              )}

              {/* ── Drop zone ── */}
              <div
                className={`udropzone ${isDragging ? "udropzone--drag" : ""} ${uploadMode === 'update' && !selectedCityId ? "udropzone--disabled" : ""}`}
                onDrop={uploadMode === 'update' && !selectedCityId ? undefined : handleDrop}
                onDragOver={uploadMode === 'update' && !selectedCityId ? undefined : handleDragOver}
                onDragLeave={uploadMode === 'update' && !selectedCityId ? undefined : handleDragLeave}
                onClick={uploadMode === 'update' && !selectedCityId ? undefined : () => fileInputRef.current?.click()}
              >
              <input
                ref={fileInputRef}
                id="geojson-file-input"
                type="file"
                accept=".geojson,.json"
                multiple
                className="udropzone__input"
                onChange={handleInputChange}
                disabled={uploadMode === 'update' && !selectedCityId}
              />
            <div className="udropzone__icon-ring">
              <UploadIcon />
            </div>
            <p className="udropzone__primary">
              {isDragging ? "Drop files here" : "Drag & drop GeoJSON files"}
            </p>
              <p className="udropzone__secondary">
                {(uploadMode === 'update' && !selectedCityId) ? "Please select a city first" : <><span className="udropzone__browse">click to browse</span></>}
              </p>
              <p className="udropzone__formats">Accepts .geojson · .json · multiple files OK</p>
          </div>

          {/* ── File list ── */}
          {hasFiles && (
            <div className="ufile-list">
              <div className="ufile-list__header">
                <span className="ufile-list__count">{entries.length} file{entries.length !== 1 ? "s" : ""} selected</span>
                <div className="ufile-list__actions">
                  <button
                    className="ulink"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <AddFileIcon /> Add more
                  </button>
                  <button className="ulink ulink--danger" onClick={clearAll}>
                    Clear all
                  </button>
                </div>
              </div>

              <div className="ufile-list__items">
                {entries.map((entry, idx) => (
                  <div key={`${entry.file.name}-${idx}`} className={`ufile-item ufile-item--${entry.status}`}>
                    {/* Icon and info */}
                    <div className="ufile-item__icon">
                      <GeoJsonIcon />
                    </div>
                    <div className="ufile-item__info">
                      <p className="ufile-item__name" title={entry.file.name}>{entry.file.name}</p>
                      <p className="ufile-item__meta">{formatBytes(entry.file.size)}</p>
                      {entry.error && (
                        <p className="ufile-item__error">{entry.error}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="ufile-item__status">
                      {entry.status === "uploading" && (
                        <span className="ufile-spinner" />
                      )}
                      {entry.status === "success" && (
                        <span className="ufile-status ufile-status--success">
                          <CheckCircle /> Uploaded
                        </span>
                      )}
                      {entry.status === "error" && (
                        <span className="ufile-status ufile-status--error">
                          <ErrorCircle /> Failed
                        </span>
                      )}
                      {entry.status === "pending" && (
                        <span className="ufile-status ufile-status--pending">Ready</span>
                      )}
                    </div>

                    {/* Remove button */}
                    {entry.status !== "uploading" && (
                      <button
                        className="ufile-item__remove"
                        onClick={() => removeEntry(idx)}
                        title="Remove"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Summary banner ── */}
          {summary && (
            <div className={`usummary ${summary.failed === 0 ? "usummary--success" : "usummary--mixed"}`}>
              <div className="usummary__icon">
                {summary.failed === 0 ? <CheckCircle /> : <ErrorCircle />}
              </div>
              <div>
                <p className="usummary__title">
                  {summary.failed === 0
                    ? `All ${summary.succeeded} file${summary.succeeded !== 1 ? "s" : ""} uploaded successfully!`
                    : `${summary.succeeded} uploaded · ${summary.failed} failed`}
                </p>
                {summary.failed > 0 && (
                  <p className="usummary__sub">Fix the errors and retry the failed files.</p>
                )}
              </div>
              {summary.failed > 0 && (
                <button className="usummary__retry" onClick={retryFailed}>
                  Retry failed
                </button>
              )}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="uactions">
            <button
              id="upload-geojson-btn"
              className={`ubtn ubtn--primary ${( !uploadableCount || isUploading || (uploadMode === 'update' && !selectedCityId) ) ? "ubtn--disabled" : ""}`}
              onClick={handleUpload}
              disabled={ !uploadableCount || isUploading || (uploadMode === 'update' && !selectedCityId) }
            >
              {isUploading ? (
                <><span className="ubtn__spinner" /> Uploading…</>
              ) : (
                <><UploadIcon /> Upload {uploadableCount > 0 ? `${uploadableCount} File${uploadableCount !== 1 ? "s" : ""}` : "Files"}</>
              )}
            </button>

            {errorCount > 0 && !isUploading && (
              <button className="ubtn ubtn--outline" onClick={retryFailed}>
                Retry Failed ({errorCount})
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadGeoJson;
