import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { ColumnsGuide } from './components/ColumnsGuide.tsx';
import { InputForm } from './components/InputForm.tsx';
import { ChannelCard } from './components/ChannelCard.tsx';
import { TrendTable } from './components/TrendTable.tsx';
import { BatchProgressCard, BatchProgressInfo, BatchProgressItem } from './components/BatchProgressCard.tsx';
import { YouTubeVideoItem, ChannelInfo, FetchTrendsRequest, FetchTrendsResponse } from './types.ts';
import { AlertCircle, FileSpreadsheet, Sparkles, CheckCircle2 } from 'lucide-react';

async function parseResponseSafe<T extends { success?: boolean; error?: string }>(
  response: Response,
  actionDesc: string
): Promise<T> {
  const text = await response.text();
  let json: any = null;

  try {
    json = JSON.parse(text);
  } catch {
    // text is not JSON
  }

  if (json) {
    if (!response.ok || json.success === false) {
      throw new Error(json.error || `${actionDesc} 실패 (상태 코드: ${response.status})`);
    }
    return json as T;
  }

  // Handle non-JSON responses with clear diagnostics
  if (response.status === 504) {
    throw new Error('서버 응답 시간 초과 (504 Gateway Timeout): 데이터 처리 시간이 길어졌습니다. 채널당 수집 영상 수를 줄이거나 잠시 후 다시 시도해주세요.');
  }
  if (response.status === 502 || response.status === 503) {
    throw new Error(`서버 일시적 연결 불가 (${response.status}): 백엔드 서버가 준비 중이거나 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.`);
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.includes('<title>')) {
    throw new Error('서버 연결 중 일시적인 지연이 발생했습니다. 브라우저 페이지를 새로고침(F5)한 뒤 다시 시도해주세요.');
  }
  if (!response.ok) {
    throw new Error(`서버 응답 오류 (${response.status}): ${trimmed.slice(0, 150)}`);
  }

  throw new Error(`${actionDesc} 중 올바른 응답을 수신하지 못했습니다. 잠시 후 다시 시도해주세요.`);
}

