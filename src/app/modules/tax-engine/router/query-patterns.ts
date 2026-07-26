export const SEARCH_PATTERNS = [
  { pattern: /^(ماده|بند|تبصره|اصل)\s*\d+/, priority: 1 },
  { pattern: /(ماده|بند|تبصره|اصل)\s*\d+/, priority: 2 },
  {
    pattern:
      /(نرخ|میزان|درصد|سقف|حداکثر|حداقل)\s+(مالیات\s+بر\s+)?(ارث|حقوق|اجاره|مشاغل|شرکت)/,
    priority: 3,
  },
  { pattern: /(معافیت|مشمول|غیرمشمول)\s+(مالیات\s+)?/, priority: 4 },
  {
    pattern:
      /(قانون\s+)?مالیات\s+بر\s+(ارث|حقوق|اجاره|مشاغل|شرکت|ارزش\s+افزوده|درامد)/,
    priority: 5,
  },
];

export const CALC_PATTERNS = [
  { pattern: /محاسبه\s+کن/, priority: 1 },
  { pattern: /\d[\d,]*\s*(تومان|ریال|میلیون|میلیارد|هزار)/, priority: 2 },
  {
    pattern: /(چقدر\s+می\s*شود|چقدر\s+است|حساب\s+کن|بگو\s+چند)/,
    priority: 3,
  },
  { pattern: /(مالیات\s+)?(حقوق|اجاره|ارث)\s+\d+/, priority: 4 },
  { pattern: /(مبلغ|عدد|رقم)\s+\d+/, priority: 5 },
];

export const PROCEDURE_PATTERNS = [
  {
    pattern: /(مدارک|اسناد|دستور|مراحل|نحوه|چگونگی|روش|فرآیند)/,
    priority: 1,
  },
  {
    pattern:
      /(چگونه\s+می\s*توانم|چطور\s+می\s*شود|راهنمایی\s+کنید|توضیح\s+دهید)/,
    priority: 2,
  },
  {
    pattern: /(مهلت|مدت|زمان|مهلت\s+تسلیم|مهلت\s+اعتراض)/,
    priority: 3,
  },
  { pattern: /(مراحل|اقدامات|گام|مرحله|رویه)/, priority: 4 },
];
