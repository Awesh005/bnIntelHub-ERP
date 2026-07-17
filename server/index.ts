import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { authMiddleware } from './middleware/auth';
import clientsRouter from './routes/clients';
import teamRouter from './routes/team';
import projectsRouter from './routes/projects';
import invoicesRouter from './routes/invoices';
import quotationsRouter from './routes/quotations';
import settingsRouter from './routes/settings';
import dashboardRouter from './routes/dashboard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Apply auth middleware to all /api routes
app.use('/api', authMiddleware);

// Mount API routes
app.use('/api/clients', clientsRouter);
app.use('/api/team', teamRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);

// Configure Vite dev server or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✓ BN IntelHub ERP server running on http://0.0.0.0:${PORT}`);
  });
}

// Start server if not running on Vercel (local dev or traditional deployment)
if (!process.env.VERCEL) {
  startServer();
}

// Export the Express API for Vercel Serverless Functions
export default app;
