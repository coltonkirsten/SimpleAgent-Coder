import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
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
    const [projectContent, setProjectContent] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [hasDrawings, setHasDrawings] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [currentProjectName, setCurrentProjectName] = useState(null);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const resizeTimeoutRef = useRef(null);
    const wsRef = useRef(null);

    // Debounced resize handler to simulate browser resize behavior
    const triggerProjectResize = useCallback(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (contentRef.current) {
          // Create and dispatch resize events to simulate browser behavior
          const resizeEvent = new Event("resize");
          window.dispatchEvent(resizeEvent);

          // Also trigger any project-specific resize handlers
          const projectContainer = contentRef.current.querySelector(
            ".project-content-container"
          );
          if (projectContainer) {
            const containerRect = projectContainer.getBoundingClientRect();

            // Update CSS custom properties for responsive design
            projectContainer.style.setProperty(
              "--container-width",
              `${containerRect.width}px`
            );
            projectContainer.style.setProperty(
              "--container-height",
              `${containerRect.height}px`
            );

            const customEvent = new CustomEvent("containerResize", {
              detail: {
                width: containerRect.width,
                height: containerRect.height,
              },
            });
            projectContainer.dispatchEvent(customEvent);

            // Force a reflow to ensure layout updates
            // eslint-disable-next-line no-unused-expressions
            projectContainer.offsetHeight;
          }
        }
      }, 100); // 100ms debounce
    }, []);

    // Set up ResizeObserver to detect container size changes
    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Trigger resize when container dimensions change
          triggerProjectResize();
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }, [triggerProjectResize]);

    // Trigger resize when drawing panel state changes
    useEffect(() => {
      triggerProjectResize();
    }, [isDrawingPanelOpen, triggerProjectResize]);

    const handleDrawMode = () => {
      onToggleDrawingPanel();
    };

    const handleProjectManager = () => {
      setIsProjectModalOpen(true);
    };

    const handleCloseProjectModal = () => {
      setIsProjectModalOpen(false);
    };

    const processHtmlContent = (htmlContent, baseUrl) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Update relative paths for assets
      const updateAssetPaths = (elements, attribute) => {
        elements.forEach((element) => {
          const src = element.getAttribute(attribute);
          if (
            src &&
            !src.startsWith("http") &&
            !src.startsWith("//") &&
            !src.startsWith("data:")
          ) {
            element.setAttribute(attribute, baseUrl + src);
          }
        });
      };

      updateAssetPaths(doc.querySelectorAll("img"), "src");
      updateAssetPaths(doc.querySelectorAll('link[rel="stylesheet"]'), "href");
      updateAssetPaths(doc.querySelectorAll("script"), "src");

      return {
        bodyContent: doc.body ? doc.body.innerHTML : htmlContent,
        headContent: doc.head ? doc.head.innerHTML : "",
      };
    };

    const processCSSForInjection = (cssText) => {
      let processedCSS = cssText;

      // Replace html and body selectors with our container
      processedCSS = processedCSS.replace(
        /\bhtml\s*{/g,
        ".project-content-container {"
      );
      processedCSS = processedCSS.replace(
        /\bbody\s*{/g,
        ".project-content-container {"
      );
      processedCSS = processedCSS.replace(
        /\bhtml\s+([^{]+)\s*{/g,
        ".project-content-container $1 {"
      );
      processedCSS = processedCSS.replace(
        /\bbody\s+([^{]+)\s*{/g,
        ".project-content-container $1 {"
      );

      // Scope all other selectors
      processedCSS = processedCSS.replace(/([^{}]+){/g, (match, selector) => {
        if (
          selector.includes(".project-content-container") ||
          selector.trim().startsWith("@")
        ) {
          return match;
        }
        return `.project-content-container ${selector.trim()} {`;
      });

      return processedCSS;
    };

    const handleOpenProject = async (fullProjectName) => {
      try {
        const response = await fetch(
          "http://localhost:8000/get_project_content",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full_project_name: fullProjectName }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const { bodyContent, headContent } = processHtmlContent(
            data.html_content,
            data.assets_base_url
          );

          setProjectContent({ bodyContent, headContent });
          setCurrentProjectName(fullProjectName);
          setIsProjectModalOpen(false);
          console.log(data.message);
        } else {
          console.error("Failed to get project content");
        }
      } catch (error) {
        console.error("Error getting project content:", error);
      }
    };

    // Function to reload the current project
    const reloadCurrentProject = useCallback(async () => {
      if (!currentProjectName) return;

      try {
        const response = await fetch(
          "http://localhost:8000/get_project_content",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full_project_name: currentProjectName }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const { bodyContent, headContent } = processHtmlContent(
            data.html_content,
            data.assets_base_url
          );

          setProjectContent({ bodyContent, headContent });
          console.log("Project reloaded successfully");
        } else {
          console.error("Failed to reload project content");
        }
      } catch (error) {
        console.error("Error reloading project content:", error);
      }
    }, [currentProjectName]);

    // WebSocket connection for real-time notifications
    useEffect(() => {
      const connectWebSocket = () => {
        const ws = new WebSocket("ws://localhost:8000/ws");
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected for project updates");
        };

        ws.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            console.log("Received notification:", notification);

            // Auto-reload project on file changes or agent completion
            if (
              (notification.type === "file_changed" ||
                notification.type === "agent_complete") &&
              currentProjectName
            ) {
              console.log("Auto-reloading project due to:", notification.type);
              reloadCurrentProject();
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected, attempting to reconnect...");
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      };

      connectWebSocket();

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }, [currentProjectName, reloadCurrentProject]);

    const handleMouseMove = (e) => {
      if (containerRef.current && !isDrawingPanelOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        setIsMenuVisible(mouseY < 60);
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
        const canvas = await html2canvas(containerRef.current, {
          allowTaint: true,
          useCORS: true,
          scale: 1,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const base64Image = canvas.toDataURL("image/png");

        if (onImageCaptured) {
          onImageCaptured(base64Image);
        }

        handleCancelDrawing();
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        alert("Failed to capture screenshot. Please try again.");
      }
    };

    const handleCancelDrawing = () => {
      setHasDrawings(false);
      onToggleDrawingPanel();
    };

    // Hide menu when drawing panel opens
    useEffect(() => {
      if (isDrawingPanelOpen) {
        setIsMenuVisible(false);
      }
    }, [isDrawingPanelOpen]);

    // Inject content into the isolated container
    useEffect(() => {
      if (projectContent && contentRef.current) {
        contentRef.current.innerHTML = "";

        const isolatedContainer = document.createElement("div");
        isolatedContainer.className = "project-content-container";

        if (projectContent.headContent) {
          const headElement = document.createElement("div");
          headElement.innerHTML = projectContent.headContent;

          // Process styles
          headElement.querySelectorAll("style").forEach((style) => {
            const processedCSS = processCSSForInjection(style.innerHTML);
            const newStyle = document.createElement("style");
            newStyle.innerHTML = processedCSS;
            document.head.appendChild(newStyle);
          });

          // Process external CSS
          headElement
            .querySelectorAll('link[rel="stylesheet"]')
            .forEach((link) => {
              document.head.appendChild(link.cloneNode(true));
            });

          // Process scripts
          headElement.querySelectorAll("script").forEach((script) => {
            const newScript = document.createElement("script");
            if (script.src) {
              newScript.src = script.src;
            } else {
              newScript.textContent = script.textContent;
            }
            isolatedContainer.appendChild(newScript);
          });
        }

        isolatedContainer.innerHTML += projectContent.bodyContent;
        contentRef.current.appendChild(isolatedContainer);

        // Trigger resize event after content is loaded
        setTimeout(() => {
          triggerProjectResize();
        }, 50);
      }
    }, [projectContent, triggerProjectResize]);

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

        <div
          className={`preview-window-content ${
            isDrawingPanelOpen ? "drawing-mode" : ""
          }`}
        >
          {projectContent ? (
            <div
              ref={contentRef}
              className={`project-content-wrapper ${
                isDrawingPanelOpen ? "drawing-mode" : ""
              }`}
            ></div>
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
