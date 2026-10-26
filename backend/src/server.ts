import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initInterviewSocket } from './sockets/interviewRoom.js';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initInterviewSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
  console.log(`🚀 WebSocket Gateway ready on ws://localhost:${PORT}`);
});
