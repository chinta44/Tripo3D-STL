import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { TripoStandaloneApp } from './components/TripoStandaloneApp';
import { MultiGlbMerger } from './components/MultiGlbMerger';
import { GlbMotionStudio } from './components/GlbMotionStudio';
import { ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'merge' | 'motion'>('single');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Tab Navigation Pill Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-2xl shadow-xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'single'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>単体モデル変換 & AR実寸</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
              activeTab === 'merge'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>複数GLB結合 (合体)</span>
          </button>

          <button
            onClick={() => setActiveTab('motion')}
            className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
              activeTab === 'motion'
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 text-white shadow-md font-black shadow-pink-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>🐱 猫・動物モーション (ARループ)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-pink-500/30 text-pink-200 border border-pink-400/40 font-mono">
              NEW
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'single' ? (
          <TripoStandaloneApp 
            onSwitchToMerge={() => setActiveTab('merge')} 
            onSwitchToMotion={() => setActiveTab('motion')}
          />
        ) : activeTab === 'merge' ? (
          <MultiGlbMerger />
        ) : (
          <GlbMotionStudio />
        )}
      </main>

      {/* App Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">
              Tripo3D → 高精度3DプリントSTL変換 & 複数GLB合体スタジオ
            </span>
            <span>•</span>
            <span>WebAssembly Meshopt解凍 & マニホールド水密ソリッド化</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Chrome AR / Bambu Studio / OrcaSlicer / Cura 完全適合
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
