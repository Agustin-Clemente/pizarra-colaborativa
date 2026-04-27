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

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    
    context.fillStyle = "#1e1e1e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    contextRef.current = context;

    socket.on('draw', (data) => {
      const ctx = contextRef.current;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    });

    socket.on('clear', () => {
      const ctx = contextRef.current;
      const cvs = canvasRef.current;
      ctx.beginPath();
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    });

    return () => {
      socket.off('draw');
      socket.off('clear');
    };
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    // CORRECCIÓN 2: Si el picker está abierto, lo cerramos al empezar a dibujar
    if (showPicker) setShowPicker(false);

    const { offsetX, offsetY } = getCoordinates(nativeEvent);

    contextRef.current.strokeStyle = isEraser ? "#1e1e1e" : color;
    contextRef.current.lineWidth = isEraser ? 25 : 3;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);

    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    socket.emit('draw', {
      x: offsetX,
      y: offsetY,
      color: contextRef.current.strokeStyle,
      lineWidth: contextRef.current.lineWidth
    });
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (event) => {
    if (event.touches) {
      const rect = canvasRef.current.getBoundingClientRect();
      return { 
        offsetX: event.touches[0].clientX - rect.left, 
        offsetY: event.touches[0].clientY - rect.top 
      };
    }
    return { offsetX: event.offsetX, offsetY: event.offsetY };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
  };

  return (
    <div className="canvas-container">
      <div className="toolbar">
        <div className="color-preview-container">
          <div
            style={{ 
              backgroundColor: color, 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              border: isEraser ? '2px solid #555' : '2px solid white', 
              cursor: isEraser ? 'not-allowed' : 'pointer',
              opacity: isEraser ? 0.3 : 1
            }}
            onClick={() => !isEraser && setShowPicker(!showPicker)}
          />
          
          {showPicker && (
            // CORRECCIÓN 1: Contenedor con posición absoluta y margen para que no se corte arriba
            <div style={{ position: 'absolute', top: '45px', left: '0px', zIndex: '2' }}>
              {/* Capa invisible que detecta clics fuera del cuadro */}
              <div 
                style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }} 
                onClick={() => setShowPicker(false)} 
              />
              <div style={{ position: 'relative', zIndex: '3' }}>
                <SketchPicker
                  color={color}
                  onChange={(c) => setColor(c.hex)}
                />
              </div>
            </div>
          )}
        </div>

        <button
          className="btn-tool"
          onClick={() => {
            setIsEraser(!isEraser);
            setShowPicker(false);
          }}
          style={{ 
            backgroundColor: isEraser ? '#4dabf7' : '#ff6b6b', 
            color: 'white',
            fontWeight: 'bold',
            minWidth: '120px'
          }}
        >
          {isEraser ? "✏️ Usar Lápiz" : "🧽 Usar Goma"}
        </button>

        <button className="btn-tool btn-clear" onClick={handleClear}>
          Limpiar Todo
        </button>
      </div>

      <canvas
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        ref={canvasRef}
      />
    </div>
  );
}

export default App;