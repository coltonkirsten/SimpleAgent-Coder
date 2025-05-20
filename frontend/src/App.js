import React, { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import Chat from "./components/Chat/Chat";
import PreviewWindow from "./components/PreviewWindow/PreviewWindow";

function App() {
  const [previewWidth, setPreviewWidth] = useState(window.innerWidth / 2);
  const [isDragging, setIsDragging] = useState(false);
  const appRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    // Prevent text selection while dragging
    e.preventDefault();
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !appRef.current) return;
      const appRect = appRef.current.getBoundingClientRect();
      let newWidth = e.clientX - appRect.left;
      const minPaneSize = 400; // Preferred minimum for each pane
      const grabberSize = 10;

      // Calculate the effective min and max for the preview pane
      const lowerBound = minPaneSize;
      // Preview pane can be at most total_width - minPaneSize (for chat) - grabberSize
      const upperBound = appRect.width - minPaneSize - grabberSize;

      // Apply the primary clamping based on preferred minimums
      if (newWidth < lowerBound) {
        newWidth = lowerBound;
      }
      // This handles if upperBound itself is < lowerBound (window too small for two preferredMinPanes)
      if (newWidth > upperBound) {
        newWidth = upperBound;
      }

      // Final safety net: ensure width is within [0, total_available_for_preview]
      newWidth = Math.max(0, newWidth);
      newWidth = Math.min(newWidth, appRect.width - grabberSize);

      setPreviewWidth(newWidth);
    },
    [isDragging] // Removed appRef from deps, it's stable from useRef
  );

  useEffect(() => {
    const currentHandleMouseUp = handleMouseUp;
    const currentHandleMouseMove = handleMouseMove;

    document.addEventListener("mousemove", currentHandleMouseMove);
    document.addEventListener("mouseup", currentHandleMouseUp);

    return () => {
      document.removeEventListener("mousemove", currentHandleMouseMove);
      document.removeEventListener("mouseup", currentHandleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Adjust width on window resize
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current) {
        const appRect = appRef.current.getBoundingClientRect();
        let adjustedWidth = previewWidth; // Start with current state value
        const minPaneSize = 200;
        const grabberSize = 10;

        const lowerBound = minPaneSize;
        const upperBound = appRect.width - minPaneSize - grabberSize;

        // If current previewWidth is too small, adjust it up
        if (adjustedWidth < lowerBound) {
          adjustedWidth = lowerBound;
        }
        // If current previewWidth is too large (making other pane too small), adjust it down
        // This also handles the case where upperBound < lowerBound
        if (adjustedWidth > upperBound) {
          adjustedWidth = upperBound;
        }

        // Final safety net for the adjusted width
        adjustedWidth = Math.max(0, adjustedWidth);
        adjustedWidth = Math.min(adjustedWidth, appRect.width - grabberSize);

        if (adjustedWidth !== previewWidth) {
          setPreviewWidth(adjustedWidth);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    // Initial call to set width correctly
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [previewWidth]);

  return (
    <div className="App" ref={appRef}>
      <div className="app-container">
        <div className="preview-pane" style={{ width: `${previewWidth}px` }}>
          {isDragging && <div className="drag-overlay"></div>}
          <PreviewWindow />
        </div>
        <div className="grabber" onMouseDown={handleMouseDown}>
          <div className="grabber-pill"></div>
        </div>
        <div
          className="chat-pane"
          style={{ width: `calc(100% - ${previewWidth}px - 10px)` }} // 10px for grabber
        >
          <Chat />
        </div>
      </div>
    </div>
  );
}

export default App;
