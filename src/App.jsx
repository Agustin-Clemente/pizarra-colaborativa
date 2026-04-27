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
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Configuración para alta resolución (Retina/Mobile)
    const dpr = window.devicePixelRatio || 1;
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
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off('startDrawing');
      socket.off('draw');
      socket.off('clear');
    };
  }, []);

  // FUNCIÓN CLAVE: Calcula la posición real considerando el SCROLL
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Soporte para touch y mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Restamos la posición del canvas respecto a la pantalla
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      clientX,
      clientY
    };
  };

  const startDrawing = (e) => {
    const { x, y, clientX, clientY } = getCoordinates(e.nativeEvent);

    if (isHandMode) {
      setIsPanning(true);
      setStartPan({ x: clientX, y: clientY, scrollLeft: window.scrollX, scrollTop: window.scrollY });
      return;
    }

    setIsDrawing(true);
    contextRef.current.strokeStyle = isEraser ? "#1e1e1e" : color;
    contextRef.current.lineWidth = isEraser ? 40 : 4;
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);

    socket.emit('startDrawing', { x, y });
  };

  const draw = (e) => {
    const { x, y, clientX, clientY } = getCoordinates(e.nativeEvent);

    if (isPanning) {
      // Movimiento de pantalla inverso para que se sienta natural
      const dx = clientX - startPan.x;
      const dy = clientY - startPan.y;
      window.scrollTo(startPan.scrollLeft - dx, startPan.scrollTop - dy);
      return;
    }

    if (!isDrawing) return;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();

    socket.emit('draw', {
      x, y,
      color: contextRef.current.strokeStyle,
      lineWidth: contextRef.current.lineWidth
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  return (
    <div className="canvas-container">
      <div className="toolbar">
        <button onClick={() => {setIsHandMode(!isHandMode); setIsEraser(false)}} 
                style={{background: isHandMode ? '#fcc419' : '#444'}}>
          {isHandMode ? "🖐️" : "✋"}
        </button>
        <button onClick={() => {setIsEraser(!isEraser); setIsHandMode(false)}}
                style={{background: isEraser ? '#4dabf7' : '#ff6b6b'}}>
          {isEraser ? "✏️" : "🧽"}
        </button>
        <div className="color-preview" onClick={() => setShowPicker(!showPicker)} 
             style={{backgroundColor: color, width: 30, height: 30, borderRadius: '50%'}} />
        {showPicker && (
          <div className="picker-popover">
             <div className="picker-cover" onClick={() => setShowPicker(false)}/>
             <SketchPicker color={color} onChange={(c) => setColor(c.hex)} />
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default App;