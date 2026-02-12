const INVALID_PHOTO_VALUES = new Set(['', '/', 'null', 'undefined']);

const looksLikeRawBase64 = (value: string): boolean => {
  const compact = value.replace(/\s/g, '');
  if (compact.length < 80) return false;
  if (compact.includes('.')) return false;
  return /^[A-Za-z0-9+/=]+$/.test(compact);
};

const guessBase64MimeType = (base64Value: string): string => {
  if (base64Value.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64Value.startsWith('/9j/')) return 'image/jpeg';
  if (base64Value.startsWith('R0lGOD')) return 'image/gif';
  if (base64Value.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
};

export const normalizeUserPhoto = (photo: unknown): string => {
  if (typeof photo !== 'string') return '';

  const trimmed = photo.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return '';
  if (INVALID_PHOTO_VALUES.has(trimmed.toLowerCase())) return '';
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalized = trimmed.replace(/\\/g, '/').replace(/^app\//, '');

  if (looksLikeRawBase64(normalized)) {
    return `data:${guessBase64MimeType(normalized)};base64,${normalized}`;
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const hasUserPhoto = (photoUrl: string | null | undefined): boolean => {
  if (!photoUrl) return false;
  const trimmed = photoUrl.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return !INVALID_PHOTO_VALUES.has(lowered);
};
