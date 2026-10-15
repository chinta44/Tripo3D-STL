import React from 'react';
import { 
  Printer, 
  ShieldCheck, 
  Zap, 
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab?: 'single' | 'merge' | 'motion';
  onSelectTab?: (tab: 'single' | 'merge' | 'motion') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab = 'single', onSelectTab }) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black text-lg">
              <Printer className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  3Dプリント高精度STL変換スタジオ
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm">
                  v2.5.0
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  完全水密ソリッド
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Tripo3D • Meshy • Hi3D 対応 & 複数GLB合体・猫動物ARループモーション・Chrome AR 直行
              </p>
            </div>
          </div>

          {/* Tab Switcher in Navbar */}
          {onSelectTab && (
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onSelectTab('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'single'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>単体モデル変換</span>
              </button>
              <button
                onClick={() => onSelectTab('merge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'merge'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-300" />
                <span>複数GLB結合</span>
              </button>
              <button
                onClick={() => onSelectTab('motion')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'motion'
                    ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 text-white font-black shadow-sm shadow-pink-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>🐱 猫・動物モーション</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-pink-500/30 text-pink-200 border border-pink-400/40 font-mono">
                  NEW
                </span>
              </button>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Meshopt Wasm Engine</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>AR / 3Dプリント最適化</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
