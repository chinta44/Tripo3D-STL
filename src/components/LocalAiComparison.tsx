import React, { useState } from 'react';
import { AI_MODELS_DATA } from '../data/modelsData';
import { AiModelComparison } from '../types';
import { 
  GitCompare, 
  Server, 
  HardDrive, 
  Check, 
  X, 
  AlertTriangle, 
  Cpu, 
  Zap, 
  Coins, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const LocalAiComparison: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'cloud' | 'local'>('all');
  const [expandedModelId, setExpandedModelId] = useState<string | null>('trellis');

  const filteredModels = AI_MODELS_DATA.filter((m) => {
    if (filterType === 'cloud') return m.type === 'cloud';
    if (filterType === 'local') return m.type === 'local';
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedModelId(expandedModelId === id ? null : id);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">
              Deep Technical Benchmark
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meshy(クラウド) vs 完全ローカル3D生成AI 徹底比較
            </h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          「本当にPCローカルだけで、GPUを回して無料で3Dモデルを作りたい」場合、現在オープンソース界隈で最も使われているモデル（Microsoft TRELLIS, TripoSR等）とMeshyの違いをまとめました。
        </p>

        {/* Filter buttons */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 self-center mr-2">表示切替:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            全モデル一覧
          </button>
          <button
            onClick={() => setFilterType('cloud')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'cloud'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            クラウド型 (GPU不要 / Meshy)
          </button>
          <button
            onClick={() => setFilterType('local')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'local'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            完全ローカル型 (GPU必須・永年無料)
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="space-y-4">
        {filteredModels.map((model) => {
          const isExpanded = expandedModelId === model.id;
          const isCloud = model.type === 'cloud';

          return (
            <div
              key={model.id}
              className={`rounded-2xl border transition-all ${
                isCloud
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-cyan-950/20 shadow-lg'
                  : 'bg-slate-900/90 border-slate-800 hover:border-purple-500/40'
              }`}
            >
              <div
                onClick={() => toggleExpand(model.id)}
                className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isCloud
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {isCloud ? <Server className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white">{model.name}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isCloud
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {isCloud ? 'クラウドAPI (GPU不要)' : 'ローカル実行 (GPU必須)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{model.provider}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">必要なGPU環境</div>
                    <div className="text-xs font-semibold text-white">
                      {model.minVram === 0 ? 'GPU不要 (iGPU可)' : `VRAM ${model.minVram}GB〜`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">費用</div>
                    <div className="text-xs font-semibold text-emerald-400">{model.cost.split('（')[0]}</div>
                  </div>
                  <button className="text-slate-400 hover:text-white p-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="px-5 pb-6 sm:px-6 pt-2 border-t border-slate-800 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Left: Spec details */}
                    <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                      <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        <span>実行環境・スペック要件</span>
                      </h4>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">GPU要件:</span>
                          <span className="font-semibold text-white">{model.gpuRequirement}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">生成速度:</span>
                          <span className="font-semibold text-white">{model.generationTime}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">出力形式:</span>
                          <span className="font-mono text-cyan-300 font-semibold">{model.outputFormats.join(', ')}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span className="text-slate-400">ネット切断(オフライン)動作:</span>
                          <span className={model.offlineCapable ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {model.offlineCapable ? '完全オフライン可能' : 'インターネット必須'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">3Dプリント適正スコア:</span>
                          <span className="font-bold text-emerald-400">{model.printReadinessScore} / 10</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Pros & Cons */}
                    <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                      <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>メリット & デメリット</span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-emerald-400 font-semibold block mb-1">👍 長所:</span>
                          <ul className="space-y-1 text-slate-300 list-disc list-inside">
                            {model.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-slate-900">
                          <span className="text-amber-400 font-semibold block mb-1">⚠️ 短所・注意点:</span>
                          <ul className="space-y-1 text-slate-400 list-disc list-inside">
                            {model.weaknesses.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Advice */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h3 className="font-bold text-white text-base sm:text-lg mb-3">
          💡 結論: どちらを選ぶべきか？
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30">
            <h4 className="font-bold text-cyan-300 mb-1">Meshy 3D Agent が向いている人</h4>
            <ul className="space-y-1 list-disc list-inside text-slate-300 text-xs">
              <li>高性能なNVIDIAグラフィックボードを持っていない（普通のPCやMacBook）</li>
              <li>PythonやCUDA、ComfyUIの面倒なエラーに悩みたくない</li>
              <li>Bambu StudioやCuraですぐに印刷できる綺麗なSTL/3MFが手軽に欲しい</li>
              <li>まずは月数十個のお試し・趣味範囲で楽しみたい（無料枠で十分）</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30">
            <h4 className="font-bold text-purple-300 mb-1">ローカルAI (TRELLIS / TripoSR) が向いている人</h4>
            <ul className="space-y-1 list-disc list-inside text-slate-300 text-xs">
              <li>RTX 3060 12GB、RTX 4070、RTX 4090などのGPUを搭載したPCがある</li>
              <li>月に何百個もモデルを生成したい（完全無料で回したい）</li>
              <li>社外秘のデザインやプライベートな画像を使いたい（オフライン環境）</li>
              <li>PythonやComfyUIのノード構築・環境設定に抵抗がない</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
