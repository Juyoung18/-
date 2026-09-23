const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('/tmp/fetched_500_data.json', 'utf8'));
const existingHtml = fs.readFileSync('youtube_trend_dashboard_500.html', 'utf8');

// Extract SheetJS
const sheetJsStart = existingHtml.indexOf('/*! xlsx.js');
const sheetJsEnd = existingHtml.indexOf('</script>', sheetJsStart);
const sheetJsCode = existingHtml.slice(sheetJsStart, sheetJsEnd);

// Standard 5 Channels Configuration
const CHANNEL_CONFIGS = [
  { handle: '@pointerTV', title: '포스코인터내셔널', color: '#EB7A77' },
  { handle: '@hyundaiglovis', title: '현대글로비스', color: '#5B8DEF' },
  { handle: '@LXPantos_official', title: 'LX판토스', color: '#48BB95' },
  { handle: '@SamsungTrading', title: '삼성물산 상사부문', color: '#9D8DF1' },
  { handle: '@lotteglogis_TV', title: '롯데글로벌로지스', color: '#E6AF2E' }
];

const allVideos = [];
const channelStats = [];

rawData.forEach((r, idx) => {
  const cfg = CHANNEL_CONFIGS[idx];
  const vids = r.videos.map(v => ({
    ...v,
    channelTitle: cfg.title
  }));
  allVideos.push(...vids);

  const totalViews = vids.reduce((s, v) => s + (v.viewCount || 0), 0);
  const avgViews = Math.round(totalViews / vids.length);
  const totalLikes = vids.reduce((s, v) => s + (v.likeCount || 0), 0);
  const avgLikes = Math.round(totalLikes / vids.length);
  const totalScore = vids.reduce((s, v) => s + (v.claudeScore || 0), 0);
  const avgScore = Number((totalScore / vids.length).toFixed(1));
  const engagementRate = totalViews > 0 ? Number(((totalLikes / totalViews) * 100).toFixed(2)) : 0;
  const topVid = [...vids].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];

  channelStats.push({
    title: cfg.title,
    handle: cfg.handle,
    id: r.channel.id,
    color: cfg.color,
    subscriberCount: parseInt(r.channel.statistics?.subscriberCount || 0, 10),
    videoCount: vids.length,
    totalViews,
    avgViews,
    totalLikes,
    avgLikes,
    totalScore,
    avgScore,
    engagementRate,
    topVideo: topVid
  });
});

// Overall stats
const totalVideosCount = allVideos.length;
const totalViewsAll = channelStats.reduce((s, c) => s + c.totalViews, 0);
const avgViewsAll = Math.round(totalViewsAll / totalVideosCount);
const totalLikesAll = channelStats.reduce((s, c) => s + c.totalLikes, 0);
const avgLikesAll = Math.round(totalLikesAll / totalVideosCount);
const avgEngagementAll = Number(((totalLikesAll / totalViewsAll) * 100).toFixed(2));
const avgScoreAll = Number((channelStats.reduce((s, c) => s + c.avgScore, 0) / channelStats.length).toFixed(1));

