import { YouTubeVideoItem, ChannelInfo } from '../types.ts';

interface ExportDashboardOptions {
  containerId?: string;
  channelTitle: string;
  collectedAt?: string;
  keywordFocus?: string;
  videos: YouTubeVideoItem[];
  channels?: ChannelInfo[];
  aiModelUsed?: string;
}

/**
 * Exports the entire rendered dashboard (KPIs, comparative charts, SWOT analysis, and detailed data table)
 * into a standalone, single HTML file that can be opened directly in any browser without needing a server.
 */
export function exportDashboardToHtml(options: ExportDashboardOptions): void {
  const {
    containerId = 'dashboard-result-container',
    channelTitle = '유튜브트렌드',
    collectedAt = new Date().toISOString().split('T')[0],
    keywordFocus,
    videos = [],
    channels = [],
    aiModelUsed,
  } = options;

  // 1. Locate the container element in the live DOM
  const targetElement =
    document.getElementById(containerId) ||
    document.getElementById('dashboard-result-area') ||
    document.querySelector('main');

  if (!targetElement) {
    throw new Error('내보낼 대시보드 화면 요소를 찾을 수 없습니다.');
  }

  // 2. Deep clone the live DOM container
  const clone = targetElement.cloneNode(true) as HTMLElement;

  // 3. Fix Recharts SVGs to ensure they preserve exact vectors and scale in offline/standalone HTML
  const originalSvgs = targetElement.querySelectorAll('svg');
  const clonedSvgs = clone.querySelectorAll('svg');

  originalSvgs.forEach((origSvg, index) => {
    const clonedSvg = clonedSvgs[index];
    if (!clonedSvg) return;

    try {
      const rect = origSvg.getBoundingClientRect();
      const currentWidth = Math.round(rect.width) || parseInt(origSvg.getAttribute('width') || '600', 10) || 600;
      const currentHeight = Math.round(rect.height) || parseInt(origSvg.getAttribute('height') || '320', 10) || 320;

      // Ensure proper viewBox is explicitly set so SVGs scale perfectly at any resolution
      if (!clonedSvg.getAttribute('viewBox')) {
        clonedSvg.setAttribute('viewBox', `0 0 ${currentWidth} ${currentHeight}`);
      }

      // Preserve dimensions while making responsive
      clonedSvg.setAttribute('width', '100%');
      clonedSvg.setAttribute('height', '100%');
      clonedSvg.style.maxWidth = '100%';
      clonedSvg.style.height = 'auto';
      clonedSvg.style.display = 'block';
      clonedSvg.style.overflow = 'visible';

      // Inline styles for text elements in SVG to maintain crisp font rendering
      const origTexts = origSvg.querySelectorAll('text');
      const clonedTexts = clonedSvg.querySelectorAll('text');
      origTexts.forEach((origText, tIdx) => {
        const clonedText = clonedTexts[tIdx];
        if (!clonedText) return;
        const computed = window.getComputedStyle(origText);
        if (!clonedText.getAttribute('fill') && computed.fill) {
          clonedText.setAttribute('fill', computed.fill);
        }
        if (!clonedText.style.fontSize && computed.fontSize) {
          clonedText.style.fontSize = computed.fontSize;
        }
      });
    } catch {
      // Continue even if individual SVG measurement fails
    }
  });

  // Ensure Recharts wrappers inside clone maintain clean layouts
  clone.querySelectorAll('.recharts-responsive-container').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.width = '100%';
    htmlEl.style.minHeight = '300px';
    htmlEl.style.maxHeight = '420px';
  });

  clone.querySelectorAll('.recharts-wrapper').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.width = '100%';
    htmlEl.style.maxWidth = '100%';
    htmlEl.style.margin = '0 auto';
  });

  // Fix image thumbnail referrer policies so YouTube images load in standalone file:///
  clone.querySelectorAll('img').forEach((img) => {
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.setAttribute('loading', 'lazy');
  });

  // Ensure table rows have searchable attributes
  clone.querySelectorAll('tbody tr').forEach((tr) => {
    const text = (tr as HTMLElement).innerText || '';
    tr.setAttribute('data-search-text', text.toLowerCase());
  });

  // 4. Collect all styles injected by Vite/Tailwind in head
  let inlinedStyles = '';
  document.querySelectorAll('style').forEach((styleEl) => {
    inlinedStyles += styleEl.innerHTML + '\n';
  });

  // 5. Build clean, standalone HTML document
  const displayTitle = channelTitle || '유튜브 트렌드 분석';
  const cleanTitle = displayTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const safeFilename = `유튜브_트렌드_대시보드_${cleanTitle}_${collectedAt}.html`;

  const htmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayTitle} - 유튜브 트렌드 분석 및 비교 대시보드 보고서</title>
  <meta name="description" content="YouTube API 및 AI 분석 기반 트렌드 영상 데이터, 기업별 SWOT 분석, 시각화 대시보드 리포트" />
  
  <!-- Pretendard Web Font -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  
  <!-- Tailwind CSS CDN for complete standalone rendering without server -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    /* Pretendard font and base styling */
    body {
      font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Inlined application CSS */
    ${inlinedStyles}

    /* Standalone & Print Optimization */
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background-color: #ffffff !important;
      }
      .bg-white {
        box-shadow: none !important;
        border-color: #e2e8f0 !important;
      }
    }

    /* SVG and Chart smoothness */
    svg {
      max-width: 100%;
      height: auto;
    }
    .recharts-responsive-container {
      width: 100% !important;
    }
    .recharts-surface {
      overflow: visible !important;
    }
  </style>
