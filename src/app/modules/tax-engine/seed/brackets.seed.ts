interface BracketData {
  year: number;
  type: string;
  bracketOrder: number;
  minAmount: bigint;
  maxAmount: bigint | null;
  rate: number;
  description: string;
  metadata?: Record<string, unknown>;
}

const BIGINT = (n: string | number) => BigInt(n);

export const TAX_BRACKETS: BracketData[] = [];

function addBracket(data: BracketData) {
  TAX_BRACKETS.push(data);
}

// === SALARY BRACKETS ===
// Historical years 1390-1402: simplified formula
function addSalaryBrackets(year: number, exemption: number) {
  addBracket({
    year,
    type: 'SALARY',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: BIGINT(exemption),
    rate: 0,
    description: `معافیت پایه حقوق سال ${year}`,
    metadata: { isExempt: true },
  });
  addBracket({
    year,
    type: 'SALARY',
    bracketOrder: 2,
    minAmount: BIGINT(exemption + 1),
    maxAmount: BIGINT(exemption * 2.5),
    rate: 10,
    description: `نرخ ۱۰٪ پله دوم حقوق ${year}`,
  });
  addBracket({
    year,
    type: 'SALARY',
    bracketOrder: 3,
    minAmount: BIGINT(exemption * 2.5 + 1),
    maxAmount: BIGINT(exemption * 5),
    rate: 15,
    description: `نرخ ۱۵٪ پله سوم حقوق ${year}`,
  });
  addBracket({
    year,
    type: 'SALARY',
    bracketOrder: 4,
    minAmount: BIGINT(exemption * 5 + 1),
    maxAmount: BIGINT(exemption * 10),
    rate: 20,
    description: `نرخ ۲۰٪ پله چهارم حقوق ${year}`,
  });
  addBracket({
    year,
    type: 'SALARY',
    bracketOrder: 5,
    minAmount: BIGINT(exemption * 10 + 1),
    maxAmount: null,
    rate: 30,
    description: `نرخ ۳۰٪ پله پنجم حقوق ${year} (بدون پله ۲۵٪)`,
  });
}

const salaryData: [number, number][] = [
  [1390, 6000000],
  [1391, 6500000],
  [1392, 7000000],
  [1393, 7500000],
  [1394, 8000000],
  [1395, 9000000],
  [1396, 10000000],
  [1397, 11000000],
  [1398, 12000000],
  [1399, 13000000],
  [1400, 14000000],
  [1401, 15000000],
  [1402, 16000000],
];

for (const [year, exemption] of salaryData) {
  addSalaryBrackets(year, exemption);
}

// 1403: 5-tier progressive (no 25% bracket)
addBracket({
  year: 1403,
  type: 'SALARY',
  bracketOrder: 1,
  minAmount: BIGINT(0),
  maxAmount: BIGINT(10000000),
  rate: 0,
  description: 'معافیت پایه حقوق ۱۴۰۳ (۱۰ میلیون ماهانه)',
  metadata: { isExempt: true },
});
addBracket({
  year: 1403,
  type: 'SALARY',
  bracketOrder: 2,
  minAmount: BIGINT(10000001),
  maxAmount: BIGINT(20000000),
  rate: 10,
  description: 'نرخ ۱۰٪ پله دوم حقوق ۱۴۰۳',
  metadata: { monthlyLabel: '۱۰ تا ۲۰ میلیون' },
});
addBracket({
  year: 1403,
  type: 'SALARY',
  bracketOrder: 3,
  minAmount: BIGINT(20000001),
  maxAmount: BIGINT(40000000),
  rate: 15,
  description: 'نرخ ۱۵٪ پله سوم حقوق ۱۴۰۳',
  metadata: { monthlyLabel: '۲۰ تا ۴۰ میلیون' },
});
addBracket({
  year: 1403,
  type: 'SALARY',
  bracketOrder: 4,
  minAmount: BIGINT(40000001),
  maxAmount: BIGINT(60000000),
  rate: 20,
  description: 'نرخ ۲۰٪ پله چهارم حقوق ۱۴۰۳',
  metadata: { monthlyLabel: '۴۰ تا ۶۰ میلیون' },
});
addBracket({
  year: 1403,
  type: 'SALARY',
  bracketOrder: 5,
  minAmount: BIGINT(60000001),
  maxAmount: null,
  rate: 30,
  description: 'نرخ ۳۰٪ پله پنجم حقوق ۱۴۰۳',
  metadata: { monthlyLabel: 'بیش از ۶۰ میلیون' },
});

