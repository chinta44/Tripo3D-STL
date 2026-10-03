import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

const tripoProxyPlugin = (): Plugin => ({
  name: 'tripo-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/api/proxy-model', async (req, res) => {
      // Handle CORS preflight
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      try {
        const fullUrl = req.url || '';
        const urlParamIndex = fullUrl.indexOf('url=');
        let targetUrl = '';
        if (urlParamIndex !== -1) {
          targetUrl = decodeURIComponent(fullUrl.slice(urlParamIndex + 4));
        }

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Target URL parameter is required' }));
          return;
        }

        // Fetch using server-side Node fetch
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (!response.ok) {
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Upstream HTTP ${response.status}: Download failed or link expired.` }));
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Content-Length', arrayBuffer.byteLength.toString());
        res.end(Buffer.from(arrayBuffer));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Proxy server error' }));
      }
    });

    server.middlewares.use('/api/download-stl', async (req, res) => {
      try {
        const fs = await import('fs');
        const candidateFiles = [
          path.resolve(__dirname, 'public/cartoon_character_solid_70mm.stl'),
          path.resolve(__dirname, 'public/tripo_70mm_ultra.stl'),
          path.resolve(__dirname, 'public/downloads/cartoon_character_solid.stl')
        ];

        let targetFile = candidateFiles.find(f => fs.existsSync(f));

        if (!targetFile) {
          res.statusCode = 404;
          res.end('File not found');
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="tripo_character_70mm_watertight.stl"');
        res.setHeader('Transfer-Encoding', 'chunked');

        const stream = fs.createReadStream(targetFile, { highWaterMark: 64 * 1024 });
        stream.pipe(res);
      } catch (err: any) {
        res.statusCode = 500;
        res.end(err.message || 'Server download error');
      }
    });
  }
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), tripoProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
