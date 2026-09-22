import React from 'react';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const ColumnsGuide: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  const columns = [
    { num: 1, name: '수집일', desc: '데이터 수집 당일 일자' },
    { num: 2, name: '키워드', desc: 'Claude 분석 트렌드 키워드' },
    { num: 3, name: '영상 제목', desc: '유튜브 영상 원본 제목' },
    { num: 4, name: '썸네일 URL', desc: '고해상도 이미지 주소' },
    { num: 5, name: '영상 URL', desc: '유튜브 시청 링크' },
    { num: 6, name: '영상 ID', desc: '고유 영상 식별자 (11자리)' },
    { num: 7, name: '조회수', desc: '누적 조회수 (숫자 서식)' },
    { num: 8, name: '좋아요수', desc: '누적 좋아요수 (미제공 시 미제공 표기)' },
    { num: 9, name: '업로드 날짜', desc: '게시 일시 (YYYY-MM-DD)' },
    { num: 10, name: '영상 길이', desc: '재생 시간 (분·초 단위)' },
    { num: 11, name: 'Claude 한줄평', desc: 'Claude AI 핵심 인사이트' },
    { num: 12, name: 'Claude 관련도 점수', desc: '트렌드 적합도 (1~100)' },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs mb-6">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              엑셀(.xlsx) 12개 열 구성 규격
              <span className="text-[11px] font-normal text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                지정 순서 100% 일치
              </span>
            </h2>
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-800 font-medium"
        >
          {isOpen ? '접기' : '자세히 보기'}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
          {columns.map((col) => (
            <div
              key={col.num}
              className="flex items-start gap-1.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-left hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {col.num}. {col.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {col.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
