import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { 
  Download, 
  Box, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCw, 
  Move, 
  Maximize2, 
  Smartphone, 
  Printer, 
  RefreshCw, 
  Sliders, 
  LayoutGrid, 
  AlignCenter, 
  Columns, 
  Palette,
  RotateCcw,
  Plus
} from 'lucide-react';

export interface ModelItem {
  id: string;
  name: string;
  sizeMb: number;
  rawScene: THREE.Group;
  originalBbox: THREE.Box3;
  originalSize: THREE.Vector3;
  originalCenter: THREE.Vector3;
  triangles: number;
  vertices: number;
  // Transforms
  posX: number; // in cm
  posZ: number; // in cm
  rotationY: number; // in degrees
  scaleMultiplier: number; // uniform multiplier e.g. 1.0
  visible: boolean;
}

export const MultiGlbMerger: React.FC = () => {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Overall combined target height (for AR in cm, and for 3D print in mm)
  const [combinedArHeightCm, setCombinedArHeightCm] = useState<number>(20);
  const [combinedPrintHeightMm, setCombinedPrintHeightMm] = useState<number>(100);

  // Auto-layout spacing between models (in cm)
  const [layoutGapCm, setLayoutGapCm] = useState<number>(5);

  // Rendering options
  const [renderMode, setRenderMode] = useState<'texture' | 'clay' | 'wireframe'>('texture');
  const [filamentColor, setFilamentColor] = useState<string>('#10b981');

  // Exported blobs
  const [mergedGlbBlob, setMergedGlbBlob] = useState<Blob | null>(null);
  const [mergedStlBlob, setMergedStlBlob] = useState<Blob | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Three.js refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelsGroupRef = useRef<THREE.Group | null>(null);

  // 1. Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Build Plate & Ground Grid
    const grid = new THREE.GridHelper(300, 30, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Plate rim
    const plateGeom = new THREE.BoxGeometry(300, 2, 300);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
    const plate = new THREE.Mesh(plateGeom, plateMat);
    plate.position.y = -1;
    scene.add(plate);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(100, 200, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-100, 80, -100);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.9);
    rimLight.position.set(0, -60, -120);
    scene.add(rimLight);

    // Group to hold all combined models
    const modelsGroup = new THREE.Group();
    scene.add(modelsGroup);
    modelsGroupRef.current = modelsGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000);
    camera.position.set(0, 90, 260);
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
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 30;
    controls.maxDistance = 600;
    controlsRef.current = controls;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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

  // 2. Parse a single GLB buffer and convert to ModelItem
  const parseGlbBuffer = async (buffer: ArrayBuffer, fileName: string): Promise<ModelItem> => {
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    return new Promise((resolve, reject) => {
      loader.parse(
        buffer,
        '',
        (gltf) => {
          const scene = gltf.scene;

          // Compute raw bbox and sizes
          const bbox = new THREE.Box3().setFromObject(scene);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // Compute tris & vertices
          let totalTris = 0;
          let totalVerts = 0;
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.geometry) {
                const geom = mesh.geometry;
                totalVerts += geom.attributes.position ? geom.attributes.position.count : 0;
                totalTris += geom.index ? geom.index.count / 3 : (geom.attributes.position ? geom.attributes.position.count / 3 : 0);
              }
            }
          });

          const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/_meshopt$/i, '');
          const sizeMb = parseFloat((buffer.byteLength / (1024 * 1024)).toFixed(2));

          resolve({
            id: 'm_' + Math.random().toString(36).substring(2, 9),
            name: baseName,
            sizeMb: sizeMb,
            rawScene: scene,
            originalBbox: bbox,
            originalSize: size,
            originalCenter: center,
            triangles: Math.round(totalTris),
            vertices: totalVerts,
            posX: 0,
            posZ: 0,
            rotationY: 0,
            scaleMultiplier: 1.0,
            visible: true,
          });
        },
        (err) => reject(err)
      );
    });
  };

  // 3. Handle multiple files input
  const handleMultipleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    setProgressText('複数GLBファイルを解析＆Meshopt解凍中...');

    try {
      const newItems: ModelItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.match(/\.(glb|gltf)$/i)) continue;
        setProgressText(`[${i + 1}/${files.length}] ${file.name} を解凍中...`);
        const buffer = await file.arrayBuffer();
        const item = await parseGlbBuffer(buffer, file.name);
        newItems.push(item);
      }

      if (newItems.length === 0) {
        setErrorMsg('.glb または .gltf ファイルを選択してください。');
        setIsLoading(false);
        return;
      }

      setModels((prev) => {
        const updated = [...prev, ...newItems];
        return autoLayoutSideBySide(updated, layoutGapCm);
      });

      if (!selectedModelId && newItems.length > 0) {
        setSelectedModelId(newItems[0].id);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg('モデル読み込みエラー: ' + (err.message || '破損または非対応フォーマットです'));
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  // 4. Layout algorithms
  const autoLayoutSideBySide = (items: ModelItem[], gap: number): ModelItem[] => {
    let currentX = 0;
    const halfWidths: number[] = [];

    items.forEach((item) => {
      const normW = ((item.originalSize.x * 70) / (item.originalSize.y || 1)) * item.scaleMultiplier;
      halfWidths.push(normW / 2);
    });

    const totalWidth = halfWidths.reduce((a, b) => a + b * 2, 0) + (items.length - 1) * (gap * 10);
    let startX = -totalWidth / 2;

    return items.map((item, idx) => {
      const myHalfW = halfWidths[idx];
      const posX = (startX + myHalfW) / 10; // convert to cm
      startX += myHalfW * 2 + gap * 10;
      return {
        ...item,
        posX: parseFloat(posX.toFixed(1)),
        posZ: 0,
      };
    });
  };

  const autoLayoutStacked = (items: ModelItem[]): ModelItem[] => {
    return items.map((item) => ({
      ...item,
      posX: 0,
      posZ: 0,
    }));
  };

  const autoLayoutStaggered = (items: ModelItem[], gap: number): ModelItem[] => {
    return items.map((item, idx) => {
      const isBackRow = idx % 2 === 1;
      const xIndex = Math.floor(idx / 2);
      const posX = (xIndex - items.length / 4) * (gap * 2.5);
      const posZ = isBackRow ? -gap * 2 : gap * 1.5;
      return {
        ...item,
        posX: parseFloat(posX.toFixed(1)),
        posZ: parseFloat(posZ.toFixed(1)),
      };
    });
  };

  // 5. Update 3D viewport whenever models or materials change
  const updateViewportScene = useCallback(() => {
    const group = modelsGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const clayMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.05,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
    });

    models.forEach((item) => {
      if (!item.visible) return;

      const clone = item.rawScene.clone(true);
      const rawH = item.originalSize.y || 1;
      const baseScale = (70 / rawH) * item.scaleMultiplier;

      clone.scale.set(baseScale, baseScale, baseScale);

      const posXmm = item.posX * 10;
      const posZmm = item.posZ * 10;
      const scaledMinY = item.originalBbox.min.y * baseScale;

      clone.position.set(
        -item.originalCenter.x * baseScale + posXmm,
        -scaledMinY,
        -item.originalCenter.z * baseScale + posZmm
      );

      clone.rotation.y = (item.rotationY * Math.PI) / 180;
      clone.updateMatrixWorld(true);

      if (renderMode !== 'texture') {
        clone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = renderMode === 'clay' ? clayMat : wireMat;
          }
        });
      }

      if (item.id === selectedModelId) {
        const boxHelper = new THREE.BoxHelper(clone, 0x38bdf8);
        group.add(boxHelper);
      }

      group.add(clone);
    });
  }, [models, selectedModelId, renderMode, filamentColor]);

  useEffect(() => {
    updateViewportScene();
  }, [updateViewportScene]);

  // 6. Build merged scene for export
  const buildMergedExportScene = (isArMeters: boolean, targetHeight: number) => {
    const exportRoot = new THREE.Group();
    const visibleModels = models.filter((m) => m.visible);
    if (visibleModels.length === 0) return null;

    const tempGroup = new THREE.Group();
    visibleModels.forEach((item) => {
      const clone = item.rawScene.clone(true);
      const rawH = item.originalSize.y || 1;
      const baseScale = (70 / rawH) * item.scaleMultiplier;

      clone.scale.set(baseScale, baseScale, baseScale);
      const posXmm = item.posX * 10;
      const posZmm = item.posZ * 10;
      const scaledMinY = item.originalBbox.min.y * baseScale;

      clone.position.set(
        -item.originalCenter.x * baseScale + posXmm,
        -scaledMinY,
        -item.originalCenter.z * baseScale + posZmm
      );

      clone.rotation.y = (item.rotationY * Math.PI) / 180;
      clone.updateMatrixWorld(true);
      tempGroup.add(clone);
    });

    const totalBbox = new THREE.Box3().setFromObject(tempGroup);
    const totalSize = new THREE.Vector3();
    totalBbox.getSize(totalSize);
    const totalCenter = new THREE.Vector3();
    totalBbox.getCenter(totalCenter);

    const combinedH = totalSize.y || 1;

    if (isArMeters) {
      // For AR in glTF specification: 1 unit = 1 meter
      const targetM = targetHeight / 100;
      const finalArScale = targetM / combinedH;

      tempGroup.scale.set(finalArScale, finalArScale, finalArScale);
      tempGroup.position.set(
        -totalCenter.x * finalArScale,
        -totalBbox.min.y * finalArScale,
        -totalCenter.z * finalArScale
      );
      tempGroup.updateMatrixWorld(true);
      exportRoot.add(tempGroup);
    } else {
      // For 3D printing STL: unit = 1 millimeter
      const finalStlScale = targetHeight / combinedH;

      tempGroup.scale.set(finalStlScale, finalStlScale, finalStlScale);
      tempGroup.position.set(
        -totalCenter.x * finalStlScale,
        -totalBbox.min.y * finalStlScale,
        -totalCenter.z * finalStlScale
      );
      tempGroup.updateMatrixWorld(true);
      exportRoot.add(tempGroup);
    }

    return exportRoot;
  };

  // 7. Export combined GLB (Chrome AR)
  const handleExportMergedGlb = async () => {
    if (models.length === 0) return;
    setIsExporting(true);
    setProgressText('複数モデルを統合したChrome AR対応GLBを生成中...');

    try {
      const mergedScene = buildMergedExportScene(true, combinedArHeightCm);
      if (!mergedScene) throw new Error('有効なモデルがありません');

      const exporter = new GLTFExporter();
      exporter.parse(
        mergedScene,
        (result) => {
          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            setMergedGlbBlob(blob);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `combined_scene_${models.length}models_AR_${combinedArHeightCm}cm.glb`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }
          setIsExporting(false);
          setProgressText('');
        },
        (err) => {
          console.error('GLTF Export Error:', err);
          setErrorMsg('GLB結合エラー: ' + err);
          setIsExporting(false);
        },
        { binary: true }
      );
    } catch (e: any) {
      setErrorMsg('エクスポート失敗: ' + e.message);
      setIsExporting(false);
    }
  };

  // 8. Export combined STL (3D Printing)
  const handleExportMergedStl = async () => {
    if (models.length === 0) return;
    setIsExporting(true);
    setProgressText('複数モデルを1つの水密バイナリSTLに結合中...');

    try {
      const mergedScene = buildMergedExportScene(false, combinedPrintHeightMm);
      if (!mergedScene) throw new Error('有効なモデルがありません');

      const exporter = new STLExporter();
      const stlData = exporter.parse(mergedScene, { binary: true });
      const blob = new Blob([stlData], { type: 'application/octet-stream' });
      setMergedStlBlob(blob);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `combined_scene_${models.length}models_${combinedPrintHeightMm}mm.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) {
      setErrorMsg('STLエクスポート失敗: ' + e.message);
    } finally {
      setIsExporting(false);
      setProgressText('');
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const updateSelectedModel = (partial: Partial<ModelItem>) => {
    if (!selectedModelId) return;
    setModels((prev) =>
      prev.map((m) => (m.id === selectedModelId ? { ...m, ...partial } : m))
    );
  };

  const removeModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    if (selectedModelId === id) {
      setSelectedModelId(null);
    }
  };

  const totalTriangles = models.reduce((acc, m) => acc + (m.visible ? m.triangles : 0), 0);
  const totalVertices = models.reduce((acc, m) => acc + (m.visible ? m.vertices : 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Merger Header Banner */}
      <header className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                複数GLB一括結合・合体スタジオ
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                Chrome AR 一括同時表示
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                3Dプリント同一プレート結合STL
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              複数のGLBファイルを1つに結合・合体
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              「キャラクター＋武器」「複数フィギュアの並び」「台座＋モデル」など、複数のGLBファイルをドラッグ＆ドロップして並べ替えるだけで、<strong className="text-purple-300">「Chrome ARで同時に出現する1本のGLBファイル」</strong>や<strong className="text-emerald-300">「まとめて一度に印刷できる結合STL」</strong>へ高精度に合成します。
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={handleExportMergedGlb}
              disabled={models.length === 0 || isExporting}
              className={`py-3.5 px-6 rounded-2xl font-black text-sm shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2.5 ${
                models.length > 0
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              <Box className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <div className="leading-tight">
                  {models.length > 0 ? `統合GLBを保存 (${models.length}体結合)` : '統合GLBを保存'}
                </div>
                <div className="text-[10px] opacity-80 font-normal">
                  AR実寸 {combinedArHeightCm}cm • Chrome AR一括出現対応
                </div>
              </div>
            </button>

            <button
              onClick={handleExportMergedStl}
              disabled={models.length === 0 || isExporting}
              className={`py-3 px-6 rounded-2xl font-bold text-xs shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 ${
                models.length > 0
                  ? 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>統合3DプリントSTL保存 (高さ{combinedPrintHeightMm}mm)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 3D Viewport with Combined Scene */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-white text-base">結合シーン・リアルタイムプレビュー</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {models.filter((m) => m.visible).length} 体 表示中
              </span>
            </div>

            {/* Display Modes */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setRenderMode('texture')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  renderMode === 'texture' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                元テクスチャ
              </button>
              <button
                onClick={() => setRenderMode('clay')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  renderMode === 'clay' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                プリント色
              </button>
              <button
                onClick={() => setRenderMode('wireframe')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  renderMode === 'wireframe' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                メッシュ
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="relative w-full h-[460px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Empty State */}
            {models.length === 0 && !isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-500/10 animate-pulse">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  結合するGLBファイルを追加してください
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  右側の「複数のGLBを選択」にファイルをまとめてドロップすると、ここに同時に配置されます。
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Meshopt暗号解凍 & PBRテクスチャ完全保持エンジン</span>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-white mb-1">{progressText || '処理中...'}</p>
                <p className="text-xs text-purple-300/80">WebAssemblyで高密度メッシュを解凍・合成しています</p>
              </div>
            )}

            {/* Reset Camera Button */}
            {models.length > 0 && (
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (controlsRef.current && cameraRef.current) {
                      cameraRef.current.position.set(0, 90, 260);
                      controlsRef.current.target.set(0, 35, 0);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/70 shadow-lg backdrop-blur-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>視点リセット</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 block">読み込みモデル数</span>
              <span className="text-base font-black text-white mt-0.5 block">
                {models.length} 体
              </span>
              <span className="text-[10px] text-purple-400 font-medium">1ファイルに統合</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 block">合計ポリゴン数</span>
              <span className="text-base font-black text-white mt-0.5 block">
                {totalTriangles.toLocaleString()} 面
              </span>
              <span className="text-[10px] text-cyan-400 font-medium">{totalVertices.toLocaleString()} 頂点</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 block">AR出現時の実寸高さ</span>
              <span className="text-base font-black text-indigo-300 mt-0.5 block">
                {combinedArHeightCm} cm
              </span>
              <span className="text-[10px] text-slate-400">({(combinedArHeightCm / 100).toFixed(2)}m)</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 block">3Dプリント造形高さ</span>
              <span className="text-base font-black text-emerald-400 mt-0.5 block">
                {combinedPrintHeightMm} mm
              </span>
              <span className="text-[10px] text-emerald-400/80">同一プレート配置</span>
            </div>
          </div>

          {/* Quick Export Banner */}
          {models.length > 0 && (
            <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-4 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">準備完了！1つのファイルに合成できます</p>
                  <p className="text-[11px] text-slate-400">Chrome ARで一度に全モデルを表示可能になります</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleExportMergedGlb}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>統合GLBをダウンロード ({combinedArHeightCm}cm)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Upload, Layout Presets & Model Items */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Dropzone */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">GLBファイルを追加（複数選択可）</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                複数同時OK
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              合体させたいGLBファイルをまとめてドラッグ＆ドロップしてください。あとから何体でも追加できます。
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) {
                  handleMultipleFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => document.getElementById('multi-glb-file-input')?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver 
                  ? 'border-purple-400 bg-purple-500/10 scale-[1.01]' 
                  : 'border-slate-700 hover:border-purple-500/50 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <input
                id="multi-glb-file-input"
                type="file"
                accept=".glb,.gltf"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleMultipleFiles(e.target.files);
                  }
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Plus className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  クリックしてファイルを追加（複数選択対応）
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tripo3D、Meshy、Hi3Dなどの <span className="text-slate-300 font-mono">.glb / .gltf</span>
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Smart Auto-Layout Presets */}
          {models.length > 0 && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">自動整列レイアウト</h3>
                </div>
                <span className="text-[11px] text-slate-400">ワンクリック配置</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModels((prev) => autoLayoutSideBySide(prev, layoutGapCm))}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Columns className="w-4 h-4 text-cyan-400" />
                  <span>横並びに整列</span>
                  <span className="text-[10px] text-slate-500 font-normal">Side-by-side</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModels((prev) => autoLayoutStacked(prev))}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
                >
                  <AlignCenter className="w-4 h-4 text-purple-400" />
                  <span>同一点重ね合わせ</span>
                  <span className="text-[10px] text-slate-500 font-normal">装備・台座合体</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModels((prev) => autoLayoutStaggered(prev, layoutGapCm))}
                  className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4 text-emerald-400" />
                  <span>前後ひな壇並び</span>
                  <span className="text-[10px] text-slate-500 font-normal">立体スタッガード</span>
                </button>
              </div>

              {/* Gap Distance Slider */}
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>モデル間の隙間（間隔）:</span>
                  <span className="font-mono font-bold text-white">{layoutGapCm} cm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={layoutGapCm}
                  onChange={(e) => {
                    const newGap = parseInt(e.target.value, 10);
                    setLayoutGapCm(newGap);
                    setModels((prev) => autoLayoutSideBySide(prev, newGap));
                  }}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Combined AR Height Adjuster */}
          {models.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 rounded-3xl border border-indigo-500/40 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">結合全体のAR実寸サイズ</h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  実寸 {combinedArHeightCm} cm
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                結合したシーン全体をChrome ARで出現させた時の高さを指定します。全員が揃った状態で指定通りの実寸で出現します！
              </p>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: '10cm', cm: 10, note: '卓上ミニ' },
                  { label: '20cm', cm: 20, note: 'フィギュア' },
                  { label: '50cm', cm: 50, note: '中型・棚' },
                  { label: '160cm', cm: 160, note: '等身大' },
                  { label: '200cm', cm: 200, note: '大型展示' },
                ].map((p) => (
                  <button
                    key={p.cm}
                    type="button"
                    onClick={() => setCombinedArHeightCm(p.cm)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center cursor-pointer border ${
                      combinedArHeightCm === p.cm
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[11px] font-mono">{p.label}</span>
                    <span className={`text-[9px] font-normal ${combinedArHeightCm === p.cm ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {p.note}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="5"
                  max="250"
                  step="1"
                  value={combinedArHeightCm}
                  onChange={(e) => setCombinedArHeightCm(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-400 cursor-pointer"
                />
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={combinedArHeightCm}
                    onChange={(e) => setCombinedArHeightCm(parseFloat(e.target.value) || 20)}
                    className="w-14 bg-transparent text-right font-mono font-bold text-sm text-indigo-300 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">cm</span>
                </div>
              </div>
            </div>
          )}

          {/* Model Item List & Individual Controls */}
          {models.length > 0 && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-base">配置モデル一覧 ({models.length})</h3>
                </div>
                <button
                  onClick={() => setModels([])}
                  className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer"
                >
                  すべて削除
                </button>
              </div>

              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {models.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedModelId(item.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      selectedModelId === item.id
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate max-w-[170px]">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.triangles.toLocaleString()}面 • {item.sizeMb}MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() =>
                          setModels((prev) =>
                            prev.map((m) => (m.id === item.id ? { ...m, visible: !m.visible } : m))
                          )
                        }
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          item.visible
                            ? 'bg-slate-800 text-slate-200 border-slate-700'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                        title={item.visible ? '非表示にする' : '表示する'}
                      >
                        {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeModel(item.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual Model Fine-Tuning (if selected) */}
              {selectedModel && (
                <div className="pt-4 border-t border-slate-800 space-y-3 bg-slate-950/60 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      選択中: {selectedModel.name} の位置・向き調整
                    </span>
                  </div>

                  {/* Move Left/Right (X) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>左右位置 (X):</span>
                      <span className="font-mono text-white font-bold">{selectedModel.posX} cm</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="0.5"
                      value={selectedModel.posX}
                      onChange={(e) => updateSelectedModel({ posX: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>

                  {/* Move Front/Back (Z) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>前後位置 (Z):</span>
                      <span className="font-mono text-white font-bold">{selectedModel.posZ} cm</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="0.5"
                      value={selectedModel.posZ}
                      onChange={(e) => updateSelectedModel({ posZ: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>

                  {/* Rotation Y */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>回転角度 (Y):</span>
                      <span className="font-mono text-white font-bold">{selectedModel.rotationY}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={selectedModel.rotationY}
                      onChange={(e) => updateSelectedModel({ rotationY: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Individual Scale Multiplier */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>個別サイズ倍率:</span>
                      <span className="font-mono text-white font-bold">{selectedModel.scaleMultiplier.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={selectedModel.scaleMultiplier}
                      onChange={(e) => updateSelectedModel({ scaleMultiplier: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
