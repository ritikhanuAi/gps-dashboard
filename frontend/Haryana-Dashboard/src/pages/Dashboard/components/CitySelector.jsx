import { useEffect, useState } from "react";

/**
 * City Selector Component - Custom radio button dropdown
 */
const CitySelector = ({
  selectedCities,
  cityOptions,
  isLoadingCityData,
  onCityChange,
  onClearSelection,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector(".city-dropdown");
      if (dropdown && !dropdown.contains(event.target)) {
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

  return (
    <div className="relative city-dropdown">
      <label className="block text-sm font-semibold text-gray-700 mb-2 myriad-pro-semibold">
        City
      </label>
      <div className="relative">
        <div
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 min-h-[42px] flex items-center cursor-pointer hover:border-gray-400"
          onClick={() => !isLoadingCityData && setIsOpen(!isOpen)}
        >
          <span className="flex-1 flex items-center gap-2">
            {isLoadingCityData ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-gray-500">Loading cities...</span>
              </>
            ) : (
              selectedCities.length > 0
                ? selectedCities[0].label
                : "Select a city"
            )}
          </span>
          <span
            className={`text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>

        {/* Dropdown Options */}
        {isOpen && !isLoadingCityData && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {/* Clear Selection Option */}
            {selectedCities.length > 0 && (
              <div
                onClick={() => {
                  onClearSelection();
                  setIsOpen(false);
                }}
                className="px-3 py-2 hover:bg-red-50 cursor-pointer border-b border-gray-200 text-sm text-red-600 font-semibold"
              >
                ✕ Remove Selection
              </div>
            )}

            {/* City Options */}
            {cityOptions.map((city) => {
              const isSelected = selectedCities.some(
                (selected) => selected.value === city.value
              );
              return (
                <label
                  key={city.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="city-selection"
                    checked={isSelected}
                    onChange={() => {
                      onCityChange(city);
                      setIsOpen(false);
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{city.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitySelector;
