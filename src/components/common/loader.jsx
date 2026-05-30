import { FourSquare } from "react-loading-indicators";
import "./loader.css";

const brandLoaderColors = ["#7c3aed", "#ec4899", "#06b6d4", "#9ed7ff"];

const Loader = () => {
  return (
    <div className="loader-overlay">
      <div className="loader-spinner" aria-label="Loading">
        <FourSquare color={brandLoaderColors} size="medium" text="" textColor="#edf2ff" />
      </div>
    </div>
  );
};

export default Loader;
