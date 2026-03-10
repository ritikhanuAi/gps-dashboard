/**
 * Filter Action Buttons Component - Minimalistic design
 */
const FilterButtons = ({ onApplyFilter, onClearFilter }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onApplyFilter}
        className="px-4 py-2 btn-accent-secondary rounded-sm text-sm font-semibold myriad-pro-semibold whitespace-nowrap"
      >
        Apply Filter
      </button>
      <button
        onClick={onClearFilter}
        className="px-4 py-2 btn-danger-light rounded-sm text-sm font-semibold myriad-pro-semibold whitespace-nowrap"
      >
        Clear Filter
      </button>
    </div>
  );
};

export default FilterButtons;
