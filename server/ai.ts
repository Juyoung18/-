import { GoogleGenAI } from '@google/genai';

/**
 * Safely sanitizes any string to ensure it is valid, well-formed UTF-16 / UTF-8
 * with no unpaired/isolated high or low surrogates.
 */
export function sanitizeUnicodeString(input: string): string {
  if (!input) return '';
  let str = String(input);

  // 1. If environment supports toWellFormed() (Node.js 20+), use it to convert lone surrogates to U+FFFD
  if (typeof (str as any).toWellFormed === 'function') {
    str = (str as any).toWellFormed();
  } else {
    // Replace lone high surrogates not followed by a low surrogate
    str = str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
    // Replace lone low surrogates not preceded by a high surrogate
    str = str.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  }

  return str;
}

/**
 * Safely slices a string by Unicode code points (graphemes/code-points)
 * instead of raw UTF-16 code units so surrogate pairs (emojis/symbols) are never split in half.
 */
export function safeUnicodeSlice(input: string, maxCodePoints: number): string {
  if (!input) return '';
  const clean = sanitizeUnicodeString(input);
  const codePoints = Array.from(clean);
  if (codePoints.length <= maxCodePoints) {
    return clean;
  }
  return codePoints.slice(0, maxCodePoints).join('');
}

export interface VideoAnalysisInput {
  id: string;
  title: string;
  description: string;
  viewCount: number;
  likeCount: number | null;
  tags: string[];
  durationFormatted: string;
  channelTitle?: string;
}

export interface VideoAIAnalysis {
  videoId: string;
  keyword: string;
  claudeReview: string;
  claudeScore: number;
  claudeReason?: string;
}

