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
      // Constraints for resizing
      const minWidth = 200; // Minimum width for each pane
      const maxWidth = appRect.width - minWidth - 10; // 10 for grabber width

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      setPreviewWidth(newWidth);
    },
    [isDragging]
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
        let newWidth = previewWidth;
        const minWidth = 200;
        const grabberWidth = 10;
        const maxWidth = appRect.width - minWidth - grabberWidth;

        if (newWidth > maxWidth) {
          newWidth = maxWidth;
        }
        // Ensure previewWidth + chatWidth doesn't exceed total width
        if (previewWidth > appRect.width - minWidth - grabberWidth) {
          newWidth = appRect.width / 2; // Or some other default
        }
        setPreviewWidth(newWidth < minWidth ? minWidth : newWidth);
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
