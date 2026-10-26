import { Server, Socket } from 'socket.io';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export const initInterviewSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join-room', (token) => {
      console.log(`User ${socket.id} joined room ${token}`);
      socket.join(token);
      io.to(token).emit('user-joined', { id: socket.id, role: 'candidate' });
    });

    socket.on('audio-stream', (data) => {
      const { token, audioData } = data;
      io.to(token).emit('hr-observer-stream', { from: socket.id, data: audioData });
    });

    socket.on('chat-message', async (data) => {
      const { token, message, history, context } = data;
      // Broadcast candidate message to HR observer
      io.to(token).emit('new-message', { sender: 'candidate', content: message });

      try {
        if (!process.env.GROQ_API_KEY) {
          io.to(token).emit('ai-response', { text: "AI is not configured on the backend.", final: true });
          return;
        }

        const messages = [
          { role: 'system', content: `You are an AI interviewer. Context: ${context}` },
          ...(history || []),
          { role: 'user', content: message }
        ];

        if (!groq) {
          io.to(token).emit('ai-response', { text: "AI is not configured on the backend. Please add GROQ_API_KEY.", final: true });
          return;
        }

        const chatCompletion = await groq.chat.completions.create({
          messages: messages,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 250,
          stream: true,
        });

        let fullResponse = '';
        for await (const chunk of chatCompletion) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          // Stream chunk back to client
          io.to(token).emit('ai-response-chunk', { chunk: content });
        }

        io.to(token).emit('ai-response', { text: fullResponse, final: true });
      } catch (error) {
        console.error("Groq AI Error:", error);
        io.to(token).emit('ai-response', { text: "Sorry, I am having trouble processing that.", final: true });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
