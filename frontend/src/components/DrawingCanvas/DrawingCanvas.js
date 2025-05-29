import React, { useRef, useEffect, useState, useCallback } from "react";
import "./DrawingCanvas.css";

const DrawingCanvas = ({
  isActive,
  tool,
  color,
  brushSize,
  onFinishDrawing,
  onCancelDrawing,
  onDrawingStart,
}) => {
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [tempShape, setTempShape] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [textPosition, setTextPosition] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing tools
  const tools = {
    PEN: "pen",
    LINE: "line",
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    ARROW: "arrow",
    TEXT: "text",
    ERASER: "eraser",
  };

  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...drawings]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [drawings, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDrawings(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDrawings(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && isActive) {
      const canvas = canvasRef.current;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Initialize history with empty state
      if (history.length === 0) {
        setHistory([[]]);
        setHistoryIndex(0);
      }
    }
  }, [isActive, history.length]);

  // Redraw canvas
  useEffect(() => {
    if (canvasRef.current && isActive) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all saved drawings
      drawings.forEach((drawing) => {
        drawObject(ctx, drawing);
      });

      // Draw temporary shape
      if (tempShape) {
        drawObject(ctx, tempShape);
      }
    }
  }, [drawings, tempShape, isActive]);

  const drawObject = (ctx, obj) => {
    ctx.strokeStyle = obj.color;
    ctx.fillStyle = obj.color;
    ctx.lineWidth = obj.size || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (obj.type) {
      case tools.PEN:
        if (obj.path && obj.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(obj.path[0].x, obj.path[0].y);
          obj.path.forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;

      case tools.LINE:
        ctx.beginPath();
        ctx.moveTo(obj.startX, obj.startY);
        ctx.lineTo(obj.endX, obj.endY);
        ctx.stroke();
        break;

      case tools.RECTANGLE:
        ctx.beginPath();
        ctx.rect(obj.x, obj.y, obj.width, obj.height);
        if (obj.filled) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;

      case tools.CIRCLE:
        ctx.beginPath();
        ctx.arc(obj.centerX, obj.centerY, obj.radius, 0, 2 * Math.PI);
        if (obj.filled) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;

      case tools.ARROW:
        drawArrow(ctx, obj.startX, obj.startY, obj.endX, obj.endY);
        break;

      case tools.TEXT:
        ctx.font = `${obj.size || 16}px Arial`;
        ctx.fillText(obj.text, obj.x, obj.y);
        break;

      default:
        break;
    }
  };

  const drawArrow = (ctx, startX, startY, endX, endY) => {
    const headLength = 10;
    const angle = Math.atan2(endY - startY, endX - startX);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    if (!isActive) return;

    const pos = getMousePos(e);

    if (tool === tools.ERASER) {
      handleErase(pos);
      return;
    }

    if (tool === tools.TEXT) {
      setTextPosition(pos);
      setIsEditing(true);
      setEditingText("");
      onDrawingStart(); // Notify that drawing has started
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);
    onDrawingStart();

    if (tool === tools.PEN) {
      setCurrentPath([pos]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isActive || !isDrawing) return;

    const pos = getMousePos(e);

    if (tool === tools.PEN) {
      setCurrentPath((prev) => [...prev, pos]);
      const newDrawing = {
        type: tools.PEN,
        path: [...currentPath, pos],
        color,
        size: brushSize,
      };
      setTempShape(newDrawing);
    } else if (startPoint) {
      // Handle shape preview
      let shape = null;

      switch (tool) {
        case tools.LINE:
          shape = {
            type: tools.LINE,
            startX: startPoint.x,
            startY: startPoint.y,
            endX: pos.x,
            endY: pos.y,
            color,
            size: brushSize,
          };
          break;

        case tools.RECTANGLE:
          shape = {
            type: tools.RECTANGLE,
            x: Math.min(startPoint.x, pos.x),
            y: Math.min(startPoint.y, pos.y),
            width: Math.abs(pos.x - startPoint.x),
            height: Math.abs(pos.y - startPoint.y),
            color,
            size: brushSize,
            filled: false, // TODO: Add fill option
          };
          break;

        case tools.CIRCLE:
          const radius = Math.sqrt(
            Math.pow(pos.x - startPoint.x, 2) +
              Math.pow(pos.y - startPoint.y, 2)
          );
          shape = {
            type: tools.CIRCLE,
            centerX: startPoint.x,
            centerY: startPoint.y,
            radius,
            color,
            size: brushSize,
            filled: false, // TODO: Add fill option
          };
          break;

        case tools.ARROW:
          shape = {
            type: tools.ARROW,
            startX: startPoint.x,
            startY: startPoint.y,
            endX: pos.x,
            endY: pos.y,
            color,
            size: brushSize,
          };
          break;

        default:
          break;
      }

      setTempShape(shape);
    }
  };

  const handleMouseUp = () => {
    if (!isActive || !isDrawing) return;

    setIsDrawing(false);

    if (tempShape) {
      saveToHistory();
      setDrawings((prev) => [...prev, tempShape]);
      setTempShape(null);
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  const handleErase = (pos) => {
    const newDrawings = drawings.filter((drawing) => {
      return !isPointInDrawing(pos, drawing);
    });

    if (newDrawings.length !== drawings.length) {
      saveToHistory();
      setDrawings(newDrawings);
    }
  };

  const isPointInDrawing = (point, drawing) => {
    const tolerance = 10;

    switch (drawing.type) {
      case tools.PEN:
        return drawing.path.some(
          (pathPoint) =>
            Math.abs(pathPoint.x - point.x) < tolerance &&
            Math.abs(pathPoint.y - point.y) < tolerance
        );

      case tools.LINE:
        return isPointNearLine(point, drawing, tolerance);

      case tools.RECTANGLE:
        return (
          point.x >= drawing.x &&
          point.x <= drawing.x + drawing.width &&
          point.y >= drawing.y &&
          point.y <= drawing.y + drawing.height
        );

      case tools.CIRCLE:
        const distance = Math.sqrt(
          Math.pow(point.x - drawing.centerX, 2) +
            Math.pow(point.y - drawing.centerY, 2)
        );
        return Math.abs(distance - drawing.radius) < tolerance;

      case tools.TEXT:
        return (
          point.x >= drawing.x &&
          point.x <= drawing.x + 100 && // Approximate text width
          point.y >= drawing.y - 20 &&
          point.y <= drawing.y
        );

      default:
        return false;
    }
  };

  const isPointNearLine = (point, line, tolerance) => {
    const A = point.x - line.startX;
    const B = point.y - line.startY;
    const C = line.endX - line.startX;
    const D = line.endY - line.startY;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = line.startX;
      yy = line.startY;
    } else if (param > 1) {
      xx = line.endX;
      yy = line.endY;
    } else {
      xx = line.startX + param * C;
      yy = line.startY + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy) < tolerance;
  };

  const handleTextSubmit = () => {
    if (editingText.trim() && textPosition) {
      const textDrawing = {
        type: tools.TEXT,
        text: editingText,
        x: textPosition.x,
        y: textPosition.y,
        color,
        size: 16,
      };

      saveToHistory();
      setDrawings((prev) => [...prev, textDrawing]);
    }

    setIsEditing(false);
    setEditingText("");
    setTextPosition(null);
  };

  const handleTextKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTextSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditingText("");
      setTextPosition(null);
    }
  };

  // Auto-focus text input when editing starts
  useEffect(() => {
    if (isEditing && textInputRef.current) {
      // Use setTimeout to ensure the input is fully rendered before focusing
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 0);
    }
  }, [isEditing]);

  // Cancel text editing when tool changes
  useEffect(() => {
    if (isEditing && tool !== tools.TEXT) {
      setIsEditing(false);
      setEditingText("");
      setTextPosition(null);
    }
  }, [tool, isEditing]);

  // Expose undo/redo functions
  useEffect(() => {
    window.drawingCanvasUndo = undo;
    window.drawingCanvasRedo = redo;

    return () => {
      delete window.drawingCanvasUndo;
      delete window.drawingCanvasRedo;
    };
  }, [undo, redo]);

  if (!isActive) return null;

  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {isEditing && textPosition && (
        <input
          ref={textInputRef}
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onKeyDown={handleTextKeyPress}
          className="text-input"
          style={{
            position: "absolute",
            left: textPosition.x,
            top: textPosition.y - 20,
            color: color,
            fontSize: "16px",
            border: "1px solid #ccc",
            background: "white",
            padding: "2px 4px",
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
};

export default DrawingCanvas;
