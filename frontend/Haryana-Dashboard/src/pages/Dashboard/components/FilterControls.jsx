import InputDropdown from "../../../component/InputDropdown/InputDropdown";
import CitySelector from "./CitySelector";
import FilterButtons from "./FilterButtons";
import RoadSelector from "./RoadSelector";

/**
 * Filter Controls Component - All filter dropdowns and buttons
 */
const FilterControls = ({
  // City
  selectedCities,
  cityOptions,
  isLoadingCityData,
  onCityChange,
  onClearSelection,
  // Municipal Council
  selectedMunicipalCouncil,
  onMunicipalCouncilChange,
  municipalCouncilOptions,
  isLoadingMunicipalCouncil,
  // Ward
  selectedWard,
  onWardChange,
  wardOptions,
  isLoadingWard,
  // Road
  selectedRoads,
  onRoadToggle,
  onClearRoads,
  onSelectAllRoads,
  roadOptions,
  isLoadingRoad,
  // Actions
  onApplyFilter,
  onClearFilter,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      {/* City Selector */}
      <CitySelector
        selectedCities={selectedCities}
        cityOptions={cityOptions}
        isLoadingCityData={isLoadingCityData}
        onCityChange={onCityChange}
        onClearSelection={onClearSelection}
      />

      {/* Municipal Council - Enabled only when city selected */}
      <div className="relative">
        <InputDropdown
          label="Municipal Council"
          value={selectedMunicipalCouncil}
          onChange={(e) => onMunicipalCouncilChange(e.selectedItem.label, e.selectedItem)}
          optionList={municipalCouncilOptions}
          placeholder={"Select Council"}
          name="municipalCouncil"
          width="100%"
          isSearchable
          disabled={selectedCities.length === 0}
        />
      </div>

      {/* Ward - Single select dropdown */}
      <div className="relative">
        <InputDropdown
          label="Ward"
          value={selectedWard}
          onChange={(e) => onWardChange(e.selectedItem.value)}
          optionList={wardOptions}
          placeholder={"Select Ward"}
          name="ward"
          width="100%"
          isSearchable
          disabled={selectedMunicipalCouncil === "" || selectedCities.length === 0}
        />
      </div>

      {/* Road - Checkbox multi-select, enabled only when ward selected */}
      <RoadSelector
        selectedRoads={selectedRoads}
        roadOptions={roadOptions}
        isLoadingRoad={isLoadingRoad}
        onRoadToggle={onRoadToggle}
        onClearRoads={onClearRoads}
        onSelectAllRoads={onSelectAllRoads}
        disabled={selectedWard === "" || selectedCities.length === 0}
      />

      {/* Action Buttons */}
      <FilterButtons onApplyFilter={onApplyFilter} onClearFilter={onClearFilter} />
    </div>
  );
};

export default FilterControls;