async function analyzeVideosWithClaudeSingleBatch(
  claudeApiKey: string,
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string,
  modelName: string = 'claude-haiku-4-5-20251001'
): Promise<VideoAIAnalysis[]> {
  const hasKeywordFocus = Boolean(keywordFocus && keywordFocus.trim());
  const focus = sanitizeUnicodeString(keywordFocus?.trim() || '');
  const safeChannelTitle = sanitizeUnicodeString(channelTitle);

  const prompt = `당신은 유튜브 트렌드 분석 및 콘텐츠 전략 전문가 AI(Claude)입니다.
아래는 '${safeChannelTitle}' 채널의 영상 목록입니다.

${
  hasKeywordFocus
    ? `★ [핵심 지침 - KEYWORD FOCUS 기준 평가] ★
사용자가 지정한 분석 기준 키워드는 [ "${focus}" ] 입니다.
1. claudeScore (Claude 관련도 점수: 0~100점):
   - 해당 영상이 사용자의 지정 키워드 [ "${focus}" ]와 얼마나 밀접하게 관련되어 있는지와, 해당 키워드 관점에서 얼마나 가치 있는 트렌드/흥행성을 지니는지를 기준으로 점수를 산출하세요.
   - 키워드와 직접적 관련성이 높고 핵심을 다룰수록 85~99점
   - 부분적 또는 간접적으로 다룬다면 65~84점
   - 키워드와의 관련성이 낮거나 주제가 동떨어져 있다면 30~60점을 부여하세요.
2. claudeReview (Claude 한줄평):
   - 지정 키워드 [ "${focus}" ]의 관점에서 이 영상이 시청자에게 주는 핵심 가치, 트렌드 적합도, 시청 포인트를 날카롭고 유용하게 1문장(존댓말)으로 평가하세요.
3. keyword:
   - 사용자가 입력한 키워드 [ "${focus}" ]를 반드시 포함하여 작성하세요.
4. claudeReason:
   - 지정 키워드 [ "${focus}" ]와의 관련도 평가 근거를 1문장으로 요약하세요.`
    : `각 영상에 대해 다음 4가지 항목을 작성해주세요:
1. keyword: 영상의 핵심 주제 및 트렌드 키워드 (1~3개)
2. claudeReview: 시청 포인트 및 트렌드 흥행 요인을 담은 'Claude 한줄평' (1문장)
3. claudeScore: 유튜브 트렌드 적합도 및 관심도 점수 (1~100점)
4. claudeReason: 점수 및 한줄평 산출 배경 (1문장 요약)`
}

[분석 대상 영상 목록]:
${videos.map((v, i) => `[${i + 1}] ID: ${v.id}
제목: ${safeUnicodeSlice(v.title, 120)}${v.channelTitle ? ` (채널: ${safeUnicodeSlice(v.channelTitle, 50)})` : ''}
조회수: ${v.viewCount.toLocaleString()} | 좋아요: ${v.likeCount !== null && v.likeCount !== undefined ? v.likeCount.toLocaleString() : '미제공'} | 길이: ${v.durationFormatted}
태그: ${v.tags.slice(0, 8).map(t => safeUnicodeSlice(t, 25)).join(', ') || '없음'}
설명 요약: ${safeUnicodeSlice(v.description, 150)}
`).join('\n')}

반드시 유효한 JSON 형식으로만 응답해주세요. 마크다운 코드블록(\`\`\`json ... \`\`\`)으로 감싸서 아래 스키마의 배열 형태로 출력하세요:
[
  {
    "videoId": "영상ID",
    "keyword": "${hasKeywordFocus ? focus : '키워드1, 키워드2'}",
    "claudeReview": "영상에 대한 통찰력 있는 한줄평",
    "claudeScore": 92,
    "claudeReason": "이유 설명"
  }
]`;

  const safePrompt = sanitizeUnicodeString(prompt);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 8192,
      system:
        '당신은 유튜브 트렌드 분석 및 콘텐츠 전략 전문가 AI입니다. 반드시 요청된 형식의 JSON 배열(Array of Objects)만 출력하세요. 인사말, 마크다운 설명, 머리말, 꼬리말은 절대 포함하지 마세요.',
      messages: [
        {
          role: 'user',
          content: safePrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Claude API 오류 (${response.status}): ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  
  // Collect all text blocks from content array (handling thinking blocks or chunked text)
  let textContent = '';
  if (Array.isArray(result.content)) {
    textContent = result.content
      .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
      .join('\n');
    if (!textContent) {
      textContent = result.content.map((c: any) => c.text || '').join('\n');
    }
  } else if (typeof result.content === 'string') {
    textContent = result.content;
  }

  return parseClaudeJsonResponse(textContent, videos, channelTitle, keywordFocus);
}

function parseClaudeJsonResponse(
  rawText: string,
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string
): VideoAIAnalysis[] {
  if (!rawText || !rawText.trim()) {
    return generateHeuristicAnalysis(videos, channelTitle, keywordFocus);
  }

  let parsedList: any[] | null = null;

  // 1. Try markdown code block extraction
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) {
        parsedList = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const candidate = (parsed as any).videos || (parsed as any).results || (parsed as any).data || (parsed as any).analyses;
        if (Array.isArray(candidate)) parsedList = candidate;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // 2. Direct JSON.parse
  if (!parsedList) {
    try {
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed)) {
        parsedList = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const candidate = (parsed as any).videos || (parsed as any).results || (parsed as any).data || (parsed as any).analyses;
        if (Array.isArray(candidate)) parsedList = candidate;
      }
    } catch {
      // Continue
    }
  }

  // 3. Substring between outermost brackets [ ... ]
  if (!parsedList) {
    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const arrayStr = rawText.slice(firstBracket, lastBracket + 1);
      try {
        const cleaned = arrayStr.replace(/,\s*([\]}])/g, '$1');
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) parsedList = parsed;
      } catch {
        // Continue
      }
    }
  }

  // 4. Substring between outermost braces { ... }
  if (!parsedList) {
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const objStr = rawText.slice(firstBrace, lastBrace + 1);
      try {
        const cleaned = objStr.replace(/,\s*([\]}])/g, '$1');
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          parsedList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const candidate = (parsed as any).videos || (parsed as any).results || (parsed as any).data || (parsed as any).analyses;
          if (Array.isArray(candidate)) parsedList = candidate;
        }
      } catch {
        // Continue
      }
    }
  }

  // 5. Truncated JSON recovery (if last bracket ] was missing due to cutoff)
  if (!parsedList) {
    const firstBracket = rawText.indexOf('[');
    if (firstBracket !== -1) {
      const truncated = rawText.slice(firstBracket).trim();
      const lastObjEnd = truncated.lastIndexOf('}');
      if (lastObjEnd !== -1) {
        const recoveredStr = truncated.slice(0, lastObjEnd + 1).replace(/,\s*([\]}])/g, '$1') + '\n]';
        try {
          const parsed = JSON.parse(recoveredStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedList = parsed;
          }
        } catch {
          // Continue
        }
      }
    }
  }

  // 6. Regex individual object extraction: extract all { "videoId": ... } items
  if (!parsedList || parsedList.length === 0) {
    const objectRegex = /\{[^{}]*"videoId"[^{}]*\}/g;
    const matches = rawText.match(objectRegex);
    if (matches && matches.length > 0) {
      const recovered: any[] = [];
      for (const m of matches) {
        try {
          const cleanedObj = m.replace(/,\s*([\]}])/g, '$1');
          const obj = JSON.parse(cleanedObj);
          if (obj && obj.videoId) {
            recovered.push(obj);
          }
        } catch {
          const vidMatch = m.match(/"videoId"\s*:\s*"([^"]+)"/);
          const kwMatch = m.match(/"keyword"\s*:\s*"([^"]+)"/);
          const revMatch = m.match(/"claudeReview"\s*:\s*"([^"]+)"/);
          const scoreMatch = m.match(/"claudeScore"\s*:\s*(\d+)/);
          const rsnMatch = m.match(/"claudeReason"\s*:\s*"([^"]+)"/);
          if (vidMatch) {
            recovered.push({
              videoId: vidMatch[1],
              keyword: kwMatch ? kwMatch[1] : (keywordFocus || '트렌드'),
              claudeReview: revMatch ? revMatch[1] : '트렌드 분석 완료',
              claudeScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 85,
              claudeReason: rsnMatch ? rsnMatch[1] : undefined,
            });
          }
        }
      }
      if (recovered.length > 0) {
        parsedList = recovered;
      }
    }
  }

  // Map parsed items by videoId
  const resultMap = new Map<string, VideoAIAnalysis>();
  if (parsedList && Array.isArray(parsedList)) {
    for (const item of parsedList) {
      if (!item || typeof item !== 'object') continue;
      const vId = String(item.videoId || item.id || '').trim();
      if (!vId) continue;

      resultMap.set(vId, {
        videoId: vId,
        keyword: String(item.keyword || keywordFocus || '트렌드').trim(),
        claudeReview: String(item.claudeReview || item.review || '트렌드 분석 완료').trim(),
        claudeScore: typeof item.claudeScore === 'number' ? item.claudeScore : 85,
        claudeReason: item.claudeReason ? String(item.claudeReason).trim() : undefined,
      });
    }
  }

  // Ensure every video in this batch has an entry
  const fallbackList = generateHeuristicAnalysis(videos, channelTitle, keywordFocus);
  const finalResults: VideoAIAnalysis[] = videos.map((v, index) => {
    if (resultMap.has(v.id)) {
      return resultMap.get(v.id)!;
    }
    if (parsedList && parsedList[index]) {
      const item = parsedList[index];
      if (item && (item.claudeReview || item.keyword)) {
        return {
          videoId: v.id,
          keyword: String(item.keyword || keywordFocus || '트렌드').trim(),
          claudeReview: String(item.claudeReview || item.review || '트렌드 분석 완료').trim(),
          claudeScore: typeof item.claudeScore === 'number' ? item.claudeScore : 85,
          claudeReason: item.claudeReason ? String(item.claudeReason).trim() : undefined,
        };
      }
    }
    return fallbackList[index] || {
      videoId: v.id,
      keyword: keywordFocus || '트렌드',
      claudeReview: '트렌드 분석 완료',
      claudeScore: 85,
    };
  });

  return finalResults;
}

