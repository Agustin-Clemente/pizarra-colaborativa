import express, { static } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join } from 'path';

const app = express();
app.use(cors());

const server = createServer(app);
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
});



const publicPath = join(__dirname, '..', 'dist');

app.use(static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});