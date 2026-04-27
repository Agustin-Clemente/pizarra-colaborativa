import { useEffect, useRef, useState } from 'react';
import { SketchPicker } from 'react-color';
import io from 'socket.io-client';
import './App.css';

// URL de tu servidor en Render
const socket = io('https://pizarra-colaborativa-2mt5.onrender.com');

function App() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  // Estados de dibujo
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [isEraser, setIsEraser] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Estados de desplazamiento (Mano)
  const [isHandMode, setIsHandMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const toggleHandMode = () => {
    setIsHandMode(!isHandMode);
    if (!isHandMode) setIsEraser(false); // Si activamos mano, quitamos goma
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Hacemos el lienzo más grande para tener espacio de desplazamiento
    canvas.width = window.innerWidth * 4;
    canvas.height = window.innerHeight * 4;
    canvas.style.width = `${window.innerWidth * 2}px`;
    canvas.style.height = `${window.innerHeight * 2}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";

    // Fondo inicial oscuro
    context.fillStyle = "#1e1e1e";
    context.fillRect(0, 0, canvas.width, canvas.height);

    contextRef.current = context;

    // EVENTOS DE SOCKET
    socket.on('startDrawing', (data) => {
      const ctx = contextRef.current;
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
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
      const cvs = canvasRef.current;
      ctx.beginPath();
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    });

    return () => {
      socket.off('startDrawing');
      socket.off('draw');
      socket.off('clear');
    };
  }, []);

  const getCoordinates = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (event.touches) {
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top,
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      };
    }
    return { 
      offsetX: event.offsetX, 
      offsetY: event.offsetY,
      clientX: event.clientX,
      clientY: event.clientY
    };
  };

  const startDrawing = (e) => {
    if (showPicker) setShowPicker(false);

    const { offsetX, offsetY, clientX, clientY } = getCoordinates(e.nativeEvent);

    // MODO MANO: Iniciar desplazamiento
    if (isHandMode) {
      setIsPanning(true);
      setStartPan({ 
        x: clientX + window.scrollX, 
        y: clientY + window.scrollY 
      });
      return;
    }

    // MODO DIBUJO/GOMA
    contextRef.current.strokeStyle = isEraser ? "#1e1e1e" : color;
    contextRef.current.lineWidth = isEraser ? 30 : 3;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    socket.emit('startDrawing', { x: offsetX, y: offsetY });
  };

  const draw = (e) => {
    const { offsetX, offsetY, clientX, clientY } = getCoordinates(e.nativeEvent);

    // Si estamos desplazando la pantalla
    if (isPanning) {
      window.scrollTo(startPan.x - clientX, startPan.y - clientY);
      return;
    }

    if (!isDrawing) return;

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
    if (isPanning) setIsPanning(false);
    
    if (isDrawing) {
      contextRef.current.closePath();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("¿Limpiar toda la pizarra para todos?")) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      socket.emit('clear');
    }
  };

  return (
    <div className={`canvas-container ${isHandMode ? 'hand-active' : ''}`}>
      <div className="toolbar">
        {/* Selector de Color */}
        <div className="color-preview-container">
          <div
            style={{
              backgroundColor: color,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: '2px solid white',
              cursor: isHandMode ? 'not-allowed' : 'pointer',
              opacity: isHandMode ? 0.3 : 1
            }}
            onClick={() => !isHandMode && setShowPicker(!showPicker)}
          />

          {showPicker && (
            <div style={{ position: 'absolute', bottom: '60px', left: '0px', zIndex: '20' }}>
              <div
                style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
                onClick={() => setShowPicker(false)}
              />
              <div style={{ position: 'relative', zIndex: '30' }}>
                <SketchPicker color={color} onChange={(c) => setColor(c.hex)} />
              </div>
            </div>
          )}
        </div>

        {/* Botón Herramienta Mano */}
        <button
          className="btn-tool"
          onClick={toggleHandMode}
          style={{ 
            backgroundColor: isHandMode ? '#fcc419' : '#444',
            color: isHandMode ? '#000' : '#fff'
          }}
        >
          🖐️
        </button>

        {/* Botón Lápiz / Goma */}
        <button
          className="btn-tool"
          onClick={() => {
            setIsHandMode(false);
            setIsEraser(!isEraser);
          }}
          style={{
            backgroundColor: isHandMode ? '#444' : (isEraser ? '#4dabf7' : '#ff6b6b'),
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {isEraser ? "✏️" : "🧽"}
        </button>

        <button className="btn-tool btn-clear" onClick={handleClear}>
          🗑️
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