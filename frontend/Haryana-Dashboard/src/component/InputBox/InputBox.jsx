import React, { useState } from "react";
import "./InputBox.scss";
import PropTypes from "prop-types";
import {
  InfoIcon,
  PasswordClosedEye,
  PasswordOpenEye,
} from "../../../assets/svgs";

const InputBox = ({
  width,
  labelPosition,
  label,
  icon = null,
  type,
  name,
  placeholder,
  value,
  checked,
  onChange,
  onFocus,
  onBlur,
  showInfo,
  infoText,
  disabled = false,
  row,
  autoComplete,
  onKeyDown,
  isMandatory = false,
  maxLength,
  min,
  step,
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  const toggleShowPassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div
      className={`input-box-container ${
        labelPosition === "left" ? "label-left" : ""
      }`}
      style={{ width: width }}
    >
      {label && (
        <div className="label-section">
          <label className="label">
            {" "}
            <div className="label-container">
              <label className="label-text myriad-pro-semibold">
                {label}
                {isMandatory && (
                  <span
                    className="ml-1"
                    style={{ color: "var(--danger)", fontSize: "0.9rem" }}
                  >
                    *
                  </span>
                )}
              </label>
            </div>
          </label>

          {showInfo && (
            <InfoIcon
              size={15}
              color={"var(--text-medium-grey)"}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setShowInfoPopup(true)}
              onMouseLeave={() => setShowInfoPopup(false)}
              
            />
          )}

          {showInfoPopup && (
            <div className="info-container">
              <p className="info-text">{infoText}</p>
            </div>
          )}
        </div>
      )}

      <div
        className={`input-box-inner-container ${disabled ? "disabled" : ""} ${
          type === "checkbox" ? "checkbox-container" : ""
        }`}
        style={{ backgroundColor: disabled && "var(--bg-light-grey)" }}
      >
        {icon && icon}

        {type === "textarea" ? (
          <textarea
            className="input-box"
            name={name}
            rows={row}
            value={value}
            onChange={(val) => onChange(val)}
            disabled={disabled}
            
          ></textarea>
        ) : (
          <div className="input-wrapper">
            <input
              style={
                type === "checkbox"
                  ? { width: "fit-content", flex: "none" }
                  : { flex: 1 }
              }
              type={
                type === "password"
                  ? passwordVisible
                    ? "text"
                    : "password"
                  : type
              }
              name={name}
              placeholder={placeholder}
              className="input-box"
              value={value}
              checked={type === "checkbox" && checked}
              onChange={(val) => {
                if (type === "checkbox") {
                  onChange(!checked);
                  return;
                }
                onChange(val);
              }}
              onFocus={onFocus}
              onBlur={onBlur}
              disabled={disabled}
              autoComplete={autoComplete && autoComplete}
              onKeyDown={onKeyDown}
              maxLength={maxLength ?? maxLength}
              min={min && min}
              step={step && step}
            />

            {type === "password" && (
              <div className="eye-icon" onClick={toggleShowPassword}>
                {passwordVisible ? (
                  <PasswordClosedEye
                    size={18}
                    color={"var(--text-medium-grey)"}
                  />
                ) : (
                  <PasswordOpenEye
                    size={18}
                    color={"var(--text-medium-grey)"}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

InputBox.propTypes = {
  width: PropTypes.string,
  labelPosition: PropTypes.string,
  label: PropTypes.string,
  icon: PropTypes.node,
  type: PropTypes.string,
  name: PropTypes.string,
  placeholder: PropTypes.string,
  value: function (props, propName, componentName) {
    if (
      props.type !== "checkbox" &&
      (props[propName] === undefined || props[propName] === null)
    ) {
      return new Error(
        `The prop \`${propName}\` is marked as required in \`${componentName}\` when type is not 'checkbox'.`
      );
    }
  },
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  autoComplete: PropTypes.string,
};

export default InputBox;
