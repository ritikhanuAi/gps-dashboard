import * as React from "react";

const TopArrow = (props) => (
  <svg
    width={props?.width}
    height={props?.height}
    className="icon"
    viewBox="0 0 1024 1024"
    {...props}
  >
    <path d="M903.232 768 960 717.568 512 256 64 717.568 120.768 768 512 364.928z" />
  </svg>
);

export default TopArrow;
