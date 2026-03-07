import * as React from "react";

const DownArrow = (props) => (
  <svg
    width={props?.width}
    height={props?.height}
    className="icon"
    viewBox="0 0 1024 1024"
    {...props}
  >
    <path d="M903.232 256 960 306.432 512 768 64 306.432 120.768 256 512 659.072z" />
  </svg>
);

export default DownArrow;
