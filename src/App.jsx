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

  useEffect(() => {
    const canvas = canvasRef.current;
    // Definimos un tamaño grande para la pizarra (3 veces la pantalla)
    canvas.width = window.innerWidth * 3;
    canvas.height = window.innerHeight * 3;
    
    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    context.fillStyle = "#1e1e1e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    contextRef.current = context;

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
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
    });

    return () => { 
      socket.off('startDrawing'); 
      socket.off('draw'); 
      socket.off('clear'); 
    };
  }, []);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    if (isHandMode) return; 
    setIsDrawing(true);
    const { x, y } = getCoords(e.nativeEvent);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    contextRef.current.strokeStyle = isEraser ? "#1e1e1e" : color;
    contextRef.current.lineWidth = isEraser ? 40 : 4;
    socket.emit('startDrawing', { x, y });
  };

  const move = (e) => {
    if (!isDrawing || isHandMode) return;
    const { x, y } = getCoords(e.nativeEvent);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    socket.emit('draw', { x, y, color: contextRef.current.strokeStyle, lineWidth: contextRef.current.lineWidth });
  };

  const stop = () => setIsDrawing(false);

  return (
    <div className="pizarra-wrapper">
      <div className="toolbar">
        {/* Selector de Color CORREGIDO */}
        <div className="tool-item picker-container">
          <div 
            onClick={() => {
              setShowPicker(!showPicker); 
              setIsHandMode(false); 
              setIsEraser(false);
            }} 
            className="color-circle"
            style={{ 
              backgroundColor: isEraser ? 'transparent' : color, 
              border: isEraser ? '1px dashed #777' : '2px solid white' 
            }} 
          />
          {showPicker && (
            <div className="picker-popover">
              {/* Capa invisible para cerrar al tocar fuera */}
              <div className="picker-cover" onClick={() => setShowPicker(false)} />
              {/* Cuadro del selector */}
              <div className="picker-content">
                <SketchPicker 
                  color={color} 
                  onChange={(c) => setColor(c.hex)} 
                  disableAlpha={true} // Opcional: simplifica el picker
                />
              </div>
            </div>
          )}
        </div>

        <button className={`btn-tool ${isHandMode ? 'active-hand' : ''}`} 
                onClick={() => {setIsHandMode(!isHandMode); setIsEraser(false); setShowPicker(false)}}>
          🖐️
        </button>

        <button className={`btn-tool ${isEraser ? 'active-eraser' : ''}`} 
                onClick={() => {setIsEraser(!isEraser); setIsHandMode(false); setShowPicker(false)}}>
          {isEraser ? "✏️" : "🧽"}
        </button>

        <button className="btn-tool btn-clear" onClick={() => window.confirm("¿Borrar todo?") && socket.emit('clear')}>🗑️</button>
      </div>

      <div className="scroll-container">
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={stop}
          style={{ touchAction: isHandMode ? 'auto' : 'none' }} 
        />
      </div>
    </div>
  );
}

export default App;