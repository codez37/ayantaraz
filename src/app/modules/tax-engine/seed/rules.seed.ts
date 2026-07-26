interface RuleData {
  ruleKey: string;
  type: string;
  description: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
}

export const TAX_RULES: RuleData[] = [
  // === RENTAL RULES ===
  {
    ruleKey: 'RENTAL_COST_DEDUCTION',
    type: 'RENTAL',
    description: '25٪ هزینه و استهلاک برای املاک اجاره‌ای',
    condition: { type: 'always' },
    action: {
      type: 'DEDUCTION',
      params: { percent: 25, label: 'هزینه‌ها و استهلاکات' },
    },
    priority: 1,
  },
  {
    ruleKey: 'RENTAL_RESIDENTIAL_DISCOUNT',
    type: 'RENTAL',
    description: '40٪ تخفیف برای املاک مسکونی (ماده ۵۳)',
    condition: { type: 'property_residential' },
    action: {
      type: 'DISCOUNT',
      params: {
        percent: 40,
        label: 'تخفیف املاک مسکونی',
        ref: 'ماده ۵۳ تبصره',
      },
    },
    priority: 2,
  },

  // === INHERITANCE RULES ===
  {
    ruleKey: 'INHERITANCE_HEIR_CLASS_1',
    type: 'INHERITANCE',
    description: 'طبقه اول وراث: ضریب ۱',
    condition: { type: 'heir_class', class: 1 },
    action: {
      type: 'MULTIPLIER',
      params: { factor: 1.0, label: 'ضریب طبقه اول' },
    },
    priority: 1,
  },
  {
    ruleKey: 'INHERITANCE_HEIR_CLASS_MULTIPLIER',
    type: 'INHERITANCE',
    description: 'طبقه دوم وراث: ضریب ۲',
    condition: { type: 'heir_class', class: 2 },
    action: {
      type: 'MULTIPLIER',
      params: { factor: 2.0, label: 'ضریب طبقه دوم', ref: 'ماده ۷۲' },
    },
    priority: 1,
  },
  {
    ruleKey: 'INHERITANCE_HEIR_CLASS_MULTIPLIER_3',
    type: 'INHERITANCE',
    description: 'طبقه سوم وراث: ضریب ۴',
    condition: { type: 'heir_class', class: 3 },
    action: {
      type: 'MULTIPLIER',
      params: { factor: 4.0, label: 'ضریب طبقه سوم', ref: 'ماده ۷۲' },
    },
    priority: 1,
  },
  {
    ruleKey: 'INHERITANCE_FUNERAL_DEDUCTION',
    type: 'INHERITANCE',
    description: 'کسر هزینه کفن و دفن از ترکه',
    condition: { type: 'always' },
    action: {
      type: 'DEDUCTION',
      params: { label: 'هزینه کفن و دفن', ref: 'ماده ۷۱' },
    },
    priority: 10,
  },
  {
    ruleKey: 'INHERITANCE_DEBT_DEDUCTION',
    type: 'INHERITANCE',
    description: 'کسر دیون متوفی از ترکه',
    condition: { type: 'always' },
    action: {
      type: 'DEDUCTION',
      params: { label: 'دیون و وام‌های متوفی', ref: 'ماده ۷۱' },
    },
    priority: 9,
  },

  // === TRANSFER RULES ===
  {
    ruleKey: 'TRANSFER_PROPERTY_RATE',
    type: 'TRANSFER',
    description: '۵٪ مالیات نقل و انتقال املاک (ماده ۹۵)',
    condition: { type: 'asset_type', asset: 'PROPERTY' },
    action: { type: 'PERCENTAGE_RATE', params: { rate: 5.0, ref: 'ماده ۵۵' } },
    priority: 1,
  },
  {
    ruleKey: 'TRANSFER_GOODWILL_MALL_RATE',
    type: 'TRANSFER',
    description: '۲٪ نقل و انتقال سرقفلی پاساژها و مجتمع‌های تجاری (ماده ۵۶)',
    condition: { type: 'asset_type', asset: 'GOODWILL_MALL' },
    action: { type: 'PERCENTAGE_RATE', params: { rate: 2.0, ref: 'ماده ۵۶' } },
    priority: 2,
  },
  {
    ruleKey: 'TRANSFER_GOODWILL_OTHER_RATE',
    type: 'TRANSFER',
    description: '۵٪ نقل و انتقال سرقفلی سایر موارد (ماده ۵۷)',
    condition: { type: 'asset_type', asset: 'GOODWILL_OTHER' },
    action: { type: 'PERCENTAGE_RATE', params: { rate: 5.0, ref: 'ماده ۵۷' } },
    priority: 2,
  },

  // === VAT RULES ===
  {
    ruleKey: 'VAT_STANDARD_RATE',
    type: 'VAT',
    description: 'نرخ استاندارد ۹٪ ارزش افزوده',
    condition: { type: 'always' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: {
        rate: 9,
        label: 'مالیات بر ارزش افزوده',
        ref: 'ماده ۲ قانون ارزش افزوده',
      },
    },
    priority: 1,
  },
  {
    ruleKey: 'VAT_HEALTH_SURCHARGE',
    type: 'VAT',
    description: '۱٪ عوارض سلامت',
    condition: { type: 'always' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: {
        rate: 1,
        label: 'عوارض سلامت',
        ref: 'ماده ۲ قانون ارزش افزوده',
      },
    },
    priority: 2,
  },
  {
    ruleKey: 'VAT_EXPORT_EXEMPTION',
    type: 'VAT',
    description: 'معافیت صادرات از ارزش افزوده',
    condition: { type: 'export' },
    action: {
      type: 'EXEMPT',
      params: { label: 'صادرات کالا و خدمات', ref: 'ماده ۹ قانون ارزش افزوده' },
    },
    priority: 1,
  },
  {
    ruleKey: 'VAT_ESSENTIAL_GOODS_EXEMPTION',
    type: 'VAT',
    description: 'معافیت کالاهای اساسی از ارزش افزوده',
    condition: { type: 'essential_goods' },
    action: {
      type: 'EXEMPT',
      params: { label: 'کالاهای اساسی', ref: 'ماده ۱۲ قانون ارزش افزوده' },
    },
    priority: 1,
  },
  {
    ruleKey: 'VAT_EDUCATION_EXEMPTION',
    type: 'VAT',
    description: 'معافیت خدمات آموزشی و بهداشتی از ارزش افزوده',
    condition: { type: 'education_health' },
    action: {
      type: 'EXEMPT',
      params: {
        label: 'خدمات آموزشی و بهداشتی',
        ref: 'ماده ۱۳ قانون ارزش افزوده',
      },
    },
    priority: 1,
  },

  // === PROPERTY RULES ===
  {
    ruleKey: 'PROPERTY_RESIDENTIAL_RATE',
    type: 'PROPERTY',
    description: '۰.۵٪ مالیات سالانه املاک مسکونی',
    condition: { type: 'property_type', propertyType: 'residential' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: {
        rate: 0.5,
        label: 'مالیات سالانه املاک مسکونی',
        ref: 'ماده ۱۴۴',
      },
    },
    priority: 1,
  },
  {
    ruleKey: 'PROPERTY_COMMERCIAL_RATE',
    type: 'PROPERTY',
    description: '۱٪ مالیات سالانه املاک تجاری',
    condition: { type: 'property_type', propertyType: 'commercial' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 1, label: 'مالیات سالانه املاک تجاری', ref: 'ماده ۱۴۴' },
    },
    priority: 1,
  },
  {
    ruleKey: 'PROPERTY_VACANT_RATE',
    type: 'PROPERTY',
    description: '۲٪ مالیات سالانه املاک بایر',
    condition: { type: 'property_type', propertyType: 'vacant' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 2, label: 'مالیات سالانه املاک بایر', ref: 'ماده ۱۴۴' },
    },
    priority: 1,
  },
  {
    ruleKey: 'PROPERTY_PRIMARY_RESIDENCE_EXEMPTION',
    type: 'PROPERTY',
    description: 'معافیت یک واحد مسکونی (ماده ۱۴۶)',
    condition: { type: 'primary_residence' },
    action: {
      type: 'EXEMPT',
      params: { label: 'معافیت محل سکونت', ref: 'ماده ۱۴۶' },
    },
    priority: 10,
  },

  // === PENALTY RULES ===
  {
    ruleKey: 'PENALTY_LATE_PAYMENT',
    type: 'PENALTY',
    description: '۲.۵٪ جریمه دیرکرد ماهانه (ماده ۱۹۰)',
    condition: { type: 'late_payment' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 2.5, label: 'جریمه دیرکرد ماهانه', ref: 'ماده ۱۹۰' },
    },
    priority: 1,
  },
  {
    ruleKey: 'PENALTY_NON_SUBMISSION',
    type: 'PENALTY',
    description: '۵۰٪ جریمه عدم تسلیم اظهارنامه (ماده ۱۸۹)',
    condition: { type: 'non_submission' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 50, label: 'جریمه عدم تسلیم اظهارنامه', ref: 'ماده ۱۸۹' },
    },
    priority: 2,
  },
  {
    ruleKey: 'PENALTY_UNDERREPORTING',
    type: 'PENALTY',
    description: '۱۰٪ جریمه اظهار خلاف واقع (ماده ۱۹۱)',
    condition: { type: 'underreporting' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 10, label: 'جریمه اظهار خلاف واقع', ref: 'ماده ۱۹۱' },
    },
    priority: 2,
  },
  {
    ruleKey: 'PENALTY_RECORD_KEEPING',
    type: 'PENALTY',
    description: '۱۰٪ جریمه عدم نگهداری دفاتر (ماده ۱۹۲)',
    condition: { type: 'record_keeping' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 10, label: 'جریمه عدم نگهداری دفاتر', ref: 'ماده ۱۹۲' },
    },
    priority: 2,
  },
  {
    ruleKey: 'PENALTY_NO_INVOICE',
    type: 'PENALTY',
    description: '۲۵٪ جریمه عدم صدور صورتحساب (ماده ۲۰۰)',
    condition: { type: 'no_invoice' },
    action: {
      type: 'PERCENTAGE_RATE',
      params: { rate: 25, label: 'جریمه عدم صدور صورتحساب', ref: 'ماده ۲۰۰' },
    },
    priority: 2,
  },
  {
    ruleKey: 'PENALTY_REGISTRATION_FAILURE',
    type: 'PENALTY',
    description: '۲۰٪ جریمه عدم ثبت‌نام در سامانه مؤدیان',
    condition: { type: 'registration_failure' },
    action: {
      type: 'PERCENTATE_RATE',
      params: {
        rate: 20,
        label: 'جریمه عدم ثبت‌نام در سامانه مؤدیان',
        ref: 'ماده ۱۹۸',
      },
    },
    priority: 2,
  },
];
