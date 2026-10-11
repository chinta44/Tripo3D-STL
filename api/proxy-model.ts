export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const targetUrl = req.query?.url || '';
    if (!targetUrl) {
      res.status(400).json({ error: 'Target URL parameter is required' });
      return;
    }

    // Check if user accidentally pasted a CSS or JS asset
    if (targetUrl.match(/\.(css|js)(\?|$)/i)) {
      res.status(400).json({ 
        error: '貼り付けられたURLは3Dモデルではなく『CSS（ウェブサイトのデザイン装飾ファイル）』です！ブラウザのアドレスバーにあるWebページのURL（https://www.hi3d.ai/...）をそのまま貼り付けてください。' 
      });
      return;
    }

    // Attempt to auto-derive the actual Tripo GLB URL from the studio task UUID if WebP
    if (targetUrl.match(/\.(webp|png|jpg|jpeg)(\?|$)/i)) {
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
              res.status(200);
              res.setHeader('Content-Type', 'model/gltf-binary');
              res.setHeader('Content-Length', modelBuf.byteLength.toString());
              res.end(Buffer.from(modelBuf));
              return;
            }
          } catch (e) {
            // Continue
          }
        }
      }

      res.status(400).json({ 
        error: '貼り付けられたURLは3Dモデル（.glb）ではなく、サムネイル画像（.webp / 画像データ）です！Tripo3Dの3Dモデル本体（..._meshopt.glb）のURLを貼り付けてください。' 
      });
      return;
    }

    // Fetch upstream resource
    let response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `上流サーバーエラー (HTTP ${response.status}): アクセスできないか、リンクの有効期限が切れています。` });
      return;
    }

    const contentType = response.headers.get('content-type') || '';

    // If upstream returned an HTML page (like Hi3D, Tripo, or Meshy share page)
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
                res.status(200);
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

      // 2. Look for embedded 3D model URLs in HTML
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
          res.status(200);
          res.setHeader('Content-Type', 'model/gltf-binary');
          res.setHeader('Content-Length', modelBuf.byteLength.toString());
          res.end(Buffer.from(modelBuf));
          return;
        }
      }

      res.status(422).json({ 
        error: '入力されたURLはWebページ画面（HTML）であり、3Dモデル本体データが含まれていませんでした。ログインが必要なプライベート画面の場合は、下の「ワンクリック抽出ブックマーク」をお試しください！' 
      });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    res.status(200);
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', arrayBuffer.byteLength.toString());
    res.end(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Proxy server error' });
  }
}
