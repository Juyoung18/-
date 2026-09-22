import React from 'react';
import { ChannelInfo } from '../types.ts';
import { Users, Video, Calendar, Sparkles, Target, Layers, Youtube, GitCompare } from 'lucide-react';

interface ChannelCardProps {
  channel: ChannelInfo;
  channels?: ChannelInfo[];
  collectedAt: string;
  videoCount: number;
  keywordFocus?: string;
  aiProviderUsed?: 'claude' | 'gemini' | 'heuristic';
  aiModelUsed?: string;
  showComparisonDashboard?: boolean;
  onToggleComparisonDashboard?: () => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  channels,
  collectedAt,
  videoCount,
  keywordFocus,
  aiProviderUsed = 'claude',
  aiModelUsed,
  showComparisonDashboard,
  onToggleComparisonDashboard,
}) => {
  const isMultiChannel = channels && channels.length > 1;

  if (isMultiChannel) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs mb-6 space-y-4">
        {/* Multi-channel Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  통합 수집 채널 현황
                </h3>
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                  총 {channels.length}개 채널 순차 수집 완료
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 채널의 데이터가 1개의 통합 테이블 및 12개 열 엑셀 규격으로 연결되어 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onToggleComparisonDashboard && (
              <button
                type="button"
                onClick={onToggleComparisonDashboard}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showComparisonDashboard
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{showComparisonDashboard ? '채널 비교 대시보드 닫기' : '채널 비교 대시보드 보기'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {keywordFocus && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>포커스:</span>
              <strong className="font-bold text-emerald-950">
                #{keywordFocus}
              </strong>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
            <Video className="w-3.5 h-3.5 text-slate-400" />
            <span>총 수집 영상:</span>
            <strong className="text-slate-900 font-mono">{videoCount}개</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>수집일:</span>
            <strong className="text-slate-900 font-mono">{collectedAt}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>AI 분석:</span>
            <strong className="font-semibold">
              {aiProviderUsed === 'claude'
                ? `Claude (${aiModelUsed?.includes('haiku-4-5') ? 'Haiku 4.5' : aiModelUsed?.includes('3-5-haiku') ? 'Haiku 3.5' : aiModelUsed?.split('-')?.[2] || 'Haiku'})`
                : aiProviderUsed === 'gemini'
                ? 'Gemini Flash'
                : '통계 휴리스틱'}
            </strong>
          </div>
        </div>

        {/* Multi-channel Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((ch, idx) => (
            <div
              key={ch.id || idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors"
            >
              {ch.thumbnailUrl ? (
                <img
                  src={ch.thumbnailUrl}
                  alt={ch.title}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {ch.title.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={ch.title}>
                    {ch.title}
                  </h4>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  {ch.customUrl && (
                    <span className="text-red-600 font-medium truncate max-w-[120px]">
                      {ch.customUrl}
                    </span>
                  )}
                  {ch.subscriberCount !== undefined && (
                    <span>구독자 {(ch.subscriberCount / 10000).toFixed(1)}만명</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single Channel View (Preserved completely)
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Channel Avatar & Info */}
        <div className="flex items-center gap-4">
          {channel.thumbnailUrl ? (
            <img
              src={channel.thumbnailUrl}
              alt={channel.title}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200/80 shadow-2xs"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
              {channel.title.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {channel.title}
              </h3>
              {channel.customUrl && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                  {channel.customUrl}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 max-w-xl mt-1">
              {channel.description || '채널 설명이 없습니다.'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
          {keywordFocus && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-2xs">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>포커스:</span>
              <strong className="font-bold text-emerald-950">
                #{keywordFocus}
              </strong>
            </div>
          )}

          {channel.subscriberCount !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>구독자:</span>
              <strong className="text-slate-900 font-mono">
                {channel.subscriberCount.toLocaleString()}명
              </strong>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
            <Video className="w-3.5 h-3.5 text-slate-400" />
            <span>수집 영상:</span>
            <strong className="text-slate-900 font-mono">{videoCount}개</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>수집일:</span>
            <strong className="text-slate-900 font-mono">{collectedAt}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>AI 분석 엔진:</span>
            <strong className="font-semibold">
              {aiProviderUsed === 'claude'
                ? `Claude (${aiModelUsed?.includes('haiku-4-5') ? 'Haiku 4.5' : aiModelUsed?.includes('3-5-haiku') ? 'Haiku 3.5' : aiModelUsed?.split('-')?.[2] || 'Haiku'})`
                : aiProviderUsed === 'gemini'
                ? 'Gemini Flash'
                : '통계 휴리스틱'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
