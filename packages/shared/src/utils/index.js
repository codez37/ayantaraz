'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isValidIranPhone = isValidIranPhone;
exports.toSlug = toSlug;
exports.formatPersianDate = formatPersianDate;
exports.formatPersianTimestamp = formatPersianTimestamp;
exports.formatPrice = formatPrice;
function isValidIranPhone(phone) {
  return /^09\d{9}$/.test(phone);
}
function toSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9آ-ی\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
function formatPersianDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fa-IR');
}
function formatPersianTimestamp(date) {
  const d = new Date(date);
  const persianDate = d.toLocaleDateString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${persianDate} ${time}`;
}
function formatPrice(price) {
  return price.toLocaleString('fa-IR') + ' ریال';
}
//# sourceMappingURL=index.js.map
