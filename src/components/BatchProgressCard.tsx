import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Youtube,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface BatchProgressItem {
  channelInput: string;
  channelTitle?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoCount?: number;
  error?: string;
}

export interface BatchProgressInfo {
  totalChannels: number;
  currentChannelIndex: number; // 0-based
  currentChannelName: string;
  items: BatchProgressItem[];
  totalVideosCollected: number;
  expectedTotalVideos: number;
  isFinished?: boolean;
}

interface BatchProgressCardProps {
  progress: BatchProgressInfo;
}

export const BatchProgressCard: React.FC<BatchProgressCardProps> = ({ progress }) => {
  const {
    totalChannels,
    currentChannelIndex,
    currentChannelName,
    items,
    totalVideosCollected,
    expectedTotalVideos,
    isFinished = false,
  } = progress;

  const currentDisplayNumber = Math.min(currentChannelIndex + 1, totalChannels);
  const percentage = totalChannels > 0
    ? Math.round(((isFinished ? totalChannels : currentChannelIndex) / totalChannels) * 100)
    : 0;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;

  return (
    <div className="bg-white border-2 border-red-500/20 rounded-2xl shadow-md p-5 mb-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
            {isFinished ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700">
                {isFinished ? '순차 수집 완료' : '채널별 독립 순차 수집 진행 중'}
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {isFinished ? (
                  `총 ${totalChannels}개 채널 처리 완료`
                ) : (
                  <span>
                    <strong className="text-red-600">
                      {currentDisplayNumber}/{totalChannels}
                    </strong>{' '}
                    <span className="text-slate-800">{currentChannelName}</span> 처리 중
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              서버 타임아웃 방지를 위해 채널별 100개씩 독립 처리하며, 완료된 채널 데이터는 프론트엔드에 즉시 누적 저장됩니다.
            </p>
          </div>
        </div>

        {/* Real-time Counter Stats */}
        <div className="flex items-center gap-3 shrink-0 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">누적 수집 영상</span>
            <span className="font-bold text-slate-900 text-sm">
              <strong className="text-red-600">{totalVideosCollected}</strong>
              <span className="text-slate-400 font-normal"> / {expectedTotalVideos}개</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 block text-[10px]">완료 채널</span>
            <span className="font-bold text-slate-900 text-sm">
              {completedCount}
              <span className="text-slate-400 font-normal"> / {totalChannels}개</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isFinished
              ? '모든 채널의 수집 및 Claude Haiku 4.5 분석이 완료되었습니다.'
              : `${currentChannelName} (YouTube 수집 및 Claude 100개 분석 진행 중)`}
          </span>
          <span className="font-bold text-slate-900 font-mono">{percentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>
      </div>

      {/* Step Badges for Each Channel */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-500 block">
          채널별 진행 현황 (오류 발생 시에도 이미 완료된 채널 데이터는 영구 보존):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {items.map((item, idx) => {
            const isCurrent = idx === currentChannelIndex && !isFinished;
            const isCompleted = item.status === 'completed';
            const isFailed = item.status === 'failed';
            const isPending = item.status === 'pending';

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                  isCompleted
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : isCurrent
                    ? 'bg-red-50 border-red-300 text-red-950 shadow-xs ring-1 ring-red-400'
                    : isFailed
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-current/20">
                    {idx + 1}/{totalChannels}
                  </span>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      완료
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      처리 중
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      실패
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Clock className="w-3 h-3" />
                      대기
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-bold truncate text-xs" title={item.channelTitle || item.channelInput}>
                    {item.channelTitle || item.channelInput}
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5 truncate">
                    {isCompleted
                      ? `+${item.videoCount || 0}개 수집 및 분석`
                      : isCurrent
                      ? '수집 & Claude 평가 중'
                      : isFailed
                      ? (item.error?.slice(0, 30) || '수집 실패')
                      : '순차 대기 중'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
