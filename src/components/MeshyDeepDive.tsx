import React, { useState } from 'react';
import { 
  Terminal, 
  Layers, 
  ExternalLink, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Printer, 
  ArrowRight,
  Sparkles,
  Server,
  Monitor,
  Copy,
  Check
} from 'lucide-react';

export const MeshyDeepDive: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                Architecture Breakdown
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                meshy-dev/meshy-3d-agent の正体と仕組み
              </h2>
            </div>
          </div>
          <a
            href="https://github.com/meshy-dev/meshy-3d-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 w-fit"
          >
            <span>GitHubでソースコードを見る</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          多くのユーザーが「このリポジトリをダウンロードしたら、自分のパソコンのGPUで3Dモデル生成が走る」と誤解しがちですが、実際は<strong className="text-cyan-300">「Meshy公式CLIをAIエージェント（Cursor, Claude Code, OpenClaw等）から自然言語で自動操作するためのスキル定義（Agent Skill）」</strong>です。
        </p>

        {/* Visual Architecture Diagram */}
        <div className="mt-8 p-5 sm:p-6 rounded-xl bg-slate-950 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            データ通信と処理の分担フロー図
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {/* Step 1: Local PC */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400">ステップ 1</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">ローカルPC</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1">プロンプト入力・指示</h4>
                <p className="text-xs text-slate-400 mb-2">
                  Cursorやターミナルで「かっこいいドラゴンのフィギュアをSTLで出して」と命令。
                </p>
                <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
                  meshy-3d-agent + Meshy CLI (Node.js)
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">※PCスペック負荷: ほぼゼロ</div>
            </div>

            {/* Step 2: Cloud */}
            <div className="bg-indigo-950/40 rounded-xl p-4 border border-indigo-500/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-400">ステップ 2</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">クラウドGPU</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1">重いAI生成計算 (API)</h4>
                <p className="text-xs text-slate-300 mb-2">
                  Meshy社のデータセンター（A100/H100 GPU群）でメッシュ生成、水密チェック、テクスチャ付けを実行。
                </p>
                <div className="text-[11px] text-indigo-200 bg-indigo-950/80 p-2 rounded border border-indigo-700/60 font-mono">
                  api.meshy.ai (クレジット消費)
                </div>
              </div>
              <div className="mt-3 text-[11px] text-amber-400">⚠️ ここでアカウントのクレジットを消費</div>
            </div>

            {/* Step 3: Local 3D Print */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-400">ステップ 3</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">ローカルPC</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1">3Dファイル受信＆スライス</h4>
                <p className="text-xs text-slate-400 mb-2">
                  PCのフォルダに `dragon.stl` や `dragon.3mf` が保存され、スライサー（Bambu Studio等）が自動起動。
                </p>
                <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
                  Bambu Studio / Cura / OrcaSlicer
                </div>
              </div>
              <div className="mt-3 text-[11px] text-emerald-400">✅ スライサー処理は完全無料・ローカル</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing / Free Credits Rules */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <span>「無料枠」とクレジット消費の具体的なルール</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 text-xs sm:text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>無料プラン（Free Tier）:</strong> アカウント登録すると、毎月または初回に無料クレジット（約200クレジット等）が付与されます。
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>出力にかかるコスト:</strong> テキストや画像からの基本3Dモデル生成に約5〜20クレジットを消費します。つまり、<strong className="text-white">無料枠だけで月に約10〜30個程度の3Dモデルを試作出力</strong>できます。
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>無料枠を使い切った場合:</strong> その月は新規モデルの生成ができなくなります。無制限に作りたい場合は月額サブスクリプション（Pro: 月$16〜）またはクレジット追加購入が必要です。
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>ダウンロード済データの利用:</strong> すでにダウンロードしたSTL/3MFファイルをスライサーで開いたり、サイズを変更したり、3Dプリンターで印刷する作業には一切課金されません。
              </span>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs space-y-3">
            <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Meshyクレジット消費目安表</span>
              <span className="text-[10px] text-slate-400">※仕様変更される場合があります</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">テキストから3Dプレビュー (Text-to-3D)</span>
              <span className="font-mono text-cyan-300 font-semibold">約 5 クレジット</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">高精細リファイン (Refine / 3D Print mesh)</span>
              <span className="font-mono text-cyan-300 font-semibold">約 10〜15 クレジット</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">画像から3D生成 (Image-to-3D)</span>
              <span className="font-mono text-cyan-300 font-semibold">約 10〜20 クレジット</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">3Dプリント用STL/3MFエクスポート</span>
              <span className="font-mono text-emerald-400 font-semibold">追加費用なし (生成に含まれる)</span>
            </div>
            <div className="flex justify-between py-1 text-slate-400">
              <span>ローカルスライサーでのリサイズ・スライス</span>
              <span className="font-mono text-emerald-400 font-semibold">完全無料 ($0)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Printing specific features in meshy-3d-agent */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Printer className="w-5 h-5 text-emerald-400" />
          <span>meshy-3d-agentが3Dプリントに強い理由</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-cyan-400 font-bold text-xs mb-1">① 水密性（マニホールド）検証</div>
            <p className="text-xs text-slate-300">
              通常の3DモデルAIは穴や面の裏返りがありスライサーでエラーになりますが、Meshyは3Dプリント向けに「中身の詰まった閉じた立体（Watertight）」を出力する機能を備えています。
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-bold text-xs mb-1">② 主要スライサーとの直接連携</div>
            <p className="text-xs text-slate-300">
              Bambu Studio, OrcaSlicer, Creality Print, Cura, Elegoo Slicer, Lycheeに対応。生成完了と同時にスライサーを自動起動して配置できます。
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-purple-400 font-bold text-xs mb-1">③ 3MF / マルチカラー対応</div>
            <p className="text-xs text-slate-300">
              単色のSTLだけでなく、Bambu Lab等の最新マルチマテリアル3Dプリンター向けにテクスチャカラーを保持した3MFファイルも出力可能です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
