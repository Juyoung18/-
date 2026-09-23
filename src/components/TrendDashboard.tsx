import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Tag,
  Target,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { YouTubeVideoItem } from '../types.ts';
import { formatNumberWithCommas } from '../utils/excel.ts';

interface TrendDashboardProps {
  videos: YouTubeVideoItem[];
  channelTitle: string;
  keywordFocus?: string;
  onFilterKeyword?: (keyword: string) => void;
  onCloseDashboard?: () => void;
}

const SCORE_COLORS = {
  tier1: '#10b981', // 90+ 최우수 (Emerald)
  tier2: '#3b82f6', // 80-89 우수 (Blue)
  tier3: '#f59e0b', // 70-79 양호 (Amber)
  tier4: '#94a3b8', // <70 보통 (Slate)
};

export const TrendDashboard: React.FC<TrendDashboardProps> = ({
  videos,
  channelTitle,
  keywordFocus,
  onFilterKeyword,
  onCloseDashboard,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'views' | 'timeline' | 'distribution'>('views');

  // 1. Overall Stats & Metrics
  const stats = useMemo(() => {
    if (!videos || videos.length === 0) {
      return {
        totalViews: 0,
        avgViews: 0,
        totalLikes: 0,
        avgLikes: 0,
        avgScore: 0,
        highestScoreVideo: null,
        highestViewVideo: null,
        highestEngagementVideo: null,
        likesAvailableCount: 0,
        allLikesMissing: true,
        engagementRateStr: '참여율 산출 불가',
      };
    }

    const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
    const avgViews = Math.round(totalViews / videos.length);
    const totalScore = videos.reduce((sum, v) => sum + (v.claudeScore || 0), 0);
    const avgScore = Math.round(totalScore / videos.length);

    // Filter videos where likeCount is actually provided by YouTube Data API
    const videosWithLikes = videos.filter((v) => v.likeCount !== null && v.likeCount !== undefined);
    const likesAvailableCount = videosWithLikes.length;
    const allLikesMissing = likesAvailableCount === 0;

    let totalLikes = 0;
    let avgLikes = 0;
    let engagementRateStr = '참여율 산출 불가';

    if (!allLikesMissing) {
      totalLikes = videosWithLikes.reduce((sum, v) => sum + (v.likeCount as number), 0);
      avgLikes = Math.round(totalLikes / likesAvailableCount);
      const totalViewsOfLikesVideos = videosWithLikes.reduce((sum, v) => sum + (v.viewCount || 0), 0);
      if (totalViewsOfLikesVideos > 0) {
        engagementRateStr = `${((totalLikes / totalViewsOfLikesVideos) * 100).toFixed(2)}%`;
      } else {
        engagementRateStr = '0.00%';
      }
    }

    const sortedByScore = [...videos].sort((a, b) => b.claudeScore - a.claudeScore);
    const sortedByViews = [...videos].sort((a, b) => b.viewCount - a.viewCount);
    const sortedByEngagement = [...videosWithLikes].sort((a, b) => {
      const rateA = a.viewCount > 0 && a.likeCount !== null ? a.likeCount / a.viewCount : 0;
      const rateB = b.viewCount > 0 && b.likeCount !== null ? b.likeCount / b.viewCount : 0;
      return rateB - rateA;
    });

    return {
      totalViews,
      avgViews,
      totalLikes,
      avgLikes,
      avgScore,
      likesAvailableCount,
      allLikesMissing,
      engagementRateStr,
      highestScoreVideo: sortedByScore[0] || null,
      highestViewVideo: sortedByViews[0] || null,
      highestEngagementVideo: sortedByEngagement[0] || null,
    };
  }, [videos]);

  // 2. Score Distribution (Pie chart)
  const scoreDistribution = useMemo(() => {
    let t1 = 0; // 90+
    let t2 = 0; // 80~89
    let t3 = 0; // 70~79
    let t4 = 0; // <70

    for (const v of videos) {
      const s = v.claudeScore || 0;
      if (s >= 90) t1++;
      else if (s >= 80) t2++;
      else if (s >= 70) t3++;
      else t4++;
    }

    return [
      { name: '최우수 (90~100점)', count: t1, color: SCORE_COLORS.tier1, pct: Math.round((t1 / videos.length) * 100) },
      { name: '우수 (80~89점)', count: t2, color: SCORE_COLORS.tier2, pct: Math.round((t2 / videos.length) * 100) },
      { name: '양호 (70~79점)', count: t3, color: SCORE_COLORS.tier3, pct: Math.round((t3 / videos.length) * 100) },
      { name: '보통 (70점 미만)', count: t4, color: SCORE_COLORS.tier4, pct: Math.round((t4 / videos.length) * 100) },
    ].filter((item) => item.count > 0);
  }, [videos]);

  // 3. Top 8 Videos by ViewCount for Bar Chart
  const topVideosData = useMemo(() => {
    return [...videos]
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 8)
      .map((v, idx) => ({
        index: idx + 1,
        shortTitle: v.title.length > 18 ? v.title.slice(0, 18) + '...' : v.title,
        fullTitle: v.title,
        views: v.viewCount,
        likes: v.likeCount,
        score: v.claudeScore,
      }));
  }, [videos]);

  // 4. Timeline trend (Sorted by date)
  const timelineData = useMemo(() => {
    return [...videos]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .map((v) => ({
        date: v.uploadDate ? v.uploadDate.split(' ')[0] : v.publishedAt.slice(0, 10),
        views: v.viewCount,
        score: v.claudeScore,
        title: v.title,
      }));
  }, [videos]);

  // 5. Keyword & Tag Frequency Analysis
  const tagRankings = useMemo(() => {
    const counts: Record<string, { count: number; totalScore: number }> = {};
    for (const v of videos) {
      const allTags = [...v.tags];
      if (v.keyword) {
        v.keyword.split(/[,#]+/).forEach((k) => {
          const trimmed = k.trim();
          if (trimmed.length > 1) allTags.push(trimmed);
        });
      }
      const uniqueTags = Array.from(new Set(allTags.map((t) => t.trim().toLowerCase()))).filter((t) => t.length > 1);
      for (const tag of uniqueTags) {
        if (!counts[tag]) counts[tag] = { count: 0, totalScore: 0 };
        counts[tag].count += 1;
        counts[tag].totalScore += v.claudeScore || 0;
      }
    }

    return Object.entries(counts)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [videos]);

  return (
    <div className="bg-gradient-to-b from-slate-50/80 via-white to-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{channelTitle} 유튜브 트렌드 분석 대시보드</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {videos.length}개 영상 분석됨
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                수집된 영상의 조회수 성과, Claude AI 관련도 점수 분포 및 키워드 트렌드를 시각적으로 분석합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {keywordFocus && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>포커스: #{keywordFocus}</span>
            </div>
          )}
          {onCloseDashboard && (
            <button
              type="button"
              onClick={onCloseDashboard}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              대시보드 접기
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>총 수집 조회수</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatNumberWithCommas(stats.totalViews)}
            <span className="text-xs font-normal text-slate-500 ml-1">회</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            영상당 평균 <strong className="text-slate-800 font-mono">{formatNumberWithCommas(stats.avgViews)}회</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>평균 Claude 점수</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 flex items-baseline gap-1">
            <span>{stats.avgScore}</span>
            <span className="text-xs font-normal text-slate-500">/ 100점</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            최고 평가: <strong className="text-emerald-700 font-mono">{stats.highestScoreVideo?.claudeScore || 0}점</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>총 좋아요 수</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          {stats.allLikesMissing ? (
            <div>
              <div className="text-lg font-bold font-mono text-slate-500">
                좋아요 수 미제공
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                참여율 산출 불가
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatNumberWithCommas(stats.totalLikes)}
                <span className="text-xs font-normal text-slate-500 ml-1">개</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span>평균 참여율 </span>
                <strong className="text-blue-700 font-mono">{stats.engagementRateStr}</strong>
                {stats.likesAvailableCount < videos.length && (
                  <span className="text-[10px] text-blue-600 block mt-0.5 font-medium">
                    (제공된 {stats.likesAvailableCount}개 영상 기준)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>트렌드 최다 조회</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate leading-snug" title={stats.highestViewVideo?.title}>
            {stats.highestViewVideo?.title || '-'}
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1 font-mono">
            {formatNumberWithCommas(stats.highestViewVideo?.viewCount || 0)}회 조회
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Main Visual Charts (Views Bar / Timeline) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                {activeChartTab === 'views' && '상위 인기 영상 조회수 & Claude 점수 비교'}
                {activeChartTab === 'timeline' && '게시일자별 조회수 및 트렌드 점수 추이'}
                {activeChartTab === 'distribution' && 'Claude 관련도 점수대별 분포 비중'}
              </h4>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveChartTab('views')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeChartTab === 'views' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                상위 영상 조회수
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('timeline')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeChartTab === 'timeline' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                게시 시계열 추이
              </button>
            </div>
          </div>

          <div className="h-68 w-full pt-2 min-w-0" style={{ width: '100%', height: '270px', minHeight: '270px' }}>
            {activeChartTab === 'views' && (
              <ResponsiveContainer width="100%" height={270} minWidth={0} minHeight={250} initialDimension={{ width: 500, height: 270 }}>
                <BarChart data={topVideosData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortTitle"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => (val >= 10000 ? `${Math.round(val / 10000)}만` : val)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1 max-w-xs">
                            <p className="font-bold text-slate-900 line-clamp-2">{data.fullTitle}</p>
                            <p className="text-slate-600">
                              조회수:{' '}
                              <strong className="text-indigo-600 font-mono">
                                {formatNumberWithCommas(data.views)}회
                              </strong>
                            </p>
                            <p className="text-slate-600">
                              좋아요:{' '}
                              <strong className="text-blue-600 font-mono">
                                {data.likes !== null && data.likes !== undefined
                                  ? `${formatNumberWithCommas(data.likes)}개`
                                  : '미제공'}
                              </strong>
                            </p>
                            <p className="text-slate-600">
                              Claude 점수:{' '}
                              <strong className="text-emerald-600 font-mono">{data.score}점</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="views" fill="#6366f1" radius={[6, 6, 0, 0]} name="조회수" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChartTab === 'timeline' && (
              <ResponsiveContainer width="100%" height={270} minWidth={0} minHeight={250} initialDimension={{ width: 500, height: 270 }}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => (val >= 10000 ? `${Math.round(val / 10000)}만` : val)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1 max-w-xs">
                            <p className="font-semibold text-slate-700">{d.date}</p>
                            <p className="font-bold text-slate-900 truncate">{d.title}</p>
                            <p className="text-slate-600">
                              조회수:{' '}
                              <strong className="text-indigo-600 font-mono">{formatNumberWithCommas(d.views)}회</strong>
                            </p>
                            <p className="text-slate-600">
                              Claude 점수:{' '}
                              <strong className="text-emerald-600 font-mono">{d.score}점</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="조회수"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Score Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Claude 점수 등급 분포</h4>
            </div>

            <div className="h-44 w-full relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value}개 영상 (${item.payload.pct}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-900">{stats.avgScore}</span>
                <span className="text-[10px] text-slate-500 font-medium">평균 점수</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {scoreDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <div className="font-mono font-semibold text-slate-800">
                  {item.count}개 ({item.pct}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Insights: Top Keywords & Strategic Takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Keywords Ranking with Interactive Filtering */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900">핵심 트렌드 키워드 & 태그 랭킹</h4>
            </div>
            <span className="text-[11px] text-slate-400">클릭 시 검색 필터 적용</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {tagRankings.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => onFilterKeyword && onFilterKeyword(item.tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer group"
              >
                <span className="font-medium">#{item.tag}</span>
                <span className="px-1 py-0.2 rounded bg-slate-200 group-hover:bg-indigo-200 text-[10px] font-mono text-slate-700 group-hover:text-indigo-900">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Strategic AI Insights */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 p-4 rounded-xl border border-indigo-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-indigo-950">AI 트렌드 요약 & 기획 인사이트</h4>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                상위 점수 영상들의 평균 조회수는{' '}
                <strong className="font-mono text-indigo-900">
                  {formatNumberWithCommas(
                    Math.round(
                      videos.filter((v) => v.claudeScore >= 85).reduce((s, v) => s + v.viewCount, 0) /
                        (videos.filter((v) => v.claudeScore >= 85).length || 1)
                    )
                  )}
                  회
                </strong>
                로 전체 평균 대비 높은 시청자 선호도를 나타냅니다.
              </span>
            </li>
            {keywordFocus && (
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  지정 키워드 <strong className="text-emerald-800">#{keywordFocus}</strong> 중심의 영상이 전체 수집 영상 중{' '}
                  <strong className="font-mono text-emerald-800">
                    {videos.filter((v) => v.keyword.toLowerCase().includes(keywordFocus.toLowerCase())).length}개
                  </strong>
                  로 높은 연관성을 유지하고 있습니다.
                </span>
              </li>
            )}
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                엑셀 다운로드 시 각 영상의 키워드 및 Claude 한줄평, 산출 점수가 포함되어 즉시 보고서로 활용할 수 있습니다.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
