import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import html2canvas from "html2canvas";
import MenuBar from "../MenuBar/MenuBar";
import DrawingCanvas from "../DrawingCanvas/DrawingCanvas";
import ProjectModal from "../ProjectModal/ProjectModal";
import "./PreviewWindow.css";

const PreviewWindow = forwardRef(
  (
    {
      isDrawingPanelOpen,
      onToggleDrawingPanel,
      onImageCaptured,
      onDrawingStart,
      drawingSettings,
    },
    ref
  ) => {
    const [iframeSrc, setIframeSrc] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [hasDrawings, setHasDrawings] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const containerRef = useRef(null);
    const iframeRef = useRef(null);

    const handleDrawMode = () => {
      onToggleDrawingPanel();
    };

    const handleProjectManager = () => {
      setIsProjectModalOpen(true);
    };

    const handleCloseProjectModal = () => {
      setIsProjectModalOpen(false);
    };

    const handleOpenProject = async (fullProjectName) => {
      try {
        const response = await fetch("http://localhost:8000/serve_project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ full_project_name: fullProjectName }),
        });

        if (response.ok) {
          const data = await response.json();
          setIframeSrc(data.url);
          setCurrentProject(fullProjectName);
          setIsProjectModalOpen(false); // Close modal after opening project
          console.log(data.message);
        } else {
          console.error("Failed to serve project");
        }
      } catch (error) {
        console.error("Error serving project:", error);
      }
    };

    const handleMouseMove = (e) => {
      if (containerRef.current && !isDrawingPanelOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        setIsMenuVisible(mouseY < 60); // Show menu when mouse is within 60px of top
      }
    };

    const handleMouseLeave = () => {
      setIsMenuVisible(false);
    };

    const handleDrawingStartInternal = () => {
      setHasDrawings(true);
      if (onDrawingStart) {
        onDrawingStart();
      }
    };

    const handleFinishDrawing = async () => {
      try {
        // Capture the entire preview window content including iframe and drawings
        const element = containerRef.current;

        const canvas = await html2canvas(element, {
          allowTaint: true,
          useCORS: true,
          scale: 1,
          logging: false,
          backgroundColor: "#ffffff",
        });

        // Convert to base64
        const base64Image = canvas.toDataURL("image/png");

        // Pass the image to the chat component
        if (onImageCaptured) {
          onImageCaptured(base64Image);
        }

        // Close drawing panel and reset state
        handleCancelDrawing();
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        alert("Failed to capture screenshot. Please try again.");
      }
    };

    const handleCancelDrawing = () => {
      setHasDrawings(false);
      onToggleDrawingPanel(); // Close the drawing panel
    };

    // Hide menu when drawing panel opens
    useEffect(() => {
      if (isDrawingPanelOpen) {
        setIsMenuVisible(false);
      }
    }, [isDrawingPanelOpen]);

    // Expose captureScreenshot method to parent
    useImperativeHandle(ref, () => ({
      captureScreenshot: handleFinishDrawing,
    }));

    return (
      <div
        className="preview-window-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <MenuBar
          type="preview"
          onDrawMode={handleDrawMode}
          onProjectManager={handleProjectManager}
          isVisible={isMenuVisible}
          isDrawModeActive={isDrawingPanelOpen}
        />

        <div className="preview-window-content">
          {iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Project Preview"
              className={`preview-iframe ${
                isDrawingPanelOpen ? "drawing-mode" : ""
              }`}
            ></iframe>
          ) : (
            <div className="no-preview-message">
              Open the Project Manager and click the arrow button to preview a
              project.
            </div>
          )}

          {isDrawingPanelOpen && (
            <DrawingCanvas
              isActive={isDrawingPanelOpen}
              tool={drawingSettings.tool}
              color={drawingSettings.color}
              brushSize={drawingSettings.brushSize}
              onFinishDrawing={handleFinishDrawing}
              onCancelDrawing={handleCancelDrawing}
              onDrawingStart={handleDrawingStartInternal}
            />
          )}
        </div>

        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={handleCloseProjectModal}
          onOpenProject={handleOpenProject}
        />
      </div>
    );
  }
);

export default PreviewWindow;
