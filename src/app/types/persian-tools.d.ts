declare module 'persian-tools' {
  export function removeDiacritics(s: string): string;
  export function normalizePersian(s: string): string;
  export function extractPersianNumbers(s: string): string;
}
