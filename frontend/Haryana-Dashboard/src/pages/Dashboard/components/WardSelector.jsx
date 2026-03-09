import { useEffect, useRef, useState } from "react";

/**
 * Ward Selector Component - Custom checkbox multi-select dropdown
 */
const WardSelector = ({
    selectedWards,
    wardOptions,
    isLoadingWard,
    onWardToggle,
    onClearWards,
    onSelectAllWards,
    disabled,
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
        ? wardOptions.filter((ward) =>
            ward.label.toLowerCase().includes(searchValue.toLowerCase())
        )
        : wardOptions;

    // Display text for the header
    const getDisplayText = () => {
        if (isLoadingWard) return null;
        if (selectedWards.length === 0) return "Select Wards";
        if (selectedWards.length === 1) return selectedWards[0].label;
        if (selectedWards.length === wardOptions.length) return "All Wards Selected";
        return `${selectedWards.length} Wards Selected`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2 myriad-pro-semibold">
                Ward
            </label>
            <div className="relative">
                <div
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 min-h-[42px] flex items-center cursor-pointer hover:border-gray-400 ${disabled ? "bg-gray-100 opacity-60 pointer-events-none" : ""
                        }`}
                    onClick={() => !disabled && !isLoadingWard && setIsOpen(!isOpen)}
                >
                    <span className="flex-1 flex items-center gap-2 truncate">
                        {isLoadingWard ? (
                            <>
                                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                                <span className="text-gray-500">Loading wards...</span>
                            </>
                        ) : (
                            <span className={selectedWards.length === 0 ? "text-gray-400" : ""}>
                                {getDisplayText()}
                            </span>
                        )}
                    </span>
                    {selectedWards.length > 0 && (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full mr-2">
                            {selectedWards.length}
                        </span>
                    )}
                    <span
                        className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    >
                        ▼
                    </span>
                </div>

                {/* Dropdown Options */}
                {isOpen && !isLoadingWard && !disabled && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden">
                        {/* Search Input */}
                        <div className="px-3 py-2 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="Search wards..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-400"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Select All / Clear All */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectAllWards();
                                }}
                                className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                            >
                                Select All ({wardOptions.length})
                            </button>
                            {selectedWards.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClearWards();
                                    }}
                                    className="text-xs text-red-600 font-semibold hover:text-red-800"
                                >
                                    ✕ Clear All
                                </button>
                            )}
                        </div>

                        {/* Ward Options */}
                        <div className="max-h-48 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((ward) => {
                                    const isSelected = selectedWards.some(
                                        (selected) => selected.value === ward.value
                                    );
                                    return (
                                        <label
                                            key={ward.value}
                                            className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${isSelected ? "bg-green-50" : ""
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onWardToggle(ward)}
                                                className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700 flex-1">
                                                {ward.label}
                                            </span>
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                    No wards found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WardSelector;
