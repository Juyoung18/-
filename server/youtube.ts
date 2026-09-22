export function parseISO8601Duration(duration: string): string {
  if (!duration) return '0초';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}분`);
  parts.push(`${seconds}초`);

  return parts.join(' ');
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

function checkYouTubeApiError(data: any, status: number) {
  if (data?.error) {
    if (data.error.code === 400 || data.error.status === 'INVALID_ARGUMENT') {
      throw new Error(`YouTube API 오류: API 키가 유효하지 않거나 잘못되었습니다. (${data.error.message})`);
    }
    if (data.error.code === 403) {
      throw new Error(`YouTube API 오류 (403): 일일 할당량(Quota) 초과 또는 YouTube Data API v3 서비스 미활성화 상태입니다. (${data.error.message})`);
    }
    throw new Error(`YouTube API 오류 (${status}): ${data.error.message || '요청 처리 실패'}`);
  }
}

export async function resolveChannel(apiKey: string, channelInput: string) {
  let cleanInput = channelInput.trim();

  // Extract from full URL if pasted
  if (cleanInput.includes('youtube.com/')) {
    const handleMatch = cleanInput.match(/@([^/?&#]+)/);
    if (handleMatch) {
      cleanInput = `@${handleMatch[1]}`;
    } else {
      const channelMatch = cleanInput.match(/\/channel\/([a-zA-Z0-9_-]{24})/);
      if (channelMatch) {
        cleanInput = channelMatch[1];
      } else {
        const cMatch = cleanInput.match(/\/(?:c|user)\/([^/?&#]+)/);
        if (cMatch) {
          cleanInput = cMatch[1];
        }
      }
    }
  }

  // Case 1: Direct Channel ID (usually starts with UC and has 24 chars)
  if (cleanInput.startsWith('UC') && cleanInput.length === 24) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${cleanInput}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    checkYouTubeApiError(data, res.status);
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
  }

  // Case 2: Handle starting with @ or plain text handle
  const handleName = cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`;
  const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${encodeURIComponent(handleName)}&key=${apiKey}`;
  const handleRes = await fetch(handleUrl);
  const handleData = await handleRes.json();
  checkYouTubeApiError(handleData, handleRes.status);
  if (handleData.items && handleData.items.length > 0) {
    return handleData.items[0];
  }

  // Case 3: Try forUsername
  const userUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forUsername=${encodeURIComponent(cleanInput)}&key=${apiKey}`;
  const userRes = await fetch(userUrl);
  const userData = await userRes.json();
  checkYouTubeApiError(userData, userRes.status);
  if (userData.items && userData.items.length > 0) {
    return userData.items[0];
  }

  // Case 4: Search API for channel
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanInput)}&maxResults=1&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  checkYouTubeApiError(searchData, searchRes.status);
  if (searchData.items && searchData.items.length > 0) {
    const channelId = searchData.items[0].snippet.channelId || searchData.items[0].id.channelId;
    if (channelId) {
      const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${apiKey}`;
      const detailsRes = await fetch(channelDetailsUrl);
      const detailsData = await detailsRes.json();
      checkYouTubeApiError(detailsData, detailsRes.status);
      if (detailsData.items && detailsData.items.length > 0) {
        return detailsData.items[0];
      }
    }
  }

  throw new Error(`채널을 찾을 수 없습니다: '${channelInput}'. 올바른 채널 ID (UC...) 또는 핸들(@채널명)을 확인해주세요.`);
}

export async function fetchChannelVideos(
  apiKey: string,
  channelItem: any,
  maxResults: number = 10,
  sortBy: 'date' | 'viewCount' = 'date'
) {
  const channelId = channelItem.id;
  const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
  const targetCount = Math.min(Math.max(maxResults, 1), 100);
  const videoIds: string[] = [];

  if (sortBy === 'date' && uploadsPlaylistId) {
    // 1 quota point playlistItems API per page of 50
    let pageToken: string | undefined = undefined;
    while (videoIds.length < targetCount) {
      const perPage = Math.min(targetCount - videoIds.length, 50);
      let playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${uploadsPlaylistId}&maxResults=${perPage}&key=${apiKey}`;
      if (pageToken) {
        playlistUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }
      const res = await fetch(playlistUrl);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`YouTube API 오류 (PlaylistItems): ${data.error?.message || res.statusText}`);
      }
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          if (vid && !videoIds.includes(vid)) {
            videoIds.push(vid);
          }
        }
      }
      pageToken = data.nextPageToken;
      if (!pageToken || !data.items || data.items.length === 0) {
        break;
      }
    }
  } else {
    // Search API for popular videos or when uploads playlist is unavailable
    const orderParam = sortBy === 'viewCount' ? 'viewCount' : 'date';
    let pageToken: string | undefined = undefined;
    while (videoIds.length < targetCount) {
      const perPage = Math.min(targetCount - videoIds.length, 50);
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=${orderParam}&type=video&maxResults=${perPage}&key=${apiKey}`;
      if (pageToken) {
        searchUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }
      const res = await fetch(searchUrl);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`YouTube API 오류 (Search): ${data.error?.message || res.statusText}`);
      }
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const vid = item.id?.videoId;
          if (vid && !videoIds.includes(vid)) {
            videoIds.push(vid);
          }
        }
      }
      pageToken = data.nextPageToken;
      if (!pageToken || !data.items || data.items.length === 0) {
        break;
      }
    }
  }

  if (videoIds.length === 0) {
    return [];
  }

  // Fetch complete video statistics and details in batches of up to 50 (YouTube API limit per call)
  const allVideoItems: any[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunkIds = videoIds.slice(i, i + 50).map((id) => id.trim()).filter(Boolean);
    if (chunkIds.length === 0) continue;

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${chunkIds.join(',')}&key=${apiKey}`;
    const vRes = await fetch(videosUrl);
    const vData = await vRes.json();
    if (!vRes.ok) {
      throw new Error(`YouTube API 오류 (Videos): ${vData.error?.message || vRes.statusText}`);
    }
    if (vData.items && vData.items.length > 0) {
      allVideoItems.push(...vData.items);
    }
  }

  // Preserve the intended chronological or viewCount order of videoIds
  const videoMap = new Map<string, any>();
  for (const item of allVideoItems) {
    if (item && item.id) {
      videoMap.set(item.id, item);
    }
  }
  const orderedVideos = videoIds.map((id) => videoMap.get(id.trim())).filter(Boolean);

  return orderedVideos.length > 0 ? orderedVideos : allVideoItems;
}
