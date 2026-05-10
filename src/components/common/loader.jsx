import "./loader.css";

const Loader = () => {
  return (
    <div className="loader-overlay">
      <div className="loader-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <span className="loader-text">Loading...</span>
      </div>
    </div>
  );
};

export default Loader;