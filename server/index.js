import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import prisma from './prisma.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import residentRoutes from './routes/residents.js';
import projectRoutes from './routes/projects.js';
import officialRoutes from './routes/officials.js';
import sessionRoutes from './routes/sessions.js';
import documentRoutes from './routes/documents.js';
import archiveRoutes from './routes/archives.js';
import activityRoutes from './routes/activity.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/archives', archiveRoutes);
app.use('/api/activity', activityRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('beforeExit', () => {
  prisma.$disconnect();
});

export { prisma };
