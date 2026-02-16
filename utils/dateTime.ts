const hasTimezoneInfo = (value: string): boolean => /([zZ]|[+-]\d{2}:\d{2})$/.test(value);

const normalizeDateStringForParse = (value: string): string => {
  const trimmed = value.trim();
  const hasTimezone = hasTimezoneInfo(trimmed);

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(trimmed)) {
    const isoLike = trimmed.replace(' ', 'T');
    return hasTimezone ? isoLike : `${isoLike}+05:30`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(trimmed)) {
    return hasTimezone ? trimmed : `${trimmed}+05:30`;
  }

  return trimmed;
};

export const toEpochMs = (value: string): number | null => {
  if (!value || typeof value !== 'string') return null;
  const normalized = normalizeDateStringForParse(value);
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) return null;
  return ms;
};

export const formatDate12h = (value: string): string => {
  const ms = toEpochMs(value);
  if (ms == null) return value;
  return new Date(ms).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