// 1404: 6-tier progressive (added 25% bracket)
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 1,
  minAmount: BIGINT(0),
  maxAmount: BIGINT(24000000),
  rate: 0,
  description: 'معافیت پایه حقوق ۱۴۰۴ (۲۴ میلیون ماهانه)',
  metadata: { isExempt: true },
});
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 2,
  minAmount: BIGINT(24000001),
  maxAmount: BIGINT(30000000),
  rate: 10,
  description: 'نرخ ۱۰٪ پله دوم حقوق ۱۴۰۴',
  metadata: { monthlyLabel: '۲۴ تا ۳۰ میلیون' },
});
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 3,
  minAmount: BIGINT(30000001),
  maxAmount: BIGINT(38000000),
  rate: 15,
  description: 'نرخ ۱۵٪ پله سوم حقوق ۱۴۰۴',
  metadata: { monthlyLabel: '۳۰ تا ۳۸ میلیون' },
});
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 4,
  minAmount: BIGINT(38000001),
  maxAmount: BIGINT(50000000),
  rate: 20,
  description: 'نرخ ۲۰٪ پله چهارم حقوق ۱۴۰۴',
  metadata: { monthlyLabel: '۳۸ تا ۵۰ میلیون' },
});
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 5,
  minAmount: BIGINT(50000001),
  maxAmount: BIGINT(66666667),
  rate: 25,
  description: 'نرخ ۲۵٪ پله پنجم حقوق ۱۴۰۴',
  metadata: { monthlyLabel: '۵۰ تا ۶۶.۷ میلیون' },
});
addBracket({
  year: 1404,
  type: 'SALARY',
  bracketOrder: 6,
  minAmount: BIGINT(66666668),
  maxAmount: null,
  rate: 30,
  description: 'نرخ ۳۰٪ پله ششم حقوق ۱۴۰۴',
  metadata: { monthlyLabel: 'بیش از ۶۶.۷ میلیون' },
});

// 1405: 6-tier with increased exemption (40M/mo)
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 1,
  minAmount: BIGINT(0),
  maxAmount: BIGINT(40000000),
  rate: 0,
  description: 'معافیت پایه حقوق ۱۴۰۵ (۴۰ میلیون ماهانه)',
  metadata: { isExempt: true },
});
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 2,
  minAmount: BIGINT(40000001),
  maxAmount: BIGINT(80000000),
  rate: 10,
  description: 'نرخ ۱۰٪ پله دوم حقوق ۱۴۰۵',
  metadata: { monthlyLabel: '۴۰ تا ۸۰ میلیون' },
});
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 3,
  minAmount: BIGINT(80000001),
  maxAmount: BIGINT(100000000),
  rate: 15,
  description: 'نرخ ۱۵٪ پله سوم حقوق ۱۴۰۵',
  metadata: { monthlyLabel: '۸۰ تا ۱۰۰ میلیون' },
});
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 4,
  minAmount: BIGINT(100000001),
  maxAmount: BIGINT(120000000),
  rate: 20,
  description: 'نرخ ۲۰٪ پله چهارم حقوق ۱۴۰۵',
  metadata: { monthlyLabel: '۱۰۰ تا ۱۲۰ میلیون' },
});
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 5,
  minAmount: BIGINT(120000001),
  maxAmount: BIGINT(140000000),
  rate: 25,
  description: 'نرخ ۲۵٪ پله پنجم حقوق ۱۴۰۵',
  metadata: { monthlyLabel: '۱۲۰ تا ۱۴۰ میلیون' },
});
addBracket({
  year: 1405,
  type: 'SALARY',
  bracketOrder: 6,
  minAmount: BIGINT(140000001),
  maxAmount: null,
  rate: 30,
  description: 'نرخ ۳۰٪ پله ششم حقوق ۱۴۰۵',
  metadata: { monthlyLabel: 'بیش از ۱۴۰ میلیون' },
});

// === RENTAL BRACKETS ===
function addRentalBracket(year: number, rate: number) {
  addBracket({
    year,
    type: 'RENTAL',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate,
    description: `نرخ پایه مالیات اجاره سال ${year}`,
  });
}

