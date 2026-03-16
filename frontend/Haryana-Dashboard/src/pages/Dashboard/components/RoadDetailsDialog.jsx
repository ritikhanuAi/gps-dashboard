import { useEffect, useState } from "react";
import { fetchRoadDetailsById } from "../../../api/RoadApi";

const RoadDetailsDialog = ({ roadId, onClose }) => {
  const [roadDetails, setRoadDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roadId) return;

    const loadDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchRoadDetailsById(roadId);
        if (response && response.data) {
          setRoadDetails(response.data);
        } else {
          setError("No details found for this road.");
        }
      } catch (err) {
        console.error("Failed to load road details:", err);
        setError("Failed to load road details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [roadId]);

  if (!roadId) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div 
        className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl border border-white/40 overflow-hidden transform animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/50 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 myriad-pro-semibold">Road Details</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto thin-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 font-medium tracking-wide">Fetching details...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : roadDetails ? (
            <div className="space-y-4">
              
              {/* ID & Name Section */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Road ID</span>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">#{roadDetails.id}</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1">Path</span>
                  <p className="font-semibold text-slate-800 text-sm leading-relaxed">
                    {roadDetails.start_pt ? roadDetails.start_pt.trim() : "Unknown"} 
                    <span className="text-slate-300 mx-2">→</span> 
                    {roadDetails.end_pt ? roadDetails.end_pt.trim() : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Ward" value={roadDetails.ward} />
                <DetailItem label="Source" value={roadDetails.source} />
                <DetailItem label="Width (m)" value={roadDetails.width} />
                <DetailItem label="Carriage" value={roadDetails.carriage} />
                <DetailItem label="GIS Length" value={roadDetails.gis_length} />
                <DetailItem label="Doc Length" value={roadDetails.lengthdoc} />
              </div>

              {/* Constituency */}
              {roadDetails.mla_cons && (
                <div className="mt-3">
                  <DetailItem label="MLA Constituency" value={roadDetails.mla_cons.trim()} fullWidth />
                </div>
              )}
              
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Helper component for detail items
const DetailItem = ({ label, value, fullWidth = false }) => (
  <div className={`bg-white rounded-lg p-3 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] ${fullWidth ? 'col-span-2 flex justify-between items-center' : 'flex flex-col gap-1'}`}>
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-semibold text-slate-700 truncate">{value !== null && value !== undefined && value !== "" ? value : "—"}</span>
  </div>
);

export default RoadDetailsDialog;
