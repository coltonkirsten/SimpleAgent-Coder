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
    const [iframeUrl, setIframeUrl] = useState(null);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const iframeRef = useRef(null);
    const injectedStylesRef = useRef([]);
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

      // Handle viewport units - convert 100vh to 100% for container height
      processedCSS = processedCSS.replace(
        /min-height:\s*100vh/g,
        "min-height: 100%"
      );
      processedCSS = processedCSS.replace(/height:\s*100vh/g, "height: 100%");
      processedCSS = processedCSS.replace(
        /max-height:\s*100vh/g,
        "max-height: 100%"
      );

      // Handle full viewport width
      processedCSS = processedCSS.replace(/width:\s*100vw/g, "width: 100%");
      processedCSS = processedCSS.replace(
        /min-width:\s*100vw/g,
        "min-width: 100%"
      );
      processedCSS = processedCSS.replace(
        /max-width:\s*100vw/g,
        "max-width: 100%"
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

    // Process relative URLs in CSS content
    const processRelativeUrlsInCSS = (cssText, baseUrl) => {
      let processedCSS = cssText;

      // Handle url() functions
      processedCSS = processedCSS.replace(
        /url\(['"]?([^'"()]+)['"]?\)/g,
        (match, url) => {
          // Skip absolute URLs, data URLs, and URLs that start with protocol
          if (
            url.startsWith("http") ||
            url.startsWith("//") ||
            url.startsWith("data:") ||
            url.startsWith("#")
          ) {
            return match;
          }

          try {
            // Convert relative URL to absolute using the CSS file's base URL
            const resolvedUrl = new URL(url, baseUrl).href;
            return `url('${resolvedUrl}')`;
          } catch (error) {
            console.warn(`Failed to resolve URL: ${url}`, error);
            return match; // Return original if URL resolution fails
          }
        }
      );

      // Handle @import statements
      processedCSS = processedCSS.replace(
        /@import\s+['"]([^'"]+)['"];?/g,
        (match, url) => {
          // Skip absolute URLs
          if (url.startsWith("http") || url.startsWith("//")) {
            return match;
          }

          try {
            const resolvedUrl = new URL(url, baseUrl).href;
            return `@import '${resolvedUrl}';`;
          } catch (error) {
            console.warn(`Failed to resolve @import URL: ${url}`, error);
            return match;
          }
        }
      );

      return processedCSS;
    };

    // Fetch and process external CSS files
    const processExternalCSS = async (linkElements, baseUrl) => {
      const processedStyles = [];

      console.log(
        `Starting to process ${linkElements.length} CSS files with base URL: ${baseUrl}`
      );

      // Process each CSS file sequentially to maintain load order
      for (const link of linkElements) {
        try {
          const cssUrl = link.getAttribute("href");
          console.log(`Fetching external CSS: ${cssUrl}`);

          // Add cache busting to prevent stale CSS files
          const timestamp = new Date().getTime();
          const cacheBustedUrl = cssUrl.includes("?")
            ? `${cssUrl}&t=${timestamp}`
            : `${cssUrl}?t=${timestamp}`;

          const response = await fetch(cacheBustedUrl);
          if (!response.ok) {
            console.error(
              `Failed to fetch CSS file: ${cssUrl}`,
              response.statusText
            );
            continue;
          }

          let cssContent = await response.text();
          console.log(
            `CSS content fetched (${cssContent.length} chars):`,
            cssContent.substring(0, 200) + "..."
          );

          // Process relative URLs in the CSS content
          cssContent = processRelativeUrlsInCSS(cssContent, cssUrl);

          // Process the CSS through our scoping function
          const scopedCSS = processCSSForInjection(cssContent);
          console.log(
            `Scoped CSS (${scopedCSS.length} chars):`,
            scopedCSS.substring(0, 200) + "..."
          );

          // Create a style element with the processed CSS
          const styleElement = document.createElement("style");
          styleElement.setAttribute("data-source", cssUrl);
          styleElement.innerHTML = scopedCSS;

          processedStyles.push(styleElement);
          console.log(`Successfully processed CSS file: ${cssUrl}`);
        } catch (error) {
          console.error(
            `Error processing CSS file: ${link.getAttribute("href")}`,
            error
          );
        }
      }

      console.log(
        `Finished processing CSS files. Total processed: ${processedStyles.length}`
      );
      return processedStyles;
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

          // Set iframe URL for normal mode
          setIframeUrl(`http://localhost:8000/projects/${fullProjectName}/`);

          // Set injection content for drawing mode
          setProjectContent({ bodyContent, headContent });
          setCurrentProjectName(fullProjectName);
          setIsProjectModalOpen(false);
          console.log(data.message);

          // Update active project path in backend settings
          try {
            const setActiveResponse = await fetch(
              "http://localhost:8000/set_active_project",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_project_name: fullProjectName }),
              }
            );

            if (setActiveResponse.ok) {
              const activeData = await setActiveResponse.json();
              console.log(activeData.message);

              // Reset agent conversation to clear previous project context
              try {
                const resetResponse = await fetch(
                  "http://localhost:8000/reset_conversation",
                  { method: "GET" }
                );

                if (resetResponse.ok) {
                  const resetData = await resetResponse.json();
                  console.log(
                    "Agent conversation reset for new project:",
                    resetData.message
                  );
                } else {
                  console.warn("Failed to reset agent conversation");
                }
              } catch (resetError) {
                console.warn("Error resetting agent conversation:", resetError);
              }
            } else {
              console.error("Failed to set active project");
              alert(
                "Warning: Failed to set active project in backend settings"
              );
            }
          } catch (activeError) {
            console.error("Error setting active project:", activeError);
            alert(
              "Warning: Could not update active project in backend settings"
            );
          }
        } else {
          console.error("Failed to get project content");
          alert("Failed to open project. Please try again.");
        }
      } catch (error) {
        console.error("Error getting project content:", error);
        alert(
          "Error opening project. Please check your connection and try again."
        );
      }
    };

    // Function to verify project synchronization between frontend and backend
    const verifyProjectSync = useCallback(async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/get_active_project"
        );

        if (response.ok) {
          const data = await response.json();
          const backendActiveProject = data.active_project_name;

          if (backendActiveProject !== currentProjectName) {
            console.warn("Project synchronization mismatch detected!");
            console.warn(`Frontend project: ${currentProjectName}`);
            console.warn(`Backend project: ${backendActiveProject}`);

            if (backendActiveProject && currentProjectName) {
              // Ask user if they want to sync or not
              const shouldSync = window.confirm(
                `Synchronization issue detected!\n\n` +
                  `Frontend is showing: ${currentProjectName}\n` +
                  `Backend is working on: ${backendActiveProject}\n\n` +
                  `Would you like to switch to the backend's active project (${backendActiveProject})?`
              );

              if (shouldSync) {
                // Switch to backend's active project by reloading the page
                // This ensures clean state management
                alert(
                  `Switching to project: ${backendActiveProject}. Please reopen the project from Project Manager.`
                );
                setCurrentProjectName(null);
                setIframeUrl(null);
                setProjectContent(null);
              } else {
                // Update backend to match frontend
                try {
                  const setActiveResponse = await fetch(
                    "http://localhost:8000/set_active_project",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        full_project_name: currentProjectName,
                      }),
                    }
                  );

                  if (setActiveResponse.ok) {
                    console.log("Backend updated to match frontend project");
                  }
                } catch (updateError) {
                  console.error(
                    "Failed to update backend project:",
                    updateError
                  );
                }
              }
            }
          } else {
            console.log("Projects are in sync:", currentProjectName);
          }
        } else {
          console.error("Failed to verify project sync");
        }
      } catch (error) {
        console.error("Error verifying project sync:", error);
      }
    }, [currentProjectName]);

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

          // Reload iframe for normal mode with cache busting
          if (iframeRef.current && !isDrawingPanelOpen) {
            const baseUrl = `http://localhost:8000/projects/${currentProjectName}/`;
            const timestamp = new Date().getTime();
            const newUrl = `${baseUrl}?t=${timestamp}`;

            // Force aggressive iframe reload by clearing src first
            console.log("Forcing complete iframe reload with cache busting");

            // Method 1: Clear src and set new URL to force complete reload
            iframeRef.current.src = "about:blank";

            // Small delay to ensure the blank page loads before setting new URL
            setTimeout(() => {
              if (iframeRef.current) {
                iframeRef.current.src = newUrl;
                console.log(`Iframe reloaded with cache-busted URL: ${newUrl}`);
              }
            }, 10);
          }

          // Update injection content for drawing mode
          setProjectContent({ bodyContent, headContent });
          console.log("Project reloaded successfully");
        } else {
          console.error("Failed to reload project content");
        }
      } catch (error) {
        console.error("Error reloading project content:", error);
      }
    }, [currentProjectName, isDrawingPanelOpen]);

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

            // Auto-reload project on file changes or agent completion with project verification
            if (
              (notification.type === "file_changed" ||
                notification.type === "agent_complete") &&
              currentProjectName
            ) {
              // Verify that the notification is for the current project
              if (notification.active_project_name) {
                if (notification.active_project_name === currentProjectName) {
                  console.log(
                    "Auto-reloading project due to:",
                    notification.type
                  );
                  console.log(
                    "Notification project matches current project:",
                    currentProjectName
                  );
                  console.log("Current drawing mode:", isDrawingPanelOpen);
                  reloadCurrentProject();
                } else {
                  console.warn(
                    `Notification for project "${notification.active_project_name}" but current project is "${currentProjectName}". Skipping reload.`
                  );
                  console.warn(
                    "This suggests a synchronization issue between frontend and backend."
                  );

                  // Verify current active project with backend
                  verifyProjectSync();
                }
              } else {
                // Legacy notification without project info - proceed with caution
                console.warn(
                  "Received notification without project information, proceeding with reload"
                );
                console.log(
                  "Auto-reloading project due to:",
                  notification.type
                );
                console.log("Current drawing mode:", isDrawingPanelOpen);
                console.log("Current project:", currentProjectName);
                reloadCurrentProject();
              }
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

    // Cleanup function to remove injected styles
    const cleanupInjectedStyles = useCallback(() => {
      // Remove all styles with data-injected attribute
      const injectedStyles = document.querySelectorAll(
        'style[data-injected="true"]'
      );
      injectedStyles.forEach((style) => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
      injectedStylesRef.current = [];
      console.log(`Cleaned up ${injectedStyles.length} injected styles`);
    }, []);

    // Inject content into the isolated container (only for drawing mode)
    useEffect(() => {
      const injectContent = async () => {
        console.log(
          "injectContent called - Drawing mode:",
          isDrawingPanelOpen,
          "Project:",
          currentProjectName
        );

        if (projectContent && contentRef.current && isDrawingPanelOpen) {
          console.log("Starting content injection...");

          // Clean up any previously injected styles
          cleanupInjectedStyles();

          contentRef.current.innerHTML = "";

          const isolatedContainer = document.createElement("div");
          isolatedContainer.className = "project-content-container";
          const newInjectedStyles = [];

          if (projectContent.headContent) {
            console.log("Processing head content...");
            const headElement = document.createElement("div");
            headElement.innerHTML = projectContent.headContent;

            // Process inline styles
            const inlineStyles = headElement.querySelectorAll("style");
            console.log(`Found ${inlineStyles.length} inline styles`);
            inlineStyles.forEach((style) => {
              const processedCSS = processCSSForInjection(style.innerHTML);
              const newStyle = document.createElement("style");
              newStyle.setAttribute("data-injected", "true");
              newStyle.setAttribute("data-type", "inline");
              newStyle.innerHTML = processedCSS;
              document.head.appendChild(newStyle);
              newInjectedStyles.push(newStyle);
            });

            // Process external CSS files
            const linkElements = Array.from(
              headElement.querySelectorAll('link[rel="stylesheet"]')
            );
            console.log(`Found ${linkElements.length} external CSS files`);

            if (linkElements.length > 0) {
              try {
                const baseUrl = `http://localhost:8000/projects/${currentProjectName}/`;
                console.log("Processing external CSS with base URL:", baseUrl);
                const processedStyles = await processExternalCSS(
                  linkElements,
                  baseUrl
                );

                // Inject processed styles into document head and track them
                processedStyles.forEach((styleElement) => {
                  styleElement.setAttribute("data-injected", "true");
                  styleElement.setAttribute("data-type", "external");
                  document.head.appendChild(styleElement);
                  newInjectedStyles.push(styleElement);
                });

                console.log(
                  `Successfully injected ${processedStyles.length} external CSS files`
                );
              } catch (error) {
                console.error("Error processing external CSS files:", error);
              }
            }

            // Update ref with new injected styles
            injectedStylesRef.current = newInjectedStyles;
            console.log(`Total styles injected: ${newInjectedStyles.length}`);

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
          console.log("Content injection completed");

          // Trigger resize event after content is loaded and when switching to drawing mode
          setTimeout(() => {
            triggerProjectResize();

            // Dispatch window resize event to the injected content
            const resizeEvent = new Event("resize");
            window.dispatchEvent(resizeEvent);

            // Update viewport meta tag if it exists in injected content
            const viewportMeta = isolatedContainer.querySelector(
              'meta[name="viewport"]'
            );
            if (viewportMeta) {
              viewportMeta.setAttribute(
                "content",
                "width=device-width, initial-scale=1.0"
              );
            }

            // Force layout recalculation
            if (isolatedContainer) {
              isolatedContainer.style.height = "100%";
              isolatedContainer.style.width = "100%";
              // Force reflow
              // eslint-disable-next-line no-unused-expressions
              isolatedContainer.offsetHeight;
            }
          }, 50);
        }
      };

      injectContent();
    }, [
      projectContent,
      isDrawingPanelOpen,
      triggerProjectResize,
      currentProjectName,
    ]);

    // Additional effect to handle resize when switching to drawing mode
    useEffect(() => {
      if (isDrawingPanelOpen && contentRef.current) {
        // Small delay to allow the panel transition to complete
        setTimeout(() => {
          triggerProjectResize();

          // Dispatch resize events to help responsive content adapt
          const resizeEvent = new Event("resize");
          window.dispatchEvent(resizeEvent);

          // Also dispatch a custom event for any content that might be listening
          const customResizeEvent = new CustomEvent("containerResize", {
            detail: {
              width: contentRef.current.clientWidth,
              height: contentRef.current.clientHeight,
            },
          });
          window.dispatchEvent(customResizeEvent);
        }, 150);
      }
    }, [isDrawingPanelOpen, triggerProjectResize]);

    // Cleanup styles when exiting drawing mode
    useEffect(() => {
      if (!isDrawingPanelOpen) {
        cleanupInjectedStyles();
      }
    }, [isDrawingPanelOpen, cleanupInjectedStyles]);

    // Cleanup injected styles on unmount
    useEffect(() => {
      return () => {
        cleanupInjectedStyles();
      };
    }, [cleanupInjectedStyles]);

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
          {iframeUrl ? (
            <>
              {/* Normal mode: Show iframe */}
              {!isDrawingPanelOpen && (
                <iframe
                  ref={iframeRef}
                  src={iframeUrl}
                  className="project-iframe"
                  title="Project Preview"
                  frameBorder="0"
                />
              )}

              {/* Drawing mode: Show injection */}
              {isDrawingPanelOpen && (
                <div
                  ref={contentRef}
                  className={`project-content-wrapper ${
                    isDrawingPanelOpen ? "drawing-mode" : ""
                  }`}
                ></div>
              )}
            </>
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
