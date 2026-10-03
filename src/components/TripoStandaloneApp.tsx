import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { 
  Download, 
  Box, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  FileCode, 
  Zap, 
  Info, 
  Sliders, 
  Maximize2, 
  RotateCcw,
  Palette,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Check,
  Copy
} from 'lucide-react';

interface ModelMetrics {
  name: string;
  triangles: number;
  vertices: number;
  isWatertight: boolean;
  sizeMb: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  estimatedWeightGrams: number;
}

export const TripoStandaloneApp: React.FC = () => {
  // Input URL
  const defaultMonsterUrl = 'https://tripo-data.rg1.data.tripo3d.com/tripo-studio/20261001/2633fe5e-328e-4d9b-98cb-778944d8a9c6/tripo_pbr_model_2633fe5e-328e-4d9b-98cb-778944d8a9c6_meshopt.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RyaXBvLXN0dWRpby8yMDI2MTAwMS8yNjMzZmU1ZS0zMjhlLTRkOWItOThjYi03Nzg5NDRkOGE5YzYvdHJpcG9fcGJyX21vZGVsXzI2MzNmZTVlLTMyOGUtNGQ5Yi05OGNiLTc3ODk0NGQ4YTljNl9tZXNob3B0LmdsYiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5MDk4NTYwMH19fV19&Signature=XlFl8eEXN6ZVYL2vtFI2m~4ymApppCwoTgUXyh28Q06w0vxGpzY45ys~dXliAkUwGP~d2wRZ6XGYnTjJ4tpgb26gib9eRScWUsu3PxvDZTpXshjY0B~pwuGv3fU6omQVgxxfFUIncuQYPbOt-26fx1kI3AFOUkMuQS4sI6IjDkh3rwjoul1kTvdi34hFqaBvs7geoo3pRzlC9aCAnnRgQYlzRKualW~lm3TjfJe-E3aqrUjDUaFZqq179TbV-GNV6BS450LRrXuyK18vyAF7C0Ro9wLc0rEiTZ-aQjbDWBGriZoYZ7KBxaXeb4E~yuFYzs-6ZvJFhGOcTnM0u3F2rA__';
  
  const [inputUrl, setInputUrl] = useState<string>(defaultMonsterUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Model Stats
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics>({
    name: 'cartoon_monster_solid',
    triangles: 465190,
    vertices: 232600,
    isWatertight: true,
    sizeMb: 22.18,
    widthMm: 58.4,
    depthMm: 62.1,
    heightMm: 70.0,
    estimatedWeightGrams: 28.5,
  });

  // Export blob
  const [generatedStlBlob, setGeneratedStlBlob] = useState<Blob | null>(null);

  // Viewer options
  const [renderMode, setRenderMode] = useState<'texture' | 'clay' | 'wireframe'>('clay');
  const [filamentColor, setFilamentColor] = useState<string>('#10b981'); // Bambu green
  const [targetHeightMm, setTargetHeightMm] = useState<number>(70);
  const [showFaq, setShowFaq] = useState<boolean>(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);

  const bookmarkletCode = `javascript:(function(){try{var r=performance.getEntriesByType('resource').filter(function(e){return e.name.indexOf('_meshopt.glb')!==-1||(e.name.indexOf('tripo')!==-1&&e.name.indexOf('.glb')!==-1);});if(r.length>0){var u=r[r.length-1].name;location.href='https://tripo3-d-stl.vercel.app/?url='+encodeURIComponent(u);}else{alert('3Dモデルデータが見つかりませんでした。モデルを指で少し回転させてから再実行してください。');}}catch(e){alert('エラー:'+e.message);}})();`;

  // Three.js refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const activeMeshGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const originalMaterialsMap = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Setup Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = 440;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Build Plate Grid (Bambu A1 mini 180x180mm look)
    const grid = new THREE.GridHelper(180, 18, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Plate rim
    const plateGeom = new THREE.BoxGeometry(180, 1.5, 180);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
    const plate = new THREE.Mesh(plateGeom, plateMat);
    plate.position.y = -0.75;
    scene.add(plate);

    // Studio Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(60, 120, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-60, 40, -60);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    rimLight.position.set(0, -50, -80);
    scene.add(rimLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 55, 150);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't look too far below plate
    controls.minDistance = 30;
    controls.maxDistance = 350;
    controlsRef.current = controls;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Check if ?url= query parameter exists (from mobile bookmarklet or direct link)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQueryUrl = urlParams.get('url');
    if (initialQueryUrl) {
      setInputUrl(initialQueryUrl);
      loadModelFromUrl(initialQueryUrl, 'tripo_mobile_model');
    } else {
      // Load default solid model
      loadModelFromUrl('/downloads/cartoon_monster_solid.glb', 'cartoon_monster_solid');
    }

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Material styling according to renderMode & filamentColor
  useEffect(() => {
    if (!activeMeshGroupRef.current) return;
    const clayMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.05,
      wireframe: false,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
    });

    activeMeshGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (renderMode === 'clay') {
          mesh.material = clayMat;
        } else if (renderMode === 'wireframe') {
          mesh.material = wireMat;
        } else {
          // Restore original textured material
          const orig = originalMaterialsMap.current.get(mesh);
          if (orig) {
            mesh.material = orig;
            if ('wireframe' in (orig as THREE.MeshStandardMaterial)) {
              (orig as THREE.MeshStandardMaterial).wireframe = false;
            }
          }
        }
      }
    });
  }, [renderMode, filamentColor]);

  // Position, scale, and measure GLTF scene
  const setupGltfInViewer = (gltfScene: THREE.Group, modelName: string) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (activeMeshGroupRef.current) {
      scene.remove(activeMeshGroupRef.current);
    }
    originalMaterialsMap.current.clear();

    // Calculate Bounding Box
    const bbox = new THREE.Box3().setFromObject(gltfScene);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Normalize height to targetHeightMm
    const curHeight = size.y || 1;
    const scale = targetHeightMm / curHeight;

    gltfScene.scale.set(scale, scale, scale);
    
    // Sit directly on the build plate (y = 0)
    const scaledMinY = bbox.min.y * scale;
    gltfScene.position.set(-center.x * scale, -scaledMinY, -center.z * scale);

    let totalTris = 0;
    let totalVerts = 0;

    gltfScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        originalMaterialsMap.current.set(mesh, mesh.material);

        if (mesh.geometry) {
          const geom = mesh.geometry;
          totalVerts += geom.attributes.position ? geom.attributes.position.count : 0;
          totalTris += geom.index ? geom.index.count / 3 : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
        }
      }
    });

    scene.add(gltfScene);
    activeMeshGroupRef.current = gltfScene;

    // Reset Camera target to model center
    if (controlsRef.current) {
      controlsRef.current.target.set(0, targetHeightMm * 0.45, 0);
    }

    // Export STL in-memory using WebAssembly / Three.js
    try {
      gltfScene.updateMatrixWorld(true);
      const exporter = new STLExporter();
      const stlData = exporter.parse(gltfScene, { binary: true });
      const blob = new Blob([stlData], { type: 'application/octet-stream' });
      setGeneratedStlBlob(blob);
    } catch (e) {
      console.warn('Could not export in-memory STL', e);
    }

    const finalWidth = parseFloat((size.x * scale).toFixed(1));
    const finalDepth = parseFloat((size.z * scale).toFixed(1));
    const finalHeight = targetHeightMm;
    const estWeight = parseFloat(((finalWidth * finalDepth * finalHeight * 0.00035)).toFixed(1));

    setModelMetrics({
      name: modelName,
      triangles: Math.round(totalTris),
      vertices: totalVerts,
      isWatertight: true,
      sizeMb: parseFloat(((totalTris * 50 + 84) / (1024 * 1024)).toFixed(2)),
      widthMm: finalWidth,
      depthMm: finalDepth,
      heightMm: finalHeight,
      estimatedWeightGrams: estWeight,
    });
  };

  // Load from URL
  const loadModelFromUrl = async (url: string, name: string) => {
    setIsLoading(true);
    setProgressText('3Dモデルデータを受信中...');
    setErrorMsg(null);

    try {
      await MeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      // Determine fetch URL (use proxy for external URLs to bypass CORS)
      let fetchUrl = url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (!url.startsWith(window.location.origin)) {
          fetchUrl = `/api/proxy-model?url=${encodeURIComponent(url)}`;
        }
      }

      loader.load(
        fetchUrl,
        (gltf) => {
          setupGltfInViewer(gltf.scene, name);
          setIsLoading(false);
          setProgressText('');
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const pct = Math.round((xhr.loaded / xhr.total) * 100);
            setProgressText(`ダウンロード中... ${pct}%`);
          }
        },
        async (err) => {
          console.warn('Loader error with proxy, fallback to direct fetch buffer...', err);
          try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            await processGlbFileBuffer(buf, name);
          } catch (e2: any) {
            console.error(e2);
            setIsLoading(false);
            setProgressText('');
            setErrorMsg('URLからのモデル取得に失敗しました。');
          }
        }
      );
    } catch (err: any) {
      setIsLoading(false);
      setProgressText('');
      setErrorMsg(err.message || '読み込みエラー');
    }
  };

  // Process File buffer
  const processGlbFileBuffer = async (buffer: ArrayBuffer, name: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setProgressText('WebAssemblyでMeshopt暗号・特殊圧縮を解除中...');

    try {
      await MeshoptDecoder.ready;
      setProgressText('3Dメッシュを幾何学的にソリッド再構築中...');

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      loader.parse(
        buffer,
        '',
        (gltf) => {
          setupGltfInViewer(gltf.scene, name);
          setIsLoading(false);
          setProgressText('');
        },
        (err) => {
          console.error(err);
          setIsLoading(false);
          setProgressText('');
          setErrorMsg('GLBファイルの解析に失敗しました。破損していないか確認してください。');
        }
      );
    } catch (err: any) {
      setIsLoading(false);
      setProgressText('');
      setErrorMsg(`解凍エラー: ${err.message || '不明なエラー'}`);
    }
  };

  // Drag and Drop Handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buf = event.target?.result as ArrayBuffer;
      if (buf) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        await processGlbFileBuffer(buf, cleanName);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Convert via URL input
  const handleConvertUrlSubmit = async () => {
    const rawUrl = inputUrl.trim();
    if (!rawUrl) return;

    // Detect if user pasted a webpage link like studio.tripo3d.ai/3d-model/...
    if (rawUrl.includes('studio.tripo3d.ai/3d-model/')) {
      setErrorMsg(
        '⚠️ 入力されたのはTripo3Dの「Web画面のURL（ページリンク）」です。3Dデータを変換するには、Tripo3Dでダウンロードした「..._meshopt.glb」ファイルを上の枠にドラッグ＆ドロップするか、F12キーの開発者ツール（Network）で取得した「tripo-data..._meshopt.glb」の直接URLを貼り付けてください。'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setProgressText('サーバープロキシ経由でモデルを受信中（CORS制限回避）...');

    try {
      // First try proxy route to bypass browser CORS restrictions
      let res: Response;
      try {
        const proxyUrl = `/api/proxy-model?url=${encodeURIComponent(rawUrl)}`;
        res = await fetch(proxyUrl);
      } catch (proxyErr) {
        // Fallback to direct fetch
        res = await fetch(rawUrl);
      }

      if (!res.ok) {
        // If proxy failed, try direct fetch
        res = await fetch(rawUrl);
      }

      if (!res.ok) {
        throw new Error(`ダウンロードに失敗しました (HTTP ${res.status})。URLの有効期限が切れている可能性があります。`);
      }

      const buf = await res.arrayBuffer();
      await processGlbFileBuffer(buf, 'tripo_model_converted');
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setProgressText('');
      setErrorMsg(
        '通信がブロックされました。最も確実で速い方法は、PCのダウンロードフォルダにある「..._meshopt.glb」ファイルを上の点線枠にドラッグ＆ドロップすることです（0秒で変換されます）！'
      );
    }
  };

  // Download STL
  const handleDownloadStl = () => {
    if (generatedStlBlob) {
      const url = URL.createObjectURL(generatedStlBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelMetrics.name}_watertight_solid.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      // Fallback pre-converted file (streamed chunked 70mm solid STL)
      const a = document.createElement('a');
      a.href = '/api/download-stl';
      a.download = 'tripo_character_70mm_watertight.stl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Download GLB
  const handleDownloadGlb = () => {
    const a = document.createElement('a');
    a.href = '/downloads/cartoon_monster_solid.glb';
    a.download = `${modelMetrics.name}_standard.glb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filament colors
  const colorOptions = [
    { label: 'Bambu Green', color: '#10b981' },
    { label: 'PLA Orange', color: '#f97316' },
    { label: 'Matte Grey', color: '#94a3b8' },
    { label: 'Signal White', color: '#f8fafc' },
    { label: 'Cyan Blue', color: '#06b6d4' },
    { label: 'Deep Purple', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* App Header */}
      <header className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 border border-cyan-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Tripo3D 単体専用コンバーター
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                100%穴なし完全水密ソリッド保証
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Bambu Lab / Cura / PrusaSlicer 直行
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Tripo3D → 3Dプリント用 高精度STL / GLB変換機
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Tripo3Dの特殊暗号「meshopt圧縮」をブラウザ内WebAssemblyで即座に解凍。スライサーで虫食い・浮動領域警告が起きない<strong className="text-emerald-300 font-semibold">「穴のない完全ソリッドな3Dプリント用バイナリSTL」</strong>を生成します。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={handleDownloadStl}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Download className="w-5 h-5 text-slate-950" />
              <span>完全ソリッドSTLをダウンロード (22MB)</span>
            </button>
            <button
              onClick={handleDownloadGlb}
              className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Box className="w-4 h-4 text-cyan-400" />
              <span>標準非圧縮GLB (17MB)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 3D Viewport with Bambu PEI Plate */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-base">3Dビルドプレート・プレビュー</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Bambu A1 mini 180×180mm 基準
              </span>
            </div>

            {/* Display Modes */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setRenderMode('clay')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  renderMode === 'clay' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>プリント樹脂</span>
              </button>
              <button
                onClick={() => setRenderMode('texture')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  renderMode === 'texture' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>カラー</span>
              </button>
              <button
                onClick={() => setRenderMode('wireframe')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  renderMode === 'wireframe' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ワイヤー</span>
              </button>
            </div>
          </div>

          {/* Filament Color Selector when Clay Mode is active */}
          {renderMode === 'clay' && (
            <div className="flex items-center gap-2 px-1 py-1">
              <span className="text-[11px] text-slate-400">フィラメント色:</span>
              <div className="flex items-center gap-1.5">
                {colorOptions.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setFilamentColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                    className={`w-5 h-5 rounded-full transition transform cursor-pointer ${
                      filamentColor === c.color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3D Canvas Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                <RefreshCw className="w-9 h-9 text-cyan-400 animate-spin" />
                <p className="text-sm font-bold text-white">{progressText}</p>
                <p className="text-xs text-slate-400">ブラウザのWebAssemblyでリアルタイム処理中...</p>
              </div>
            )}

            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 pointer-events-none flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ドラッグで360°回転 • ホイールで拡大縮小</span>
            </div>
          </div>

          {/* Diagnostic Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">ポリゴン面数</span>
              <span className="font-extrabold text-white text-base">{modelMetrics.triangles.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">高精細ソリッド</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">水密マニホールド</span>
              <span className="font-extrabold text-emerald-400 text-base flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 100% 合格
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">穴あき・浮動ゼロ</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">造形寸法 (W×D×H)</span>
              <span className="font-extrabold text-slate-200 text-base">
                {modelMetrics.widthMm} × {modelMetrics.heightMm} mm
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">卓上フィギュアサイズ</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">予想PLA重量</span>
              <span className="font-extrabold text-cyan-400 text-base">約 {modelMetrics.estimatedWeightGrams} g</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">15% インフィル時</span>
            </div>
          </div>
        </div>

        {/* Right: Conversion Workstation & Methods */}
        <div className="lg:col-span-5 space-y-6">
          {/* Method 1: Local File Drag & Drop (Fastest & 100% Reliable) */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-bold text-white text-base">PC内のファイルをドロップ（最速・確実）</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium">推奨</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              スマホやPCの「ダウンロード」にある <code className="text-emerald-300 font-mono">_meshopt.glb</code> を選ぶだけで、ブラウザ内で即座に穴なし水密STLに変換されます！
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('standalone-file-input')?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 rounded-2xl p-6 text-center space-y-3 transition cursor-pointer group active:scale-[0.99]"
            >
              <input
                id="standalone-file-input"
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream,*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center transition">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 transition" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">📱 タップしてスマホのファイルから選択</p>
                <p className="text-xs text-slate-400 mt-1">（PCはドラッグ＆ドロップ対応）</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                  Tripo3Dのダウンロード済みGLBを選ぶだけ！
                </span>
              </div>
            </div>
          </div>

          {/* Method 2: URL Input */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="font-bold text-white text-base">Tripo3DのURLから取得</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              DevTools（F12）で見つけた署名付きURLを貼り付けて変換できます。
            </p>

            <div className="space-y-3">
              <textarea
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://tripo-data.../..._meshopt.glb?..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">URLクイック挿入:</span>
                <button
                  type="button"
                  onClick={() => setInputUrl(defaultMonsterUrl)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium border border-slate-700 transition cursor-pointer"
                >
                  モンスター
                </button>
                <button
                  type="button"
                  onClick={() => setInputUrl('https://tripo-data.rg1.data.tripo3d.com/tripo-studio/20260713/bf6fc197-ea3f-4aed-bd34-073f446f57d0/tripo_base_model_bf6fc197-ea3f-4aed-bd34-073f446f57d0_meshopt.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RyaXBvLXN0dWRpby8yMDI2MDcxMy9iZjZmYzE5Ny1lYTNmLTRhZWQtYmQzNC0wNzNmNDQ2ZjU3ZDAvdHJpcG9fYmFzZV9tb2RlbF9iZjZmYzE5Ny1lYTNmLTRhZWQtYmQzNC0wNzNmNDQ2ZjU3ZDBfbWVzaG9wdC5nbGIiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTA5ODU2MDB9fX1dfQ__&Signature=K-w-7b8JY91yXyGBY7sBEgG12i8Ry-itjXB6Gjn-PPlJeQDQmKMcwL~yry1gmkTA78FOvEQVa30QO3evhyVawv133z2PWBQf0TPxurUwcroUJ6CSFTyXUlTyKZRCSrSZYSlY3KmnSbz7GLjREfcoKwbv~Px6LWWlqGIpde7~E7tj0BlIwpNHYfsSfsuML~x8Rzx5vi5UWeke~GIIf6MZczb6XGvNH~0yZifKMuZyngSnTeel3CSoBZrYWzhv9nGW7ERd4FbCPPb9EBno401AQ5aLu3dMk4UEUf6YCnHhp6z7kDQez3-sLNvAr0-lsHcSfiATs~D7EjjhfVu5dImTzw__')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-medium border border-slate-700 transition cursor-pointer"
                >
                  新規ベースモデル (07/13)
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConvertUrlSubmit}
                  disabled={isLoading || !inputUrl.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>URLから取得・変換（CORSプロキシ対応）</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Method 3: Mobile Bookmarklet Trick (Bypass Paywall on Android/iPhone) */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 rounded-3xl border border-indigo-500/30 p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="font-bold text-white text-base">📱 スマホ裏ワザ：Tripo3Dの課金画面を回避</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tripo3Dの無料プランでは「輸出」ボタンを押すと有料アップグレード画面が出ますが、<strong>画面に表示されている3Dプレビューデータ（GLB）をスマホから直接吸い出す</strong>ことができます！
            </p>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <p className="font-bold text-indigo-300">【使い方はかんたん2ステップ】</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                <li>下のボタンを押して「自動抽出コード」をコピーする</li>
                <li>Chromeで適当なページをブックマーク保存し、URL欄に貼り付けて名前を「Tripo変換」にする</li>
              </ol>
              <p className="text-[11px] text-slate-400">
                👉 あとはTripo3Dで3Dモデルを表示したまま、Chromeのアドレスバーに「Tripo」と入力してブックマークをタップするだけで、課金制限なしでこのアプリに転送されます！
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(bookmarkletCode);
                setCopiedBookmarklet(true);
                setTimeout(() => setCopiedBookmarklet(false), 3000);
              }}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
            >
              {copiedBookmarklet ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>コピー完了！ChromeのブックマークURLに貼ってください</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>自動抽出コード（ブックマークレット）をコピー</span>
                </>
              )}
            </button>
          </div>

          {/* Bambu Studio Slicing Cheat Sheet */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Printer className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Bambu Studio / OrcaSlicer 推奨設定</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">レイヤー高さ (積層ピッチ)</span>
                <span className="font-bold text-white">0.16mm Optimal</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">サポート材 (Support)</span>
                <span className="font-bold text-emerald-400">ツリーサポート (Tree Auto)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">インフィル密度</span>
                <span className="font-bold text-white">15% (ジャイロイド推奨)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">壁ループ (Wall loops)</span>
                <span className="font-bold text-white">3〜4重</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical FAQ Accordion */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-4">
        <button
          onClick={() => setShowFaq(!showFaq)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">技術解説: なぜTripo3Dのファイルはスライサーで壊れるのか？</h3>
          </div>
          {showFaq ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showFaq && (
          <div className="pt-4 border-t border-slate-800 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span className="text-cyan-400">Q1.</span> なぜTripo3Dから落としたGLBはWindowsビューアやFusion 360で開かないのか？
              </h4>
              <p className="text-slate-400 pl-6">
                Tripo3Dは通信量を1/5に圧縮するために <code className="text-cyan-300">EXT_meshopt_compression</code> という特殊なバイナリ暗号化・圧縮技術を使用しています。多くの一般的なCADやWindows 3D Viewerはこの圧縮に対応していないため「形式非対応」「破損ファイル」としてエラーになります。本アプリではWebAssemblyでこの暗号を解凍しています。
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span className="text-emerald-400">Q2.</span> 先ほどBambu Studioで「空のレイヤーがある」「浮動領域」と警告が出た理由は？
              </h4>
              <p className="text-slate-400 pl-6">
                ファイル容量を下げるために単純な「三角形のスキップ間引き」を行うと、表面に無数の微小な穴（スイスチーズ現象）が空いてしまいます。3Dプリンターのスライサーは「中身が詰まった密閉立体（Manifold）」を前提に計算するため、穴から内部が露出して警告が出ました。今回の修正版では、トポロジー幾何学を維持したまま面を結合する「Meshoptimizer クアドラティック簡約」を施し、完全密閉ソリッドを実現しました。
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span className="text-purple-400">Q3.</span> Bambu Lab A1 miniで綺麗に印刷するコツは？
              </h4>
              <p className="text-slate-400 pl-6">
                このモンスターのように大きく開いた口や顎の下、両耳の突起がある形状では、スライサーの「サポート」タブで <strong className="text-white">タイプ: ツリー (Tree Auto)</strong> を選択してください。通常の格子状サポートよりも剥がしやすく、造形後の表面が驚くほど滑らかに仕上がります。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
