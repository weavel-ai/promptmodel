import { ReactSVG } from "react-svg";

export const WeavelLogo = () => (
  <ReactSVG
    src="/weavel-logo.svg"
    beforeInjection={(svg) => {
      svg.setAttribute("style", "width: 28px; height: 28px;");
    }}
  />
);
