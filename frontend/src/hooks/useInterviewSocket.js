import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function useInterviewSocket(interviewToken) {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!interviewToken) return;

    socketRef.current = io(`${SOCKET_URL}/interviews`, {
      auth: { token: interviewToken },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to AI Interview Room');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from AI Interview Room');
    });

    socket.on('transcript_delta', (data) => {
      setTranscript((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, [interviewToken]);

  const sendAudioChunk = (audioBlob) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('audio_chunk', audioBlob);
    }
  };

  return { isConnected, transcript, sendAudioChunk };
}
