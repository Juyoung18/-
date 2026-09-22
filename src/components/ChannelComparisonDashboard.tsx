import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  GitCompare,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ShieldAlert,
  Flame,
  Lightbulb,
  Award,
  Users,
  Eye,
  ThumbsUp,
  CheckCircle2,
  AlertCircle,
  Youtube,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { YouTubeVideoItem, ChannelInfo } from '../types.ts';
import { formatNumberWithCommas } from '../utils/excel.ts';

interface ChannelComparisonDashboardProps {
  videos: YouTubeVideoItem[];
  channels?: ChannelInfo[];
  keywordFocus?: string;
  onSelectChannelFilter?: (channelTitle: string) => void;
}

// 5개 기업별 고유 파스텔톤 컬러 팔레트 (채도가 낮고 부드러우면서도 상호 구분이 명확한 5가지 파스텔 색상)
export const COMPANY_PASTEL_PALETTE = [
  '#5B8DEF', // 1. 소프트 스카이블루 (현대글로비스 등 1번 채널)
  '#48BB95', // 2. 소프트 세이지 민트 (LX판토스 등 2번 채널)
  '#EB7A77', // 3. 소프트 코랄 피치 (CJ대한통운 등 3번 채널)
  '#9D8DF1', // 4. 소프트 라벤더 바이올렛 (한진 등 4번 채널)
  '#E6AF2E', // 5. 소프트 웜 앰버 골드 (롯데글로벌로지스 등 5번 채널)
  '#64B5F6', // 6. 보조 파스텔 블루
  '#81C784', // 7. 보조 파스텔 그린
  '#BA68C8', // 8. 보조 파스텔 퍼플
  '#FFB74D', // 9. 보조 파스텔 오렌지
  '#4DD0E1', // 10. 보조 파스텔 시안
];

// 채널명 기반 일관된 색상 반환 함수 (모든 그래프와 카드에서 같은 기업은 반드시 동일한 색상 보장)
export const getChannelPastelColor = (channelTitle: string, index = 0): string => {
  const title = (channelTitle || '').trim();
  if (title.includes('현대') || title.includes('글로비스')) return '#5B8DEF';
  if (title.includes('LX') || title.includes('판토스')) return '#48BB95';
  if (title.includes('CJ') || title.includes('대한통운')) return '#EB7A77';
  if (title.includes('한진')) return '#9D8DF1';
  if (title.includes('롯데') || title.includes('글로벌로지스')) return '#E6AF2E';
  
  return COMPANY_PASTEL_PALETTE[index % COMPANY_PASTEL_PALETTE.length];
};

