import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Server, 
  Cpu, 
  Coins, 
  Printer, 
  ArrowRight,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { CORE_ANSWERS } from '../data/modelsData';

interface QuickVerdictProps {
  onGoToChecker: () => void;
  onGoToComparison: () => void;
  onGoToViewer: () => void;
  onGoToColabFree: () => void;
}

export const QuickVerdict: React.FC<QuickVerdictProps> = ({
  onGoToChecker,
  onGoToComparison,
  onGoToViewer,
  onGoToColabFree,
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner Alert / Conclusion Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                Direct Answer / 結論まとめ
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                ご質問へのズバリ回答（3大ポイント）
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>2026年最新リポジトリ検証済</span>
          </div>
        </div>

        {/* 3 Core Answer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/80 flex flex-col justify-between hover:border-cyan-500/50 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">質問 1</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">
                  アプリはローカル / 生成はクラウド
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                ローカルに入れて3Dプリント用に出力できる？
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-cyan-300">Yes。</strong> CLIツールやAIエージェント（Cursor, Claude Code等）のスキルとしてPCにインストールでき、<strong className="text-white">STL / 3MF形式で3Dプリント用に出力可能</strong>です。ただし、3Dモデルを生成する重い計算処理はローカルではなく<strong className="text-cyan-300">Meshyのクラウドサーバー（API）</strong>で行われます。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bambu StudioやCura等のスライサー連携対応</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/80 flex flex-col justify-between hover:border-amber-500/50 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">質問 2</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-900/60 text-amber-300 border border-amber-700">
                  無料枠あり (上限あり)
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                完全無料で出力できる？
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-amber-300">完全無料・無制限ではありません。</strong> Meshyアカウント登録時に貰える<strong className="text-white">無料クレジット（月間約200クレジット等）の範囲内であれば無料</strong>で出力できます。ただしクレジットを使い切ると有料サブスク（$16/月〜）が必要です。生成済ファイルの編集・スライスは永年無料です。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>1モデルあたり約5〜20クレジットを消費</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/80 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">質問 3</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  GPU不要 (軽量)
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                必要なPCスペックやGPU環境は？
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong className="text-emerald-300">高級なGPU（RTXなど）は一切不要です！</strong> クラウド側でGPU計算するため、<strong className="text-white">普通の薄型ノートPCやIntel内蔵GPU、MacBookでもサクサク動きます</strong>。Node.js 22.12以上と、スライサーソフト（8GB〜16GBメモリ推奨）が動く環境があればOKです。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Node.js 22.12+ / メモリ8GB以上推奨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlight banner for Colab / VRAM 4GB users */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base">
                VRAM 4GBやColabインストールエラーでお困りの方へ
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-semibold uppercase">
                解決策あり
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              インストール不要の無料Webツール（TRELLIS / SF3D）や、Colabで依存ループを起こさない修正スクリプトをご用意しています。
            </p>
          </div>
        </div>
        <button
          onClick={onGoToColabFree}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 whitespace-nowrap transition"
        >
          <span>写真から無料3D出力ガイドを見る</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Crucial Concept: Cloud API vs Local Generative AI */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span>一番勘違いしやすい「meshy-3d-agent」の仕組み</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Cloud wrapper */}
          <div className="bg-slate-800/70 rounded-xl p-5 border-l-4 border-l-cyan-500 border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-cyan-300">今回質問された「meshy-3d-agent」</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-800">クラウド型</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
              このGitHubリポジトリは、<strong className="text-white">AIコーディングエージェント（CursorやClaude Code等）にMeshyのCLI操作スキルを教えるための指示定義書</strong>です。
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>ローカルで動く部分:</strong> Node.js CLI、ファイルの保存・リサイズ、スライサー（Bambu Studio等）の起動</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>クラウドで動く部分:</strong> 3Dメッシュ生成、テクスチャ生成、ポリゴン最適化、リギング（Meshyの巨大GPUサーバー群で実行）</span>
              </li>
            </ul>
            <div className="mt-4 p-2.5 rounded bg-slate-900/80 text-xs text-slate-400">
              💡 <strong>メリット:</strong> GPUのないPCでも数分で高品質なフィギュアが生成できる！<br />
              ⚠️ <strong>注意点:</strong> クレジット消費制のため完全無料・無制限ではない。
            </div>
          </div>

          {/* True Local Generative AI */}
          <div className="bg-slate-800/70 rounded-xl p-5 border-l-4 border-l-purple-500 border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-purple-300">もし「完全無料・無制限・GPUローカル完結」を望む場合</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-800">完全ローカル型</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
              「ネット通信なし」「クレジット課金なし」で自分のPCのGPUだけで3Dモデルを生成したい場合は、Meshyではなく<strong className="text-white">オープンソースのローカル3D AI</strong>を使います。
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>Microsoft TRELLIS:</strong> 高品質だがNVIDIA GPU (VRAM 12GB〜16GB以上) 必須</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>TripoSR:</strong> 超高速(1秒)＆軽め。NVIDIA GPU (VRAM 6GB〜8GB)で動作</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span><strong>Tencent Hunyuan3D-2:</strong> 超高解像度だがRTX 3090/4090 (VRAM 24GB) クラスが推奨</span>
              </li>
            </ul>
            <div className="mt-4 p-2.5 rounded bg-slate-900/80 text-xs text-slate-400">
              💡 <strong>メリット:</strong> 何千個作っても永年無料！プライベートデータも安全。<br />
              ⚠️ <strong>注意点:</strong> 高価なゲーミングPC (RTXグラフィックボード) が必須。
            </div>
          </div>
        </div>

        {/* Quick Decision Guide */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">あなたのPC環境に最適な方法はどれ？</div>
            <div className="text-xs text-slate-400">搭載しているGPUやメモリを選ぶだけで、どちらが動くか自動診断できます</div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={onGoToChecker}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition"
            >
              <Cpu className="w-4 h-4" />
              <span>PCスペック診断機を開く</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onGoToViewer}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>3Dモデル印刷適正ビューア</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
