import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import "./InputDropdown.scss";

// svg icons
import DownArrow from "../../assets/svgs/DownArrow";
import TopArrow from "../../assets/svgs/TopArrow";

const InputDropdown = ({
  value,
  name,
  onChange,
  width,
  label = "",
  disabled,
  placeholder,
  isSearchable = false,
  optionList,
  icon = null,
  isMandatory = false,
  style = {},
}) => {
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(value || "");
  const [searchValue, setSearchValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);
  // console.log("filteredOptions", name, " ", filteredOptions);

  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  const handleOptionClick = (option) => {
    setSelectedOption(option.label);
    setIsOpen(false);
    setSearchValue("");
    setFilteredOptions(optionList);

    const event = {
      target: {
        name: name,
        value: option.value,
      },
      selectedItem: option,
    };

    if (onChange) {
      onChange(event);
    }
  };

  useEffect(() => {
    setFilteredOptions(optionList);
  }, [optionList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const filtered = optionList?.filter((option) =>
      option.label.toString().toLowerCase().includes(searchValue.toLowerCase()),
    );
    setFilteredOptions(filtered);
  }, [searchValue]);

  return (
    <div
      ref={dropdownRef}
      className="dropdown-container"
      style={{ width: width }}
    >
      {label && (
        <div className="label-container">
          <label className="label-text myriad-pro-semibold">
            {label}
            {isMandatory && (
              <span
                className="ml-1"
                style={{ color: "#dc3545", fontSize: "0.9rem" }}
              >
                *
              </span>
            )}
          </label>
        </div>
      )}

      <div className="main-dropdown-container">
        <div
          className={`dropdown-header ${isOpen ? "active" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          style={{
            backgroundColor: disabled
              ? "var(--bg-light-grey)"
              : style.backgroundColor,
            ...style,
          }}
        >
          {icon && <span className="dropdown-icon">{icon}</span>}

          <p
            className={`myriad-pro-regular ${
              selectedOption ? "" : "placeholder-text"
            }`}
          >
            {selectedOption || placeholder}
          </p>

          {!disabled && (
            <span className="dropdown-arrow">
              {isOpen ? (
                <TopArrow height={"10"} width={"10"} />
              ) : (
                <DownArrow height={"10"} width={"10"} />
              )}
            </span>
          )}
        </div>

        {isOpen && (
          <div className="dropdown-options-container">
            {isSearchable && (
              <div className="search-container">
                <input
                  type="text"
                  name="search"
                  className="search-input"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            )}

            <div
              className="dropdown-options"
              style={{ marginTop: isSearchable ? "0" : "5px" }}
            >
              {filteredOptions?.length > 0 ? (
                filteredOptions?.map((option, index) => {
                  const label = option?.label || "";
                  const search = searchValue.trim().toLowerCase();

                  const matchIndex = label
                    .toString()
                    .toLowerCase()
                    .indexOf(search);

                  let highlightedLabel;

                  if (search && matchIndex !== -1) {
                    const beforeMatchText = label.slice(0, matchIndex);
                    const matchText = label.slice(
                      matchIndex,
                      matchIndex + search.length,
                    );
                    const afterMatchText = label.slice(
                      matchIndex + search.length,
                    );

                    highlightedLabel = (
                      <>
                        {beforeMatchText}
                        <span className="highlight-text">{matchText}</span>
                        {afterMatchText}
                      </>
                    );
                  } else {
                    highlightedLabel = label;
                  }

                  return (
                    <div
                      key={index}
                      className={`dropdown-option ${
                        option?.label === selectedOption ? "selected" : ""
                      }`}
                      onClick={() => handleOptionClick(option)}
                    >
                      <p className="myriad-pro-regular">{highlightedLabel}</p>
                    </div>
                  );
                })
              ) : (
                <div className="dropdown-option no-result">
                  No Results Found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

InputDropdown.propTypes = {
  value: PropTypes.any.isRequired,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  width: PropTypes.string,
  label: PropTypes.string,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  isSearchable: PropTypes.bool,
  optionList: PropTypes.array,
  icon: PropTypes.node,
  style: PropTypes.object,
};

export default InputDropdown;
