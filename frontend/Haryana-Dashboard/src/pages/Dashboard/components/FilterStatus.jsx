/**
 * Filter Status Messages Component - Subtle minimalistic style
 */
const FilterStatus = ({ isLoadingCityData, selectedCities }) => {
  return (
    <>
      {isLoadingCityData && (
        <div className="mt-3 py-2.5 px-4 bg-blue-50/60 rounded-lg flex items-center gap-2 text-blue-600 text-xs">
          <div className="w-3.5 h-3.5 border-[1.5px] border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="font-medium myriad-pro-semibold">Loading cities…</span>
        </div>
      )}

      {!isLoadingCityData && selectedCities.length === 0 && (
        <div className="mt-3 py-2.5 px-4 bg-amber-50/60 rounded-lg text-amber-600 text-xs font-medium myriad-pro-semibold">
          Select a city to get started
        </div>
      )}
    </>
  );
};

export default FilterStatus;
