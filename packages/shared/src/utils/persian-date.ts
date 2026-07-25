const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export function formatPersianDate(date: Date | string | number): string {
  const d = new Date(date);
  const persian = d.toLocaleDateString('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return persian;
}

export function formatPersianTimestamp(date: Date | string | number): string {
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
