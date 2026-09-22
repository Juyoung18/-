import * as XLSX from 'xlsx';
import { YouTubeVideoItem, ExcelColumnRow } from '../types.ts';

export function formatNumberWithCommas(n: number): string {
  return (n || 0).toLocaleString('ko-KR');
}

export function exportVideosToExcel(
  videos: YouTubeVideoItem[],
  channelTitle: string = '채널'
): void {
  if (!videos || videos.length === 0) {
    throw new Error('내보낼 영상 데이터가 없습니다.');
  }

  // Exact 12 columns requested by user
  const rows: ExcelColumnRow[] = videos.map((v) => ({
    '수집일': v.collectedAt,
    '키워드': v.keyword,
    '영상 제목': v.title,
    '썸네일 URL': v.thumbnailUrl,
    '영상 URL': v.videoUrl,
    '영상 ID': v.id,
    '조회수': v.viewCount,
    '좋아요수': v.likeCount !== null && v.likeCount !== undefined ? v.likeCount : '미제공',
    '업로드 날짜': v.uploadDate,
    '영상 길이': v.durationFormatted,
    'Claude 한줄평': v.claudeReview,
    'Claude 관련도 점수': v.claudeScore,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set friendly column widths
  worksheet['!cols'] = [
    { wch: 12 }, // 수집일
    { wch: 25 }, // 키워드
    { wch: 45 }, // 영상 제목
    { wch: 35 }, // 썸네일 URL
    { wch: 35 }, // 영상 URL
    { wch: 15 }, // 영상 ID
    { wch: 14 }, // 조회수
    { wch: 12 }, // 좋아요수
    { wch: 18 }, // 업로드 날짜
    { wch: 12 }, // 영상 길이
    { wch: 60 }, // Claude 한줄평
    { wch: 16 }, // Claude 관련도 점수
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '유튜브트렌드데이터');

  // Sanitize filename
  const cleanTitle = channelTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || '유튜브';
  const today = new Date().toISOString().split('T')[0];
  const filename = `유튜브_트렌드_${cleanTitle}_${today}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(workbook, filename);
}

export function exportVideosToCsv(
  videos: YouTubeVideoItem[],
  channelTitle: string = '채널'
): void {
  if (!videos || videos.length === 0) return;

  const headers = [
    '수집일',
    '키워드',
    '영상 제목',
    '썸네일 URL',
    '영상 URL',
    '영상 ID',
    '조회수',
    '좋아요수',
    '업로드 날짜',
    '영상 길이',
    'Claude 한줄평',
    'Claude 관련도 점수',
  ];

  const escapeCsv = (str: any) => {
    const s = String(str ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows = [
    headers.map(escapeCsv).join(','),
    ...videos.map((v) =>
      [
        escapeCsv(v.collectedAt),
        escapeCsv(v.keyword),
        escapeCsv(v.title),
        escapeCsv(v.thumbnailUrl),
        escapeCsv(v.videoUrl),
        escapeCsv(v.id),
        v.viewCount,
        v.likeCount !== null && v.likeCount !== undefined ? v.likeCount : '미제공',
        escapeCsv(v.uploadDate),
        escapeCsv(v.durationFormatted),
        escapeCsv(v.claudeReview),
        v.claudeScore,
      ].join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const cleanTitle = channelTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || '유튜브';
  const today = new Date().toISOString().split('T')[0];
  link.href = URL.createObjectURL(blob);
  link.download = `유튜브_트렌드_${cleanTitle}_${today}.csv`;
  link.click();
}
