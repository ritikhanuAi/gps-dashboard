import { useEffect, useRef, useState } from "react";

/**
 * Road Selector Component - Clean checkbox multi-select dropdown
 */
const RoadSelector = ({
    selectedRoads,
    roadOptions,
    isLoadingRoad,
    onRoadToggle,
    onClearRoads,
    onSelectAllRoads,
    disabled,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isOpen]);

    const filteredOptions = searchValue
        ? roadOptions.filter((road) =>
            road.label.toLowerCase().includes(searchValue.toLowerCase())
        )
        : roadOptions;

    const getDisplayText = () => {
        if (isLoadingRoad) return null;
        if (selectedRoads.length === 0) return "Select Roads";
        if (selectedRoads.length === 1) return selectedRoads[0].label;
        if (selectedRoads.length === roadOptions.length) return "All Roads";
        return `${selectedRoads.length} Roads`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider myriad-pro-semibold">
                Road
            </label>
            <div className="relative">
                <div
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white min-h-[38px] flex items-center cursor-pointer transition-colors ${disabled
                            ? "bg-gray-50 opacity-50 pointer-events-none border-gray-100"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                    onClick={() => !disabled && !isLoadingRoad && setIsOpen(!isOpen)}
                >
                    <span className="flex-1 flex items-center gap-2 truncate">
                        {isLoadingRoad ? (
                            <>
                                <div className="w-3.5 h-3.5 border-[1.5px] border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
                                <span className="text-xs text-gray-400">Loading…</span>
                            </>
                        ) : (
                            <span className={`text-sm ${selectedRoads.length === 0 ? "text-gray-400" : "text-gray-700"}`}>
                                {getDisplayText()}
                            </span>
                        )}
                    </span>
                    {selectedRoads.length > 0 && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mr-1.5">
                            {selectedRoads.length}
                        </span>
                    )}
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {isOpen && !isLoadingRoad && !disabled && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden">
                        {/* Search */}
                        <div className="px-3 py-2 border-b border-gray-100">
                            <input
                                type="text"
                                placeholder="Search…"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectAllRoads(); }}
                                className="text-[10px] text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                            >
                                Select All ({roadOptions.length})
                            </button>
                            {selectedRoads.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onClearRoads(); }}
                                    className="text-[10px] text-gray-400 font-semibold hover:text-red-500 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto road-dropdown-scroll">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((road) => {
                                    const isSelected = selectedRoads.some((s) => s.value === road.value);
                                    return (
                                        <label
                                            key={road.value}
                                            className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors ${isSelected ? "bg-blue-50/50" : ""
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onRoadToggle(road)}
                                                className="mr-2.5 h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span className="text-xs text-gray-700 flex-1 truncate">
                                                {road.label}
                                            </span>
                                            <span className="text-[10px] text-gray-300 ml-2 font-mono">
                                                #{road.value}
                                            </span>
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-4 text-xs text-gray-400 text-center">
                                    No roads found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoadSelector;
