import React, { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";
import Chat from "./components/Chat/Chat";
import PreviewWindow from "./components/PreviewWindow/PreviewWindow";
import DrawingPanel from "./components/DrawingPanel/DrawingPanel";

function App() {
  const [previewWidth, setPreviewWidth] = useState(window.innerWidth / 2);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [isDrawingPanelOpen, setIsDrawingPanelOpen] = useState(false);
  const [hasDrawings, setHasDrawings] = useState(false);
  const [drawingSettings, setDrawingSettings] = useState({
    tool: "pen",
    color: "#000000",
    brushSize: 3,
  });
  const appRef = useRef(null);
  const chatRef = useRef(null);
  const previewRef = useRef(null);

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
      const minPaneSize = 450; // Preferred minimum for each pane
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
        setPreviewWidth((currentWidth) => {
          let adjustedWidth = currentWidth; // Use current state value
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

          return adjustedWidth;
        });
      }
    };
    window.addEventListener("resize", handleResize);
    // Initial call to set width correctly
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array - only run once on mount

  const handleShowChat = () => {
    setIsChatHidden(false);
  };

  const handleHideChat = () => {
    setIsChatHidden(true);
  };

  const handleToggleDrawingPanel = () => {
    setIsDrawingPanelOpen(!isDrawingPanelOpen);
    if (isDrawingPanelOpen) {
      // Reset drawing state when closing
      setHasDrawings(false);
    }
  };

  const handleImageCaptured = (base64Image) => {
    // Directly pass the image to the chat component
    if (chatRef.current && chatRef.current.setSelectedImage) {
      chatRef.current.setSelectedImage(base64Image);
    }
  };

  const handleDrawingStart = () => {
    setHasDrawings(true);
  };

  const handleFinishDrawing = () => {
    // Trigger screenshot capture in PreviewWindow
    if (previewRef.current && previewRef.current.captureScreenshot) {
      previewRef.current.captureScreenshot();
    }
  };

  const handleCancelDrawing = () => {
    setHasDrawings(false);
    setIsDrawingPanelOpen(false);
  };

  const handleToolChange = useCallback((settings) => {
    setDrawingSettings(settings);
  }, []);

  const drawingPanelHeight = 190; // Height of drawing panel content

  return (
    <div className="App" ref={appRef}>
      <div className="app-container">
        <div
          className="preview-section"
          style={{
            width: isChatHidden ? "100%" : `${previewWidth}px`,
          }}
        >
          <div
            className="preview-pane"
            style={{
              height: isDrawingPanelOpen
                ? `calc(100% - ${drawingPanelHeight}px)`
                : "100%",
            }}
          >
            {isDragging && <div className="drag-overlay"></div>}
            <PreviewWindow
              ref={previewRef}
              isDrawingPanelOpen={isDrawingPanelOpen}
              onToggleDrawingPanel={handleToggleDrawingPanel}
              onImageCaptured={handleImageCaptured}
              onDrawingStart={handleDrawingStart}
              drawingSettings={drawingSettings}
            />
          </div>
          {isDrawingPanelOpen && (
            <div
              className="drawing-pane"
              style={{ height: `${drawingPanelHeight}px` }}
            >
              <DrawingPanel
                onClose={handleToggleDrawingPanel}
                onFinishDrawing={handleFinishDrawing}
                onCancelDrawing={handleCancelDrawing}
                hasDrawings={hasDrawings}
                onToolChange={handleToolChange}
              />
            </div>
          )}
        </div>
        {!isChatHidden && (
          <>
            <div className="grabber" onMouseDown={handleMouseDown}>
              <div className="grabber-pill"></div>
            </div>
            <div
              className="chat-pane"
              style={{ width: `calc(100% - ${previewWidth}px - 10px)` }} // 10px for grabber
            >
              <Chat ref={chatRef} onHideChat={handleHideChat} />
            </div>
          </>
        )}
        {isChatHidden && (
          <div className="grabber show-chat-grabber" onClick={handleShowChat}>
            <div className="grabber-pill"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