export async function analyzeVideosWithClaude(
  claudeApiKey: string,
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string,
  modelName: string = 'claude-haiku-4-5-20251001'
): Promise<VideoAIAnalysis[]> {
  if (videos.length <= 25) {
    return analyzeVideosWithClaudeSingleBatch(claudeApiKey, videos, channelTitle, keywordFocus, modelName);
  }

  const chunkSize = 25;
  const chunks: VideoAnalysisInput[][] = [];
  for (let i = 0; i < videos.length; i += chunkSize) {
    chunks.push(videos.slice(i, i + chunkSize));
  }

  const results: VideoAIAnalysis[] = new Array(videos.length);
  // Concurrency of 2 prevents reverse-proxy 60s gateway timeouts for 100-500 videos while staying within rate limits
  const concurrency = 2;

  for (let i = 0; i < chunks.length; i += concurrency) {
    const currentBatch = chunks.slice(i, i + concurrency);
    const promises = currentBatch.map(async (chunk, batchOffset) => {
      const globalChunkIndex = i + batchOffset;
      const startIndex = globalChunkIndex * chunkSize;
      try {
        const chunkResults = await analyzeVideosWithClaudeSingleBatch(
          claudeApiKey,
          chunk,
          channelTitle,
          keywordFocus,
          modelName
        );
        for (let j = 0; j < chunkResults.length; j++) {
          results[startIndex + j] = chunkResults[j];
        }
      } catch (chunkErr: any) {
        console.warn(
          `[Claude API] Chunk ${globalChunkIndex + 1}/${chunks.length} 처리 중 경고, 해당 배치만 대체 분석 적용:`,
          chunkErr.message
        );
        const fallbackResults = generateHeuristicAnalysis(chunk, channelTitle, keywordFocus);
        for (let j = 0; j < fallbackResults.length; j++) {
          results[startIndex + j] = fallbackResults[j];
        }
      }
    });

    await Promise.all(promises);
  }

  return results.filter(Boolean);
}