export default function App() {
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [collectedAt, setCollectedAt] = useState<string>('');
  const [aiProviderUsed, setAiProviderUsed] = useState<'claude' | 'gemini' | 'heuristic'>('claude');
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [activeKeywordFocus, setActiveKeywordFocus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressInfo | null>(null);

  const handleFetchTrends = async (params: FetchTrendsRequest) => {
    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);
    setAiNotice(null);

    // 1. Resolve unique list of target channels while maintaining order
    const targetChannels: string[] = [];
    if (params.channelInputs && params.channelInputs.length > 0) {
      for (const ch of params.channelInputs) {
        const trimmed = ch.trim();
        if (trimmed && !targetChannels.includes(trimmed)) {
          targetChannels.push(trimmed);
        }
      }
    } else if (params.channelInput && params.channelInput.trim()) {
      const trimmed = params.channelInput.trim();
      if (!targetChannels.includes(trimmed)) {
        targetChannels.push(trimmed);
      }
    }

    if (targetChannels.length === 0) {
      setIsLoading(false);
      setError('수집할 YouTube 채널 아이디 또는 핸들(@채널명)을 1개 이상 입력해주세요.');
      return;
    }

    const perChannelTarget = Math.min(Math.max(params.maxResults || 10, 1), 100);
    const expectedTotal = targetChannels.length * perChannelTarget;

    // Reset previous dataset for fresh multi-channel collection
    setVideos([]);
    setChannels([]);
    setChannel(null);

    // Initialize progress items
    const initialItems: BatchProgressItem[] = targetChannels.map((ch) => ({
      channelInput: ch,
      status: 'pending',
    }));

    setBatchProgress({
      totalChannels: targetChannels.length,
      currentChannelIndex: 0,
      currentChannelName: targetChannels[0],
      items: initialItems,
      totalVideosCollected: 0,
      expectedTotalVideos: expectedTotal,
      isFinished: false,
    });

    const accumulatedVideos: YouTubeVideoItem[] = [];
    const accumulatedChannels: ChannelInfo[] = [];
    const failedChannels: { channel: string; error: string }[] = [];
    let lastCollectedAt = new Date().toISOString().split('T')[0];
    let lastAiProvider: 'claude' | 'gemini' | 'heuristic' = 'claude';
    let lastAiModel = params.claudeModel || 'claude-haiku-4-5-20251001';

    // 2. Process each channel sequentially and independently to prevent timeout
    for (let i = 0; i < targetChannels.length; i++) {
      const currentChannelInput = targetChannels[i];
      const progressLabel = `[${i + 1}/${targetChannels.length}] ${currentChannelInput} 처리 중... (YouTube ${perChannelTarget}개 수집 및 Claude Haiku 4.5 분석)`;
      setLoadingStep(progressLabel);

      // Update progress item status to 'processing'
      setBatchProgress((prev) => {
        if (!prev) return null;
        const nextItems = [...prev.items];
        nextItems[i] = {
          ...nextItems[i],
          status: 'processing',
        };
        return {
          ...prev,
          currentChannelIndex: i,
          currentChannelName: currentChannelInput,
          items: nextItems,
        };
      });

      try {
        // Send single-channel request to server
        const singleChannelParams: FetchTrendsRequest = {
          youtubeApiKey: params.youtubeApiKey,
          claudeApiKey: params.claudeApiKey,
          channelInput: currentChannelInput,
          channelInputs: [currentChannelInput],
          keywordFocus: params.keywordFocus,
          maxResults: perChannelTarget,
          sortBy: params.sortBy || 'date',
          claudeModel: params.claudeModel,
          useGeminiFallback: params.useGeminiFallback,
        };

        const response = await fetch('/api/youtube/fetch-trends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(singleChannelParams),
        });

        const data = await parseResponseSafe<FetchTrendsResponse>(
          response,
          `'${currentChannelInput}' 데이터 수집 및 분석`
        );

        if (data.collectedAt) lastCollectedAt = data.collectedAt;
        if (data.aiProviderUsed) lastAiProvider = data.aiProviderUsed;
        if (data.aiModelUsed) lastAiModel = data.aiModelUsed;
        if (data.aiNotice) setAiNotice(data.aiNotice);

        // Append new videos (preventing duplicates by id)
        const incomingVideos = data.videos || [];
        for (const v of incomingVideos) {
          if (!accumulatedVideos.some((existing) => existing.id === v.id)) {
            accumulatedVideos.push(v);
          }
        }

        // Append channel info
        const incomingChannel = data.channel || (data.channels && data.channels[0]);
        if (incomingChannel && !accumulatedChannels.some((c) => c.id === incomingChannel.id)) {
          accumulatedChannels.push(incomingChannel);
        }

        // IMMEDIATELY update state: incremental accumulation in real time!
        const currentAccumulatedVideos = [...accumulatedVideos];
        const currentAccumulatedChannels = [...accumulatedChannels];

        setVideos(currentAccumulatedVideos);
        setChannels(currentAccumulatedChannels);
        if (currentAccumulatedChannels.length > 0) {
          setChannel(currentAccumulatedChannels[0]);
        }
        setCollectedAt(lastCollectedAt);
        setAiProviderUsed(lastAiProvider);
        setAiModelUsed(lastAiModel);
        if (data.keywordFocus || params.keywordFocus?.trim()) {
          setActiveKeywordFocus(data.keywordFocus || params.keywordFocus?.trim() || '');
        }

        // Update progress item status to 'completed'
        setBatchProgress((prev) => {
          if (!prev) return null;
          const nextItems = [...prev.items];
          nextItems[i] = {
            ...nextItems[i],
            status: 'completed',
            channelTitle: incomingChannel?.title || currentChannelInput,
            videoCount: incomingVideos.length,
          };
          return {
            ...prev,
            items: nextItems,
            totalVideosCollected: currentAccumulatedVideos.length,
          };
        });
      } catch (chErr: any) {
        console.error(`[순차 수집] 채널 '${currentChannelInput}' 오류 발생:`, chErr);
        failedChannels.push({
          channel: currentChannelInput,
          error: chErr.message || '데이터 수집 중 오류가 발생했습니다.',
        });

        // Mark item as 'failed' but DO NOT ABORT OR CLEAR ACCUMULATED DATA
        setBatchProgress((prev) => {
          if (!prev) return null;
          const nextItems = [...prev.items];
          nextItems[i] = {
            ...nextItems[i],
            status: 'failed',
            error: chErr.message || '수집 실패',
          };
          return {
            ...prev,
            items: nextItems,
          };
        });
      }
    }

    // 3. Sequential processing loop completed
    setIsLoading(false);
    setLoadingStep('');

    setBatchProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isFinished: true,
      };
    });

    if (accumulatedVideos.length > 0) {
      const aiLabel =
        lastAiProvider === 'claude'
          ? 'Claude Haiku'
          : lastAiProvider === 'gemini'
          ? 'Gemini 3.8 Flash'
          : '통계 분석';

      if (failedChannels.length === 0) {
        setSuccessNotice(
          targetChannels.length > 1
            ? `총 ${accumulatedChannels.length}개 채널에서 각 ${perChannelTarget}개씩 수집하여 총 ${accumulatedVideos.length}개의 통합 데이터 수집 및 ${aiLabel} 분석을 성공적으로 완료했습니다!`
            : params.keywordFocus?.trim()
            ? `'${params.keywordFocus.trim()}' 키워드 기준 ${accumulatedVideos.length}개 영상 트렌드 수집 및 ${aiLabel} 분석을 완료했습니다!`
            : `성공적으로 ${accumulatedVideos.length}개의 영상 트렌드 수집 및 ${aiLabel} 분석을 완료했습니다!`
        );
      } else {
        setSuccessNotice(
          `총 ${accumulatedChannels.length}개 채널에서 ${accumulatedVideos.length}개의 영상 수집 및 ${aiLabel} 분석을 완료했습니다. (일부 채널 수집 실패: ${failedChannels.map((f) => f.channel).join(', ')})`
        );
        setError(
          `다음 채널 처리 중 오류가 발생했으나 이미 완료된 ${accumulatedVideos.length}개의 데이터는 안전하게 보존되었습니다:\n${failedChannels
            .map((f) => `• [${f.channel}] ${f.error}`)
            .join('\n')}`
        );
      }
    } else {
      setError(
        `모든 채널의 데이터 수집에 실패했습니다:\n${failedChannels
          .map((f) => `• [${f.channel}] ${f.error}`)
          .join('\n')}`
      );
    }
  };

  const handleLoadSample = async (keywordFocus?: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);
    setBatchProgress(null);
    setLoadingStep('샘플 트렌드 데이터 불러오는 중...');

    try {
      const url = keywordFocus && keywordFocus.trim()
        ? `/api/youtube/sample-trends?keywordFocus=${encodeURIComponent(keywordFocus.trim())}`
        : '/api/youtube/sample-trends';
      const res = await fetch(url);
      const data = await parseResponseSafe<FetchTrendsResponse>(res, '샘플 데이터 불러오기');

      setVideos(data.videos);
      setChannel(data.channel);
      setChannels(data.channels && data.channels.length > 0 ? data.channels : (data.channel ? [data.channel] : []));
      setCollectedAt(data.collectedAt);
      setAiProviderUsed(data.aiProviderUsed);
      setAiModelUsed(data.aiModelUsed || '');
      setActiveKeywordFocus(data.keywordFocus || keywordFocus?.trim() || '');
      setSuccessNotice(
        data.keywordFocus
          ? `'${data.keywordFocus}' 키워드 포커스가 반영된 샘플 데이터가 로드되었습니다. 엑셀의 '키워드' 열과 Claude 관련도 점수를 확인해보세요.`
          : '샘플 데이터가 로드되었습니다. 바로 상단의 [엑셀 다운로드] 버튼을 눌러 테스트해보세요.'
      );
    } catch (err: any) {
      setError(err.message || '샘플 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Columns Structure Guide */}
        <ColumnsGuide />

        {/* Input Configuration Form */}
        <InputForm
          onSubmit={handleFetchTrends}
          onLoadSample={handleLoadSample}
          isLoading={isLoading}
          loadingStep={loadingStep}
        />

        {/* Real-time Sequential Batch Progress Card */}
        {batchProgress && (isLoading || batchProgress.totalChannels > 1) && (
          <div className="relative">
            <BatchProgressCard progress={batchProgress} />
          </div>
        )}

        {/* Success Notification */}
        {successNotice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold shrink-0"
            >
              닫기
            </button>
          </div>
        )}

        {/* AI Notice / Automatic Fallback Notification */}
        {aiNotice && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950">AI 분석 모델 자동 안전 전환 안내</h4>
                <p className="mt-0.5 text-amber-800 leading-relaxed">{aiNotice}</p>
              </div>
            </div>
            <button
              onClick={() => setAiNotice(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs shrink-0 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-rose-900">요청 처리 중 오류가 발생했습니다</h4>
              <p className="mt-1 text-rose-700 leading-relaxed">{error}</p>
              <div className="mt-2 text-xs text-rose-600">
                Tip: YouTube Data API 할당량 초과 여부 또는 채널 ID (예: @채널명) 형식을 다시 한번 확인해보세요.
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold text-xs shrink-0"
            >
              닫기
            </button>
          </div>
        )}

        {/* Result Area */}
        {channel && videos.length > 0 ? (
          <div id="dashboard-result-container">
            {/* Channel Overview Card */}
            <ChannelCard
              channel={channel}
              channels={channels}
              collectedAt={collectedAt}
              videoCount={videos.length}
              keywordFocus={activeKeywordFocus}
              aiProviderUsed={aiProviderUsed}
              aiModelUsed={aiModelUsed}
            />

            {/* Video List & Excel Export Table */}
            <TrendTable
              videos={videos}
              channelTitle={channels.length > 1 ? `통합 (${channels.length}개 채널)` : channel.title}
              keywordFocus={activeKeywordFocus}
              channels={channels}
              collectedAt={collectedAt}
              aiModelUsed={aiModelUsed}
            />
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-500/10 to-amber-500/10 text-red-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                수집된 트렌드 데이터가 없습니다
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                위 설정 창에 YouTube API 키, Claude API 키, 채널 아이디를 입력하거나, 아래 버튼을 눌러 샘플 데이터를 바로 확인해보세요.
              </p>
              <button
                type="button"
                onClick={() => handleLoadSample()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                샘플 데이터로 엑셀 구조 미리보기
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>
            유튜브 트렌드 엑셀 추출기 · YouTube Data API v3 & Anthropic Claude
          </p>
          <p>
            엑셀 포맷: .xlsx (12개 열 규격 완벽 대응)
          </p>
        </div>
      </footer>
    </div>
  );
}
