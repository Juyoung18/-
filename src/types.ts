export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  publishedAt: string;
  uploadDate: string; // Formatted YYYY-MM-DD HH:mm
  durationRaw: string; // PT10M24S
  durationFormatted: string; // e.g. 10분 24초
  viewCount: number;
  likeCount: number | null;
  commentCount: number;
  tags: string[];
  collectedAt: string; // Formatted YYYY-MM-DD
  keyword: string;
  claudeReview: string;
  claudeScore: number;
  claudeReason?: string;
  channelTitle?: string;
  channelId?: string;
  channelThumbnailUrl?: string;
}

export interface ChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
}

export interface FetchTrendsRequest {
  youtubeApiKey: string;
  claudeApiKey: string;
  channelInput: string;
  channelInputs?: string[]; // 1 to 10 channels for multi-channel collection
  keywordFocus?: string; // User-defined target keyword focus
  maxResults?: number;
  sortBy?: 'date' | 'viewCount';
  targetTopic?: string;
  claudeModel?: string;
  useGeminiFallback?: boolean;
}

export interface FetchTrendsResponse {
  success: boolean;
  channel: ChannelInfo;
  channels?: ChannelInfo[]; // Array of collected channels
  videos: YouTubeVideoItem[];
  collectedAt: string;
  keywordFocus?: string;
  aiProviderUsed: 'claude' | 'gemini' | 'heuristic';
  aiModelUsed?: string;
  aiNotice?: string;
  error?: string;
}

export interface ExcelColumnRow {
  '수집일': string;
  '키워드': string;
  '영상 제목': string;
  '썸네일 URL': string;
  '영상 URL': string;
  '영상 ID': string;
  '조회수': number;
  '좋아요수': number | string;
  '업로드 날짜': string;
  '영상 길이': string;
  'Claude 한줄평': string;
  'Claude 관련도 점수': number;
}
