import { FourSquare } from "react-loading-indicators";
import "./loader.css";

const brandLoaderColors = ["#7c3aed", "#ec4899", "#06b6d4", "#9ed7ff"];

const Loader = ({ mode = "screen", label = "Loading" }) => {
  return (
    <div className={`loader-overlay ${mode === "panel" ? "panel" : ""}`}>
      <div className="loader-spinner" aria-label={label}>
        <FourSquare color={brandLoaderColors} size="medium" text="" textColor="#edf2ff" />
      </div>
    </div>
  );
};

export default Loader;
