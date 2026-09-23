import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Sparkles,
  Youtube,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  HelpCircle,
  Target,
  Hash,
  Plus,
  Trash2,
  ListPlus,
  Layers,
  X,
} from 'lucide-react';
import { FetchTrendsRequest } from '../types.ts';

interface InputFormProps {
  onSubmit: (data: FetchTrendsRequest) => void;
  onLoadSample: (keywordFocus?: string) => void;
  isLoading: boolean;
  loadingStep?: string;
}

const STORAGE_KEY_YT = 'yt_trend_yt_key';
const STORAGE_KEY_CLAUDE = 'yt_trend_claude_key';
const STORAGE_KEY_CHANNEL = 'yt_trend_channel_input';
const STORAGE_KEY_CHANNELS = 'yt_trend_channel_inputs';
const STORAGE_KEY_KEYWORD_FOCUS = 'yt_trend_keyword_focus';

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onLoadSample,
  isLoading,
  loadingStep,
}) => {
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [channels, setChannels] = useState<string[]>(['']);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');
  const [keywordFocus, setKeywordFocus] = useState('');
  const [maxResults, setMaxResults] = useState<number>(10);
  const [sortBy, setSortBy] = useState<'date' | 'viewCount'>('date');
  const [claudeModel, setClaudeModel] = useState('claude-haiku-4-5-20251001');
  const [rememberKeys, setRememberKeys] = useState(true);

  const [showYtKey, setShowYtKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load saved keys and channels from localStorage on mount
  useEffect(() => {
    try {
      const savedYt = localStorage.getItem(STORAGE_KEY_YT) || '';
      const savedClaude = localStorage.getItem(STORAGE_KEY_CLAUDE) || '';
      const savedKeyword = localStorage.getItem(STORAGE_KEY_KEYWORD_FOCUS) || '';
      const savedChannelsJson = localStorage.getItem(STORAGE_KEY_CHANNELS);

      if (savedYt) setYoutubeApiKey(savedYt);
      if (savedClaude) setClaudeApiKey(savedClaude);
      if (savedKeyword) setKeywordFocus(savedKeyword);

      if (savedChannelsJson) {
        try {
          const parsed = JSON.parse(savedChannelsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChannels(parsed.slice(0, 10));
          }
        } catch {
          const savedSingle = localStorage.getItem(STORAGE_KEY_CHANNEL) || '';
          if (savedSingle) setChannels([savedSingle]);
        }
      } else {
        const savedSingle = localStorage.getItem(STORAGE_KEY_CHANNEL) || '';
        if (savedSingle) setChannels([savedSingle]);
      }
    } catch {
      // Ignore localStorage error in private browsing
    }
  }, []);

  const handleAddChannel = () => {
    if (channels.length >= 10) return;
    setChannels((prev) => [...prev, '']);
  };

  const handleRemoveChannel = (index: number) => {
    if (channels.length <= 1) {
      setChannels(['']);
      return;
    }
    setChannels((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleChannelChange = (index: number, value: string) => {
    if (value.includes(',') || value.includes('\n') || value.includes(';')) {
      const items = value
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 1) {
        const next = [...channels];
        next[index] = items[0];
        const remainingCapacity = 10 - next.length;
        const additional = items.slice(1, remainingCapacity + 1);
        next.push(...additional);
        setChannels(next.slice(0, 10));
        return;
      }
    }

    const next = [...channels];
    next[index] = value;
    setChannels(next);
  };

  const handleApplyBatchText = () => {
    const items = batchText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length === 0) {
      alert('채널 아이디 또는 핸들을 1개 이상 입력해주세요.');
      return;
    }

    setChannels(items.slice(0, 10));
    setIsBatchMode(false);
    setBatchText('');
  };

  const handleQuickPreset = (presetChannels: string[]) => {
    setChannels(presetChannels.slice(0, 10));
    setIsBatchMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeApiKey.trim()) {
      alert('YouTube Data API 키를 입력해주세요.');
      return;
    }

    const validChannels = channels.map((c) => c.trim()).filter(Boolean);
    if (validChannels.length === 0) {
      alert('YouTube 채널 아이디 또는 핸들(@채널명)을 최소 1개 이상 입력해주세요.');
      return;
    }

    if (rememberKeys) {
      try {
        localStorage.setItem(STORAGE_KEY_YT, youtubeApiKey.trim());
        localStorage.setItem(STORAGE_KEY_CLAUDE, claudeApiKey.trim());
        localStorage.setItem(STORAGE_KEY_CHANNEL, validChannels[0]);
        localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(validChannels));
        localStorage.setItem(STORAGE_KEY_KEYWORD_FOCUS, keywordFocus.trim());
      } catch {
        // Ignore
      }
    }

    onSubmit({
      youtubeApiKey: youtubeApiKey.trim(),
      claudeApiKey: claudeApiKey.trim(),
      channelInput: validChannels[0],
      channelInputs: validChannels,
      keywordFocus: keywordFocus.trim(),
      maxResults,
      sortBy,
      claudeModel,
      useGeminiFallback: true,
    });
  };

  const handleReset = () => {
    setYoutubeApiKey('');
    setClaudeApiKey('');
    setChannels(['']);
    setKeywordFocus('');
    try {
      localStorage.removeItem(STORAGE_KEY_YT);
      localStorage.removeItem(STORAGE_KEY_CLAUDE);
      localStorage.removeItem(STORAGE_KEY_CHANNEL);
      localStorage.removeItem(STORAGE_KEY_CHANNELS);
      localStorage.removeItem(STORAGE_KEY_KEYWORD_FOCUS);
    } catch {
      // Ignore
    }
  };

  const handleQuickKeyword = (kw: string) => {
    setKeywordFocus(kw);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
              유튜브 & Claude API 데이터 수집 및 키워드 포커스 설정
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              API 키와 대상 채널, 분석 기준 키워드를 설정하면 엑셀 자동 연동 및 Claude AI 평가를 수행합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadSample(keywordFocus)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-indigo-600" />
              샘플 데이터 즉시 체험
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              title="입력 내용 초기화"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2 Main API Keys: YouTube Key, Claude Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* YouTube API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              <span className="text-red-500 mr-1">*</span>
              YouTube Data API v3 키
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showYtKey ? 'text' : 'password'}
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowYtKey(!showYtKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showYtKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-slate-400">Google Cloud Console 발급</span>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
              >
                발급 가이드 <HelpCircle className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Claude API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Claude API 키 (Anthropic)</span>
              <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                관련도 점수 평가
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <input
                type={showClaudeKey ? 'text' : 'password'}
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-slate-400">Anthropic Console 발급</span>
              <span className="text-[10px] text-amber-600 font-medium">미입력 또는 크레딧 부족 시 Gemini 자동 대체</span>
            </div>
          </div>
        </div>

        {/* Dedicated YouTube Channel(s) Card (1 to 10 channels) */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                <Youtube className="w-3.5 h-3.5" />
              </div>
              <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="text-red-500">*</span>
                YouTube 대상 채널 (1개 ~ 최대 10개)
              </label>
              <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                {channels.map((c) => c.trim()).filter(Boolean).length}개 / 최대 10개
              </span>
              {channels.map((c) => c.trim()).filter(Boolean).length > 1 && (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  순차 수집 및 통합 데이터 테이블 연동
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsBatchMode(!isBatchMode)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5 text-slate-500" />
                {isBatchMode ? '개별 입력 모드' : '일괄 붙여넣기'}
              </button>
              <button
                type="button"
                onClick={handleAddChannel}
                disabled={channels.length >= 10 || isBatchMode}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                채널 추가 ({channels.length}/10)
              </button>
            </div>
          </div>

          {/* Batch Mode Textarea */}
          {isBatchMode ? (
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                여러 채널 일괄 붙여넣기 (쉼표 또는 줄바꿈 구분, 최대 10개)
              </label>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'@GoogleDevelopers\n@Geekble\n@TED\n또는 @채널1, @채널2, @채널3'}
                rows={4}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  붙여넣은 채널을 자동으로 분리하여 순차 수집 목록으로 등록합니다.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchMode(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBatchText}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs cursor-pointer"
                  >
                    목록에 적용
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-channel Input Grid */
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {channels.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shadow-2xs">
                      #{idx + 1}
                    </span>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Youtube className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={ch}
                        onChange={(e) => handleChannelChange(idx, e.target.value)}
                        placeholder={
                          idx === 0
                            ? '@GoogleDevelopers 또는 채널ID'
                            : idx === 1
                            ? '@Geekble 또는 @침착맨'
                            : `@채널핸들_${idx + 1}`
                        }
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium shadow-2xs"
                      />
                    </div>
                    {channels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(idx)}
                        title="이 채널 제거"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {channels.length < 10 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddChannel}
                    className="w-full py-1.5 border border-dashed border-slate-300 hover:border-red-400 text-slate-500 hover:text-red-600 bg-white/60 hover:bg-red-50/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    새 채널 추가하기 ({channels.length}/10)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick presets & helpers */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
            <span className="text-slate-400 font-medium">추천 채널 프리셋:</span>
            <button
              type="button"
              onClick={() => {
                handleQuickPreset(['@hyundaiglovis', '@LXPantos_official', '@pointerTV', '@SamsungTrading', '@lotteglogis_TV']);
                setMaxResults(100);
              }}
              className="text-red-700 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors shadow-2xs"
            >
              물류 5사 (총 500개) : @hyundaiglovis, @LXPantos_official, @pointerTV, @SamsungTrading, @lotteglogis_TV
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(['@GoogleDevelopers'])}
              className="text-slate-600 hover:text-red-600 bg-white hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              단일: @GoogleDevelopers
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(['@GoogleDevelopers', '@Geekble', '@TED'])}
              className="text-slate-600 hover:text-red-600 bg-white hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
            >
              테크 3채널: @GoogleDevelopers, @Geekble, @TED
            </button>
          </div>
        </div>

        {/* KEYWORD FOCUS (Prominently Highlighted Input Card) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white border border-emerald-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Target className="w-3.5 h-3.5" />
              </div>
              <label htmlFor="keyword-focus-input" className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                KEYWORD FOCUS (분석 키워드)
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  엑셀 ‘키워드’ 열 자동 저장
                </span>
              </label>
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">
              ★ Claude API가 이 키워드를 기준으로 관련도 점수(0~100점)를 엄밀히 산출합니다
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
              <Hash className="w-4 h-4" />
            </div>
            <input
              id="keyword-focus-input"
              type="text"
              value={keywordFocus}
              onChange={(e) => setKeywordFocus(e.target.value)}
              placeholder="예: 생성형 AI, 개발자 취업, 아이폰 17, 재테크 전략, 유튜브 알고리즘 (입력 시 엑셀의 '키워드' 열에 즉시 반영)"
              className="w-full pl-10 pr-28 py-2.5 text-xs sm:text-sm bg-white border border-emerald-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-2xs transition-all font-medium"
            />
            {keywordFocus && (
              <button
                type="button"
                onClick={() => setKeywordFocus('')}
                className="absolute inset-y-0 right-2 pr-2 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                지우기
              </button>
            )}
          </div>

          {/* Quick Recommendation Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-emerald-100/80 text-[11px]">
            <span className="text-slate-500 font-medium">추천 키워드 포커스:</span>
            {['무역 물류', '생성형 AI', '유튜브 알고리즘', '웹 개발', '생산성 툴', '수익화 모델'].map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => handleQuickKeyword(kw)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  keywordFocus === kw
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200/80'
                }`}
              >
                #{kw}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Options Bar: Sort, Count, Advanced, Remember */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Order */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">정렬:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSortBy('date')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sortBy === 'date'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  최신순 (낮은할당량)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('viewCount')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sortBy === 'viewCount'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  조회수 인기순
                </button>
              </div>
            </div>

            {/* Video Count per Channel */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">채널당 수집:</span>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value={5}>5개</option>
                <option value={10}>10개 (권장)</option>
                <option value={20}>20개</option>
                <option value={30}>30개</option>
                <option value={50}>50개</option>
                <option value={100}>100개 (최대 · 5채널 시 총 500개)</option>
              </select>
              {channels.map((c) => c.trim()).filter(Boolean).length > 1 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  (총 {channels.map((c) => c.trim()).filter(Boolean).length * maxResults}개 예상)
                </span>
              )}
            </div>

            {/* Advanced Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              상세 AI 모델 설정
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberKeys}
              onChange={(e) => setRememberKeys(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>브라우저에 키 및 설정 기억하기 (localStorage)</span>
          </label>
        </div>

        {/* Collapsible Advanced Settings */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-xl">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Claude AI 모델 선택
            </label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
            >
              <option value="claude-haiku-4-5-20251001">
                claude-haiku-4-5 (최신 하이쿠 · 초고속 추천)
              </option>
              <option value="claude-3-7-sonnet-20250219">
                claude-3-7-sonnet (심층 분석 · 최고 성능)
              </option>
              <option value="claude-3-5-sonnet-20241022">
                claude-3-5-sonnet (안정형 고성능)
              </option>
            </select>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>
                  {loadingStep || 'YouTube 데이터 수집 및 Claude 키워드 관련도 분석 중...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {channels.map((c) => c.trim()).filter(Boolean).length > 1
                    ? `[총 ${channels.map((c) => c.trim()).filter(Boolean).length}개 채널 순차 수집] ${
                        keywordFocus.trim() ? `'${keywordFocus.trim()}' 포커스 ` : ''
                      }통합 트렌드 데이터 및 엑셀 생성`
                    : keywordFocus.trim()
                    ? `[${keywordFocus.trim()}] 포커스 기준 유튜브 트렌드 수집 및 엑셀 생성`
                    : '유튜브 트렌드 데이터 수집 및 엑셀 생성'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
