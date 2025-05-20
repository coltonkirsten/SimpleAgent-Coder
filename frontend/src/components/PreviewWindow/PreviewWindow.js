import React, { useState } from "react";
import "./PreviewWindow.css";

function PreviewWindow() {
  const [iframeSrc, setIframeSrc] = useState(null);

  const handleConnect = () => {
    const url = window.prompt(
      "Enter the localhost URL (e.g., http://localhost:3000):"
    );
    if (url) {
      // Basic validation for localhost URLs, can be made more robust
      if (
        url.startsWith("http://localhost:") ||
        url.startsWith("https://localhost:")
      ) {
        setIframeSrc(url);
      } else {
        alert(
          "Invalid URL. Please enter a valid localhost URL (e.g., http://localhost:3000)."
        );
      }
    }
  };

  return (
    <div className="preview-window-container">
      <div className="preview-window-header">
        {!iframeSrc ? (
          <button className="connect-button" onClick={handleConnect}>
            Connect to Localhost
          </button>
        ) : (
          <button
            className="connect-button change-url-button"
            onClick={handleConnect}
          >
            Change URL
          </button>
        )}
      </div>
      <div className="preview-window-content">
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            title="Localhost Preview"
            className="preview-iframe"
          ></iframe>
        ) : (
          <div className="no-preview-message">
            Click "Connect to Localhost" to preview your web app.
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewWindow;