async function analyzeVideosWithGeminiSingleBatch(
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string
): Promise<VideoAIAnalysis[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const hasKeywordFocus = Boolean(keywordFocus && keywordFocus.trim());
  const focus = keywordFocus?.trim() || '';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `당신은 유튜브 트렌드 분석 전문가입니다.
'${channelTitle}' 채널의 영상 목록을 분석하세요.
${
  hasKeywordFocus
    ? `사용자가 지정한 기준 키워드는 [ "${focus}" ] 입니다.
각 영상이 이 키워드와 얼마나 관련이 깊은지 기준으로 관련도 점수(claudeScore: 0~100점)를 산출하고, 키워드 관점에서의 한줄평(claudeReview)을 작성하세요.`
    : '각 영상의 핵심 키워드, 한줄평, 트렌드 점수(1~100)를 작성하세요.'
}

[영상 목록]:
${videos.map((v, i) => `[${i + 1}] ID: ${v.id} | 제목: ${v.title} | 조회수: ${v.viewCount} | 태그: ${v.tags.slice(0, 5).join(', ')}`).join('\n')}

출력은 반드시 JSON 배열로만 응답하세요:
[
  {
    "videoId": "영상ID",
    "keyword": "${hasKeywordFocus ? focus : '키워드1, 키워드2'}",
    "claudeReview": "핵심 흥행 요인 및 내용을 압축한 한줄평",
    "claudeScore": 90,
    "claudeReason": "평가 배경"
  }
]`;

  // Candidate models compliant with modern @google/genai guidelines: gemini-3.8-flash, gemini-3.1-flash-lite
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        if (text) {
          return parseClaudeJsonResponse(text, videos, channelTitle, keywordFocus);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Model ${modelName} attempt ${attempt + 1} error:`, err.message || err);
        // If 503 or transient rate limit, wait briefly before retrying or switching models
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }

  console.warn('[Gemini API] All Gemini models failed, falling back to heuristic analysis:', lastError?.message);
  return generateHeuristicAnalysis(videos, channelTitle, keywordFocus);
}

export async function analyzeVideosWithGemini(
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string
): Promise<VideoAIAnalysis[]> {
  if (videos.length <= 25) {
    return analyzeVideosWithGeminiSingleBatch(videos, channelTitle, keywordFocus);
  }

  const chunkSize = 25;
  const results: VideoAIAnalysis[] = [];
  for (let i = 0; i < videos.length; i += chunkSize) {
    const chunk = videos.slice(i, i + chunkSize);
    try {
      const chunkResults = await analyzeVideosWithGeminiSingleBatch(chunk, channelTitle, keywordFocus);
      results.push(...chunkResults);
    } catch (chunkErr: any) {
      console.warn(`[Gemini API] Chunk error, using heuristic for chunk:`, chunkErr.message);
      const fallbackResults = generateHeuristicAnalysis(chunk, channelTitle, keywordFocus);
      results.push(...fallbackResults);
    }
  }
  return results;
}

export function generateHeuristicAnalysis(
  videos: VideoAnalysisInput[],
  channelTitle: string,
  keywordFocus?: string
): VideoAIAnalysis[] {
  const focusWords = keywordFocus
    ? keywordFocus
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((w) => w.length > 1)
    : [];

  return videos.map((v) => {
    const textBlob = `${v.title} ${v.description} ${v.tags.join(' ')}`.toLowerCase();
    
    // Keyword match calculation
    let matchCount = 0;
    if (focusWords.length > 0) {
      for (const w of focusWords) {
        if (textBlob.includes(w)) matchCount++;
      }
    }

    const engagementRatio = v.viewCount > 0 && v.likeCount !== null && v.likeCount !== undefined ? (v.likeCount / v.viewCount) * 100 : 0;
    
    let baseScore = 70;
    if (focusWords.length > 0) {
      if (matchCount >= focusWords.length) {
        baseScore = 90;
      } else if (matchCount > 0) {
        baseScore = 80;
      } else {
        baseScore = 55;
      }
    }

    if (v.viewCount > 500000) baseScore += 6;
    else if (v.viewCount > 100000) baseScore += 3;

    if (engagementRatio > 3) baseScore += 4;

    const finalScore = Math.min(99, Math.max(35, Math.round(baseScore)));
    const assignedKeyword = keywordFocus && keywordFocus.trim()
      ? keywordFocus.trim()
      : v.tags.length > 0
      ? v.tags.slice(0, 3).join(', ')
      : `${v.channelTitle || channelTitle} 트렌드`;

    const review = keywordFocus && keywordFocus.trim()
      ? `지정 키워드 '${keywordFocus.trim()}' 관점에서 시청자 관심과 반응도를 이끌어낸 콘텐츠입니다.`
      : `조회수 ${v.viewCount.toLocaleString()}회와 높은 반응도를 기록하며 시청자 관심사를 입증한 인기 영상입니다.`;

    return {
      videoId: v.id,
      keyword: assignedKeyword,
      claudeReview: review,
      claudeScore: finalScore,
      claudeReason: keywordFocus && keywordFocus.trim()
        ? `키워드 '${keywordFocus.trim()}' 일치도(${matchCount}/${focusWords.length || 1}) 및 시청 지표 분석`
        : `참여율 ${(engagementRatio).toFixed(1)}% 및 시청 지표 기반 트렌드 분석`,
    };
  });
}
