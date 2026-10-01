import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { TripoStandaloneApp } from './components/TripoStandaloneApp';
import { Image3dStudio } from './components/Image3dStudio';
import { PrintReadinessViewer } from './components/PrintReadinessViewer';
import { ExternalLink, Printer, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('tripo-converter');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'tripo-converter' && <TripoStandaloneApp />}
        {currentTab === 'studio' && <Image3dStudio />}
        {currentTab === 'viewer' && <PrintReadinessViewer />}
      </main>

      {/* App Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">
              Tripo3D → 高精度STL変換スタジオ
            </span>
            <span>•</span>
            <span>Meshopt WebAssembly 解凍 & クアドラティック水密ソリッド変換</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Bambu Studio / OrcaSlicer 検証済み
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
