import "./loader.css";

const Loader = () => {
  return (
    <div className="loader-overlay">
      <div className="loader-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>

        <div className="loader-core"></div>

        <div className="loader-text">LOADING</div>
      </div>
    </div>
  );
};

export default Loader;
