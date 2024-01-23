import { ReactSVG } from "react-svg";

export const WeavelLogo = ({ size = 28 }: { size?: number }) => (
  <ReactSVG
    src="/weavel-logo.svg"
    draggable="false"
    beforeInjection={(svg) => {
      svg.setAttribute("style", `width: ${size}px; height: ${size}px;`);
    }}
  />
);
