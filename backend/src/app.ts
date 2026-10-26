import express from 'express';
import cors from 'cors';
import routes from './routes/v1/index.js';
import { startInterviewSession, chatInterviewStream } from './controllers/interviews.controller.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', routes);

// Direct aliases matching Hire-Wire protocol
app.post('/api/start-interview', startInterviewSession);
app.post('/api/chat', chatInterviewStream);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
