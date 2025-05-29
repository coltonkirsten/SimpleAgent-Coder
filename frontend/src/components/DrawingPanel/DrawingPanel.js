import React, { useState, useEffect } from "react";
import {
  FiX,
  FiEdit3,
  FiMinus,
  FiSquare,
  FiCircle,
  FiArrowUpRight,
  FiType,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
  FiCheckSquare,
} from "react-icons/fi";
import "./DrawingPanel.css";

function DrawingPanel({
  onClose,
  onFinishDrawing,
  onCancelDrawing,
  hasDrawings,
  onToolChange,
}) {
  const [selectedTool, setSelectedTool] = useState("pen");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);

  const tools = [
    { id: "pen", icon: FiEdit3, name: "Pen" },
    { id: "line", icon: FiMinus, name: "Line" },
    { id: "rectangle", icon: FiSquare, name: "Rectangle" },
    { id: "circle", icon: FiCircle, name: "Circle" },
    { id: "arrow", icon: FiArrowUpRight, name: "Arrow" },
    { id: "text", icon: FiType, name: "Text" },
    { id: "eraser", icon: FiTrash2, name: "Eraser" },
  ];

  // Notify parent of tool changes
  useEffect(() => {
    if (onToolChange) {
      onToolChange({
        tool: selectedTool,
        color: selectedColor,
        brushSize: brushSize,
      });
    }
  }, [selectedTool, selectedColor, brushSize, onToolChange]);

  // Also set up the window callback for the drawing canvas
  useEffect(() => {
    window.drawingToolSettings = (settings) => {
      // This is called by the drawing canvas to get current settings
    };

    // Update the window object with current settings
    window.currentDrawingSettings = {
      tool: selectedTool,
      color: selectedColor,
      brushSize: brushSize,
    };

    return () => {
      delete window.drawingToolSettings;
      delete window.currentDrawingSettings;
    };
  }, [selectedTool, selectedColor, brushSize]);

  const handleUndo = () => {
    if (window.drawingCanvasUndo) {
      window.drawingCanvasUndo();
    }
  };

  const handleRedo = () => {
    if (window.drawingCanvasRedo) {
      window.drawingCanvasRedo();
    }
  };

  return (
    <div className="drawing-panel">
      <div className="drawing-panel-header">
        <h3>Drawing Tools</h3>
        <div className="header-controls">
          {hasDrawings && (
            <>
              <button
                className="action-button finish-button"
                onClick={onFinishDrawing}
                title="Finish Drawing & Attach to Chat"
              >
                <FiCheckSquare />
              </button>
              <button
                className="action-button cancel-button"
                onClick={onCancelDrawing}
                title="Cancel Drawing"
              >
                <FiX />
              </button>
            </>
          )}
          <button
            className="close-button"
            onClick={onClose}
            title="Close Drawing Panel"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="drawing-panel-content">
        <div className="tools-section">
          <div className="section-title">Tools</div>
          <div className="tools-grid">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={tool.id}
                  className={`tool-button ${
                    selectedTool === tool.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedTool(tool.id)}
                  title={tool.name}
                >
                  <IconComponent />
                </button>
              );
            })}
          </div>
        </div>

        <div className="controls-section">
          <div className="section-title">Controls</div>
          <div className="controls-row">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="color-picker-input"
              title="Pick Color"
            />
            <div className="brush-size-control">
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="brush-size-slider"
              />
              <span className="brush-size-value">{brushSize}px</span>
            </div>
            <div className="action-buttons">
              <button
                className="action-button"
                onClick={handleUndo}
                title="Undo"
              >
                <FiRotateCcw />
              </button>
              <button
                className="action-button"
                onClick={handleRedo}
                title="Redo"
              >
                <FiRotateCw />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DrawingPanel;
