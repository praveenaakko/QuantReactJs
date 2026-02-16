"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate12h = exports.toEpochMs = void 0;
const hasTimezoneInfo = (value) => /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
const normalizeDateStringForParse = (value) => {
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
const toEpochMs = (value) => {
    if (!value || typeof value !== 'string')
        return null;
    const normalized = normalizeDateStringForParse(value);
    const ms = Date.parse(normalized);
    if (Number.isNaN(ms))
        return null;
    return ms;
};
exports.toEpochMs = toEpochMs;
const formatDate12h = (value) => {
    const ms = (0, exports.toEpochMs)(value);
    if (ms == null)
        return value;
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
exports.formatDate12h = formatDate12h;