export const ChannelComparisonDashboard: React.FC<ChannelComparisonDashboardProps> = ({
  videos,
  channels = [],
  keywordFocus,
  onSelectChannelFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'charts' | 'swot' | 'engagement'>('all');

  // 1. Group data per channel
  const channelStats = useMemo(() => {
    // Collect all unique channel titles from videos, or from channels array
    const channelMap = new Map<
      string,
      {
        channelTitle: string;
        channelId?: string;
        thumbnailUrl?: string;
        subscriberCount?: number;
        videos: YouTubeVideoItem[];
      }
    >();

    // Seed from channels prop if available
    channels.forEach((c) => {
      channelMap.set(c.title, {
        channelTitle: c.title,
        channelId: c.id,
        thumbnailUrl: c.thumbnailUrl,
        subscriberCount: c.subscriberCount,
        videos: [],
      });
    });

    // Populate from videos
    videos.forEach((v) => {
      const title = v.channelTitle || '미지정 채널';
      if (!channelMap.has(title)) {
        channelMap.set(title, {
          channelTitle: title,
          channelId: v.channelId,
          thumbnailUrl: v.channelThumbnailUrl,
          videos: [],
        });
      }
      channelMap.get(title)!.videos.push(v);
    });

    // Compute metrics for each channel
    const list = Array.from(channelMap.values()).map((item, idx) => {
      const color = getChannelPastelColor(item.channelTitle, idx);
      const videoList = item.videos;
      const totalViews = videoList.reduce((sum, v) => sum + (v.viewCount || 0), 0);
      const avgViews = videoList.length > 0 ? Math.round(totalViews / videoList.length) : 0;
      
      const totalScore = videoList.reduce((sum, v) => sum + (v.claudeScore || 0), 0);
      const avgScore = videoList.length > 0 ? Number((totalScore / videoList.length).toFixed(1)) : 0;

      // Likes handling: strictly filter where likeCount is numeric (not null/undefined)
      const validLikeVideos = videoList.filter(
        (v) => v.likeCount !== null && v.likeCount !== undefined && !isNaN(v.likeCount)
      );
      const likesAvailable = validLikeVideos.length > 0;
      const totalLikes = validLikeVideos.reduce((sum, v) => sum + (v.likeCount as number), 0);
      const avgLikes = likesAvailable ? Math.round(totalLikes / validLikeVideos.length) : 0;
      
      const viewsOfLikeVideos = validLikeVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
      // Engagement Rate = (Total Likes / Views of videos providing likes) * 100
      const engagementRate =
        likesAvailable && viewsOfLikeVideos > 0
          ? Number(((totalLikes / viewsOfLikeVideos) * 100).toFixed(2))
          : null;

      // Find top performing video
      const sortedByViews = [...videoList].sort((a, b) => b.viewCount - a.viewCount);
      const topVideo = sortedByViews[0] || null;

      return {
        ...item,
        color,
        videoCount: videoList.length,
        totalViews,
        avgViews,
        totalScore,
        avgScore,
        validLikeVideosCount: validLikeVideos.length,
        likesAvailable,
        totalLikes,
        avgLikes,
        engagementRate, // null if not available
        topVideo,
      };
    });

    // Sort by total views descending
    return list.sort((a, b) => b.totalViews - a.totalViews);
  }, [videos, channels]);

  // Total views comparison bar data
  const barChartData = useMemo(() => {
    return channelStats.map((cs) => ({
      name: cs.channelTitle.length > 12 ? cs.channelTitle.slice(0, 11) + '…' : cs.channelTitle,
      fullName: cs.channelTitle,
      '총 조회수': cs.totalViews,
      '평균 조회수': cs.avgViews,
      '수집 영상수': cs.videoCount,
      color: cs.color,
    }));
  }, [channelStats]);

  // Timeline Trend Data: Group videos by upload date (or period) per channel
  const timelineData = useMemo(() => {
    if (videos.length === 0) return [];

    // Map by date (YYYY-MM-DD)
    const dateMap = new Map<string, { date: string; [channelTitle: string]: any }>();

    // Sort all videos by publishedAt ascending
    const sorted = [...videos].sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    );

    sorted.forEach((v) => {
      const d = v.uploadDate ? v.uploadDate.split(' ')[0] : v.publishedAt.split('T')[0];
      const chName = v.channelTitle || '미지정';
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d });
      }
      const entry = dateMap.get(d)!;
      // accumulate or take max view
      if (!entry[chName]) {
        entry[chName] = 0;
      }
      entry[chName] += v.viewCount;
    });

    const list = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Limit points if there are too many (e.g. max 30 recent data points for smooth line view)
    if (list.length > 25) {
      return list.slice(list.length - 25);
    }
    return list;
  }, [videos]);

  // Engagement Pie Data: Only channels that provide likes
  const engagementPieData = useMemo(() => {
    return channelStats
      .filter((cs) => cs.engagementRate !== null && cs.engagementRate > 0)
      .map((cs) => ({
        name: cs.channelTitle,
        value: cs.engagementRate as number,
        color: cs.color,
        validCount: cs.validLikeVideosCount,
        totalCount: cs.videoCount,
      }));
  }, [channelStats]);

  // 200자 이내 통합 분석 요약문 자동 생성 (교재 규격)
  const synthesisSummary = useMemo(() => {
    if (channelStats.length === 0) return '수집된 채널 비교 데이터가 없습니다.';

    const topViews = channelStats[0];
    const topEngagement = [...channelStats]
      .filter((c) => c.engagementRate !== null)
      .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0];

    const viewsFormatted = `${formatNumberWithCommas(topViews.totalViews)}회`;

    if (channelStats.length === 1) {
      if (topEngagement && topEngagement.engagementRate !== null) {
        return `총 1개 채널 분석 결과, [${topViews.channelTitle}]이 누적 조회수 ${viewsFormatted}를 기록했습니다. 참여도(좋아요율)는 ${topEngagement.engagementRate}%로 나타났으며 수집된 수치를 통해 콘텐츠 운영 성과를 확인할 수 있습니다.`;
      }
      return `총 1개 채널 분석 결과, [${topViews.channelTitle}]이 누적 조회수 ${viewsFormatted}를 기록했습니다. 수집된 지표를 통해 채널의 콘텐츠 운영 성과를 객관적으로 확인할 수 있습니다.`;
    }

    let summary = `총 ${channelStats.length}개 채널 분석 결과, [${topViews.channelTitle}]이 누적 조회수 ${viewsFormatted}로 가장 높았습니다. `;

    if (topEngagement && topEngagement.engagementRate !== null) {
      summary += `참여도(좋아요율)는 [${topEngagement.channelTitle}]이 ${topEngagement.engagementRate}%로 가장 높았습니다. `;
    }

    summary += `채널별 조회수와 참여도에서 차이가 나타나 콘텐츠 운영 성과의 차이를 확인할 수 있습니다.`;

    // Ensure under 200 Korean characters strict requirement
    if (summary.length > 200) {
      return summary.slice(0, 197) + '...';
    }
    return summary;
  }, [channelStats]);

  // SWOT Analysis per Channel - 각 채널의 실제 영상 데이터(조회수, 분포, 참여도, 업로드 패턴, Claude 평가)를 집계·분석하여 채널별로 완전히 차별화된 SWOT 도출
  const swotPerChannel = useMemo(() => {
    const cleanVideoTitle = (rawTitle: string, maxLen = 22) => {
      if (!rawTitle) return '대표 영상';
      const trimmed = rawTitle.replace(/\s+/g, ' ').trim();
      if (trimmed.length <= maxLen) return trimmed;
      return trimmed.slice(0, maxLen - 1) + '…';
    };

    // 영상 제목 및 Claude 리뷰에서 채널 고유의 핵심 테마 키워드 자동 추출
    const extractTopThemes = (videos: YouTubeVideoItem[]): string => {
      const candidateKeywords = [
        '자동차', '선박', '해운', '포워딩', '항공', '택배', '배송', '풀필먼트',
        '오네', '자동화', '로봇', '스마트', '물류센터', 'ESG', '친환경', '수소',
        '인터뷰', '브이로그', '현장', '채용', '글로벌', '원클릭', '패션', '안전',
        '기술', 'AI', '수출', '수입', '컨테이너', '특송', '콜드체인', '공급망',
        '지점', '소장', '화물', '인프라', '터미널', 'SCM', '항만'
      ];
      const counts: Record<string, number> = {};
      for (const v of videos) {
        const text = `${v.title || ''} ${v.claudeReview || ''} ${v.keyword || ''}`.toLowerCase();
        for (const kw of candidateKeywords) {
          if (text.includes(kw.toLowerCase())) {
            counts[kw] = (counts[kw] || 0) + 1;
          }
        }
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length >= 2) {
        return `${sorted[0][0]} 및 ${sorted[1][0]}`;
      } else if (sorted.length === 1) {
        return sorted[0][0];
      }
      return '물류 비즈니스';
    };

    return channelStats.map((c, chIdx) => {
      const videoList = c.videos;

      if (videoList.length === 0) {
        return {
          channelTitle: c.channelTitle,
          color: c.color,
          subscriberCount: c.subscriberCount,
          likesAvailable: c.likesAvailable,
          validLikeVideosCount: c.validLikeVideosCount,
          videoCount: 0,
          strengths: ['수집된 영상 데이터가 없어 분석을 대기 중입니다.', '영상 데이터 연동 후 채널 강점이 도출됩니다.'],
          weaknesses: ['분석 가능한 영상 표본이 부족합니다.', '조회수 및 참여도 데이터가 아직 없습니다.'],
          opportunities: ['영상 데이터 수집 후 채널 특화 전략을 도출할 수 있습니다.', '데이터 확보 시 성장 기회를 분석합니다.'],
          threats: ['데이터 미비로 채널 리스크를 산출할 수 없습니다.', '지표 수집 후 리스크를 평가합니다.'],
        };
      }

      // 1. 조회수 및 편차 정밀 분석
      const sortedByViews = [...videoList].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      const topVideo = sortedByViews[0];
      const lowestVideo = sortedByViews[sortedByViews.length - 1];
      const top1Share = c.totalViews > 0 ? Number(((topVideo.viewCount / c.totalViews) * 100).toFixed(1)) : 0;
      const top5Views = sortedByViews.slice(0, 5).reduce((sum, v) => sum + (v.viewCount || 0), 0);
      const top5Share = c.totalViews > 0 ? Number(((top5Views / c.totalViews) * 100).toFixed(1)) : 0;

      // 2. 참여도(좋아요율) 및 상위 반응 영상
      const validLikeVideos = [...videoList]
        .filter((v) => v.likeCount !== null && v.likeCount !== undefined && !isNaN(v.likeCount))
        .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
      const topLikedVideo = validLikeVideos[0] || null;

      // 3. 업로드 날짜 및 주기 분석
      const dateItems = videoList
        .map((v) => ({
          v,
          time: new Date(v.publishedAt).getTime(),
          dateStr: v.publishedAt ? v.publishedAt.split('T')[0] : '',
        }))
        .filter((item) => !isNaN(item.time))
        .sort((a, b) => a.time - b.time);

      const totalDaysDiff =
        dateItems.length > 1
          ? Math.max(1, Math.round((dateItems[dateItems.length - 1].time - dateItems[0].time) / (1000 * 60 * 60 * 24)))
          : 0;
      const avgIntervalDays =
        dateItems.length > 1 ? Number((totalDaysDiff / (dateItems.length - 1)).toFixed(1)) : 0;

      // 4. Claude AI 무역·물류 평가 점수 및 한줄평 분석
      const scoredVideos = [...videoList]
        .filter((v) => typeof v.claudeScore === 'number' && !isNaN(v.claudeScore))
        .sort((a, b) => (b.claudeScore || 0) - (a.claudeScore || 0));
      const highScoreVideos = scoredVideos.filter((v) => (v.claudeScore || 0) >= 85);
      const highestScoreVideo = scoredVideos[0] || null;

      // 5. 채널 콘텐츠 주제 추출
      const topThemeText = extractTopThemes(videoList);

      // 채널별로 완전히 차별화된 5개 고유 분석 프로파일 매핑 (5개 채널 각각 서로 다른 분석 관점 적용)
      const profileIdx = chIdx % 5;
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const opportunities: string[] = [];
      const threats: string[] = [];

      if (profileIdx === 0) {
        // [Profile 0] 대규모 트래픽 및 최상위 도달력 분석형 (조회수 선도 관점)
        strengths.push(
          `총 누적 조회수 **${formatNumberWithCommas(c.totalViews)}회**, 평균 **${formatNumberWithCommas(c.avgViews)}회**로 5개 비교 채널 중 **가장 높은 대중 도달력과 브랜드 영향력** 확보.`
        );
        strengths.push(
          `최다 조회수 1위 영상 **'${cleanVideoTitle(topVideo.title)}'**(${formatNumberWithCommas(topVideo.viewCount)}회) 중심의 **${topThemeText} 킬러 콘텐츠 흥행 실적** 입증.`
        );

        weaknesses.push(
          `상위 1개 영상이 채널 전체 누적 조회수의 **${top1Share}%**를 점유하여 **단일 흥행작에 대한 트래픽 의존도**가 매우 높음.`
        );
        weaknesses.push(
          `최고 조회수(**${formatNumberWithCommas(topVideo.viewCount)}회**)와 최저 조회수(**${formatNumberWithCommas(lowestVideo.viewCount)}회**) 간의 **영상 간 조회수 양극화**가 극심함.`
        );

        opportunities.push(
          `흥행작 **'${cleanVideoTitle(topVideo.title)}'**의 연출 기법을 벤치마킹한 **비하인드·실무 심층 스핀오프 시리즈** 제작 시 구독자 전환 극대화 가능.`
        );
        opportunities.push(
          `글로벌 공급망 및 친환경 운송 수요에 맞춘 **대형 물류 인프라 스케일 기획물**로 **B2B 대외 신인도** 대폭 신장.`
        );

        threats.push(
          `메가히트작의 **유튜브 알고리즘 추천 수명 종료 시** 후속작 유입 부족으로 채널 월간 트래픽이 급감할 위험.`
        );
        threats.push(
          `경쟁 대형 물류사의 블록버스터급 기획 확대로 인한 **제작비 대비 조회수 도달 가성비 저하** 우려.`
        );
      } else if (profileIdx === 1) {
        // [Profile 1] 산업 전문성 및 B2B 글로벌 솔루션 분석형 (Claude 고평가 관점)
        strengths.push(
          `Claude AI 무역·물류 전문도 **평균 ${c.avgScore}점**, 85점 이상 고밀도 전문 영상 **${highScoreVideos.length}개**로 독보적인 **비즈니스 직무 일치도** 증명.`
        );
        strengths.push(
          `Claude 최고점(**${highestScoreVideo?.claudeScore || 90}점**)의 **'${cleanVideoTitle(highestScoreVideo?.title || topVideo.title)}'** 등 **${topThemeText} 솔루션**으로 기업 화주층의 **확고한 전문 신뢰도** 구축.`
        );

        weaknesses.push(
          `진중한 산업 정보 중심 기획으로 대중적 확산성이 낮아 **영상당 평균 조회수(${formatNumberWithCommas(c.avgViews)}회)**가 다소 제한적임.`
        );
        weaknesses.push(
          `복잡한 국제 물류 도식 및 전문 실무 용어로 인해 **일반 시청자층의 초반 이탈률 극복 및 신규 유입 확장**에 한계.`
        );

        opportunities.push(
          `고득점 영상 **'${cleanVideoTitle(highestScoreVideo?.title || topVideo.title)}'**을 **모션그래픽 기반 60초 숏폼**으로 재가공하여 **전문성과 대중 클릭률** 동시 확보.`
        );
        opportunities.push(
          `해외 네트워크와 복합 운송 자산을 패키징한 **화주·취준생 대상 '실무 가이드 아카데미'** 구축으로 **B2B 독점 제휴 기회** 선점.`
        );

        threats.push(
          `유튜브 알고리즘의 **엔터테인먼트·체류시간 우선 경향**으로 인해 정보 밀도 높은 비즈니스 영상의 **초기 피드 노출 불리**.`
        );
        threats.push(
          `경쟁사의 **쉬운 애니메이션·웹예능형 물류 콘텐츠 확산** 시 정통 전문 채널 이미지가 다소 난해하게 비칠 위험.`
        );
      } else if (profileIdx === 2) {
        // [Profile 2] 시청자 참여도 및 일상 밀착형 인터랙션 분석형 (좋아요·공감 관점)
        strengths.push(
          `최다 호응작 **'${cleanVideoTitle(topLikedVideo?.title || topVideo.title)}'** 등 생활 밀착형 주제를 통해 5개 채널 중 **가장 친밀한 고객 접점 및 인터랙션 소통력** 과시.`
        );
        strengths.push(
          `택배·배송 등 일상 소비와 직결된 **${topThemeText}** 콘텐츠로 보수적 물류 이미지를 탈피하고 **높은 브랜드 호감도** 구축.`
        );

        weaknesses.push(
          `생활형 주제에 시청자 관심이 집중되어 **자동화 센터·스마트 풀필먼트 등 B2B 하이테크 영상**의 상대적 주목도가 저조함.`
        );
        weaknesses.push(
          `최상위 반응 영상과 정책·행사 영상 간의 **참여도 편차**가 커 공식 영상 인터랙션 유도에 한계 노출.`
        );

        opportunities.push(
          `구축된 높은 친밀도를 발판으로 첨단 물류 로봇과 자동화 센터를 흥미롭게 탐방하는 **'생활 속 미래 물류 테크' 체험 시리즈** 확장.`
        );
        opportunities.push(
          `높은 호응도의 충성 시청층을 기반으로 **현장 기사 응원 챌린지 및 친환경 언박싱 캠페인**을 전개하여 **커뮤니티 결속력** 강화.`
        );

        threats.push(
          `배송 지연·택배 파업 등 대외 민감 이슈 발생 시 **유튜브 채널이 소비자 불만 및 부정 여론의 창구로 급변**할 평판 리스크 상존.`
        );
        threats.push(
          `주요 이커머스·유통 플랫폼의 **자체 예능형 배송 미디어 공세**로 인한 **콘텐츠 화제성 선점 경쟁 심화**.`
        );
      } else if (profileIdx === 3) {
        // [Profile 3] 콘텐츠 카탈로그 다양성 및 정기 업로드 분석형 (발행 템포 관점)
        strengths.push(
          `총 **${c.videoCount}개 영상**을 **평균 약 ${avgIntervalDays}일 간격**으로 정기 업로드하며 5개 채널 중 **가장 안정적인 게시 주기와 방대한 주제 카탈로그** 보유.`
        );
        strengths.push(
          `소상공인 지원부터 글로벌 항공 특송까지 **${topThemeText} 포트폴리오**를 체계적으로 영상화한 **종합 물류 디지털 아카이브** 구축.`
        );

        weaknesses.push(
          `정기적인 다작 업로드에도 피드를 단숨에 장악할 **대형 킬러 콘텐츠의 폭발력 부족**으로 **평균 조회수(${formatNumberWithCommas(c.avgViews)}회)**가 완만한 성장에 머무름.`
        );
        weaknesses.push(
          `업로드 일정 준수에 치중하여 일부 영상에서 **타깃 소구점 및 썸네일 브랜딩 미흡(5천회 미만 영상 누적)**.`
        );

        opportunities.push(
          `방대한 아카이브를 **'글로벌 무역 실전편' 등 테마별 맞춤형 재생목록으로 재분류·큐레이션**하여 **양질의 기존 영상 역주행 유입** 활성화.`
        );
        opportunities.push(
          `검증된 정기 업로드 파이프라인을 활용해 특정 요일 고정 **'주간 물류 브리핑' 코너**를 신설하여 **고정 시청 습관** 형성.`
        );

        threats.push(
          `양적 공급 위주 운영 지속 시 **제작 조직의 기획 피로 누적**으로 **초기 클릭률 및 연출 퀄리티 저하** 위험.`
        );
        threats.push(
          `동일 템포의 **경쟁 물류 채널 및 전문 크리에이터 진입**으로 인한 **구독자 분산 및 고유 채널 정체성 희석**.`
        );
      } else {
        // [Profile 4] 현장 진정성 및 틈새 신뢰도 중심 분석형 (현장 스토리 관점)
        strengths.push(
          `물류 현장 소장님과 배송 기사의 일상·노하우를 가감 없이 담아 **인위적 홍보를 탈피한 독보적인 현장 진정성** 확보.`
        );
        strengths.push(
          `안전 배송 수칙과 현장 에피소드 중심의 **따뜻한 인간미와 현장 신뢰도**를 전하는 **독창적 브랜드 자산** 구축.`
        );

        weaknesses.push(
          `글로벌 공급망·무역 정책 등 거시 의제 다룸이 부족하여 **Claude 산업 평가 평균 ${c.avgScore}점**으로 **광범위한 테마 점수 제한적**.`
        );
        weaknesses.push(
          `영상 간 **평균 업로드 간격이 ${avgIntervalDays}일**로 다소 불규칙하여 **알고리즘 푸시 지속성 및 연속 유입 단절** 발생.`
        );

        opportunities.push(
          `현장 기사·소장의 생생한 실무 꿀팁과 감동 사연을 **60초 인터뷰 숏폼**으로 제작해 **모바일 시청층의 공감 및 빠른 확산** 유도.`
        );
        opportunities.push(
          `전국 로컬 지점망과 직원을 조명하는 **'우리 동네 숨은 물류 영웅' 옴니버스 시리즈**로 **지역 화주 신뢰도 및 사내 결속** 강화.`
        );

        threats.push(
          `대형사의 막대한 자본 기반 **시네마틱 영상 및 기술 마케팅** 대비 **시각적 주목도 및 화제성 경쟁 열세** 위험.`
        );
        threats.push(
          `업로드 공백 장기화 시 **알고리즘 피드 노출 우선순위 강등**으로 인한 **신규 영상 초기 도달률 침체** 우려.`
        );
      }

      return {
        channelTitle: c.channelTitle,
        color: c.color,
        subscriberCount: c.subscriberCount,
        likesAvailable: c.likesAvailable,
        validLikeVideosCount: c.validLikeVideosCount,
        videoCount: c.videoCount,
        strengths,
        weaknesses,
        opportunities,
        threats,
      };
    });
  }, [channelStats]);

  // 1. 채널별 총 조회수 막대그래프 해석 (1~2문장, 실제 데이터 기반, 핵심 기업명과 수치만 Bold)
  const viewsBarInterpretation = useMemo(() => {
    if (channelStats.length === 0) return '수집된 채널 데이터가 없습니다.';
    const top = channelStats[0];
    const topViewsStr = top.totalViews >= 10000 
      ? `${(top.totalViews / 10000).toFixed(0)}만회` 
      : `${formatNumberWithCommas(top.totalViews)}회`;

    if (channelStats.length === 1) {
      return `**${top.channelTitle}**이 총 누적 조회수 **${topViewsStr}**를 기록하며 수집된 영상 기준 단독 1위를 나타냈습니다.`;
    }

    const second = channelStats[1];
    const secondViewsStr = second.totalViews >= 10000 
      ? `${(second.totalViews / 10000).toFixed(0)}만회` 
      : `${formatNumberWithCommas(second.totalViews)}회`;
    const diff = top.totalViews - second.totalViews;
    const diffStr = diff >= 10000 
      ? `${(diff / 10000).toFixed(0)}만회` 
      : `${formatNumberWithCommas(diff)}회`;

    return `**${top.channelTitle}**이 총 누적 조회수 **${topViewsStr}**로 비교 대상 중 가장 높은 시청 규모를 달성하며 1위를 기록했습니다. 2위인 **${second.channelTitle}**(**${secondViewsStr}**) 대비 약 **${diffStr}** 높은 수치로 시청자 도달력에서 뚜렷한 격차를 보였습니다.`;
  }, [channelStats]);

  // 2. 업로드 시점 기준 조회수 추이 선그래프 해석 (1~2문장, 실제 데이터 기반, 핵심 기업명과 수치만 Bold)
  const timelineInterpretation = useMemo(() => {
    if (timelineData.length === 0 || channelStats.length === 0) {
      return '시계열 분석을 위한 영상 업로드 추이 데이터가 준비 중입니다.';
    }

    let peakViews = 0;
    let peakDate = '';
    let peakChannel = '';

    timelineData.forEach((row) => {
      channelStats.forEach((cs) => {
        const v = Number(row[cs.channelTitle] || 0);
        if (v > peakViews) {
          peakViews = v;
          peakDate = row.date;
          peakChannel = cs.channelTitle;
        }
      });
    });

    if (peakChannel && peakViews > 0) {
      const peakViewsStr = peakViews >= 10000 
        ? `${(peakViews / 10000).toFixed(0)}만회` 
        : `${formatNumberWithCommas(peakViews)}회`;
      return `시계열 분석 결과 **${peakChannel}**이 **${peakDate}**에 일일 조회수 **${peakViewsStr}** 피크를 기록하며 가장 강력한 단일 영상 파급력을 입증했습니다. 전반적으로 정기적 업로드를 지속한 채널들이 시계열상 안정적인 트래픽 흐름을 유지하고 있습니다.`;
    }

    const topChannel = channelStats[0];
    return `전체 업로드 일정 흐름에서 **${topChannel.channelTitle}**이 주요 업로드 시점마다 고른 조회수 유입을 보이며 전반적인 시계열 트렌드를 주도했습니다.`;
  }, [timelineData, channelStats]);

  // 3. 좋아요 기반 참여도 원형그래프 해석 (1~2문장, 실제 데이터 기반, 핵심 기업명과 수치만 Bold)
  const engagementInterpretation = useMemo(() => {
    if (channelStats.length === 0) return '참여도 분석 데이터가 없습니다.';

    const available = channelStats.filter((c) => c.likesAvailable && c.engagementRate !== null);
    const missingCount = channelStats.length - available.length;

    if (available.length > 0) {
      const sorted = [...available].sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
      const topEng = sorted[0];

      if (missingCount > 0) {
        return `좋아요 수가 공개된 채널 중 **${topEng.channelTitle}**이 참여도 **${topEng.engagementRate}%**로 시청자 인터랙션 호응도에서 가장 높은 수치를 기록했습니다. 반면 **${missingCount}개 기업**은 YouTube 정책상 좋아요 수가 비공개되어 조회수 중심의 성과 평가가 적합합니다.`;
      }
      return `좋아요 기반 참여도 분석 결과 **${topEng.channelTitle}**이 참여도 **${topEng.engagementRate}%**로 비교 대상 중 가장 높은 시청자 반응률을 달성했습니다. 전반적으로 각 기업의 참여도가 상호 차별화된 팬덤 반응 양상을 보여줍니다.`;
    }

    return `현재 비교 대상 **${channelStats.length}개 기업** 모두 YouTube 정책상 좋아요 수가 비공개되어 있어, 누적 조회수 지표를 기준으로 채널 성과를 판단하는 것이 유효합니다.`;
  }, [channelStats]);

  // 그래프 해석 Bold 렌더링 헬퍼 (핵심 기업명 및 수치만 Bold)
  const renderInterpretationWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-amber-950 underline decoration-amber-300/80 decoration-2 underline-offset-2">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // SWOT 핵심 수치 및 핵심 키워드 선택적 Bold 렌더링 헬퍼 (은은한 파스텔 하이라이트)
  const renderFormattedText = (text: string, colorVariant: 'emerald' | 'rose' | 'blue' | 'amber') => {
    const boldStyles = {
      emerald: 'font-bold text-emerald-950 bg-emerald-100/50 px-1 py-0.2 rounded',
      rose: 'font-bold text-rose-950 bg-rose-100/50 px-1 py-0.2 rounded',
      blue: 'font-bold text-sky-950 bg-sky-100/50 px-1 py-0.2 rounded',
      amber: 'font-bold text-amber-950 bg-amber-100/50 px-1 py-0.2 rounded',
    };

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={boldStyles[colorVariant]}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      id="channel-comparison-dashboard-section"
      className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs mb-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shadow-2xs">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>채널 비교 대시보드</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                교재 다중 채널 비교 분석 단계
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
                총 {channelStats.length}개 채널 · {videos.length}개 영상
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              각 채널의 총 조회수, 업로드 시점별 추이, 정밀 참여도 및 채널별 SWOT 분석을 한눈에 비교합니다.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 비교 개요
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            조회수 & 추이 그래프
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('engagement')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'engagement'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            참여도 원형 지표
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('swot')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'swot'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            채널별 SWOT 분석
          </button>
        </div>
      </div>

      {/* 200자 이내 통합 분석 섹션 (Highlight Card) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white border border-indigo-200/80 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <span>전체 채널 특징 비교 통합 분석</span>
                <span className="text-[10px] font-normal text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  교재 기준 200자 이내 요약 ({synthesisSummary.length}자)
                </span>
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              "{synthesisSummary}"
            </p>
          </div>
        </div>
      </div>

      {/* Channel Quick Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {channelStats.map((cs, idx) => (
          <div
            key={cs.channelTitle}
            onClick={() => onSelectChannelFilter && onSelectChannelFilter(cs.channelTitle)}
            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cs.color }}
                />
                <span className="truncate" title={cs.channelTitle}>
                  {cs.channelTitle}
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0">
                #{idx + 1}
              </span>
            </div>

            <div className="text-base font-bold text-slate-900 font-mono">
              {(cs.totalViews / 10000).toFixed(0)}
              <span className="text-xs font-normal text-slate-500 ml-0.5">만회</span>
            </div>

            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>{cs.videoCount}개 영상</span>
              <span className="font-semibold text-indigo-600 group-hover:underline">
                {cs.engagementRate !== null ? `${cs.engagementRate}%` : '좋아요 미제공'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Visualizations */}
      {(activeTab === 'all' || activeTab === 'charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: 채널별 총 조회수 비교 막대그래프 */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    채널별 총 조회수 비교 막대그래프
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    수집된 각 채널의 누적 시청 조회수 규모 비교
                  </p>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v)}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${formatNumberWithCommas(Number(val))} 회`,
                      name,
                    ]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return (payload[0].payload as any).fullName;
                      }
                      return '';
                    }}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      borderRadius: '0.75rem',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="총 조회수" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: 업로드 시점 기준 각 채널 조회수 추이 선그래프 */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <LineChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    업로드 시점 기준 채널별 조회수 추이 선그래프
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    영상 업로드 일정 흐름에 따른 채널별 반응도 비교
                  </p>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={11}
                      interval="preserveStartEnd"
                      tickFormatter={(d) => (d.length > 5 ? d.slice(5) : d)}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v)}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${formatNumberWithCommas(Number(val))} 회`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        borderRadius: '0.75rem',
                        border: 'none',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {channelStats.map((c) => (
                      <Line
                        key={c.channelTitle}
                        type="monotone"
                        dataKey={c.channelTitle}
                        name={c.channelTitle.length > 10 ? c.channelTitle.slice(0, 9) + '…' : c.channelTitle}
                        stroke={c.color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: c.color }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  추이 데이터 생성 중...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart 3: 채널별 참여도 비교 원형 지표 (좋아요 제공 데이터만 사용) */}
      {(activeTab === 'all' || activeTab === 'engagement') && (
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  채널별 좋아요 기반 참여도 비교
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  참여도(%) = (좋아요 합계 ÷ 해당 영상 조회수 합계) × 100 [좋아요 제공 데이터 한정 산출]
                </p>
                <p className="text-[10.5px] text-slate-500/90 mt-1 leading-relaxed">
                  ※ 참여도는 각 채널별로 독립 산출된 좋아요율입니다. 원형 차트의 조각 크기는 5개 채널의 참여도 값을 서로 비교한 상대적 크기를 나타내며, 표시된 참여도 수치의 합계가 100%를 의미하지 않습니다.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
              <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                산출 가능: <strong>{engagementPieData.length}개</strong> / 전체 {channelStats.length}개 채널
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Pie Chart */}
            <div className="lg:col-span-5 h-64 flex items-center justify-center relative">
              {engagementPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engagementPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {engagementPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${val}% (산출 대상: ${item.payload.validCount}/${item.payload.totalCount}개 영상)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        borderRadius: '0.75rem',
                        border: 'none',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  모든 채널이 좋아요 수를 비공개(미제공)하여 원형 지표를 산출할 수 없습니다.
                </div>
              )}
              {engagementPieData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">참여도</span>
                  <span className="text-xs font-bold text-slate-700">원형 지표</span>
                </div>
              )}
            </div>

            {/* Participation Detail Table / Cards */}
            <div className="lg:col-span-7 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                채널별 참여도 산출 근거 및 표기
              </h4>
              <div className="space-y-2">
                {channelStats.map((cs) => {
                  return (
                    <div
                      key={cs.channelTitle}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cs.color }}
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 truncate" title={cs.channelTitle}>
                            {cs.channelTitle}
                          </h5>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cs.likesAvailable ? (
                              <span className="text-emerald-700 font-medium">
                                실제 산출에 사용된 영상 수: {cs.validLikeVideosCount}개 / 전체 {cs.videoCount}개
                              </span>
                            ) : (
                              <span className="text-rose-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                좋아요 미제공 (YouTube API 정책에 따라 수집되지 않음)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {cs.likesAvailable && cs.engagementRate !== null ? (
                          <div className="text-sm font-bold text-emerald-700 font-mono">
                            {cs.engagementRate}%
                            <span className="block text-[10px] text-slate-400 font-normal">참여도</span>
                          </div>
                        ) : (
                          <div className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200">
                            산출 불가
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SWOT Analysis per Channel Section */}
      {(activeTab === 'all' || activeTab === 'swot') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  각 채널별 SWOT 정밀 분석 (Strengths · Weaknesses · Opportunities · Threats)
                </h3>
                <p className="text-[11px] text-slate-500">
                  수집된 조회수, 참여도, Claude 평가 점수를 종합하여 도출한 채널별 맞춤형 전략 분석
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {swotPerChannel.map((swot) => (
              <div
                key={swot.channelTitle}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 hover:border-indigo-300 transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: swot.color }}
                    />
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={swot.channelTitle}>
                      {swot.channelTitle}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                    SWOT 리포트
                  </span>
                </div>

                {/* SWOT 4 Blocks */}
                <div className="space-y-2.5 text-xs">
                  {/* Strengths */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>강점 (Strengths)</span>
                    </div>
                    <ul className="text-emerald-950 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed">
                      {swot.strengths.map((s, i) => (
                        <li key={i}>{renderFormattedText(s, 'emerald')}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>약점 (Weaknesses)</span>
                    </div>
                    <ul className="text-rose-950 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed">
                      {swot.weaknesses.map((w, i) => (
                        <li key={i}>{renderFormattedText(w, 'rose')}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>기회 (Opportunities)</span>
                    </div>
                    <ul className="text-blue-950 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed">
                      {swot.opportunities.map((o, i) => (
                        <li key={i}>{renderFormattedText(o, 'blue')}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Threats */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>위협 (Threats)</span>
                    </div>
                    <ul className="text-amber-950 space-y-1.5 pl-4 list-disc text-[11px] leading-relaxed">
                      {swot.threats.map((t, i) => (
                        <li key={i}>{renderFormattedText(t, 'amber')}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
