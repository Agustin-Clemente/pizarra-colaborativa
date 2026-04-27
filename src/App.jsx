import { useEffect, useRef, useState } from 'react';
import { SketchPicker } from 'react-color';
import io from 'socket.io-client';
import './App.css';

const socket = io('https://pizarra-colaborativa-2mt5.onrender.com');

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [isEraser, setIsEraser] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isHandMode, setIsHandMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    
    // Pizarra grande: 3 veces el ancho/alto de la pantalla
    const width = window.innerWidth * 3;
    const height = window.innerHeight * 3;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    context.scale(dpr, dpr);
    context.lineCap = "round";
    context.lineJoin = "round";

    context.fillStyle = "#1e1e1e";
    context.fillRect(0, 0, width, height);
    contextRef.current = context;

    // Sockets
    socket.on('startDrawing', (data) => {
      contextRef.current.beginPath();
      contextRef.current.moveTo(data.x, data.y);
    });

    socket.on('draw', (data) => {
      const ctx = contextRef.current;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    });

    socket.on('clear', () => {
      const ctx = contextRef.current;
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off('startDrawing');
      socket.off('draw');
      socket.off('clear');
    };
  }, []);

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      clientX,
      clientY
    };
  };

  const startAction = (e) => {
    if (showPicker) setShowPicker(false);
    const { x, y, clientX, clientY } = getCoordinates(e.nativeEvent);

    if (isHandMode) {
      setIsPanning(true);
      setStartPan({ 
        x: clientX, 
        y: clientY, 
        scrollLeft: window.scrollX, 
        scrollTop: window.scrollY 
      });
      return;
    }

    setIsDrawing(true);
    contextRef.current.strokeStyle = isEraser ? "#1e1e1e" : color;
    contextRef.current.lineWidth = isEraser ? 40 : 4;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    socket.emit('startDrawing', { x, y });
  };

  const doAction = (e) => {
    const { x, y, clientX, clientY } = getCoordinates(e.nativeEvent);

    if (isPanning) {
      const dx = clientX - startPan.x;
      const dy = clientY - startPan.y;
      window.scrollTo(startPan.scrollLeft - dx, startPan.scrollTop - dy);
      return;
    }

    if (!isDrawing) return;
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    socket.emit('draw', { x, y, color: contextRef.current.strokeStyle, lineWidth: contextRef.current.lineWidth });
  };

  const stopAction = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  const handleClear = () => {
    if (window.confirm("¿Borrar todo para todos?")) {
      const ctx = contextRef.current;
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      socket.emit('clear');
    }
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="picker-container">
          <div 
            className="color-circle" 
            style={{ backgroundColor: color }} 
            onClick={() => { setShowPicker(!showPicker); setIsEraser(false); setIsHandMode(false); }}
          />
          {showPicker && (
            <div className="picker-popover">
              <div className="picker-cover" onClick={() => setShowPicker(false)} />
              <SketchPicker color={color} onChange={(c) => setColor(c.hex)} />
            </div>
          )}
        </div>

        <button className={`btn ${isHandMode ? 'active' : ''}`} onClick={() => { setIsHandMode(!isHandMode); setIsEraser(false); }}>🖐️</button>
        <button className={`btn ${isEraser ? 'active-eraser' : ''}`} onClick={() => { setIsEraser(!isEraser); setIsHandMode(false); }}>🧽</button>
        <button className="btn btn-clear" onClick={handleClear}>🗑️</button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startAction}
        onMouseMove={doAction}
        onMouseUp={stopAction}
        onMouseLeave={stopAction}
        onTouchStart={startAction}
        onTouchMove={doAction}
        onTouchEnd={stopAction}
      />
    </div>
  );
}

export default App;