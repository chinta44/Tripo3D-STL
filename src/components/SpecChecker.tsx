import React, { useState, useMemo } from 'react';
import { GPU_PRESETS } from '../data/modelsData';
import { GpuOption, SpecDiagnosticResult } from '../types';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Cpu, 
  HardDrive, 
  Laptop, 
  Layers, 
  HelpCircle,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface SpecCheckerProps {
  onGoToWorkflow: () => void;
  onGoToComparison: () => void;
}

export const SpecChecker: React.FC<SpecCheckerProps> = ({ onGoToWorkflow, onGoToComparison }) => {
  const [selectedGpuId, setSelectedGpuId] = useState<string>('none-igpu');
  const [selectedRam, setSelectedRam] = useState<number>(16);
  const [selectedOs, setSelectedOs] = useState<'windows' | 'mac-apple' | 'mac-intel' | 'linux'>('windows');
  const [userGoal, setUserGoal] = useState<'free' | 'quality' | 'easy'>('easy');

  const selectedGpu = useMemo<GpuOption>(() => {
    return GPU_PRESETS.find((g) => g.id === selectedGpuId) || GPU_PRESETS[0];
  }, [selectedGpuId]);

  // Compute diagnostics
  const diagnosis = useMemo<SpecDiagnosticResult>(() => {
    // 1. Meshy Agent is ALWAYS runnable as long as OS is standard and Node.js can run
    const canRunMeshy = true;
    const meshyReason = 'クラウドGPU処理のため、選択された環境で快適に動作します！Node.js 22.12+のインストールのみ必要です。';

    // 2. Slicer software (Bambu Studio, Cura, etc.)
    const canRunSlicer = selectedRam >= 8;
    const slicerReason = canRunSlicer 
      ? `メモリ${selectedRam}GBと選択したGPUでスライサー（Bambu Studio, Cura等）の3Dプレビューは快適に動きます。`
      : 'メモリが8GB未満の場合、複雑な3Dスライス時に動作が重くなる可能性があります。';

    // 3. TripoSR (Requires NVIDIA >= 6GB or Apple MPS)
    let canRunTripoSR = false;
    let tripoSRReason = '';
    if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 6) {
      canRunTripoSR = true;
      tripoSRReason = `NVIDIA GPU (VRAM ${selectedGpu.vram}GB) で約1〜3秒で超高速ローカル生成が可能です！`;
    } else if (selectedGpu.type === 'apple' && selectedRam >= 16) {
      canRunTripoSR = true;
      tripoSRReason = 'Apple Silicon (MPS) 環境で動作可能です（生成時間: 約5〜10秒）。';
    } else {
      canRunTripoSR = false;
      tripoSRReason = `VRAM不足またはNVIDIA非搭載のため動作しません (最低VRAM 6GBのNVIDIA GPU推奨)。`;
    }

    // 4. Microsoft TRELLIS (Requires NVIDIA >= 12GB)
    let canRunTrellis = false;
    let trellisReason = '';
    if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 12) {
      canRunTrellis = true;
      trellisReason = `VRAM ${selectedGpu.vram}GBにより、超高精度なローカル3D生成（TRELLIS）が快適に動作します！完全無料で無制限に出力可能です。`;
    } else if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 8) {
      canRunTrellis = false;
      trellisReason = `VRAM ${selectedGpu.vram}GBではメモリ不足（OOMエラー）になる可能性が高いです（fp16軽量版で動く場合もありますが12GB以上推奨）。`;
    } else if (selectedGpu.type === 'apple' && selectedRam >= 32) {
      canRunTrellis = false;
      trellisReason = `Apple SiliconでのTRELLIS公式サポートは現在実験的または非対応です（PyTorch CUDA拡張が必要）。`;
    } else {
      canRunTrellis = false;
      trellisReason = 'NVIDIA GPU (VRAM 12GB〜16GB以上) が必須のため、ローカル実行は不可です。';
    }

    // 5. Tencent Hunyuan3D-2 (Requires NVIDIA >= 16GB)
    let canRunHunyuan = false;
    let hunyuanReason = '';
    if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 16) {
      canRunHunyuan = true;
      hunyuanReason = `ハイエンドVRAM ${selectedGpu.vram}GBにより、映画・ゲーム級の超精細メッシュ生成がローカルで可能です。`;
    } else {
      canRunHunyuan = false;
      hunyuanReason = 'VRAM 16GB〜24GBクラスのハイエンドGPU (RTX 4080/4090/3090) が必要なため不可です。';
    }

    let overallRecommendation = '';
    let tierDescription = '';

    if (selectedGpu.type === 'none') {
      tierDescription = '【軽量ノートPC / 内蔵グラフィック環境】';
      overallRecommendation = 'グラフィックボードを搭載していないため、ローカルAIの実行は不可能です。しかし「Meshy 3D Agent」ならクラウドで計算されるため、このPCのままで最高品質の3Dプリント用STL/3MFデータを問題なく生成・出力できます！まずはMeshyの無料クレジット枠で試すのがベストです。';
    } else if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 12) {
      tierDescription = '【モンスター級 / ハイエンドAIクリエイター環境】';
      overallRecommendation = '素晴らしいスペックです！クラウドの「Meshy 3D Agent」はもちろん爆速で扱えますし、完全ローカル＆完全無料・無制限の「Microsoft TRELLIS」もローカルでバリバリ動かせます。クレジットを気にせず何百個も作りたいならTRELLIS、手軽さと自動3Dプリント補正を重視するならMeshyと使い分けるのが理想的です！';
    } else if (selectedGpu.type === 'nvidia' && selectedGpu.vram >= 6) {
      tierDescription = '【ミドルレンジ / ゲーミングPC環境】';
      overallRecommendation = '一般的なゲーミングGPUを搭載しています。「Meshy 3D Agent」は100%快適に利用可能です。完全ローカル生成を試したい場合は「TripoSR」であれば超高速に動きます。TRELLISなど重たい最新モデルはMeshyのクラウドに任せるのが最も安定します。';
    } else if (selectedGpu.type === 'apple') {
      tierDescription = '【Apple Silicon Mac環境】';
      overallRecommendation = '「Meshy 3D Agent」はNode.js経由でmacOSに完全対応しており、驚くほど快適に動きます。3Dプリント用のスライサー（Bambu Studio for MacやOrcaSlicer）もApple Siliconネイティブでサクサク動作します。ローカルAIはCUDA（NVIDIA専用）の依存が多いため、Meshyを活用するのが最もストレスフリーです。';
    } else {
      tierDescription = '【AMD / エントリー環境】';
      overallRecommendation = '「Meshy 3D Agent」であればGPUの種類に関係なく快適に利用可能です。3Dプリント用データの作成・出力はMeshyの無料枠からスタートすることをおすすめします。';
    }

    return {
      canRunMeshy,
      meshyReason,
      canRunTripoSR,
      tripoSRReason,
      canRunTrellis,
      trellisReason,
      canRunHunyuan,
      hunyuanReason,
      canRunSlicer,
      slicerReason,
      overallRecommendation,
      tierDescription,
    };
  }, [selectedGpu, selectedRam, selectedOs]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              Interactive Hardware Checker
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              あなたのPCスペック動作診断機
            </h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          お使いのPCのGPUやメモリ構成を選ぶと、「Meshy 3D Agent」および「オープンソースの完全ローカル3D AI（TRELLIS等）」が動作可能か瞬時に判定します。
        </p>

        {/* Input Controls */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
          {/* OS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span>オペレーティングシステム (OS)</span>
            </label>
            <select
              value={selectedOs}
              onChange={(e) => setSelectedOs(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="windows">Windows 10 / 11</option>
              <option value="mac-apple">macOS (Apple Silicon M1/M2/M3/M4)</option>
              <option value="mac-intel">macOS (Intel Mac)</option>
              <option value="linux">Linux (Ubuntu / Debian等)</option>
            </select>
          </div>

          {/* GPU Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>搭載GPU (グラフィックボード)</span>
            </label>
            <select
              value={selectedGpuId}
              onChange={(e) => setSelectedGpuId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {GPU_PRESETS.map((gpu) => (
                <option key={gpu.id} value={gpu.id}>
                  {gpu.name}
                </option>
              ))}
            </select>
          </div>

          {/* System RAM */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>メインメモリ (RAM)</span>
            </label>
            <select
              value={selectedRam}
              onChange={(e) => setSelectedRam(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={8}>8 GB (標準的)</option>
              <option value={16}>16 GB (快適・推奨)</option>
              <option value={32}>32 GB (ハイパワー)</option>
              <option value={64}>64 GB 以上 (プロ仕様)</option>
            </select>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-2">あなたが最重視したいこと:</span>
          {[
            { id: 'easy', label: '手軽さ＆失敗しない3Dプリント適正', color: 'cyan' },
            { id: 'free', label: '完全無料・無制限・ローカル完結', color: 'purple' },
            { id: 'quality', label: '最高峰のフィギュアディテール', color: 'emerald' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setUserGoal(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                userGoal === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Results Summary Box */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
              {diagnosis.tierDescription}
            </span>
            <span className="text-xs text-slate-400">診断ステータス</span>
          </div>
        </div>

        {/* Recommendation Note */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 mb-6">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            総合アドバイス
          </h4>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {diagnosis.overallRecommendation}
          </p>
        </div>

        {/* Detailed Breakdown for each Tool */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meshy 3D Agent Result */}
          <div className="rounded-xl p-5 border bg-slate-900/80 border-cyan-500/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h4 className="font-bold text-white text-sm">Meshy 3D Agent (質問のアプリ)</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                100% 動作可能
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1.5">
              <p>{diagnosis.meshyReason}</p>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>コスト: 無料クレジット枠あり</span>
                <span className="text-cyan-400 font-medium">STL/3MF/スライサー直結</span>
              </div>
            </div>
          </div>

          {/* Slicer Compatibility */}
          <div className="rounded-xl p-5 border bg-slate-900/80 border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${diagnosis.canRunSlicer ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <h4 className="font-bold text-white text-sm">3Dスライサー (Bambu / Cura等)</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${diagnosis.canRunSlicer ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700'}`}>
                {diagnosis.canRunSlicer ? '快適に動作' : 'やや注意'}
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1.5">
              <p>{diagnosis.slicerReason}</p>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>推奨RAM: 16GB</span>
                <span className="text-emerald-400 font-medium">Gコード生成可能</span>
              </div>
            </div>
          </div>

          {/* Microsoft TRELLIS Result */}
          <div className={`rounded-xl p-5 border bg-slate-900/80 ${diagnosis.canRunTrellis ? 'border-purple-500/50' : 'border-slate-800 opacity-80'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${diagnosis.canRunTrellis ? 'bg-purple-400' : 'bg-slate-600'}`} />
                <h4 className="font-bold text-white text-sm">Microsoft TRELLIS (完全ローカルSOTA)</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${diagnosis.canRunTrellis ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {diagnosis.canRunTrellis ? 'ローカル動作OK' : 'VRAM不足 / 不可'}
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1.5">
              <p>{diagnosis.trellisReason}</p>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>必要要件: NVIDIA VRAM 12GB+</span>
                <span className="text-purple-300 font-medium">完全無料・永年無制限</span>
              </div>
            </div>
          </div>

          {/* TripoSR Result */}
          <div className={`rounded-xl p-5 border bg-slate-900/80 ${diagnosis.canRunTripoSR ? 'border-blue-500/40' : 'border-slate-800 opacity-80'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${diagnosis.canRunTripoSR ? 'bg-blue-400' : 'bg-slate-600'}`} />
                <h4 className="font-bold text-white text-sm">TripoSR (ローカル超高速AI)</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${diagnosis.canRunTripoSR ? 'bg-blue-950 text-blue-300 border border-blue-700' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {diagnosis.canRunTripoSR ? 'ローカル動作OK' : '不可'}
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1.5">
              <p>{diagnosis.tripoSRReason}</p>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>必要要件: NVIDIA VRAM 6GB+</span>
                <span className="text-blue-300 font-medium">約1〜3秒で生成</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap gap-3">
          <button
            onClick={onGoToWorkflow}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
          >
            <span>Meshy 3D Agent のインストール手順を見る</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onGoToComparison}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <span>各3D生成AIのスペック比較表を見る</span>
          </button>
        </div>
      </div>
    </div>
  );
};
