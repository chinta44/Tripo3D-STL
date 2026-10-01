import React from 'react';
import { 
  Zap, 
  Printer, 
  Sparkles, 
  Wand2, 
  FileCode,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'tripo-converter', label: 'Tripo3D 高精度STL変換機', icon: <FileCode className="w-4 h-4 text-emerald-400" />, badge: 'メイン' },
    { id: 'studio', label: '写真から3D化スタジオ', icon: <Wand2 className="w-4 h-4 text-cyan-400" /> },
    { id: 'viewer', label: '3Dプリント・スライス診断', icon: <Printer className="w-4 h-4 text-indigo-400" /> },
  ];

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
                  Tripo3D → 高精度STL変換機
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  完全水密ソリッド
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Meshopt解凍 & Bambu Lab / OrcaSlicer / Cura 直行バイナリSTL出力
              </p>
            </div>
          </div>

          {/* Quick links & Direct STL */}
          <div className="flex items-center gap-3">
            <a
              href="/downloads/cartoon_monster_solid.stl"
              download="cartoon_monster_solid.stl"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
            >
              <span>モンスターSTL直接保存 (22MB)</span>
            </a>

            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
