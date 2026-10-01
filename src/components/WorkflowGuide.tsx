import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Layers, 
  Printer, 
  Cpu, 
  Download, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const WorkflowGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      number: '01',
      title: 'Node.js 22.12以上のインストール',
      desc: 'meshy-3d-agentおよびMeshy CLI 0.4.0を動かすためには、最新のNode.js環境が必要です（Windows / Mac / Linux共通）。',
      command: 'node -v  # v22.12.0 以上であることを確認',
      note: '※GPUやCUDAのインストールは不要です。'
    },
    {
      number: '02',
      title: 'AIエージェントへのスキル導入 または Meshy CLI実行',
      desc: 'Cursor, Claude Code, OpenClawなどのエージェントにGitHubのINSTALL.mdリンクを読み込ませるか、ターミナルで直接CLIを実行します。',
      command: 'npx meshy login  # ブラウザ認証でMeshyアカウントにログイン (初回のみ)',
      note: '※APIキーをチャットに直貼りする必要はありません。ブラウザで承認されます。'
    },
    {
      number: '03',
      title: '3Dプリント用モデルの自動生成コマンド',
      desc: 'プロンプトに「3D print ready」「manifold」を含めるか、エージェントに対話形式で指示します。',
      command: 'npx meshy make --prompt "A cute robotic cat figurine standing on a flat circular base, watertight for 3D printing" --output ./cat_model.stl',
      note: '※出力形式に .stl または .3mf を指定すると、スライサーですぐに開ける形式でダウンロードされます。'
    },
    {
      number: '04',
      title: 'スライサーソフト（Bambu Studio / Cura）でスライス＆印刷',
      desc: 'ダウンロードされたSTLをスライサーに読み込み、サポート材や充填率（Infill 15〜20%）を設定してG-codeを出力します。',
      command: '# 生成と同時にスライサーで開くことも可能\nbambu-studio ./cat_model.stl  # または Cura / OrcaSlicer',
      note: '※このローカルスライス・印刷工程は完全無料・ネット不要です。'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              Step-by-Step Practical Setup
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              meshy-3d-agent の実践導入＆3Dプリント手順
            </h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          GPU非搭載のPCでも今すぐ始められる、Node.jsセットアップから3Dプリント用ファイル出力までの最短手順です。
        </p>

        {/* Steps List */}
        <div className="mt-8 space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-slate-950 border border-slate-800 relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mb-3">{step.desc}</p>
                  </div>
                </div>
              </div>

              {/* Code snippet with copy button */}
              <div className="relative group bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-200">
                <pre className="overflow-x-auto whitespace-pre-wrap">{step.command}</pre>
                <button
                  onClick={() => copyToClipboard(step.command, idx)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="コマンドをコピー"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">{step.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompting Tips for 3D Printing */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h3 className="font-bold text-white text-base sm:text-lg mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>3Dプリントで失敗しない「プロンプト呪文のコツ」</span>
        </h3>
        <p className="text-xs text-slate-300 mb-4">
          AIに3Dモデルを作らせる際、以下の単語をプロンプトに入れると、3Dプリントの成功率が跳ね上がります：
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-300 block mb-1">"standing on a flat circular base"</span>
            <span className="text-slate-400">底面が平らになり、3Dプリンターのビルドプレートにしっかり吸着します。</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-300 block mb-1">"watertight solid manifold geometry"</span>
            <span className="text-slate-400">穴や隙間のない中身の詰まったソリッド形状を優先して生成します。</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-300 block mb-1">"thick limbs, minimal overhangs"</span>
            <span className="text-slate-400">手足が細すぎて折れるのを防ぎ、サポート材の量を抑えられます。</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-300 block mb-1">"chibi figurine style, low complexity"</span>
            <span className="text-slate-400">ディテールが詰まったデフォルメキャラはFDMプリンタでの造形精度が最も高くなります。</span>
          </div>
        </div>
      </div>
    </div>
  );
};
