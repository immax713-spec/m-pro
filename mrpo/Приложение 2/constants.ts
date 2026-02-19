export const MAIN_PHOTO_PROMPTS: string[] = [
  'Сделайте основное фото объекта (1 из 5)',
  'Сделайте второе основное фото (2 из 5)',
  'Сделайте фото для карусели (3 из 5)',
  'Сделайте еще одно фото для карусели (4 из 5)',
  'Сделайте последнее фото для карусели (5 из 5)'
];

export const COMMENTS_PHOTO_PROMPTS: string[] = [
  'Загрузите фото для комментария (1 из 4)',
  'Загрузите фото для комментария (2 из 4)',
  'Загрузите фото для комментария (3 из 4)',
  'Загрузите фото для комментария (4 из 4)'
];

export const TOTAL_MAIN_PHOTOS = MAIN_PHOTO_PROMPTS.length;
export const TOTAL_COMMENTS_PHOTOS = COMMENTS_PHOTO_PROMPTS.length;

const ORIGIN = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
// export const GOOGLE_SHEETS_ENDPOINT = ORIGIN ? (ORIGIN + '/exec') : 'https://script.google.com/macros/s/AKfycbzhaTyc0W8700tT3ZGS8AWvrRSH_1Mwe4a1CZNdOq2Fgn2AKHbnbZlr7NKjfjcyg3kGiA/exec';
export const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxrcsmywNcAyPRLhitdoGZpAohHQpJLYWjhS6vZm6clHvZvjVMG-EjorP8uDu_7xqoluQ/exec';
export const DEFAULT_SHEET_ID = '1B9Joj6DFhJM9DMmp8JHQpF66JSii0WPSdKZIUPvZGko';
export const DEFAULT_GID = '92265092';
export const buildExtraParams = () => {
  try {
    const params = new URLSearchParams(typeof window !== 'undefined' ? (window.location.search || '') : '');
    let sid = params.get('sheet_id') || params.get('spreadsheetId') || DEFAULT_SHEET_ID;
    let gid = params.get('gid') || DEFAULT_GID;
    const out: string[] = [];
    if (sid) out.push('sheet_id=' + encodeURIComponent(sid));
    if (gid) out.push('gid=' + encodeURIComponent(gid));
    return out.length ? ('&' + out.join('&')) : '';
  } catch (_) { return ''; }
};
