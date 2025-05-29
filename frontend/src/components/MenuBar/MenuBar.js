import React from "react";
import { FiRefreshCw, FiEyeOff, FiEdit3, FiFolder } from "react-icons/fi";
import "./MenuBar.css";

function MenuBar({
  type,
  onResetChat,
  onHideChat,
  onDrawMode,
  onProjectManager,
  isVisible,
  isDrawModeActive,
}) {
  const renderButtons = () => {
    if (type === "chat") {
      return (
        <>
          <button
            className="menu-button"
            onClick={onResetChat}
            title="Reset Chat"
          >
            <FiRefreshCw />
          </button>
          <button
            className="menu-button"
            onClick={onHideChat}
            title="Hide Chat"
          >
            <FiEyeOff />
          </button>
        </>
      );
    } else if (type === "preview") {
      return (
        <>
          <button
            className="menu-button"
            onClick={onProjectManager}
            title="Project Manager"
          >
            <FiFolder />
          </button>
          <button
            className={`menu-button ${isDrawModeActive ? "active" : ""}`}
            onClick={onDrawMode}
            title="Draw Mode"
          >
            <FiEdit3 />
          </button>
        </>
      );
    }
    return null;
  };

  return (
    <div className={`menu-bar ${isVisible ? "visible" : ""}`}>
      <div className="menu-buttons">{renderButtons()}</div>
    </div>
  );
}

export default MenuBar;
