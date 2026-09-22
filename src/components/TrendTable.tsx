import React, { useState, useMemo } from 'react';
import { YouTubeVideoItem, ChannelInfo } from '../types.ts';
import {
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Eye,
  ThumbsUp,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  TrendingUp,
  BarChart3,
  X,
  SlidersHorizontal,
  Target,
  LayoutDashboard,
  Youtube,
  Layers,
  GitCompare,
} from 'lucide-react';
import { exportVideosToExcel, exportVideosToCsv, formatNumberWithCommas } from '../utils/excel.ts';
import { TrendDashboard } from './TrendDashboard.tsx';
import { ChannelComparisonDashboard } from './ChannelComparisonDashboard.tsx';

interface TrendTableProps {
  videos: YouTubeVideoItem[];
  channelTitle: string;
  keywordFocus?: string;
  channels?: ChannelInfo[];
}

export const TrendTable: React.FC<TrendTableProps> = ({
  videos,
  channelTitle,
  keywordFocus,
  channels,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'claudeScore' | 'viewCount' | 'likeCount' | 'uploadDate'>('claudeScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [showComparisonDashboard, setShowComparisonDashboard] = useState<boolean>(true);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('ALL');

  // Identify unique channels in dataset
  const uniqueChannels = useMemo(() => {
    const map = new Map<string, { title: string; count: number; thumbnailUrl?: string }>();
    videos.forEach((v) => {
      const title = v.channelTitle || channelTitle || '기본 채널';
      if (!map.has(title)) {
        map.set(title, {
          title,
          count: 0,
          thumbnailUrl: v.channelThumbnailUrl,
        });
      }
      map.get(title)!.count += 1;
    });
    return Array.from(map.values());
  }, [videos, channelTitle]);

  // Channel filtered videos
  const channelFilteredVideos = useMemo(() => {
    if (selectedChannelFilter === 'ALL') return videos;
    return videos.filter((v) => (v.channelTitle || channelTitle) === selectedChannelFilter);
  }, [videos, channelTitle, selectedChannelFilter]);

  // Summary Metrics calculation for current channel filter
  const metrics = useMemo(() => {
    if (!channelFilteredVideos || channelFilteredVideos.length === 0) {
      return { totalViews: 0, totalLikes: 0, avgScore: 0, topVideo: null };
    }
    const totalViews = channelFilteredVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
    const totalLikes = channelFilteredVideos.reduce((acc, v) => acc + (v.likeCount || 0), 0);
    const avgScore = Math.round(
      channelFilteredVideos.reduce((acc, v) => acc + (v.claudeScore || 0), 0) / channelFilteredVideos.length
    );
    const topVideo = [...channelFilteredVideos].sort((a, b) => b.claudeScore - a.claudeScore)[0];

    return { totalViews, totalLikes, avgScore, topVideo };
  }, [channelFilteredVideos]);

  // Copy handler
  const handleCopy = (text: string, type: 'id' | 'url', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedUrl(id);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  // Filter videos by search
  const filteredVideos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return channelFilteredVideos;
    return channelFilteredVideos.filter((v) => {
      return (
        v.title.toLowerCase().includes(term) ||
        v.keyword.toLowerCase().includes(term) ||
        v.claudeReview.toLowerCase().includes(term) ||
        v.id.toLowerCase().includes(term) ||
        (v.channelTitle && v.channelTitle.toLowerCase().includes(term))
      );
    });
  }, [channelFilteredVideos, searchTerm]);

  // Sort videos
  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'claudeScore') {
        cmp = a.claudeScore - b.claudeScore;
      } else if (sortKey === 'viewCount') {
        cmp = a.viewCount - b.viewCount;
      } else if (sortKey === 'likeCount') {
        const valA = a.likeCount !== null && a.likeCount !== undefined ? a.likeCount : -1;
        const valB = b.likeCount !== null && b.likeCount !== undefined ? b.likeCount : -1;
        cmp = valA - valB;
      } else if (sortKey === 'uploadDate') {
        cmp = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredVideos, sortKey, sortOrder]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return sortOrder === 'desc' ? (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
    );
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        label: '매우 우수',
      };
    }
    if (score >= 80) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
        label: '우수',
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: '양호',
      };
    }
    return {
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      label: '보통',
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. Summary KPI Bar (Professional Metrics Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">수집 영상</span>
            <span className="p-1 rounded-md bg-slate-100 text-slate-600">
              <BarChart3 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            {videos.length}
            <span className="text-xs font-normal text-slate-500 ml-1">개 영상</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            수집일: <span className="font-mono text-slate-700">{videos[0]?.collectedAt || '-'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">총 조회수 합계</span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight font-mono">
            {formatNumberWithCommas(metrics.totalViews)}
            <span className="text-xs font-normal text-slate-500 ml-1">회</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            평균 {(metrics.totalViews / (videos.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}회 / 영상
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">평균 Claude 트렌드 점수</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight font-mono flex items-baseline gap-1.5">
            <span>{metrics.avgScore}</span>
            <span className="text-xs font-normal text-slate-500">/ 100점</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> AI 트렌드 적합도 평가
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">최고 평가 트렌드 영상</span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate leading-snug">
            {metrics.topVideo?.title || '-'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="font-mono text-emerald-700 font-bold">
              Claude {metrics.topVideo?.claudeScore || 0}점
            </span>
            <span className="font-mono text-slate-500">
              {formatNumberWithCommas(metrics.topVideo?.viewCount || 0)}회
            </span>
          </div>
        </div>
      </div>

      {/* 2. 수집 동영상 데이터 관리 테이블 섹션 */}
      <div id="collected-videos-management-section" className="space-y-4 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>수집 동영상 데이터 관리 테이블</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
                총 {videos.length}개 영상
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {uniqueChannels.length > 1 && (
              <button
                type="button"
                onClick={() => setShowComparisonDashboard((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showComparisonDashboard
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{showComparisonDashboard ? '채널 비교 대시보드 닫기' : '채널 비교 대시보드 열기'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDashboard((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                showDashboard
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700" />
              <span>{showDashboard ? '단일/통합 지표 접기' : '단일/통합 지표 열기'}</span>
            </button>
          </div>
        </div>

        {/* Channel Comparison Dashboard (교재 다중 채널 비교 분석 단계) */}
        {uniqueChannels.length > 1 && showComparisonDashboard && (
          <ChannelComparisonDashboard
            videos={videos}
            channels={channels}
            keywordFocus={keywordFocus}
            onSelectChannelFilter={(chTitle) => setSelectedChannelFilter(chTitle)}
          />
        )}

        {/* Dashboard Display Area inside '수집 동영상 데이터 관리 테이블' Section */}
        {showDashboard && (
          <TrendDashboard
            videos={channelFilteredVideos}
            channelTitle={
              selectedChannelFilter === 'ALL'
                ? uniqueChannels.length > 1
                  ? `통합 (${uniqueChannels.length}개 채널)`
                  : channelTitle
                : selectedChannelFilter
            }
            keywordFocus={keywordFocus}
            onFilterKeyword={(kw) => setSearchTerm(kw)}
            onCloseDashboard={() => setShowDashboard(false)}
          />
        )}

        {/* Main Data Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          {/* Multi-channel Filter Bar (When 2+ channels are present) */}
          {uniqueChannels.length > 1 && (
            <div className="px-4 sm:px-5 py-3 bg-slate-50/90 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                  <Youtube className="w-4 h-4 text-red-600" />
                  채널별 데이터 필터:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChannelFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedChannelFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  통합 전체 ({videos.length}개 영상)
                </button>
                {uniqueChannels.map((ch) => (
                  <button
                    key={ch.title}
                    type="button"
                    onClick={() => setSelectedChannelFilter(ch.title)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedChannelFilter === ch.title
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{ch.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                        selectedChannelFilter === ch.title
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ch.count}개
                    </span>
                  </button>
                ))}
              </div>

              {selectedChannelFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedChannelFilter('ALL')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline decoration-slate-300 self-end sm:self-auto cursor-pointer"
                >
                  전체 채널 통합 보기로 복원
                </button>
              )}
            </div>
          )}

          {/* Top Control Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Search Field */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="영상 제목, 키워드, Claude 한줄평, 영상 ID, 채널명 검색..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action & Export Group */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
              {/* Density switch */}
              <div className="hidden sm:inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setIsCompact(false)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    !isCompact ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  편안하게
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompact(true)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    isCompact ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  컴팩트
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="표 보기"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="카드 그리드 보기"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1"></div>

              {/* CSV Export */}
              <button
                type="button"
                onClick={() =>
                  exportVideosToCsv(
                    channelFilteredVideos,
                    selectedChannelFilter === 'ALL'
                      ? uniqueChannels.length > 1
                        ? `통합_${uniqueChannels.length}개채널`
                        : channelTitle
                      : selectedChannelFilter
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                CSV
              </button>

              {/* Primary Excel (.xlsx) Download */}
              <button
                type="button"
                id="export-excel-btn"
                onClick={() =>
                  exportVideosToExcel(
                    channelFilteredVideos,
                    selectedChannelFilter === 'ALL'
                      ? uniqueChannels.length > 1
                        ? `통합_${uniqueChannels.length}개채널`
                        : channelTitle
                      : selectedChannelFilter
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-600/30 hover:shadow-md hover:shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {selectedChannelFilter === 'ALL'
                    ? uniqueChannels.length > 1
                      ? '통합 엑셀 (.xlsx) 내보내기'
                      : '엑셀 (.xlsx) 내보내기'
                    : `'${selectedChannelFilter}' 엑셀 (.xlsx) 내보내기`}
                </span>
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-700 text-[10px] font-mono">
                  {channelFilteredVideos.length}행
                </span>
              </button>

              {/* 대시보드 생성 Button (Placed immediately to the right of the Excel button) */}
              <button
                type="button"
                id="generate-dashboard-btn"
                onClick={() => {
                  setShowDashboard((prev) => !prev);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  showDashboard
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/25'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/90 shadow-indigo-100/50'
                }`}
                title="수집 동영상 데이터 관리 테이블 섹션에 시각화 대시보드를 표시합니다"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>대시보드 생성</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                    showDashboard ? 'bg-indigo-700 text-white' : 'bg-indigo-200/80 text-indigo-800'
                  }`}
                >
                  {showDashboard ? 'ON' : '보기'}
                </span>
              </button>
            </div>
          </div>

        {/* Filter / Sort Quick Indicator */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">정렬 기준:</span>
            <button
              type="button"
              onClick={() => toggleSort('claudeScore')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                sortKey === 'claudeScore'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200 font-bold'
                  : 'hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              Claude 관련도 점수 {getSortIcon('claudeScore')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('viewCount')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                sortKey === 'viewCount'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
                  : 'hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              조회수 {getSortIcon('viewCount')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('likeCount')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                sortKey === 'likeCount'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
                  : 'hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              좋아요수 {getSortIcon('likeCount')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('uploadDate')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                sortKey === 'uploadDate'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
                  : 'hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              업로드 날짜 {getSortIcon('uploadDate')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium">
            {keywordFocus && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-900 border border-emerald-300 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>KEYWORD FOCUS:</span>
                <span className="font-bold underline decoration-emerald-500">#{keywordFocus}</span>
                <span className="text-[10px] text-emerald-800 bg-white/70 px-1 py-0.2 rounded font-semibold">엑셀 키워드 열 저장</span>
              </div>
            )}
            <div className="text-slate-500">
              {searchTerm ? (
                <span>
                  검색 결과: <strong className="text-slate-900">{sortedVideos.length}</strong> / {videos.length}개
                </span>
              ) : (
                <span>총 {sortedVideos.length}개 영상 트렌드 데이터</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Table View or Cards View */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-md border-b border-slate-200/90 text-slate-600">
                <tr className="text-[11px] font-bold tracking-wider">
                  <th className="py-2.5 px-1.5 text-center w-8 text-slate-400">#</th>
                  <th className="py-2.5 px-2 w-20 text-center whitespace-nowrap">1. 수집일</th>
                  <th className="py-2.5 px-2 w-24">2. 키워드</th>
                  <th className="py-2.5 px-2 min-w-[200px]">3. 영상 제목 · 4. 썸네일</th>
                  <th className="py-2.5 px-2 w-24 text-center whitespace-nowrap">5. 영상 URL · 6. ID</th>
                  <th
                    className="py-2.5 px-2 w-22 text-right cursor-pointer hover:bg-slate-200/50 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort('viewCount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>7. 조회수</span>
                      {getSortIcon('viewCount')}
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-2 w-20 text-right cursor-pointer hover:bg-slate-200/50 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort('likeCount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>8. 좋아요수</span>
                      {getSortIcon('likeCount')}
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-2 w-22 text-center cursor-pointer hover:bg-slate-200/50 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort('uploadDate')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>9. 업로드 날짜</span>
                      {getSortIcon('uploadDate')}
                    </div>
                  </th>
                  <th className="py-2.5 px-1.5 w-16 text-center whitespace-nowrap">10. 길이</th>
                  <th className="py-2.5 px-2 min-w-[180px]">11. Claude 한줄평</th>
                  <th
                    className="py-2.5 px-2 w-22 text-center cursor-pointer hover:bg-slate-200/50 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort('claudeScore')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>12. Claude 점수</span>
                      {getSortIcon('claudeScore')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedVideos.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">검색 조건에 일치하는 영상이 없습니다.</p>
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
                      >
                        검색 초기화
                      </button>
                    </td>
                  </tr>
                ) : (
                  sortedVideos.map((video, idx) => {
                    const badge = getScoreBadge(video.claudeScore);
                    const cellPadding = isCompact ? 'py-1.5 px-2' : 'py-2.5 px-2';

                    return (
                      <tr
                        key={video.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* # Index */}
                        <td className={`${cellPadding} text-center font-mono text-slate-400 text-[10px]`}>
                          {idx + 1}
                        </td>

                        {/* 1. 수집일 */}
                        <td className={`${cellPadding} text-slate-600 font-mono text-[10px] whitespace-nowrap text-center`}>
                          {video.collectedAt}
                        </td>

                        {/* 2. 키워드 */}
                        <td className={`${cellPadding}`}>
                          <div className="flex flex-wrap gap-1 max-w-[110px]">
                            {video.keyword.split(',').map((kw, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60 truncate max-w-[100px]"
                                title={kw.trim()}
                              >
                                #{kw.trim()}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 3. 영상 제목 & 4. 썸네일 URL */}
                        <td className={`${cellPadding}`}>
                          <div className="flex items-start gap-2.5">
                            <div className="relative shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs group-hover:border-slate-300 transition-colors">
                              {video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                                  No Image
                                </div>
                              )}
                              <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 text-white rounded text-[8px] font-mono">
                                {video.durationFormatted}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              {video.channelTitle && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-semibold border border-slate-200/80 mb-0.5">
                                  <Youtube className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                  <span className="truncate max-w-[120px]">{video.channelTitle}</span>
                                </div>
                              )}
                              <a
                                href={video.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-slate-900 hover:text-red-600 line-clamp-2 leading-snug transition-colors text-xs block"
                                title={video.title}
                              >
                                {video.title}
                              </a>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(video.thumbnailUrl, 'url', video.id)}
                                  className="text-slate-400 hover:text-slate-600 shrink-0 flex items-center gap-0.5"
                                  title="썸네일 URL 복사"
                                >
                                  {copiedUrl === video.id ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" /> 복사됨
                                    </span>
                                  ) : (
                                    <span className="hover:underline flex items-center gap-0.5">
                                      <Copy className="w-2.5 h-2.5" /> 썸네일 URL
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 5. 영상 URL & 6. 영상 ID */}
                        <td className={`${cellPadding} whitespace-nowrap text-center`}>
                          <div className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-700 bg-slate-100/70 border border-slate-200/60 px-1.5 py-0.5 rounded w-fit">
                            <span className="max-w-[65px] truncate" title={video.id}>{video.id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(video.id, 'id', video.id)}
                              title="영상 ID 복사"
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedId === video.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                          <a
                            href={video.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-0.5 text-[10px] text-red-600 hover:text-red-700 font-medium hover:underline mt-1"
                            title="유튜브에서 영상 보기"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>YouTube</span>
                          </a>
                        </td>

                        {/* 7. 조회수 */}
                        <td className={`${cellPadding} text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap text-[11px]`}>
                          {formatNumberWithCommas(video.viewCount)}
                          <span className="text-[10px] text-slate-400 font-normal ml-0.5">회</span>
                        </td>

                        {/* 8. 좋아요수 */}
                        <td className={`${cellPadding} text-right font-mono text-slate-700 tabular-nums whitespace-nowrap text-[11px]`}>
                          {video.likeCount !== null && video.likeCount !== undefined ? (
                            <>
                              {formatNumberWithCommas(video.likeCount)}
                              <span className="text-[10px] text-slate-400 ml-0.5">개</span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-normal" title="좋아요 수가 API에서 제공되지 않은 영상 (비공개/미제공)">
                              미제공
                            </span>
                          )}
                        </td>

                        {/* 9. 업로드 날짜 */}
                        <td className={`${cellPadding} text-slate-600 font-mono text-[11px] whitespace-nowrap text-center`}>
                          {video.uploadDate}
                        </td>

                        {/* 10. 영상 길이 */}
                        <td className={`${cellPadding} text-center text-slate-700 font-medium whitespace-nowrap`}>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                            {video.durationFormatted}
                          </span>
                        </td>

                        {/* 11. Claude 한줄평 */}
                        <td className={`${cellPadding}`}>
                          <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-slate-800 text-[11px] leading-relaxed flex items-start gap-1.5 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-900 line-clamp-2" title={video.claudeReview}>
                                {video.claudeReview}
                              </p>
                              {video.claudeReason && (
                                <p className="text-[9px] text-amber-800/80 mt-0.5 font-normal line-clamp-1" title={video.claudeReason}>
                                  근거: {video.claudeReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 12. Claude 관련도 점수 */}
                        <td className={`${cellPadding} text-center whitespace-nowrap`}>
                          <div className={`inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg border ${badge.bg} shadow-2xs min-w-[62px]`}>
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              <span className="font-bold text-xs font-mono tracking-tight">
                                {video.claudeScore}점
                              </span>
                            </div>
                            <span className="text-[8px] font-medium opacity-80 mt-0.2">
                              {badge.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/40">
            {sortedVideos.map((video) => {
              const badge = getScoreBadge(video.claudeScore);
              return (
                <div
                  key={video.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col group"
                >
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white rounded text-[10px] font-mono">
                      {video.durationFormatted}
                    </span>
                    <span
                      className={`absolute top-2.5 right-2.5 font-bold px-2.5 py-1 rounded-xl text-xs shadow-xs border ${badge.bg} flex items-center gap-1.5`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      Claude {video.claudeScore}점
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        {video.channelTitle && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded-md font-semibold border border-red-200/70 mr-0.5">
                            <Youtube className="w-2.5 h-2.5 text-red-600 shrink-0" />
                            <span>{video.channelTitle}</span>
                          </span>
                        )}
                        {video.keyword.split(',').map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium border border-slate-200/60"
                          >
                            #{kw.trim()}
                          </span>
                        ))}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                        {video.title}
                      </h4>

                      {/* Claude Review */}
                      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-slate-800 flex items-start gap-2 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="line-clamp-3 leading-relaxed font-medium">{video.claudeReview}</p>
                          {video.claudeReason && (
                            <p className="text-[10px] text-amber-800/80 mt-1">
                              근거: {video.claudeReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3 font-mono font-medium">
                        <span className="flex items-center gap-1 text-slate-800 font-bold">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {formatNumberWithCommas(video.viewCount)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                          {video.likeCount !== null && video.likeCount !== undefined ? (
                            formatNumberWithCommas(video.likeCount)
                          ) : (
                            <span className="text-slate-400 text-[11px]" title="좋아요 수 미제공(비공개)">미제공</span>
                          )}
                        </span>
                      </div>
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold hover:underline"
                      >
                        YouTube 열기 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Verification & Direct Download Bar */}
        <div className="p-3.5 px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">12개 지정 열 완벽 구성:</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              수집일 · 키워드 · 영상 제목 · 썸네일 URL · 영상 URL · 영상 ID · 조회수 · 좋아요수 · 업로드 날짜 · 영상 길이 · Claude 한줄평 · Claude 관련도 점수
            </span>
          </div>
          <button
            type="button"
            onClick={() => exportVideosToExcel(videos, channelTitle)}
            className="text-emerald-700 font-bold hover:text-emerald-800 hover:underline flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            엑셀 파일(.xlsx)로 내려받기
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
