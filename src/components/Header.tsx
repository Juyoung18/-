import React from 'react';
import { FileSpreadsheet, Sparkles, Youtube } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-sm shadow-red-200">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                유튜브 트렌드 엑셀 추출기
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Claude AI 연동
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              YouTube Data API + Claude AI 분석으로 12개 컬럼 엑셀(.xlsx) 자동 생성
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>12개 지정 열 구성 자동 서식</span>
          </div>
        </div>
      </div>
    </header>
  );
};
