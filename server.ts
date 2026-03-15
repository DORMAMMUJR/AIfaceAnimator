import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  app.use(express.json());

  // Mock database for jobs
  const jobs = new Map<string, { status: string; url?: string; progress?: number }>();

  // API Routes
  app.post('/api/v1/animate', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // In a real scenario, we would upload to S3/R2 and enqueue to Celery here.
    // We are mocking this process.
    const jobId = Math.random().toString(36).substring(7);
    
    jobs.set(jobId, { status: 'En cola', progress: 0 });

    // Simulate Celery worker picking up the job
    setTimeout(() => {
      jobs.set(jobId, { status: 'Procesando', progress: 20 });
      
      // Simulate processing time
      let progress = 20;
      const interval = setInterval(() => {
        progress += 15;
        if (progress >= 100) {
          clearInterval(interval);
          jobs.set(jobId, { 
            status: 'Completado', 
            progress: 100,
            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' // Dummy video URL
          });
        } else {
          jobs.set(jobId, { status: 'Procesando', progress });
        }
      }, 1000);

    }, 2000);

    res.status(202).json({ job_id: jobId, status: 'Accepted' });
  });

  app.get('/api/v1/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
