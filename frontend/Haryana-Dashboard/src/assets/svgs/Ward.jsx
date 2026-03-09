import * as React from "react";
const SvgComponent = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props?.width}
    height={props?.height}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 21V3.9S5.875 3 8.5 3s4.375 1.8 7 1.8 3.5-.9 3.5-.9v10.8s-.875.9-3.5.9-4.375-1.8-7-1.8-3.5.9-3.5.9"
    />
  </svg>
);
export default SvgComponent;