const rentalRates: [number, number][] = [
  [1390, 20],
  [1391, 20],
  [1392, 20],
  [1393, 22],
  [1394, 22],
  [1395, 22],
  [1396, 25],
  [1397, 25],
  [1398, 25],
  [1399, 25],
  [1400, 25],
  [1401, 25],
  [1402, 25],
  [1403, 25],
  [1404, 25],
  [1405, 25],
];

for (const [year, rate] of rentalRates) {
  addRentalBracket(year, rate);
}

// === CORPORATE BRACKETS ===
function addCorporateBracket(year: number, rate: number) {
  addBracket({
    year,
    type: 'CORPORATE',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate,
    description: `نرخ مالیات اشخاص حقوقی سال ${year}`,
  });
}

const corporateRates: [number, number][] = [
  [1390, 25],
  [1391, 25],
  [1392, 25],
  [1393, 25],
  [1394, 25],
  [1395, 25],
  [1396, 25],
  [1397, 25],
  [1398, 25],
  [1399, 25],
  [1400, 25],
  [1401, 25],
  [1402, 25],
  [1403, 25],
  [1404, 25],
  [1405, 25],
];

for (const [year, rate] of corporateRates) {
  addCorporateBracket(year, rate);
}

// === TRANSFER BRACKETS ===
function addTransferBracket(year: number, rate: number) {
  addBracket({
    year,
    type: 'TRANSFER',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate,
    description: `نرخ مالیات نقل و انتقال سال ${year}`,
  });
}

for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
  1403, 1404, 1405,
]) {
  addTransferBracket(year, 5);
}

// === BUSINESS BRACKETS ===
function addBusinessBracket(year: number, rate: number) {
  addBracket({
    year,
    type: 'BUSINESS',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate,
    description: `نرخ پایه مالیات مشاغل سال ${year}`,
  });
}

for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
  1403, 1404, 1405,
]) {
  addBusinessBracket(year, 15);
}

// === INHERITANCE BRACKETS ===
// Post-2016 reform (applicable for deaths after 1395/01/01)
// Rates shown are for class 1 heirs; class 2 = 2x, class 3 = 4x
function addInheritanceBracket(
  year: number,
  bracketOrder: number,
  description: string,
  rate: number,
  assetType: string,
) {
  addBracket({
    year,
    type: 'INHERITANCE',
    bracketOrder,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate,
    description,
    metadata: { isBaseRate: true, assetType, heirClass: 1 },
  });
}

for (const year of [
  1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405,
]) {
  addInheritanceBracket(
    year,
    1,
    `سپرده بانکی و اوراق بهادار - سال ${year}`,
    3,
    'bank_deposit',
  );
  addInheritanceBracket(
    year,
    2,
    `سهام بورسی - سال ${year}`,
    0.75,
    'listed_stock',
  );
  addInheritanceBracket(
    year,
    3,
    `سهام غیربورسی و سهم‌الشرکه - سال ${year}`,
    6,
    'unlisted_stock',
  );
  addInheritanceBracket(
    year,
    4,
    `املاک مسکونی و اراضی - سال ${year}`,
    7.5,
    'residential_property',
  );
  addInheritanceBracket(
    year,
    5,
    `املاک تجاری و اداری - سال ${year}`,
    3,
    'commercial_property',
  );
  addInheritanceBracket(
    year,
    6,
    `خودرو و وسایل نقلیه - سال ${year}`,
    2,
    'vehicle',
  );
  addInheritanceBracket(
    year,
    7,
    `سرقفلی و حق واگذاری - سال ${year}`,
    3,
    'goodwill',
  );
  addInheritanceBracket(
    year,
    8,
    `حق امتیاز و سایر حقوق مالی - سال ${year}`,
    10,
    'royalty',
  );
  addInheritanceBracket(year, 9, `سایر اموال - سال ${year}`, 10, 'other');
}

// Pre-2016: simplified flat 35% on total estate value (after exemptions)
for (const year of [1390, 1391, 1392, 1393, 1394]) {
  addBracket({
    year,
    type: 'INHERITANCE',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 35,
    description: `نرخ یکسان مالیات بر ارث سال ${year} (قانون قدیم)`,
    metadata: { isOldLaw: true },
  });
}

