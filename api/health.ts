// api/health.ts
// Vercel Serverless Function — GET /api/health

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'ok',
    service: 'clinicops-api',
    timestamp: new Date().toISOString(),
  });
}
