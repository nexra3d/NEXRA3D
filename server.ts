import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

try {
  const devEnvPath = path.resolve('/app/.dev.env.json');
  if (fs.existsSync(devEnvPath)) {
    const raw = JSON.parse(fs.readFileSync(devEnvPath, 'utf8'));
    for (const [k, v] of Object.entries(raw)) {
      if (!process.env[k] && typeof v === 'string') {
        process.env[k] = v;
      }
    }
  }
} catch (_) {}

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import app from './app.js';
import { ensureDbSchema } from './src/lib/prisma.js';
import { getRouteSEOData, injectSEOIntoHtml } from './src/lib/serverSEO.js';

const PORT = 3000;

async function startServer() {
  await ensureDbSchema().catch((e) => {
    console.warn('[Startup] Database schema check notice:', e?.message || e);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    app.get('*', async (req: Request, res: Response, next) => {
      // Pass through API calls or static files with extension
      if (req.originalUrl.startsWith('/api') || path.extname(req.path)) {
        return next();
      }

      try {
        const rawTemplate = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        const seoData = await getRouteSEOData(req.path, req.query as Record<string, any>);
        const transformedTemplate = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const finalHtml = injectSEOIntoHtml(transformedTemplate, seoData);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
      } catch (e: any) {
        if (vite) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api') || path.extname(req.path)) {
        return next();
      }

      try {
        const indexPath = path.join(distPath, 'index.html');
        const rawTemplate = fs.existsSync(indexPath)
          ? fs.readFileSync(indexPath, 'utf-8')
          : fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        const seoData = await getRouteSEOData(req.path, req.query as Record<string, any>);
        const finalHtml = injectSEOIntoHtml(rawTemplate, seoData);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
      } catch (e) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n============================================================`);
    console.log(`🚀 E-Commerce Server running on http://0.0.0.0:${PORT}`);
    console.log(`============================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