// === INCIDENTAL BRACKETS ===
function addIncidentalBrackets(year: number) {
  addBracket({
    year,
    type: 'INCIDENTAL',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: BIGINT(50000000),
    rate: 10,
    description: `نرخ پایه درآمد اتفاقی سال ${year}`,
  });
  addBracket({
    year,
    type: 'INCIDENTAL',
    bracketOrder: 2,
    minAmount: BIGINT(50000001),
    maxAmount: BIGINT(200000000),
    rate: 15,
    description: `نرخ متوسط درآمد اتفاقی سال ${year}`,
  });
  addBracket({
    year,
    type: 'INCIDENTAL',
    bracketOrder: 3,
    minAmount: BIGINT(200000001),
    maxAmount: null,
    rate: 20,
    description: `نرخ حداکثر درآمد اتفاقی سال ${year}`,
  });
}

for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
  1403, 1404, 1405,
]) {
  addIncidentalBrackets(year);
}

// === PROPERTY BRACKETS ===
function addPropertyBracket(year: number) {
  addBracket({
    year,
    type: 'PROPERTY',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 0.5,
    description: `نرخ پایه مالیات بر املاک مسکونی سال ${year}`,
  });
  addBracket({
    year,
    type: 'PROPERTY',
    bracketOrder: 2,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 1,
    description: `نرخ مالیات بر املاک تجاری سال ${year}`,
  });
  addBracket({
    year,
    type: 'PROPERTY',
    bracketOrder: 3,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 2,
    description: `نرخ مالیات بر املاک بایر سال ${year}`,
  });
}

for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
  1403, 1404, 1405,
]) {
  addPropertyBracket(year);
}

// === VAT BRACKETS ===
// 9% rate from 1387 (implementation) through 1402
for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
]) {
  addBracket({
    year,
    type: 'VAT',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 9,
    description: `نرخ مالیات بر ارزش افزوده سال ${year} (۹٪)`,
  });
}

// 10% from 1403 onward (1% added for pension fund)
for (const year of [1403, 1404, 1405]) {
  addBracket({
    year,
    type: 'VAT',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 10,
    description: `نرخ مالیات بر ارزش افزوده سال ${year} (۱۰٪ شامل ۱٪ عوارض سلامت)`,
  });
}

// === BUSINESS EXEMPTION (Maddah 101) ===
// Separate from salary - for self-employed / business owners
interface BusExempt {
  year: number;
  exemptionAnnual: number;
}
const busExemptions: BusExempt[] = [
  { year: 1390, exemptionAnnual: 15000000 },
  { year: 1391, exemptionAnnual: 18000000 },
  { year: 1392, exemptionAnnual: 21600000 },
  { year: 1393, exemptionAnnual: 25200000 },
  { year: 1394, exemptionAnnual: 30000000 },
  { year: 1395, exemptionAnnual: 36000000 },
  { year: 1396, exemptionAnnual: 39600000 },
  { year: 1397, exemptionAnnual: 39600000 },
  { year: 1398, exemptionAnnual: 42000000 },
  { year: 1399, exemptionAnnual: 44100000 },
  { year: 1400, exemptionAnnual: 39600000 },
  { year: 1401, exemptionAnnual: 39600000 },
  { year: 1402, exemptionAnnual: 47500000 },
  { year: 1403, exemptionAnnual: 100000000 },
  { year: 1404, exemptionAnnual: 200000000 },
  { year: 1405, exemptionAnnual: 280000000 },
];
for (const { year, exemptionAnnual } of busExemptions) {
  addBracket({
    year,
    type: 'BUSINESS',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: BIGINT(exemptionAnnual),
    rate: 0,
    description: `معافیت ماده ۱۰۱ مشاغل سال ${year} (${(exemptionAnnual / 1000000).toLocaleString('fa-IR')} میلیون تومان)`,
    metadata: { isExempt: true, article: '101' },
  });
}

// === PENALTY BRACKETS ===
for (const year of [
  1390, 1391, 1392, 1393, 1394, 1395, 1396, 1397, 1398, 1399, 1400, 1401, 1402,
  1403, 1404, 1405,
]) {
  addBracket({
    year,
    type: 'PENALTY',
    bracketOrder: 1,
    minAmount: BIGINT(0),
    maxAmount: null,
    rate: 2.5,
    description: `جریمه دیرکرد ماهانه سال ${year}`,
  });
}
