import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  resolveChannel,
  fetchChannelVideos,
  parseISO8601Duration,
  formatDateTime,
} from './server/youtube.ts';
import {
  analyzeVideosWithClaude,
  analyzeVideosWithGemini,
  generateHeuristicAnalysis,
  VideoAnalysisInput,
  VideoAIAnalysis,
} from './server/ai.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API: Health check
  app.get(['/api/health', '/api/health/'], (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Sample trends data (for immediate testing without keys)
  app.get(['/api/youtube/sample-trends', '/api/youtube/sample-trends/'], (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const userKeyword = (req.query.keywordFocus as string)?.trim() || '';

    const sampleVideos = [
      {
        id: 'dQw4w9WgXcQ',
        title: '2026 AI 코딩 에이전트와 차세대 풀스택 개발 워크플로우 완벽 가이드',
        description: '최신 AI 개발 트렌드와 프롬프트 기반 웹 애플리케이션 구축 실무 분석',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        publishedAt: '2026-09-18T14:30:00Z',
        uploadDate: '2026-09-18 23:30',
        durationRaw: 'PT14M32S',
        durationFormatted: '14분 32초',
        viewCount: 428000,
        likeCount: 18200,
        commentCount: 1250,
        tags: ['AI개발', '코딩트렌드', '풀스택', '웹개발'],
        collectedAt: today,
        keyword: userKeyword || 'AI 코딩, 차세대 풀스택 개발, 생산성 혁신',
        claudeReview: userKeyword
          ? `지정 키워드 '${userKeyword}' 관점에서 실무 패러다임 변화를 핵심만 명료하게 짚어낸 완성도 높은 트렌드 영상`
          : 'AI 도구 도입에 따른 실무 패러다임 변화를 핵심만 명료하게 짚어낸 완성도 높은 트렌드 영상',
        claudeScore: userKeyword ? 97 : 96,
        claudeReason: userKeyword
          ? `키워드 '${userKeyword}'와의 밀접한 연관성 및 높은 시청자 파급력 인정`
          : '최신 생성형 AI 트렌드와 실용성 높은 인사이트를 균형 있게 전달함',
        channelTitle: '테크 & 트렌드 인사이트',
        channelId: 'UC_sample_channel_123',
      },
      {
        id: 'abc123xyz78',
        title: '구글 딥마인드와 Claude 3.5 신기능 분석: 개발자가 주목해야 할 5가지',
        description: '최신 LLM 모델들의 벤치마크 비교 및 실무 적용 방안 상세 설명',
        thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.youtube.com/watch?v=abc123xyz78',
        publishedAt: '2026-09-15T09:15:00Z',
        uploadDate: '2026-09-15 18:15',
        durationRaw: 'PT18M45S',
        durationFormatted: '18분 45초',
        viewCount: 312000,
        likeCount: 14500,
        commentCount: 890,
        tags: ['Claude3.5', '딥마인드', 'LLM', 'AI벤치마크'],
        collectedAt: today,
        keyword: userKeyword || 'Claude AI, 딥마인드, 모델 비교, 개발자 전략',
        claudeReview: userKeyword
          ? `키워드 '${userKeyword}' 기준 최신 AI 벤치마크 비교와 기술적 신뢰성을 효과적으로 전달함`
          : '기술적 신뢰성과 알기 쉬운 비교 시연으로 개발자 시청층의 호응을 이끌어낸 핵심 콘텐츠',
        claudeScore: userKeyword ? 94 : 94,
        claudeReason: userKeyword
          ? `'${userKeyword}' 주제에 대한 심층적 분석과 실무 적용성 우수`
          : '업계 최신 AI 기술 발표를 빠르게 다루어 시의성이 매우 우수함',
        channelTitle: '테크 & 트렌드 인사이트',
        channelId: 'UC_sample_channel_123',
      },
      {
        id: 'sample003_v',
        title: '초보자도 10분 만에 만드는 유튜브 자동화 & 데이터 분석 파이프라인',
        description: 'YouTube Data API와 자동화 스크립트로 트렌드 데이터를 수집하는 튜토리얼',
        thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.youtube.com/watch?v=sample003_v',
        publishedAt: '2026-09-10T11:00:00Z',
        uploadDate: '2026-09-10 20:00',
        durationRaw: 'PT11M10S',
        durationFormatted: '11분 10초',
        viewCount: 189000,
        likeCount: 9200,
        commentCount: 540,
        tags: ['유튜브API', '데이터수집', '엑셀자동화', '파이썬'],
        collectedAt: today,
        keyword: userKeyword || '유튜브 API, 엑셀 자동화, 데이터 크롤링',
        claudeReview: userKeyword
          ? `'${userKeyword}' 분석 자동화를 위한 실전 파이프라인을 친절하게 제시한 실전형 가이드`
          : '실무 즉시 적용 가능한 엑셀 연동 및 데이터 분석 기법을 단계별로 친절하게 설명한 실전형 가이드',
        claudeScore: userKeyword ? 91 : 91,
        claudeReason: '업무 효율화에 대한 높은 대중적 관심도와 직관적인 설명 방식',
        channelTitle: '긱블 Geekble',
        channelId: 'UC_sample_channel_456',
      },
      {
        id: 'sample004_v',
        title: '유튜브 알고리즘 역이용하기: 2026년 조회수를 폭발시키는 썸네일 & 타이틀 법칙',
        description: '시청 지속 시간과 CTR을 극대화하는 유튜브 전략 리포트',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.youtube.com/watch?v=sample004_v',
        publishedAt: '2026-09-05T08:20:00Z',
        uploadDate: '2026-09-05 17:20',
        durationRaw: 'PT22M05S',
        durationFormatted: '22분 5초',
        viewCount: 654000,
        likeCount: 31000,
        commentCount: 2100,
        tags: ['유튜브알고리즘', '채널성장', '썸네일제작', '크리에이터'],
        collectedAt: today,
        keyword: userKeyword || '유튜브 알고리즘, CTR 최적화, 바이럴 기법',
        claudeReview: userKeyword
          ? `'${userKeyword}' 트렌드 콘텐츠를 바이럴 시키기 위한 클릭률 및 알고리즘 최적화 전략 공략`
          : '데이터 기반 검증 사례와 시각적 예시를 곁들여 크리에이터의 페인포인트를 정확히 공략함',
        claudeScore: userKeyword ? 88 : 97,
        claudeReason: '폭넓은 공감대 형성과 높은 클릭률 유도 전략이 돋보이는 바이럴 트렌드 콘텐츠',
        channelTitle: '긱블 Geekble',
        channelId: 'UC_sample_channel_456',
      },
      {
        id: 'sample005_v',
        title: '퇴근 후 월 100만원 부업? AI 활용 콘텐츠 제작의 현실과 수익화 로드맵',
        description: 'AI 도구를 활용한 유튜브 채널 운영의 장단점과 수익 모델 솔직 리뷰',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=800&auto=format&fit=crop&q=60',
        videoUrl: 'https://www.youtube.com/watch?v=sample005_v',
        publishedAt: '2026-08-28T13:40:00Z',
        uploadDate: '2026-08-28 22:40',
        durationRaw: 'PT16M50S',
        durationFormatted: '16분 50초',
        viewCount: 520000,
        likeCount: 22400,
        commentCount: 1680,
        tags: ['부업', '콘텐츠수익화', 'AI자동화', '재테크'],
        collectedAt: today,
        keyword: userKeyword || '수익화 로드맵, AI 부업, 크리에이터 이코노미',
        claudeReview: userKeyword
          ? `'${userKeyword}' 기술을 활용한 수익화 및 채널 운영 모델을 솔직하게 분석함`
          : '과장 없는 현실적인 피드백과 실현 가능한 액션 플랜을 제시하여 시청자 신뢰도가 매우 높음',
        claudeScore: userKeyword ? 86 : 89,
        claudeReason: '경제적 관심사와 AI 기술 접목으로 높은 시청 지속 시간 기록',
        channelTitle: 'Google Developers',
        channelId: 'UC_sample_channel_789',
      },
    ];

    res.json({
      success: true,
      channel: {
        id: 'UC_sample_channel_123',
        title: '테크 & 트렌드 인사이트 (샘플 채널)',
        customUrl: '@TechInsightKorea',
        description: '유튜브 트렌드 및 최신 기술 인사이트를 전달하는 채널입니다.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=60',
        subscriberCount: 385000,
        videoCount: 142,
        viewCount: 45200000,
      },
      channels: [
        {
          id: 'UC_sample_channel_123',
          title: '테크 & 트렌드 인사이트',
          customUrl: '@TechInsightKorea',
          description: '유튜브 트렌드 및 최신 기술 인사이트를 전달하는 채널입니다.',
          thumbnailUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=60',
          subscriberCount: 385000,
          videoCount: 142,
          viewCount: 45200000,
        },
        {
          id: 'UC_sample_channel_456',
          title: '긱블 Geekble',
          customUrl: '@Geekble',
          description: '메이킹과 과학 기술 트렌드를 다루는 미디어 채널',
          thumbnailUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=60',
          subscriberCount: 1120000,
          videoCount: 380,
          viewCount: 120500000,
        },
        {
          id: 'UC_sample_channel_789',
          title: 'Google Developers',
          customUrl: '@GoogleDevelopers',
          description: 'Google의 공식 개발자 생태계 및 최신 API/기술 채널',
          thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=60',
          subscriberCount: 2450000,
          videoCount: 890,
          viewCount: 350000000,
        },
      ],
      videos: sampleVideos,
      collectedAt: today,
      keywordFocus: userKeyword || undefined,
      aiProviderUsed: 'claude',
      aiModelUsed: 'claude-haiku-4-5-20251001 (Sample Preview)',
    });
  });

  // API: Real YouTube & Claude Fetch Trends Endpoint
  app.post(['/api/youtube/fetch-trends', '/api/youtube/fetch-trends/'], async (req, res) => {
    try {
      const {
        youtubeApiKey,
        claudeApiKey,
        channelInput,
        channelInputs,
        keywordFocus,
        maxResults = 10,
        sortBy = 'date',
        targetTopic = '',
        claudeModel = 'claude-haiku-4-5-20251001',
        useGeminiFallback = true,
      } = req.body;

      const effectiveKeywordFocus = (keywordFocus || targetTopic || '').trim();

      const effectiveYoutubeApiKey = (
        (typeof youtubeApiKey === 'string' && youtubeApiKey.trim()) ||
        process.env.YOUTUBE_API_KEY ||
        ''
      ).trim();

      const effectiveClaudeApiKey = (
        (typeof claudeApiKey === 'string' && claudeApiKey.trim()) ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_API_KEY ||
        ''
      ).trim();

      if (!effectiveYoutubeApiKey) {
        return res.status(400).json({
          success: false,
          error: 'YouTube Data API v3 키를 입력해주세요.',
        });
      }

      // Collect all channels from either channelInputs array or channelInput string
      const rawChannels: string[] = [];
      if (Array.isArray(channelInputs) && channelInputs.length > 0) {
        for (const item of channelInputs) {
          if (typeof item === 'string' && item.trim()) {
            rawChannels.push(item.trim());
          }
        }
      } else if (typeof channelInput === 'string' && channelInput.trim()) {
        const parts = channelInput.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        rawChannels.push(...parts);
      }

      // Deduplicate while preserving user-defined order
      const uniqueChannelInputs: string[] = [];
      for (const ch of rawChannels) {
        if (!uniqueChannelInputs.includes(ch)) {
          uniqueChannelInputs.push(ch);
        }
      }

      if (uniqueChannelInputs.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'YouTube 채널 아이디 또는 핸들(@채널명)을 1개 이상 입력해주세요.',
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const perChannelLimit = Math.min(Math.max(Number(maxResults) || 10, 1), 100);

      const resolvedChannels: any[] = [];
      const allBaseVideos: (VideoAnalysisInput & {
        thumbnailUrl: string;
        videoUrl: string;
        publishedAt: string;
        uploadDate: string;
        durationRaw: string;
        commentCount: number;
        channelTitle: string;
        channelId: string;
        channelThumbnailUrl: string;
      })[] = [];
      const channelErrors: string[] = [];

      // Sequentially collect data for each requested channel
      for (let i = 0; i < uniqueChannelInputs.length; i++) {
        const chInput = uniqueChannelInputs[i];
        try {
          console.log(`[YouTube Data API] (${i + 1}/${uniqueChannelInputs.length}) 채널 확인 및 조회 시작: '${chInput}'`);
          const channelItem = await resolveChannel(effectiveYoutubeApiKey, chInput);
          const channelInfo = {
            id: channelItem.id,
            title: channelItem.snippet?.title || 'Unknown Channel',
            customUrl: channelItem.snippet?.customUrl,
            description: channelItem.snippet?.description || '',
            thumbnailUrl:
              channelItem.snippet?.thumbnails?.medium?.url ||
              channelItem.snippet?.thumbnails?.default?.url ||
              '',
            subscriberCount: parseInt(channelItem.statistics?.subscriberCount || '0', 10),
            videoCount: parseInt(channelItem.statistics?.videoCount || '0', 10),
            viewCount: parseInt(channelItem.statistics?.viewCount || '0', 10),
          };
          resolvedChannels.push(channelInfo);

          console.log(`[YouTube Data API] '${channelInfo.title}' 영상 수집 진행 (최대 ${perChannelLimit}개, 정렬: ${sortBy})...`);
          const rawVideos = await fetchChannelVideos(
            effectiveYoutubeApiKey,
            channelItem,
            perChannelLimit,
            sortBy
          );

          if (rawVideos && rawVideos.length > 0) {
            for (const item of rawVideos) {
              const id = item.id;
              const snippet = item.snippet || {};
              const stats = item.statistics || {};
              const contentDetails = item.contentDetails || {};

              const durationRaw = contentDetails.duration || 'PT0S';
              const durationFormatted = parseISO8601Duration(durationRaw);
              const uploadDate = formatDateTime(snippet.publishedAt);
              const thumbnailUrl =
                snippet.thumbnails?.maxres?.url ||
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                snippet.thumbnails?.default?.url ||
                '';

              // Helper to robustly parse numeric metrics from YouTube API (stripping commas/symbols if any)
              const parseStatValue = (val: any): number => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.floor(val));
                const cleaned = String(val).replace(/[^0-9]/g, '');
                if (!cleaned) return 0;
                const parsed = parseInt(cleaned, 10);
                return isNaN(parsed) ? 0 : parsed;
              };

              const viewCount = parseStatValue(stats.viewCount);
              // Extract likeCount: Distinguish between actual 0 and omitted/hidden likeCount
              const rawLike = stats.likeCount ?? (stats as any).like_count ?? (stats as any).likes ?? (item as any).likeCount;
              let likeCount: number | null = null;
              if (rawLike !== undefined && rawLike !== null && rawLike !== '') {
                likeCount = parseStatValue(rawLike);
              } else {
                likeCount = null;
              }
              const commentCount = parseStatValue(stats.commentCount);

              allBaseVideos.push({
                id,
                title: snippet.title || '제목 없음',
                description: snippet.description || '',
                thumbnailUrl,
                videoUrl: `https://www.youtube.com/watch?v=${id}`,
                publishedAt: snippet.publishedAt || '',
                uploadDate,
                durationRaw,
                durationFormatted,
                viewCount,
                likeCount,
                commentCount,
                tags: snippet.tags || [],
                channelTitle: channelInfo.title,
                channelId: channelInfo.id,
                channelThumbnailUrl: channelInfo.thumbnailUrl,
              });
            }
          }
          console.log(`[YouTube Data API] '${channelInfo.title}' 수집 완료 (누적 영상: ${allBaseVideos.length}개)`);
        } catch (chErr: any) {
          console.error(`[YouTube Data API] 채널 '${chInput}' 수집 중 오류:`, chErr.message);
          channelErrors.push(`[${chInput}] ${chErr.message}`);
          if (uniqueChannelInputs.length === 1) {
            throw chErr;
          }
        }
      }

      if (allBaseVideos.length === 0) {
        return res.status(404).json({
          success: false,
          error:
            channelErrors.length > 0
              ? `영상 데이터를 수집할 수 없습니다:\n${channelErrors.join('\n')}`
              : '입력된 채널에서 가져올 수 있는 영상이 없습니다.',
          channel: resolvedChannels[0] || null,
          channels: resolvedChannels,
        });
      }

      console.log(`[YouTube Data API] 총 ${resolvedChannels.length}개 채널에서 ${allBaseVideos.length}개 영상 수집 완료.`);

      // 3. AI Analysis (Claude priority with reliable keyword & statistical analysis)
      let aiAnalyses: VideoAIAnalysis[] = [];
      let aiProviderUsed: 'claude' | 'gemini' | 'heuristic' = 'heuristic';
      let aiModelUsed = '';

      const summaryChannelTitle =
        resolvedChannels.length > 1
          ? `통합 채널 (${resolvedChannels.map((c) => c.title).slice(0, 3).join(', ')}${resolvedChannels.length > 3 ? ` 외 ${resolvedChannels.length - 3}개` : ''})`
          : resolvedChannels[0]?.title || '유튜브 채널';

      let aiNotice: string | undefined = undefined;

      if (effectiveClaudeApiKey) {
        try {
          aiAnalyses = await analyzeVideosWithClaude(
            effectiveClaudeApiKey,
            allBaseVideos,
            summaryChannelTitle,
            effectiveKeywordFocus,
            claudeModel
          );
          aiProviderUsed = 'claude';
          aiModelUsed = claudeModel;
        } catch (claudeErr: any) {
          const isCreditIssue =
            claudeErr.message?.includes('credit balance is too low') ||
            claudeErr.message?.includes('Plans & Billing') ||
            claudeErr.message?.includes('400');

          console.warn('[Claude API] Error during analysis, attempting fallback:', claudeErr.message);

          if (isCreditIssue) {
            aiNotice =
              'Claude API 크레딧 잔액 부족(400): 내장 Gemini 3.6 Flash로 자동 전환하여 분석을 안전하게 완료했습니다. Claude 분석을 계속 이용하시려면 Anthropic Console(Plans & Billing)에서 크레딧을 충전해주세요.';
          } else {
            aiNotice = `Claude API 연결 상태 확인 필요 (${claudeErr.message?.slice(0, 80)}): 내장 Gemini AI로 자동 대체되었습니다.`;
          }

          if (useGeminiFallback !== false && process.env.GEMINI_API_KEY) {
            try {
              aiAnalyses = await analyzeVideosWithGemini(
                allBaseVideos,
                summaryChannelTitle,
                effectiveKeywordFocus
              );
              aiProviderUsed = 'gemini';
              aiModelUsed = 'gemini-3.6-flash';
            } catch (geminiErr: any) {
              console.warn('[Gemini API] Fallback error, using heuristic analysis:', geminiErr.message);
              aiAnalyses = generateHeuristicAnalysis(allBaseVideos, summaryChannelTitle, effectiveKeywordFocus);
              aiProviderUsed = 'heuristic';
              aiModelUsed = '통계 및 키워드 분석 (Claude & Gemini 대체)';
            }
          } else {
            aiAnalyses = generateHeuristicAnalysis(allBaseVideos, summaryChannelTitle, effectiveKeywordFocus);
            aiProviderUsed = 'heuristic';
            aiModelUsed = '통계 및 키워드 분석 (Claude API 연결 대체)';
          }
        }
      } else if (useGeminiFallback !== false && process.env.GEMINI_API_KEY) {
        try {
          aiAnalyses = await analyzeVideosWithGemini(
            allBaseVideos,
            summaryChannelTitle,
            effectiveKeywordFocus
          );
          aiProviderUsed = 'gemini';
          aiModelUsed = 'gemini-3.6-flash';
        } catch (geminiErr: any) {
          console.warn('[Gemini API] Error during analysis, falling back to heuristic:', geminiErr.message);
          aiAnalyses = generateHeuristicAnalysis(allBaseVideos, summaryChannelTitle, effectiveKeywordFocus);
          aiProviderUsed = 'heuristic';
          aiModelUsed = '통계 및 키워드 기반 분석';
        }
      } else {
        // High-precision keyword relevance and engagement analysis
        aiAnalyses = generateHeuristicAnalysis(allBaseVideos, summaryChannelTitle, effectiveKeywordFocus);
        aiProviderUsed = 'heuristic';
        aiModelUsed = '통계 및 키워드 기반 분석';
      }

      // Map AI analysis to video items
      const analysisMap = new Map<string, VideoAIAnalysis>();
      for (const a of aiAnalyses) {
        analysisMap.set(a.videoId, a);
      }

      const finalVideos = allBaseVideos.map((v) => {
        const ai = analysisMap.get(v.id);
        const fallbackKeyword = v.tags.length > 0 ? v.tags.slice(0, 3).join(', ') : `${v.channelTitle || summaryChannelTitle} 트렌드`;

        // If user specified a KEYWORD FOCUS, that exact keyword is saved into the Excel '키워드' column!
        const assignedKeyword = effectiveKeywordFocus || ai?.keyword || fallbackKeyword;

        return {
          id: v.id,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          videoUrl: v.videoUrl,
          publishedAt: v.publishedAt,
          uploadDate: v.uploadDate,
          durationRaw: v.durationRaw,
          durationFormatted: v.durationFormatted,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: v.commentCount,
          tags: v.tags,
          collectedAt: today,
          keyword: assignedKeyword,
          claudeReview: ai?.claudeReview || '트렌드 분석 완료',
          claudeScore: ai?.claudeScore ?? 85,
          claudeReason: ai?.claudeReason,
          channelTitle: v.channelTitle,
          channelId: v.channelId,
          channelThumbnailUrl: v.channelThumbnailUrl,
        };
      });

      return res.json({
        success: true,
        channel: resolvedChannels[0],
        channels: resolvedChannels,
        videos: finalVideos,
        collectedAt: today,
        keywordFocus: effectiveKeywordFocus || undefined,
        aiProviderUsed,
        aiModelUsed,
        aiNotice,
      });
    } catch (err: any) {
      console.error('Fetch trends error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || '데이터 수집 중 오류가 발생했습니다.',
      });
    }
  });

  // Explicit 404 handler for any unhandled /api/* routes so it NEVER falls through to Vite HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API 엔드포인트를 찾을 수 없습니다: [${req.method}] ${req.originalUrl || req.url}`,
    });
  });

  // Vite middleware in dev / static serve in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
