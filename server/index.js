import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('clear', () => {
        io.emit('clear');
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });

    socket.on('startDrawing', (data) => {
    socket.broadcast.emit('startDrawing', data);
});
});

const publicPath = path.join(__dirname, '..', 'dist');

app.use(express.static(publicPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});