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
        let response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });

        if (!response.ok) {
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `上流サーバーエラー (HTTP ${response.status}): アクセスできないか、リンクの有効期限が切れています。` }));
          return;
        }

        const contentType = response.headers.get('content-type') || '';

        // Check if user accidentally pasted a Tripo WebP / thumbnail image
        if (contentType.includes('image/') || targetUrl.match(/\.(webp|png|jpg|jpeg)(\?|$)/i)) {
          // Attempt to auto-derive the actual Tripo GLB URL from the studio task UUID
          const tripoMatch = targetUrl.match(/tripo-studio\/([^\/]+)\/([a-f0-9\-]+)\//i);
          if (tripoMatch) {
            const date = tripoMatch[1];
            const uuid = tripoMatch[2];
            const queryParams = targetUrl.includes('?') ? targetUrl.slice(targetUrl.indexOf('?')) : '';
            
            const candidateUrls = [
              `https://tripo-data.rg1.data.tripo3d.com/tripo-studio/${date}/${uuid}/tripo_pbr_model_${uuid}_meshopt.glb${queryParams}`,
              `https://tripo-data.rg1.data.tripo3d.com/tripo-studio/${date}/${uuid}/tripo_base_model_${uuid}_meshopt.glb${queryParams}`,
              `https://tripo-data.rg1.data.tripo3d.com/tripo-studio/${date}/${uuid}/tripo_draft_model_${uuid}_meshopt.glb${queryParams}`
            ];

            for (const candUrl of candidateUrls) {
              try {
                const candResp = await fetch(candUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
                  }
                });
                if (candResp.ok) {
                  const modelBuf = await candResp.arrayBuffer();
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'model/gltf-binary');
                  res.setHeader('Content-Length', modelBuf.byteLength.toString());
                  res.end(Buffer.from(modelBuf));
                  return;
                }
              } catch (e) {
                // Continue to next candidate
              }
            }
          }

          // If auto-derivation failed or not a Tripo model
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: '貼り付けられたURLは3Dモデル（.glb）ではなく、サムネイル画像（.webp / 画像データ）です！Tripo3Dの3Dモデル本体（..._meshopt.glb）のURLを貼り付けてください。' 
          }));
          return;
        }

        // If upstream returned an HTML page (like a share page or workspace), attempt to find embedded GLB URL
        if (contentType.includes('text/html')) {
          const htmlText = await response.text();
          
          // 1. Dedicated support for Hi3D (hi3d.ai)
          if (targetUrl.includes('hi3d.ai') || htmlText.includes('hi3d.ai') || htmlText.includes('__NUXT_DATA__')) {
            const nuxtMatch = htmlText.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (nuxtMatch) {
              try {
                const arr = JSON.parse(nuxtMatch[1]);
                const smallGlb = arr.find((item: any) => typeof item === 'string' && item.startsWith('http') && item.includes('SMALL0.glb'));
                const fullGlb = arr.find((item: any) => typeof item === 'string' && item.startsWith('http') && item.includes('.glb'));
                const hi3dModelUrl = smallGlb || fullGlb;
                if (hi3dModelUrl) {
                  const hi3dResp = await fetch(hi3dModelUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
                    }
                  });
                  if (hi3dResp.ok) {
                    const modelBuf = await hi3dResp.arrayBuffer();
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'model/gltf-binary');
                    res.setHeader('Content-Length', modelBuf.byteLength.toString());
                    res.end(Buffer.from(modelBuf));
                    return;
                  }
                }
              } catch (e) {
                console.warn('Hi3D Nuxt parsing error:', e);
              }
            }
          }

          // 2. Look for 3D model URLs in HTML
          const glbMatches = htmlText.match(/https?:\/\/[^"'\s<>]+\.(?:glb|gltf)(?:\?[^"'\s<>]*)?/gi) ||
                             htmlText.match(/https?:\/\/[^"'\s<>]*tripo-data[^"'\s<>]+/gi) ||
                             htmlText.match(/https?:\/\/[^"'\s<>]*assets\.meshy\.ai[^"'\s<>]+/gi) ||
                             htmlText.match(/https?:\/\/[^"'\s<>]*zaohaowu\.net[^"'\s<>]+/gi);

          if (glbMatches && glbMatches.length > 0) {
            const resolvedModelUrl = glbMatches[0].replace(/&amp;/g, '&');
            const modelResp = await fetch(resolvedModelUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
              }
            });
            if (modelResp.ok) {
              const modelBuf = await modelResp.arrayBuffer();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'model/gltf-binary');
              res.setHeader('Content-Length', modelBuf.byteLength.toString());
              res.end(Buffer.from(modelBuf));
              return;
            }
          }

          // If no model URL could be extracted from HTML
          res.statusCode = 422;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: '入力されたURLはWebページ画面（HTML）であり、3Dモデル本体データが含まれていませんでした。ログインが必要なプライベート画面の場合は、下の「ワンクリック抽出ブックマーク」をお試しください！' 
          }));
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
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