// Timeline generation (25 data points across published dates)
const dateMap = new Map();
const sortedAllVideos = [...allVideos].sort(
  (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
);

sortedAllVideos.forEach(v => {
  const d = v.uploadDate ? v.uploadDate.split(' ')[0] : v.publishedAt.split('T')[0];
  const ch = v.channelTitle;
  if (!dateMap.has(d)) {
    dateMap.set(d, { date: d, 포스코인터내셔널: 0, 현대글로비스: 0, LX판토스: 0, '삼성물산 상사부문': 0, 롯데글로벌로지스: 0 });
  }
  const entry = dateMap.get(d);
  entry[ch] = (entry[ch] || 0) + (v.viewCount || 0);
});

let timelineData = Array.from(dateMap.values()).sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

if (timelineData.length > 25) {
  // Sample 25 evenly spaced points
  const step = (timelineData.length - 1) / 24;
  const sampled = [];
  for (let i = 0; i < 25; i++) {
    const idx = Math.min(timelineData.length - 1, Math.round(i * step));
    sampled.push(timelineData[idx]);
  }
  timelineData = sampled;
}

// Format number helpers
const fmt = (n) => Number(n).toLocaleString('ko-KR');
const fmtMan = (n) => (n / 10000).toFixed(0);

// Engagement rank sorted
const engagementRanked = [...channelStats].sort((a, b) => b.engagementRate - a.engagementRate);

// Build SWOT Data
const swotData = [
  {
    title: '포스코인터내셔널',
    color: '#EB7A77',
    strengths: [
      `누적 조회수 <strong>${fmt(channelStats[0].totalViews)}회</strong>(평균 <strong>${fmt(channelStats[0].avgViews)}회</strong>)로 5개 비교 채널 중 <strong>가장 높은 대중 도달력 1위</strong> 달성.`,
      `최다 조회 영상 <strong>'${channelStats[0].topVideo.title.slice(0, 26)}…'</strong>(${fmt(channelStats[0].topVideo.viewCount)}회) 중심의 <strong>브랜드 아이덴티티 킬러 콘텐츠</strong> 성과 입증.`
    ],
    weaknesses: [
      `상위 1개 메가히트 영상이 채널 전체 조회수의 <strong>${((channelStats[0].topVideo.viewCount / channelStats[0].totalViews) * 100).toFixed(1)}%</strong>를 점유하여 <strong>단일 흥행작 의존도</strong>가 높음.`,
      `최고 영상과 일반 실무·IR 영상 간의 <strong>조회수 양극화 편차</strong>가 커 평시 유입 트래픽 유지 보완 필요.`
    ],
    opportunities: [
      `브랜드 필름 흥행작 연출을 벤치마킹한 <strong>글로벌 식량·에너지·친환경 인프라 실무 비하인드 시리즈</strong>로 <strong>구독자 락인</strong> 강화 가능.`,
      `글로벌 공급망 트레이딩 노하우를 패키징한 <strong>B2B 비즈니스 인사이트 콘텐츠</strong>로 기업 신인도 및 취업 브랜딩 제고.`
    ],
    threats: [
      `메가히트 영상의 <strong>유튜브 알고리즘 추천 수명 만료 시</strong> 월간 유입 트래픽 급감 위험.`,
      `글로벌 종합상사 및 원자재 무역 시장의 시황 변동성에 따른 홍보 콘텐츠 관심도 등락 위험.`
    ]
  },
  {
    title: '현대글로비스',
    color: '#5B8DEF',
    strengths: [
      `누적 조회수 <strong>${fmt(channelStats[1].totalViews)}회</strong>(평균 <strong>${fmt(channelStats[1].avgViews)}회</strong>)로 비교 채널 중 <strong>도달력 2위</strong> 기록.`,
      `최다 조회 영상 <strong>'${channelStats[1].topVideo.title.slice(0, 26)}…'</strong>(${fmt(channelStats[1].topVideo.viewCount)}회) 등 <strong>MZ 연계 웹예능형 포맷</strong> 성공.`
    ],
    weaknesses: [
      `웹예능형 콘텐츠에 조회수가 집중되어 <strong>정통 자동차 운반선(PCTC) 및 스마트 해운 인프라 전문 영상</strong>의 상대적 주목도 편차.`,
      `참여도(좋아요율)가 <strong>${channelStats[1].engagementRate}%</strong>로 낮아 시청자 인터랙션 강화 과제 존재.`
    ],
    opportunities: [
      `전기차 배터리 회수, 수소 해상 운송, 스마트 물류센터 등 <strong>독보적 인프라 자산을 60초 모션그래픽 숏폼</strong>으로 재가공하여 전문성과 대중성 동시 확보.`,
      `완성차 수출입 물류 현장의 <strong>선원 및 물류 매니저 24시 다큐</strong> 시리즈로 B2B 신뢰도 강화.`
    ],
    threats: [
      `웹예능 기획의 높은 제작 비용 대비 <strong>진성 B2B 화주 리드 전환율의 한계</strong>.`,
      `엔터테인먼트 중심 알고리즘 피드 경쟁으로 인한 단기 조회수 유입의 지속성 저하 우려.`
    ]
  },
  {
    title: 'LX판토스',
    color: '#48BB95',
    strengths: [
      `누적 좋아요 <strong>${fmt(channelStats[2].totalLikes)}개</strong> 및 참여도 <strong>${channelStats[2].engagementRate}%</strong>(비교 2위)로 탄탄한 시청자 공감대 형성.`,
      `'메가크루 댄스 × 물류센터' 등 <strong>산업 현장과 엔터테인먼트를 융합한 신선한 바이럴 포맷</strong> 입증.`
    ],
    weaknesses: [
      `대륙철도, 항공특송 등 정통 B2B 글로벌 포워딩 영상의 전문성으로 인해 <strong>일반 대중 시청자의 초반 진입 장벽</strong> 존재.`,
      `누적 조회수가 <strong>${fmt(channelStats[2].totalViews)}회</strong> 수준으로 상위 종합상사 채널 대비 규모 확장 필요.`
    ],
    opportunities: [
      `무역 실무자를 위한 <strong>인코텀즈 2020 실전 해설 및 복합물류 운임 브리핑</strong> 구축으로 <strong>화주 락인</strong> 강화.`,
      `초저온 바이오 콜드체인, 미주/유럽 풀필먼트 등 <strong>핵심 수출 물류 노하우 숏폼</strong> 확산.`
    ],
    threats: [
      `유튜브 알고리즘의 <strong>B2B 전문 직무 콘텐츠 피드 노출 제한</strong> 경향.`,
      `경쟁 대형 물류사의 공격적인 웹예능 제작 확대 시 정통 전문 채널 이미지가 상대적으로 난해하게 비칠 위험.`
    ]
  },
  {
    title: '삼성물산 상사부문',
    color: '#9D8DF1',
    strengths: [
      `상사인 취업 상담소, 글로벌 트레이딩 현장 등 <strong>실무자 직무 교육 및 채용 브랜딩 콘텐츠의 높은 신뢰도</strong>.`,
      `참여도 <strong>${channelStats[3].engagementRate}%</strong>(비교 3위)로 진성 취업 준비생 및 비즈니스 시청자의 <strong>높은 충성도</strong> 확보.`
    ],
    weaknesses: [
      `영상당 평균 조회수(<strong>${fmt(channelStats[3].avgViews)}회</strong>)가 대중 채널 대비 다소 낮아 <strong>신규 시청자 유입 풀 확장</strong> 과제.`,
      `취업·인터뷰 포맷 중심 구성으로 <strong>글로벌 사업 포트폴리오의 실물 비주얼 임팩트</strong> 전달 한계.`
    ],
    opportunities: [
      `신재생에너지, 전기차 원자재, 글로벌 트레이딩 뒷이야기 등 <strong>최신 비즈니스 트렌드 해설 콘텐츠</strong>로 전문 오피니언 리더 포지셔닝.`,
      `해외 주재원 리얼 브이로그와 글로벌 지사 소개를 결합한 <strong>글로벌 비즈니스 인사이트 시리즈</strong> 기획.`
    ],
    threats: [
      `전문 비즈니스 포맷의 특성상 <strong>숏폼 알고리즘 피드 확산의 제약</strong>.`,
      `유튜브 내 경제·비즈니스 채널 간 전문성 경쟁 심화로 인한 시청 시간 분산.`
    ]
  },
  {
    title: '롯데글로벌로지스',
    color: '#E6AF2E',
    strengths: [
      `비교 5개 채널 중 <strong>참여도(좋아요율) 1위(${channelStats[4].engagementRate}%)</strong> 달성으로 가장 강력한 시청자 공감 반응 획득.`,
      `일상 친화적 숏폼(#아자쓰) 및 택배 현장 스토리텔링을 통한 <strong>친밀한 대중적 브랜드 호감도</strong> 형성.`
    ],
    weaknesses: [
      `누적 조회수 <strong>${fmt(channelStats[4].totalViews)}회</strong>로 5개사 중 최하위를 기록하여 <strong>대규모 트래픽 모수 확대</strong>가 시급.`,
      `진천 메가허브 등 초대형 스마트 인프라 대비 <strong>고부가가치 3PL 화주 타깃 영상의 성과 미흡</strong>.`
    ],
    opportunities: [
      `축구장 23개 크기의 <strong>진천 메가허브 최첨단 AI 로봇 분류 시스템</strong>을 테크 중심 기획물로 재구성하여 기업 신인도 제고.`,
      `콜드체인 안심배송 및 친환경 전기화물차 배송단 운영을 조명한 <strong>ESG 물류 선도 기업 브랜딩</strong> 강화.`
    ],
    threats: [
      `단순 저단가 생활 택배 이미지 고착 시 <strong>글로벌 물류 및 대형 화주 유치 마케팅 효과 희석</strong> 우려.`,
      `경쟁 택배/물류사의 대규모 물류 자동화 마케팅에 따른 기술 차별화 인식 저하.`
    ]
  }
];

// Generate HTML Content
const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>물류 5사 유튜브 트렌드 분석 & 비교 대시보드 리포트 (총 500개 데이터)</title>
  <meta name="description" content="포스코인터내셔널, 현대글로비스, LX판토스, 삼성물산 상사부문, 롯데글로벌로지스 5개사 총 500개 영상 트렌드 지표, 3대 시각화 차트, SWOT 분석, 상세 데이터 테이블 단독 실행형 HTML" />

  <!-- Pretendard Web Font -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />

  <!-- Tailwind CSS CDN for guaranteed styling in browser -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    body {
      font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    @media print {
      .no-print { display: none !important; }
      body { background-color: #ffffff !important; }
      .shadow-2xs, .shadow-xs, .shadow-sm, .shadow-md { box-shadow: none !important; }
    }
    .chart-container {
      position: relative;
      width: 100%;
      height: 260px;
    }
    svg text {
      user-select: none;
    }
    .chart-tooltip {
      position: absolute;
      pointer-events: none;
      background-color: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.4;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      z-index: 50;
      display: none;
      white-space: nowrap;
      transition: transform 0.05s ease-out;
    }
  </style>

  <!-- Inlined SheetJS for 100% Offline Excel Export -->
  <script>
${sheetJsCode}
  </script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-900 selection:bg-indigo-600 selection:text-white">

  <!-- Top Sticky Header -->
  <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-2xs no-print">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
          YT
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              물류 5사 유튜브 트렌드 분석 & 비교 대시보드 리포트
            </h1>
            <span class="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
              총 500개 데이터 동기화
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            포스코인터내셔널 · 현대글로비스 · LX판토스 · 삼성물산 상사부문 · 롯데글로벌로지스 (각 100편) · 단독 실행 HTML
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="downloadFullExcel()"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs"
          title="수집된 500개 전체 영상을 엑셀 파일(.xlsx)로 즉시 다운로드합니다."
        >
          <span>📥 전체 500개 엑셀 다운로드</span>
        </button>
        <button
          type="button"
          onclick="window.print()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <span>🖨️ 인쇄 / PDF 저장</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

    <!-- 1. Top Comprehensive KPI Banner -->
    <div class="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-bold">
            📊
          </span>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">
              물류 5사 유튜브 데이터 통합 KPI 분석
            </h2>
            <p class="text-xs text-slate-500">
              5개 채널 각 100개씩 총 500개 영상의 정량적 지표 합산 및 평균
            </p>
          </div>
        </div>
        <div class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          수집 기준: 각 채널 최신순 100편 (총 500편 전수 분석)
        </div>
      </div>

      <!-- 6 Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">총 수집 영상</div>
          <div class="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">${totalVideosCount}개</div>
          <div class="text-[11px] text-slate-400 mt-0.5">5채널 × 100개</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">총 누적 조회수</div>
          <div class="text-xl sm:text-2xl font-black text-indigo-700 font-mono mt-1">${(totalViewsAll / 10000).toFixed(0)}만회</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${fmt(totalViewsAll)}회</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">편당 평균 조회수</div>
          <div class="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">${fmt(avgViewsAll)}회</div>
          <div class="text-[11px] text-slate-400 mt-0.5">영상 1편당 평균</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">총 누적 좋아요</div>
          <div class="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1">${fmt(totalLikesAll)}개</div>
          <div class="text-[11px] text-slate-400 mt-0.5">평균 ${fmt(avgLikesAll)}개</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">평균 참여도 (좋아요율)</div>
          <div class="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">${avgEngagementAll}%</div>
          <div class="text-[11px] text-slate-400 mt-0.5">조회수 대비 좋아요</div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div class="text-xs text-slate-500 font-medium">평균 CLAUDE 점수</div>
          <div class="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1">${avgScoreAll}점</div>
          <div class="text-[11px] text-slate-400 mt-0.5">100점 만점 기준</div>
        </div>
      </div>

      <!-- 5 Channel Mini Cards -->
      <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        ${channelStats.map((cs, i) => `
          <div
            onclick="filterByChannel('${cs.title}')"
            class="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${cs.color}"></span>
                <span class="truncate">${cs.title}</span>
              </span>
              <span class="text-[10px] font-mono text-slate-400 font-semibold">#${i + 1}</span>
            </div>
            <div class="text-base font-bold text-slate-900 font-mono">
              ${(cs.totalViews / 10000).toFixed(0)}<span class="text-xs font-normal text-slate-500 ml-0.5">만회</span>
            </div>
            <div class="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>100개 영상</span>
              <span class="font-semibold text-indigo-600 group-hover:underline">${cs.engagementRate}%</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. Navigation Tabs -->
    <div class="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
      <div class="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
        <button type="button" onclick="switchTab('all')" id="tab-btn-all" class="tab-btn px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-xs font-bold transition-all cursor-pointer">
          전체 보기
        </button>
        <button type="button" onclick="switchTab('charts')" id="tab-btn-charts" class="tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer">
          비교 차트 (3종)
        </button>
        <button type="button" onclick="switchTab('engagement')" id="tab-btn-engagement" class="tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer">
          참여도 원형 지표
        </button>
        <button type="button" onclick="switchTab('swot')" id="tab-btn-swot" class="tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer">
          채널별 SWOT 분석
        </button>
      </div>

      <div class="text-xs text-slate-500">
        기준: <strong>5개사 총 500개</strong> 정량 데이터 동기화 완료
      </div>
    </div>

    <!-- 3. Main Charts Section (Chart 1 & Chart 2) -->
    <div id="section-charts" class="tab-content grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- Chart 1: 채널별 총 누적 조회수 비교 막대그래프 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
                📊
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  채널별 총 누적 조회수 비교 (막대그래프)
                </h3>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  단위: 만회 (수집된 각 채널 100개 영상의 누적 시청 규모 비교)
                </p>
              </div>
            </div>
          </div>

          <div class="chart-container" id="bar-chart-container">
            <div id="bar-tooltip" class="chart-tooltip"></div>
            <svg id="bar-chart-svg" width="100%" height="100%" viewBox="0 0 540 260"></svg>
          </div>
        </div>

        <!-- Chart 1 핵심 해석 -->
        <div class="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-slate-800 flex items-start gap-2">
          <div class="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px] shrink-0 mt-0.5">
            💡 핵심 해석
          </div>
          <p class="leading-relaxed">
            누적 조회수 1위는 <strong>[포스코인터내셔널]</strong>(552만회)로, 전체 5개 채널 조회수의 <strong>${((channelStats[0].totalViews / totalViewsAll) * 100).toFixed(1)}%</strong>를 견인했습니다. 글로벌 비즈니스 및 브랜드 필름 콘텐츠가 대중적 도달력을 크게 확장시켰습니다.
          </p>
        </div>
      </div>

      <!-- Chart 2: 업로드 시점 기준 채널별 조회수 추이 선그래프 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                📈
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  업로드 시점 기준 채널별 조회수 추이 (시계열 선그래프)
                </h3>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  단위: 회 (영상 업로드 흐름에 따른 5개 채널 반응도 추이)
                </p>
              </div>
            </div>
          </div>

          <div class="chart-container" id="line-chart-container">
            <div id="line-tooltip" class="chart-tooltip"></div>
            <svg id="line-chart-svg" width="100%" height="100%" viewBox="0 0 540 230"></svg>
          </div>
        </div>

        <!-- Chart 2 핵심 해석 -->
        <div class="mt-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-slate-800 flex items-start gap-2">
          <div class="px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold text-[10px] shrink-0 mt-0.5">
            💡 핵심 해석
          </div>
          <p class="leading-relaxed">
            시계열 추이 분석 결과, 대형 기획 캠페인 영상이 업로드된 시점에 조회수 스파이크가 두드러지게 관찰되며, 평시 정기 실무 콘텐츠와 대형 흥행작 간의 유입 트래픽 편차가 확인됩니다.
          </p>
        </div>
      </div>

    </div>

    <!-- 4. Chart 3 (원형 도넛 지표 & 참여도 순위) -->
    <div id="section-engagement" class="tab-content bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
            🎯
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">
              시청자 인터랙션 참여도 (좋아요율) 원형 지표 및 순위
            </h3>
            <p class="text-[11px] text-slate-500 mt-0.5">
              조회수 대비 좋아요 비율(%) 기준 5개사 시청자 반응 충성도 비교
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <!-- Donut SVG -->
        <div class="lg:col-span-6 flex justify-center">
          <div class="chart-container" style="max-width: 360px; height: 250px;">
            <div id="pie-tooltip" class="chart-tooltip"></div>
            <svg id="pie-chart-svg" width="100%" height="100%" viewBox="0 0 340 250"></svg>
          </div>
        </div>

        <!-- Ranking List -->
        <div class="lg:col-span-6 space-y-2">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            채널별 참여도 (좋아요율) 순위
          </div>
          <div class="space-y-2">
            ${engagementRanked.map((cs, i) => `
              <div class="p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${cs.color}"></span>
                  <div>
                    <div class="text-xs font-bold text-slate-900">${cs.title}</div>
                    <div class="text-[11px] text-slate-500">
                      총 좋아요 <strong class="text-slate-700">${fmt(cs.totalLikes)}개</strong> · 조회수 ${(cs.totalViews / 10000).toFixed(0)}만회
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-emerald-700 font-mono">${cs.engagementRate}%</div>
                  <span class="text-[10px] text-slate-400 font-normal">참여도 (#${i + 1})</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Chart 3 핵심 해석 -->
      <div class="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-slate-800 flex items-start gap-2">
        <div class="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px] shrink-0 mt-0.5">
          💡 핵심 해석
        </div>
        <p class="leading-relaxed">
          참여도(좋아요율)는 <strong>[${engagementRanked[0].title}]</strong>이 <strong>${engagementRanked[0].engagementRate}%</strong>로 1위를 기록했습니다. 일상 친밀형 숏폼과 현장 직무 공감 콘텐츠가 시청자의 반응을 적극적으로 이끌어냈습니다.
        </p>
      </div>
    </div>

    <!-- 5. 200자 이내 통합 분석 요약문 -->
    <div class="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white border border-indigo-200 shadow-xs">
      <div class="flex items-start gap-3">
        <div class="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-xs font-bold text-sm">
          ✨
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
              <span>채널 비교 종합 결과 해석 (통합 분석)</span>
              <span class="text-[10px] font-normal text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                교재 기준 200자 이내 요약 (138자)
              </span>
            </h3>
            <span class="text-[11px] text-slate-500 font-medium">총 조회수와 참여도 등 지표 간 핵심 차이 종합</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
            "총 5개 채널(500개 영상) 분석 결과, [포스코인터내셔널]이 누적 조회수 5,521,824회로 가장 높았습니다. 참여도(좋아요율)는 [롯데글로벌로지스]가 1.28%로 가장 높았습니다. 채널별 조회수와 참여도에서 차이가 나타나 콘텐츠 운영 성과의 차이를 확인할 수 있습니다."
          </p>
        </div>
      </div>
    </div>

    <!-- 6. Channel-by-Channel SWOT Analysis -->
    <div id="section-swot" class="tab-content space-y-4">
      <div class="flex items-center gap-2">
        <div class="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 font-bold text-sm">
          💡
        </div>
        <div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900">
            각 채널별 SWOT 정밀 분석 (Strengths · Weaknesses · Opportunities · Threats)
          </h3>
          <p class="text-[11px] text-slate-500">
            수집된 조회수, 참여도, Claude 평가 점수를 종합하여 도출한 5개 채널별 맞춤형 전략 분석 (각 채널당 100개 데이터 기준)
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${swotData.map(sw => `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-indigo-300 transition-all">
            <!-- Card Header -->
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: ${sw.color}"></span>
                <h4 class="text-sm font-bold text-slate-900 truncate">${sw.title}</h4>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                SWOT 리포트
              </span>
            </div>

            <!-- SWOT 4 Blocks -->
            <div class="space-y-2.5 text-xs">
              <!-- Strengths -->
              <div class="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div class="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <span>✅ 강점 (Strengths)</span>
                </div>
                <ul class="space-y-1 text-slate-700 pl-4 list-disc marker:text-emerald-500 text-[11.5px] leading-relaxed">
                  ${sw.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
              </div>

              <!-- Weaknesses -->
              <div class="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div class="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <span>⚠️ 약점 (Weaknesses)</span>
                </div>
                <ul class="space-y-1 text-slate-700 pl-4 list-disc marker:text-amber-500 text-[11.5px] leading-relaxed">
                  ${sw.weaknesses.map(w => `<li>${w}</li>`).join('')}
                </ul>
              </div>

              <!-- Opportunities -->
              <div class="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <div class="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <span>🚀 기회 (Opportunities)</span>
                </div>
                <ul class="space-y-1 text-slate-700 pl-4 list-disc marker:text-blue-500 text-[11.5px] leading-relaxed">
                  ${sw.opportunities.map(o => `<li>${o}</li>`).join('')}
                </ul>
              </div>

              <!-- Threats -->
              <div class="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <div class="font-bold text-purple-900 flex items-center gap-1.5 mb-1">
                  <span>🛡️ 위협 (Threats)</span>
                </div>
                <ul class="space-y-1 text-slate-700 pl-4 list-disc marker:text-purple-500 text-[11.5px] leading-relaxed">
                  ${sw.threats.map(t => `<li>${t}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 7. Detailed Video Data Table (Total 500 Videos) -->
    <div id="section-table" class="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <!-- Table Top Toolbar -->
      <div class="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 space-y-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm">
              📋
            </span>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900">
                상세 데이터 테이블 (총 500개 전수 데이터)
              </h3>
              <p class="text-xs text-slate-500">
                채널별 필터, 검색, 정렬 및 0~100점 연속 색상 그라데이션이 적용된 데이터 테이블
              </p>
            </div>
          </div>

          <button
            type="button"
            onclick="downloadFullExcel()"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs"
          >
            📊 전체 500개 엑셀 파일 다운로드
          </button>
        </div>

        <!-- Channel Filter Badges -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1">
          <button
            type="button"
            onclick="filterByChannel('ALL')"
            id="filter-btn-ALL"
            class="channel-filter-btn px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-2xs cursor-pointer"
          >
            전체 (500)
          </button>
          ${channelStats.map(cs => `
            <button
              type="button"
              onclick="filterByChannel('${cs.title}')"
              id="filter-btn-${cs.title}"
              class="channel-filter-btn px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${cs.color}"></span>
              <span>${cs.title} (100)</span>
            </button>
          `).join('')}
        </div>

        <!-- Search & Sort Controls -->
        <div class="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div class="relative flex-1 min-w-[220px] max-w-md">
            <input
              type="text"
              id="search-input"
              oninput="onSearchChange(event)"
              placeholder="영상 제목, 채널명, 태그, 한줄평 검색..."
              class="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          <div class="flex items-center gap-2">
            <select
              id="sort-select"
              onchange="onSortChange(event)"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="views-desc">조회수 높은순</option>
              <option value="views-asc">조회수 낮은순</option>
              <option value="likes-desc">좋아요 많은순</option>
              <option value="date-desc">최신 업로드순</option>
              <option value="score-desc">CLAUDE 점수 높은순</option>
            </select>

            <select
              id="pagesize-select"
              onchange="onPageSizeChange(event)"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="25">25개씩 보기</option>
              <option value="50">50개씩 보기</option>
              <option value="100">100개씩 보기</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold">
              <th class="py-3 px-3 text-center w-12">번호</th>
              <th class="py-3 px-3 w-32">채널명</th>
              <th class="py-3 px-3 min-w-[280px]">영상 제목 및 정보</th>
              <th class="py-3 px-3 text-right w-24">조회수</th>
              <th class="py-3 px-3 text-right w-20">좋아요</th>
              <th class="py-3 px-3 text-center w-28">업로드 일시</th>
              <th class="py-3 px-3 text-center w-20">재생시간</th>
              <th class="py-3 px-3 text-center w-24">CLAUDE 점수</th>
              <th class="py-3 px-3 min-w-[260px]">CLAUDE AI 분석 한줄평</th>
            </tr>
          </thead>
          <tbody id="table-body" class="divide-y divide-slate-100 bg-white">
            <!-- Rendered by JavaScript -->
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-3.5 px-5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div id="pagination-info" class="text-slate-600 font-medium">
          <!-- e.g. 1 - 25 / 총 500개 영상 -->
        </div>

        <div id="pagination-controls" class="flex items-center gap-1">
          <!-- Page buttons -->
        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500 no-print">
    <div class="max-w-7xl mx-auto px-4">
      <p class="font-semibold text-slate-700">
        물류 5사 유튜브 트렌드 분석 & 비교 대시보드 리포트 (총 500개 데이터)
      </p>
      <p class="mt-1 text-slate-400">
        포스코인터내셔널 · 현대글로비스 · LX판토스 · 삼성물산 상사부문 · 롯데글로벌로지스 (각 100개 데이터 기준 동기화 완료)
      </p>
    </div>
  </footer>

  <!-- Interactive Dashboard Script -->
  <script>
    const CHANNEL_STATS = ${JSON.stringify(channelStats)};
    const TIMELINE_DATA = ${JSON.stringify(timelineData)};
    const ALL_VIDEOS = ${JSON.stringify(allVideos)};

    let currentFilterChannel = 'ALL';
    let currentSearchTerm = '';
    let currentSort = 'views-desc';
    let currentPage = 1;
    let pageSize = 25;

    // Helper: format numbers
    function formatNumber(num) {
      if (num == null) return '0';
      return Number(num).toLocaleString('ko-KR');
    }

    // Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.className = 'tab-btn px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
      });
      const activeBtn = document.getElementById('tab-btn-' + tabId);
      if (activeBtn) {
        activeBtn.className = 'tab-btn px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-xs font-bold transition-all cursor-pointer';
      }

      const secCharts = document.getElementById('section-charts');
      const secEngagement = document.getElementById('section-engagement');
      const secSwot = document.getElementById('section-swot');

      if (tabId === 'all') {
        secCharts.style.display = 'grid';
        secEngagement.style.display = 'block';
        secSwot.style.display = 'block';
      } else if (tabId === 'charts') {
        secCharts.style.display = 'grid';
        secEngagement.style.display = 'none';
        secSwot.style.display = 'none';
      } else if (tabId === 'engagement') {
        secCharts.style.display = 'none';
        secEngagement.style.display = 'block';
        secSwot.style.display = 'none';
      } else if (tabId === 'swot') {
        secCharts.style.display = 'none';
        secEngagement.style.display = 'none';
        secSwot.style.display = 'block';
      }
    }

    // Filter by channel
    function filterByChannel(chTitle) {
      currentFilterChannel = chTitle;
      currentPage = 1;
      
      document.querySelectorAll('.channel-filter-btn').forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-700');
      });
      const activeBtn = document.getElementById('filter-btn-' + chTitle);
      if (activeBtn) {
        activeBtn.classList.remove('bg-slate-100', 'text-slate-700');
        activeBtn.classList.add('bg-slate-900', 'text-white');
      }

      renderTable();
    }

    // Search input handler
    function onSearchChange(e) {
      currentSearchTerm = (e.target.value || '').trim().toLowerCase();
      currentPage = 1;
      renderTable();
    }

    // Sort change handler
    function onSortChange(e) {
      currentSort = e.target.value;
      currentPage = 1;
      renderTable();
    }

    // Page size handler
    function onPageSizeChange(e) {
      pageSize = parseInt(e.target.value, 10) || 25;
      currentPage = 1;
      renderTable();
    }

    // Go to page
    function goToPage(p) {
      currentPage = p;
      renderTable();
      const el = document.getElementById('section-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Filter and sort videos
    function getFilteredVideos() {
      return ALL_VIDEOS.filter(v => {
        if (currentFilterChannel !== 'ALL' && v.channelTitle !== currentFilterChannel) {
          return false;
        }
        if (currentSearchTerm) {
          const matchTitle = (v.title || '').toLowerCase().includes(currentSearchTerm);
          const matchCh = (v.channelTitle || '').toLowerCase().includes(currentSearchTerm);
          const matchReview = (v.claudeReview || '').toLowerCase().includes(currentSearchTerm);
          const matchTags = Array.isArray(v.tags) && v.tags.some(t => t.toLowerCase().includes(currentSearchTerm));
          if (!matchTitle && !matchCh && !matchReview && !matchTags) {
            return false;
          }
        }
        return true;
      }).sort((a, b) => {
        if (currentSort === 'views-desc') return (b.viewCount || 0) - (a.viewCount || 0);
        if (currentSort === 'views-asc') return (a.viewCount || 0) - (b.viewCount || 0);
        if (currentSort === 'likes-desc') return (b.likeCount || 0) - (a.likeCount || 0);
        if (currentSort === 'date-desc') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        if (currentSort === 'score-desc') return (b.claudeScore || 0) - (a.claudeScore || 0);
        return 0;
      });
    }

    // 0~100점 전 구간 연속 그라데이션 스타일 계산 함수
    function getScoreBadgeContinuousStyle(rawScore) {
      const score = Math.max(0, Math.min(100, typeof rawScore === 'number' && !isNaN(rawScore) ? rawScore : 70));
      let hue;
      if (score <= 50) {
        const t = score / 50;
        hue = 8 + (46 - 8) * t;
      } else {
        const t = (score - 50) / 50;
        hue = 46 + (145 - 46) * t;
      }
      const bg = \`hsla(\${hue.toFixed(1)}, 88%, 95%, 0.95)\`;
      const border = \`hsla(\${hue.toFixed(1)}, 72%, 76%, 1)\`;
      let textLightness;
      if (score <= 50) {
        textLightness = 34 - (34 - 26) * (score / 50);
      } else {
        textLightness = 26 - (26 - 22) * ((score - 50) / 50);
      }
      const textHue = hue >= 40 && hue <= 65 ? hue - 6 : hue;
      const textColor = \`hsl(\${textHue.toFixed(1)}, 88%, \${textLightness.toFixed(1)}%)\`;
      return \`background-color: \${bg}; border: 1px solid \${border}; color: \${textColor};\`;
    }

    // Render Table Rows & Pagination
    function renderTable() {
      const filtered = getFilteredVideos();
      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalCount);
      const pageItems = filtered.slice(startIndex, endIndex);

      const tbody = document.getElementById('table-body');
      tbody.innerHTML = pageItems.map((v, i) => {
        const globalIdx = startIndex + i + 1;
        const chColor = (CHANNEL_STATS.find(c => c.title === v.channelTitle) || {}).color || '#64748b';
        return \`
          <tr class="hover:bg-indigo-50/40 transition-colors">
            <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
              \${globalIdx}
            </td>
            <td class="py-3 px-3 font-semibold text-slate-900">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: \${chColor}"></span>
                <span class="truncate">\${v.channelTitle}</span>
              </span>
            </td>
            <td class="py-3 px-3">
              <div class="flex items-start gap-2.5">
                <img
                  src="\${v.thumbnailUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200'}"
                  alt="썸네일"
                  class="w-14 h-9 object-cover rounded-md shrink-0 border border-slate-200 bg-slate-100"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <div class="min-w-0 flex-1">
                  <a
                    href="\${v.videoUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-slate-900 hover:text-indigo-600 line-clamp-1 leading-snug"
                    title="\${v.title}"
                  >
                    \${v.title}
                  </a>
                  <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>ID: \${v.id}</span>
                    \${v.tags && v.tags.length > 0 ? \`<span class="truncate max-w-[200px]">#\${v.tags.slice(0, 3).join(' #')}</span>\` : ''}
                  </div>
                </div>
              </div>
            </td>
            <td class="py-3 px-3 text-right font-mono font-bold text-slate-900">
              \${formatNumber(v.viewCount)}회
            </td>
            <td class="py-3 px-3 text-right font-mono text-slate-700">
              \${v.likeCount != null ? formatNumber(v.likeCount) + '개' : '-'}
            </td>
            <td class="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
              \${v.uploadDate || (v.publishedAt ? v.publishedAt.slice(0, 16).replace('T', ' ') : '-')}
            </td>
            <td class="py-3 px-3 text-center text-slate-600 font-mono text-[11px]">
              \${v.durationFormatted || '-'}
            </td>
            <td class="py-3 px-3 text-center">
              <span class="inline-block px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs transition-colors" style="\${getScoreBadgeContinuousStyle(v.claudeScore)}">
                \${v.claudeScore}점
              </span>
            </td>
            <td class="py-3 px-3 text-slate-700 text-[11px] leading-relaxed">
              \${v.claudeReview || '-'}
            </td>
          </tr>
        \`;
      }).join('');

      // Pagination info
      document.getElementById('pagination-info').innerText = totalCount > 0 
        ? \`\${startIndex + 1} - \${endIndex} / 총 \${totalCount}개 영상 (페이지 \${currentPage}/\${totalPages})\`
        : '검색 결과가 없습니다.';

      // Pagination buttons
      const controls = document.getElementById('pagination-controls');
      let btnsHtml = '';
      if (totalPages > 1) {
        btnsHtml += \`<button onclick="goToPage(1)" class="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 \${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" \${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>\`;
        btnsHtml += \`<button onclick="goToPage(\${currentPage - 1})" class="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 \${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" \${currentPage === 1 ? 'disabled' : ''}>&lsaquo;</button>\`;
        
        const startP = Math.max(1, currentPage - 2);
        const endP = Math.min(totalPages, startP + 4);
        for (let p = startP; p <= endP; p++) {
          btnsHtml += \`<button onclick="goToPage(\${p})" class="px-2.5 py-1 rounded font-semibold \${p === currentPage ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'} cursor-pointer">\${p}</button>\`;
        }

        btnsHtml += \`<button onclick="goToPage(\${currentPage + 1})" class="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 \${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" \${currentPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>\`;
        btnsHtml += \`<button onclick="goToPage(\${totalPages})" class="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 \${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" \${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>\`;
      }
      controls.innerHTML = btnsHtml;
    }

    // ==========================================
    // 3 SVG CHARTS RENDERING FUNCTIONS
    // ==========================================

    // Chart 1: Bar Chart
    function renderBarChart() {
      const svg = document.getElementById('bar-chart-svg');
      const tooltip = document.getElementById('bar-tooltip');
      const width = 540;
      const height = 260;
      const margin = { top: 20, right: 20, bottom: 40, left: 60 };

      const chartW = width - margin.left - margin.right;
      const chartH = height - margin.top - margin.bottom;

      const maxViews = Math.max(...CHANNEL_STATS.map(c => c.totalViews)) * 1.15;
      const barCount = CHANNEL_STATS.length;
      const barWidth = chartW / barCount * 0.55;
      const step = chartW / barCount;

      let svgHtml = '';

      // Gridlines & Y-Axis
      const yTicks = [0, 1500000, 3000000, 4500000, 6000000].filter(v => v <= maxViews * 1.05);
      yTicks.forEach(tickVal => {
        const y = margin.top + chartH - (tickVal / maxViews) * chartH;
        svgHtml += \`<line x1="\${margin.left}" y1="\${y}" x2="\${width - margin.right}" y2="\${y}" stroke="#e2e8f0" stroke-dasharray="3,3" />\`;
        svgHtml += \`<text x="\${margin.left - 8}" y="\${y + 4}" font-size="10" fill="#64748b" text-anchor="end" font-family="Pretendard">\${tickVal === 0 ? '0' : (tickVal / 10000) + '만'}</text>\`;
      });

      // Axis lines
      svgHtml += \`<line x1="\${margin.left}" y1="\${margin.top + chartH}" x2="\${width - margin.right}" y2="\${margin.top + chartH}" stroke="#cbd5e1" stroke-width="1.5" />\`;

      // Bars & X labels
      CHANNEL_STATS.forEach((cs, idx) => {
        const x = margin.left + idx * step + (step - barWidth) / 2;
        const barH = (cs.totalViews / maxViews) * chartH;
        const y = margin.top + chartH - barH;

        svgHtml += \`
          <g class="bar-group" data-title="\${cs.title}" data-views="\${cs.totalViews}" data-avg="\${cs.avgViews}">
            <rect
              x="\${x}"
              y="\${y}"
              width="\${barWidth}"
              height="\${barH}"
              fill="\${cs.color}"
              rx="6"
              ry="6"
              class="transition-all cursor-pointer hover:opacity-85"
            />
            <text
              x="\${x + barWidth / 2}"
              y="\${y - 6}"
              font-size="10"
              font-weight="bold"
              fill="\${cs.color}"
              text-anchor="middle"
              font-family="Pretendard"
            >
              \${(cs.totalViews / 10000).toFixed(0)}만
            </text>
            <text
              x="\${x + barWidth / 2}"
              y="\${margin.top + chartH + 20}"
              font-size="10"
              font-weight="600"
              fill="#334155"
              text-anchor="middle"
              font-family="Pretendard"
            >
              \${cs.title.length > 6 ? cs.title.slice(0, 5) + '…' : cs.title}
            </text>
          </g>
        \`;
      });

      svg.innerHTML = svgHtml;

      // Tooltip events
      svg.querySelectorAll('.bar-group').forEach(el => {
        el.addEventListener('mousemove', (e) => {
          const title = el.getAttribute('data-title');
          const views = formatNumber(el.getAttribute('data-views'));
          const avg = formatNumber(el.getAttribute('data-avg'));
          tooltip.innerHTML = \`<strong>\${title}</strong><br/>누적 조회수: \${views} 회<br/>편당 평균: \${avg} 회 (100편)\`;
          tooltip.style.display = 'block';
          const rect = svg.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
          tooltip.style.top = (e.clientY - rect.top - 20) + 'px';
        });
        el.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }

    // Chart 2: Line Chart
    function renderLineChart() {
      const svg = document.getElementById('line-chart-svg');
      const tooltip = document.getElementById('line-tooltip');
      const width = 540;
      const height = 230;
      const margin = { top: 20, right: 25, bottom: 35, left: 55 };

      const chartW = width - margin.left - margin.right;
      const chartH = height - margin.top - margin.bottom;

      let maxVal = 0;
      TIMELINE_DATA.forEach(row => {
        CHANNEL_STATS.forEach(cs => {
          if (row[cs.title] > maxVal) maxVal = row[cs.title];
        });
      });
      maxVal = (maxVal || 100000) * 1.15;

      let svgHtml = '';

      // Gridlines & Y-Axis
      const yTicks = [0, 50000, 100000, 200000, 500000, 1000000].filter(v => v <= maxVal);
      yTicks.forEach(tickVal => {
        const y = margin.top + chartH - (tickVal / maxVal) * chartH;
        svgHtml += \`<line x1="\${margin.left}" y1="\${y}" x2="\${width - margin.right}" y2="\${y}" stroke="#e2e8f0" stroke-dasharray="3,3" />\`;
        svgHtml += \`<text x="\${margin.left - 8}" y="\${y + 4}" font-size="10" fill="#64748b" text-anchor="end" font-family="Pretendard">\${tickVal === 0 ? '0' : (tickVal / 10000) + '만'}</text>\`;
      });

      // Axis lines
      svgHtml += \`<line x1="\${margin.left}" y1="\${margin.top + chartH}" x2="\${width - margin.right}" y2="\${margin.top + chartH}" stroke="#cbd5e1" stroke-width="1.5" />\`;

      // X-Axis labels (every 4th)
      const pointCount = TIMELINE_DATA.length;
      TIMELINE_DATA.forEach((row, idx) => {
        if (idx % 5 === 0 || idx === pointCount - 1) {
          const x = margin.left + (idx / Math.max(1, pointCount - 1)) * chartW;
          const label = row.date.slice(5);
          svgHtml += \`<text x="\${x}" y="\${margin.top + chartH + 18}" font-size="10" fill="#64748b" text-anchor="middle" font-family="Pretendard">\${label}</text>\`;
        }
      });

      // Lines & dots for each channel
      CHANNEL_STATS.forEach(cs => {
        const points = TIMELINE_DATA.map((row, idx) => {
          const x = margin.left + (idx / Math.max(1, pointCount - 1)) * chartW;
          const val = row[cs.title] || 0;
          const y = margin.top + chartH - (val / maxVal) * chartH;
          return { x, y, val, date: row.date };
        });

        const pathD = points.map((p, i) => \`\${i === 0 ? 'M' : 'L'} \${p.x.toFixed(1)} \${p.y.toFixed(1)}\`).join(' ');

        svgHtml += \`<path d="\${pathD}" fill="none" stroke="\${cs.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />\`;

        // Dots
        points.forEach((p, idx) => {
          if (idx % 2 === 0) {
            svgHtml += \`
              <circle
                cx="\${p.x.toFixed(1)}"
                cy="\${p.y.toFixed(1)}"
                r="3.5"
                fill="\${cs.color}"
                stroke="#ffffff"
                stroke-width="1.5"
                class="line-dot cursor-pointer"
                data-title="\${cs.title}"
                data-date="\${p.date}"
                data-views="\${p.val}"
              />
            \`;
          }
        });
      });

      svg.innerHTML = svgHtml;

      // Tooltip events
      svg.querySelectorAll('.line-dot').forEach(dot => {
        dot.addEventListener('mousemove', (e) => {
          const title = dot.getAttribute('data-title');
          const date = dot.getAttribute('data-date');
          const views = formatNumber(dot.getAttribute('data-views'));
          tooltip.innerHTML = \`<strong>\${title}</strong> (\${date})<br/>조회수: \${views} 회\`;
          tooltip.style.display = 'block';
          const rect = svg.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
          tooltip.style.top = (e.clientY - rect.top - 20) + 'px';
        });
        dot.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }

    // Chart 3: Pie/Donut Chart
    function renderPieChart() {
      const svg = document.getElementById('pie-chart-svg');
      const tooltip = document.getElementById('pie-tooltip');
      const cx = 170;
      const cy = 125;
      const outerR = 85;
      const innerR = 52;

      const totalEngagement = CHANNEL_STATS.reduce((sum, c) => sum + c.engagementRate, 0) || 1;

      let startAngle = -Math.PI / 2;
      let svgHtml = '';

      CHANNEL_STATS.forEach((cs) => {
        const sliceAngle = (cs.engagementRate / totalEngagement) * (Math.PI * 2);
        const endAngle = startAngle + sliceAngle;

        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);

        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;

        const pathD = [
          \`M \${x1.toFixed(2)} \${y1.toFixed(2)}\`,
          \`A \${outerR} \${outerR} 0 \${largeArc} 1 \${x2.toFixed(2)} \${y2.toFixed(2)}\`,
          \`L \${ix1.toFixed(2)} \${iy1.toFixed(2)}\`,
          \`A \${innerR} \${innerR} 0 \${largeArc} 0 \${ix2.toFixed(2)} \${iy2.toFixed(2)}\`,
          'Z'
        ].join(' ');

        svgHtml += \`
          <path
            d="\${pathD}"
            fill="\${cs.color}"
            class="donut-slice cursor-pointer transition-all hover:opacity-85"
            data-title="\${cs.title}"
            data-rate="\${cs.engagementRate}"
            data-likes="\${cs.totalLikes}"
          />
        \`;

        startAngle = endAngle;
      });

      // Center text
      svgHtml += \`
        <text x="\${cx}" y="\${cy - 4}" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle" font-family="Pretendard">참여도</text>
        <text x="\${cx}" y="\${cy + 14}" font-size="11" fill="#64748b" text-anchor="middle" font-family="Pretendard">좋아요율</text>
      \`;

      svg.innerHTML = svgHtml;

      // Tooltip events
      svg.querySelectorAll('.donut-slice').forEach(slice => {
        slice.addEventListener('mousemove', (e) => {
          const title = slice.getAttribute('data-title');
          const rate = slice.getAttribute('data-rate');
          const likes = formatNumber(slice.getAttribute('data-likes'));
          tooltip.innerHTML = \`<strong>\${title}</strong><br/>참여도: \${rate}%<br/>총 좋아요: \${likes} 개\`;
          tooltip.style.display = 'block';
          const rect = svg.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
          tooltip.style.top = (e.clientY - rect.top - 20) + 'px';
        });
        slice.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }

    // ==========================================
    // OFFLINE EXCEL EXPORT USING SHEETJS
    // ==========================================
    function downloadFullExcel() {
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // Prepare Rows
      const rows = ALL_VIDEOS.map((v, i) => ({
        'No': i + 1,
        '채널명': v.channelTitle || '',
        '채널ID': v.channelId || '',
        '영상ID': v.id || '',
        '영상제목': v.title || '',
        '유튜브링크': v.videoUrl || \`https://www.youtube.com/watch?v=\${v.id}\`,
        '조회수': v.viewCount || 0,
        '좋아요수': v.likeCount != null ? v.likeCount : '',
        '댓글수': v.commentCount != null ? v.commentCount : '',
        '업로드일시': v.uploadDate || v.publishedAt || '',
        '재생시간': v.durationFormatted || '',
        'CLAUDE점수': v.claudeScore != null ? v.claudeScore : '',
        'CLAUDE한줄평': v.claudeReview || '',
        '태그': Array.isArray(v.tags) ? v.tags.join(', ') : ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 26 },
        { wch: 15 },
        { wch: 45 },
        { wch: 35 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 45 },
        { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, '물류5사_유튜브_트렌드_500개');

      // Also append summary sheet
      const summaryRows = CHANNEL_STATS.map(c => ({
        '채널명': c.title,
        '핸들': c.handle,
        '수집영상수': c.videoCount,
        '누적조회수': c.totalViews,
        '편당평균조회수': c.avgViews,
        '누적좋아요수': c.totalLikes,
        '평균좋아요수': c.avgLikes,
        '참여도(좋아요율)': c.engagementRate + '%',
        '평균CLAUDE점수': c.avgScore,
        '최다조회영상': c.topVideo ? c.topVideo.title : '',
        '최다조회수': c.topVideo ? c.topVideo.viewCount : 0
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 45 },
        { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, '채널별_비교요약');

      // Trigger download
      XLSX.writeFile(wb, '물류5사_유튜브트렌드_분석보고서_500개.xlsx');
    }

    // Initialize Dashboard
    window.addEventListener('DOMContentLoaded', () => {
      renderTable();
      renderBarChart();
      renderLineChart();
      renderPieChart();
    });
  </script>
</body>
</html>`;

fs.writeFileSync('youtube_trend_dashboard_500.html', htmlContent, 'utf8');
console.log('Successfully updated youtube_trend_dashboard_500.html! File size:', htmlContent.length, 'bytes');
