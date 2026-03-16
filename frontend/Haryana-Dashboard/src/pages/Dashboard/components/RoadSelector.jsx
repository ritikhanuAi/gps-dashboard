import { useEffect, useRef, useState } from "react";

/**
 * Road Selector Component - Custom checkbox multi-select dropdown
 * Features: Clear Roads button on top, checkboxes on each road, search, select all
 */
const RoadSelector = ({
    selectedRoads,
    roadOptions,
    isLoadingRoad,
    onRoadToggle,
    onClearRoads,
    onSelectAllRoads,
    disabled,
    icon,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [isOpen]);

    // Filter options by search
    const filteredOptions = searchValue
        ? roadOptions.filter((road) =>
            road.label.toLowerCase().includes(searchValue.toLowerCase())
        )
        : roadOptions;

    // Display text for the header
    const getDisplayText = () => {
        if (isLoadingRoad) return null;
        if (selectedRoads.length === 0) return "Select Roads";
        if (selectedRoads.length === 1) return selectedRoads[0].label;
        if (selectedRoads.length === roadOptions.length) return "All Roads Selected";
        return `${selectedRoads.length} Roads Selected`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1 myriad-pro-semibold">
                Road
            </label>

            {/* Clear Roads button — always visible when roads are selected */}
            {selectedRoads.length > 0 && !disabled && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClearRoads();
                    }}
                    className="mb-1 text-xs text-red-500 font-semibold hover:text-red-700 transition-colors flex items-center gap-1"
                >
                    <span>✕</span> Clear Roads ({selectedRoads.length})
                </button>
            )}

            <div className="relative">
                <div
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 min-h-[38px] flex items-center cursor-pointer hover:border-gray-400 transition-colors ${disabled ? "bg-gray-100 opacity-60 pointer-events-none" : ""
                        }`}
                    onClick={() => !disabled && !isLoadingRoad && setIsOpen(!isOpen)}
                >
                    {icon && <span className="mr-2 flex-shrink-0 flex items-center">{icon}</span>}
                    <span className="flex-1 flex items-center gap-2 truncate">
                        {isLoadingRoad ? (
                            <>
                                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                                <span className="text-gray-500">Loading roads...</span>
                            </>
                        ) : (
                            <span className={selectedRoads.length === 0 ? "text-gray-400" : ""}>
                                {getDisplayText()}
                            </span>
                        )}
                    </span>
                    {selectedRoads.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full mr-2">
                            {selectedRoads.length}
                        </span>
                    )}
                    <span
                        className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                            }`}
                    >
                        ▼
                    </span>
                </div>

                {/* Dropdown Options */}
                {isOpen && !isLoadingRoad && !disabled && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                        {/* Search Input */}
                        <div className="px-3 py-2 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="Search roads..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-400"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Select All / Clear All bar */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectAllRoads();
                                }}
                                className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                            >
                                Select All ({roadOptions.length})
                            </button>
                            {selectedRoads.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClearRoads();
                                    }}
                                    className="text-xs text-red-600 font-semibold hover:text-red-800 transition-colors"
                                >
                                    ✕ Clear All
                                </button>
                            )}
                        </div>

                        {/* Road Options with checkboxes */}
                        <div className="max-h-52 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((road) => {
                                    const isSelected = selectedRoads.some(
                                        (selected) => selected.value === road.value
                                    );
                                    return (
                                        <label
                                            key={road.value}
                                            className={`flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onRoadToggle(road)}
                                                className="mr-2.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer accent-blue-600"
                                            />
                                            <span className={`text-sm flex-1 ${isSelected ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                                {road.label}
                                            </span>
                                            {isSelected && (
                                                <span className="text-blue-500 text-xs">✓</span>
                                            )}
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-4 text-sm text-gray-400 text-center">
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