</head>
<body class="bg-slate-50 min-h-screen text-slate-900 selection:bg-red-500 selection:text-white">
  
  <!-- Top Standalone Report Navigation Bar (No-Print) -->
  <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-2xs no-print">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
          YT
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              유튜브 트렌드 분석 & 비교 대시보드 리포트
            </h1>
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              HTML 단독 실행 파일
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            ${displayTitle} · 수집일: <span class="font-mono text-slate-700">${collectedAt}</span> · 총 <span class="font-bold text-slate-800">${videos.length}</span>개 영상 ${
              keywordFocus ? `· 포커스: #${keywordFocus}` : ''
            } ${aiModelUsed ? `· AI: ${aiModelUsed}` : ''}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="window.print()"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
        >
          <span>🖨️ 인쇄 / PDF 저장</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Report Body Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    ${clone.outerHTML}
  </main>

  <!-- Standalone Report Footer -->
  <footer class="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500 no-print">
    <div class="max-w-7xl mx-auto px-4">
      <p class="font-semibold text-slate-700">
        유튜브 트렌드 엑셀 추출기 & 채널 비교 분석 보고서
      </p>
      <p class="mt-1 text-slate-400">
        본 파일은 별도 서버 설치 없이 브라우저에서 직접 열어 확인 가능한 독립형 HTML 대시보드 보고서입니다.
      </p>
    </div>
  </footer>

  <!-- Interactive JavaScript for Standalone HTML -->
  <script>
    (function() {
      // 1. Interactive Table Search in standalone HTML
      const searchInputs = document.querySelectorAll('input[placeholder*="검색"]');
      const tableRows = document.querySelectorAll('tbody tr[data-search-text]');

      searchInputs.forEach(function(input) {
        input.addEventListener('input', function(e) {
          const term = (e.target.value || '').trim().toLowerCase();
          let visibleCount = 0;

          tableRows.forEach(function(row) {
            const text = row.getAttribute('data-search-text') || row.innerText.toLowerCase();
            if (!term || text.includes(term)) {
              row.style.display = '';
              visibleCount++;
            } else {
              row.style.display = 'none';
            }
          });
        });
      });

      // 2. Channel Comparison Dashboard Tab Switching in standalone HTML
      const tabButtons = document.querySelectorAll('#channel-comparison-dashboard-section button');
      tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          const text = (btn.innerText || '').trim();
          if (text.includes('전체') || text.includes('차트') || text.includes('SWOT') || text.includes('참여도')) {
            tabButtons.forEach(function(b) {
              b.classList.remove('bg-white', 'text-indigo-700', 'shadow-2xs', 'font-bold');
              b.classList.add('text-slate-600');
            });
            btn.classList.add('bg-white', 'text-indigo-700', 'shadow-2xs', 'font-bold');
            btn.classList.remove('text-slate-600');
          }
        });
      });

      // 3. Channel Filter Buttons in standalone HTML
      const channelButtons = document.querySelectorAll('[data-channel-filter]');
      channelButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          const target = btn.getAttribute('data-channel-filter');
          tableRows.forEach(function(row) {
            if (target === 'ALL') {
              row.style.display = '';
            } else {
              const text = row.getAttribute('data-search-text') || '';
              row.style.display = text.includes(target.toLowerCase()) ? '' : 'none';
            }
          });
        });
      });
    })();
  </script>
</body>
</html>`;

  // 6. Trigger client-side file download
  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = safeFilename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
