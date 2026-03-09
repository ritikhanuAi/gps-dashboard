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
      d="m16.719 19.752-.64-5.124A3 3 0 0 0 13.101 12h-2.204a3 3 0 0 0-2.976 2.628l-.641 5.124A2 2 0 0 0 9.266 22h5.468a2 2 0 0 0 1.985-2.248Z"
    />
    <circle cx={12} cy={5} r={3} stroke="#000" strokeWidth={2} />
    <circle cx={4} cy={9} r={2} stroke="#000" strokeWidth={2} />
    <circle cx={20} cy={9} r={2} stroke="#000" strokeWidth={2} />
    <path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 14h-.306a2 2 0 0 0-1.973 1.671l-.333 2A2 2 0 0 0 3.361 20H7M20 14h.306a2 2 0 0 1 1.973 1.671l.333 2A2 2 0 0 1 20.639 20H17"
    />
  </svg>
);
export default SvgComponent;
