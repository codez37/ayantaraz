const PERSIAN_DIGITS: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

export function normalizePersian(text: string): string {
  let result = text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأا]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    .replace(/ۀ/g, 'ه')
    .replace(/\s+/g, ' ')
    .replace(/[ًٌٍَُِّـ]/g, '')
    .replace(/ـ/g, '')
    .replace(/\u200C/g, ' ');

  result = result.replace(/[۰-۹]/g, (ch) => PERSIAN_DIGITS[ch] || ch);
  result = result.replace(/[٤٥٦]/g, (ch) => {
    if (ch === '٤') return '4';
    if (ch === '٥') return '5';
    if (ch === '٦') return '6';
    return ch;
  });

  return result.trim();
}
