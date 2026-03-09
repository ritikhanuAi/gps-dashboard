/**
 * Filter Action Buttons Component - Minimalistic design
 */
const FilterButtons = ({ onApplyFilter, onClearFilter }) => {
  return (
    <div className="flex gap-2 items-end pb-0.5">
      <button
        onClick={onApplyFilter}
        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold myriad-pro-semibold whitespace-nowrap transition-colors"
      >
        Apply
      </button>
      <button
        onClick={onClearFilter}
        className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold myriad-pro-semibold whitespace-nowrap transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

export default FilterButtons;
