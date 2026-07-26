export interface BusinessAlias {
  canonical: string;
  aliases: string[];
  category:
    | 'wholesale'
    | 'retail'
    | 'service'
    | 'manufacturing'
    | 'agriculture';
  coefficient: number;
}

export const BUSINESS_DICTIONARY: BusinessAlias[] = [
  // Wholesale - Building & Sanitary
  {
    canonical: 'عمده فروشی لوازم ساختمانی',
    aliases: [
      'شیرآلات',
      'شیرآلات ساختمانی',
      'لوازم بهداشتی ساختمان',
      'بهداشتی ساختمان',
      'سرامیک',
      'کاشی',
      'لوازم ساختمان',
      'مصالح ساختمانی',
      'اتاق خواب',
      'پکیج',
      'رادیاتور',
      'ویلا',
      'سرویس بهداشتی',
    ],
    category: 'wholesale',
    coefficient: 0.028,
  },

  // Wholesale - Hygiene
  {
    canonical: 'عمده فروشی لوازم بهداشتی',
    aliases: [
      'بهداشتی',
      'لوازم بهداشتی',
      'آرایشی بهداشتی',
      'شامپو',
      'صابون',
      'مسواک',
      'خمیردندان',
      'لوازم آرایشی',
      'لوازم شخصی',
    ],
    category: 'wholesale',
    coefficient: 0.03,
  },

  // Wholesale - Food
  {
    canonical: 'عمده فروشی مواد غذایی',
    aliases: [
      'مواد غذایی',
      'غذایی',
      'خوراکی',
      'خشکبار',
      'ادویه',
      'روغن',
      'شکر',
      'برنج',
      'آرد',
      'حبوبات',
      ' لبنیات',
      'گوشت',
      'مرغ',
      'ماهی',
    ],
    category: 'wholesale',
    coefficient: 0.025,
  },

  // Wholesale - Clothing
  {
    canonical: 'عمده فروشی پوشاک',
    aliases: [
      'پوشاک',
      'لباس',
      'بازرگانی پوشاک',
      'تکس',
      'منسوجات',
      'پارچه',
      'نخ',
      'الیاف',
    ],
    category: 'wholesale',
    coefficient: 0.035,
  },

  // Wholesale - Home Appliances
  {
    canonical: 'عمده فروشی لوازم خانگی',
    aliases: [
      'لوازم خانگی',
      'خانگی',
      'یخچال',
      'ماشین لباسشویی',
      'ماشین ظرفشویی',
      'اجاق گاز',
      'مایکروفر',
      'تهویه',
      'اسپلیت',
      'کولر',
    ],
    category: 'wholesale',
    coefficient: 0.025,
  },

  // Wholesale - Iron & Metal
  {
    canonical: 'عمده فروشی آهن آلات',
    aliases: [
      'آهن',
      'آهن آلات',
      'فلزات',
      'فولاد',
      'آلومینیوم',
      'مس',
      'برنج',
      'ورق',
      'میلگرد',
      'تیرآهن',
      'نبشی',
      'پروفیل',
    ],
    category: 'wholesale',
    coefficient: 0.02,
  },

  // Wholesale - Auto Parts
  {
    canonical: 'عمده فروشی لوازم یدکی',
    aliases: [
      'یدکی',
      'لوازم یدکی',
      'قطعات خودرو',
      'قطعات یدکی',
      'لوازم یدکی خودرو',
      'فیلتر',
      'لاستیک',
      'روغن موتور',
    ],
    category: 'wholesale',
    coefficient: 0.03,
  },

  // Wholesale - Medical Equipment
  {
    canonical: 'عمده فروشی تجهیزات پزشکی',
    aliases: [
      'تجهیزات پزشکی',
      'پزشکی',
      'لوازم پزشکی',
      'دارو',
      'داروخانه',
      'تست',
      'آزمایشگاه',
      'دندانپزشکی',
    ],
    category: 'wholesale',
    coefficient: 0.04,
  },

  // Wholesale - General
  {
    canonical: 'عمده فروشی',
    aliases: [
      'عمده',
      'عمده فروش',
      'عمده فروشی',
      'بازرگانی',
      'تجارت',
      'صادرات',
      'واردات',
      'import',
      'export',
      'trade',
      'wholesale',
      'فروش عمده',
      'bulk',
    ],
    category: 'wholesale',
    coefficient: 0.022,
  },

  // Retail
  {
    canonical: 'خرده فروشی',
    aliases: [
      'خرده',
      'خرده فروش',
      'فروشگاه',
      'مغازه',
      'دکان',
      'بازار',
      'store',
      'shop',
      'retail',
      'فروشگاه زنجیره‌ای',
      'سوپرمارکت',
      'هایپرمارکت',
    ],
    category: 'retail',
    coefficient: 0.03,
  },

  // Retail - Hygiene
  {
    canonical: 'خرده فروشی لوازم بهداشتی',
    aliases: ['فروشگاه بهداشتی', 'فروشگاه لوازم بهداشتی'],
    category: 'retail',
    coefficient: 0.04,
  },

  // Retail - Building
  {
    canonical: 'خرده فروشی لوازم ساختمانی',
    aliases: ['فروشگاه ساختمانی', 'فروشگاه لوازم ساختمانی'],
    category: 'retail',
    coefficient: 0.035,
  },

  // Retail - Food
  {
    canonical: 'خرده فروشی مواد غذایی',
    aliases: ['فروشگاه مواد غذایی', 'سوپرمارکت مواد غذایی'],
    category: 'retail',
    coefficient: 0.03,
  },

  // Service - Accounting
  {
    canonical: 'خدمات حسابداری',
    aliases: [
      'حسابداری',
      'حسابدار',
      'امور مالی',
      'حسابرسی',
      'مشاوره مالی',
      'مالی',
      'finances',
      'accounting',
    ],
    category: 'service',
    coefficient: 0.35,
  },

  // Service - Legal
  {
    canonical: 'خدمات حقوقی',
    aliases: ['حقوقی', 'وکالت', 'وکیل', '法律', 'Legal', 'داوری', '调试'],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - Consulting
  {
    canonical: 'خدمات مشاوره',
    aliases: ['مشاوره', 'consulting', 'مشاور', 'کوچینگ', 'آموزش'],
    category: 'service',
    coefficient: 0.35,
  },

  // Service - IT
  {
    canonical: 'خدمات فناوری اطلاعات',
    aliases: [
      'فناوری',
      'IT',
      'کامپیوتر',
      'نرم افزار',
      'software',
      'برنامه نویسی',
      'وب',
      'سایت',
      'اپلیکیشن',
      'دیجیتال',
      'تکنولوژی',
      'فناوری اطلاعات',
    ],
    category: 'service',
    coefficient: 0.35,
  },

  // Service - Advertising
  {
    canonical: 'خدمات تبلیغاتی',
    aliases: [
      'تبلیغات',
      'تبلیغ',
      'advertising',
      'دیجیتال مارکتینگ',
      'بازاریابی',
      'مارکتینگ',
      'تبلیغاتی',
    ],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - Transport
  {
    canonical: 'حمل و نقل',
    aliases: [
      'حمل',
      'نقل',
      'باربری',
      'اسباب کشی',
      'ترانSPORT',
      'logistics',
      'پست',
      'ارسال',
      'پیک',
      'موتور',
    ],
    category: 'service',
    coefficient: 0.25,
  },

  // Service - Hotel
  {
    canonical: 'هتل',
    aliases: [
      'هتل',
      'اقامت',
      'مهمانخانه',
      'پانسیون',
      'home',
      'اقامتگاه',
      'بومگردی',
      'هتل آپارتمان',
    ],
    category: 'service',
    coefficient: 0.35,
  },

  // Service - Restaurant
  {
    canonical: 'رستوران',
    aliases: [
      'رستوران',
      'غذاخوری',
      'آشپزخانه',
      'فست فود',
      'کترینگ',
      'چلوکبابی',
      'جگرکی',
      'سالادbar',
      'رستورانی',
    ],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - Cafe
  {
    canonical: 'کافی شاپ',
    aliases: [
      'کافی شاپ',
      'کافه',
      'cafe',
      'coffee',
      'چایخانه',
      'قهوه خانه',
      'بستنی فروشی',
    ],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - Salon
  {
    canonical: 'آرایشگاه',
    aliases: [
      'آرایشگاه',
      'آرایشگر',
      'زیبایی',
      ' salon',
      'آرایش',
      'گریم',
      'ناخن',
      'اپیلاسیون',
    ],
    category: 'service',
    coefficient: 0.45,
  },

  // Service - Auto Repair
  {
    canonical: 'تعمیرگاه خودرو',
    aliases: [
      'تعمیرگاه',
      'تعمیر',
      'خودرو',
      'ماشین',
      'مکانیک',
      'تعمیر خودرو',
      'تعمیرگاه خودرو',
      'تعویض روغن',
      'صافکاری',
      'رنگ',
    ],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - Education
  {
    canonical: 'آموزشگاه',
    aliases: [
      'آموزشگاه',
      'آموزش',
      'آموزشی',
      'آکادمی',
      'آموزشگاه',
      'کلاس',
      'دوره',
      'edu',
      'آموزش',
    ],
    category: 'service',
    coefficient: 0.4,
  },

  // Service - General
  {
    canonical: 'خدمات',
    aliases: [
      'خدمات',
      'service',
      'خدمت',
      'پیمانکار',
      'پیمانکاری',
      'contractor',
    ],
    category: 'service',
    coefficient: 0.35,
  },

  // Manufacturing
  {
    canonical: 'تولیدی',
    aliases: [
      'تولید',
      'تولیدی',
      'کارخانه',
      'کارگاه',
      'manufacturing',
      'factory',
      'تولیدی',
      'ساخت',
    ],
    category: 'manufacturing',
    coefficient: 0.15,
  },

  // Agriculture
  {
    canonical: 'کشاورزی',
    aliases: ['کشاورزی', 'زراعت', 'باغداری', 'agriculture', 'farm', 'گلخانه'],
    category: 'agriculture',
    coefficient: 0.05,
  },
];

export function normalizeBusinessType(input: string): {
  canonical: string;
  coefficient: number;
  category: string;
  confidence: number;
} | null {
  const normalizedInput = input
    .toLowerCase()
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try exact canonical match (full input equals canonical name)
  for (const entry of BUSINESS_DICTIONARY) {
    if (normalizedInput === entry.canonical.toLowerCase()) {
      return {
        canonical: entry.canonical,
        coefficient: entry.coefficient,
        category: entry.category,
        confidence: 1.0,
      };
    }
  }

  // Try alias match - use LONGEST matching alias (not sum) to avoid double-counting
  // Plus bonus for category-discriminator keywords
  const retailKeywords = ['فروشگاه', 'مغازه', 'دکان', 'خرده'];
  const wholesaleKeywords = ['عمده', 'بازرگانی', 'پخش', 'تعداد بالا'];

  let bestMatch: {
    entry: BusinessAlias;
    score: number;
    specificityBonus: number;
  } | null = null;

  for (const entry of BUSINESS_DICTIONARY) {
    let longestMatch = 0;
    let matchedAliases = 0;
    for (const alias of entry.aliases) {
      if (normalizedInput.includes(alias.toLowerCase())) {
        longestMatch = Math.max(longestMatch, alias.length);
        matchedAliases++;
      }
    }
    if (longestMatch > 0) {
      // Bonus for retail/wholesale discriminator keywords matching the category
      let discriminatorBonus = 0;
      if (
        entry.category === 'retail' &&
        retailKeywords.some((k) => normalizedInput.includes(k))
      ) {
        discriminatorBonus = 20; // strong signal
      } else if (
        entry.category === 'wholesale' &&
        wholesaleKeywords.some((k) => normalizedInput.includes(k))
      ) {
        discriminatorBonus = 20;
      }

      const score = longestMatch + discriminatorBonus;
      const canonicalWords = entry.canonical.split(/\s+/);
      const specificityBonus = canonicalWords.filter((w) =>
        normalizedInput.includes(w.toLowerCase()),
      ).length;

      if (
        !bestMatch ||
        score > bestMatch.score ||
        (score === bestMatch.score &&
          specificityBonus > bestMatch.specificityBonus)
      ) {
        bestMatch = { entry, score, specificityBonus };
      }
    }
  }

  if (bestMatch) {
    const confidence = Math.min(bestMatch.score / 10, 1.0); // normalize to 0-1
    return {
      canonical: bestMatch.entry.canonical,
      coefficient: bestMatch.entry.coefficient,
      category: bestMatch.entry.category,
      confidence,
    };
  }

  return null;
}
