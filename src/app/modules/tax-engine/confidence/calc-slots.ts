export interface SlotDefinition {
  name: string;
  label: string;
  required: boolean;
  weight: number; // contribution to confidence score (0-1)
  prompt: string; // follow-up question if missing
  examples: string[];
}

export interface CalcSlotConfig {
  type: string;
  label: string;
  slots: SlotDefinition[];
}

export const CALC_SLOTS: CalcSlotConfig[] = [
  {
    type: 'SALARY',
    label: 'مالیات حقوق',
    slots: [
      {
        name: 'amount',
        label: 'مبلغ حقوق',
        required: true,
        weight: 0.4,
        prompt: 'مبلغ حقوق ماهانه یا سالانه خود را وارد کنید.',
        examples: ['۱۵ میلیون تومان', '۲۰۰ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال مالیاتی',
        required: true,
        weight: 0.2,
        prompt: 'سال مالیاتی مورد نظر کدام است؟',
        examples: ['۱۴۰۳', '۱۴۰۴'],
      },
      {
        name: 'hasInsurance',
        label: 'بیمه',
        required: false,
        weight: 0.15,
        prompt: 'آیا حق بیمه پرداخت می‌کنید؟',
        examples: ['بله', 'خیر'],
      },
      {
        name: 'hasDeductions',
        label: 'کسورات',
        required: false,
        weight: 0.15,
        prompt: 'کسورات دیگری (مثل وام، جریمه) دارید؟',
        examples: ['وام مسکن', 'ندارم'],
      },
    ],
  },
  {
    type: 'RENTAL',
    label: 'مالیات اجاره',
    slots: [
      {
        name: 'amount',
        label: 'اجاره سالانه',
        required: true,
        weight: 0.4,
        prompt: 'اجاره سالانه ملک را وارد کنید.',
        examples: ['۱۲۰ میلیون تومان', '۱ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال مالیاتی',
        required: true,
        weight: 0.2,
        prompt: 'سال مالیاتی مورد نظر کدام است؟',
        examples: ['۱۴۰۳'],
      },
      {
        name: 'hasMortgage',
        label: 'ودیعه',
        required: false,
        weight: 0.2,
        prompt: 'آیا ودیعه (رهن) دارید؟ اگر آره مبلغ آن چقدر است؟',
        examples: ['۵۰۰ میلیون تومان', 'ندارم'],
      },
      {
        name: 'isCommercial',
        label: 'نوع ملک',
        required: false,
        weight: 0.2,
        prompt: 'ملک مسکونی است یا تجاری؟',
        examples: ['مسکونی', 'تجاری'],
      },
    ],
  },
  {
    type: 'BUSINESS',
    label: 'مالیات مشاغل',
    slots: [
      {
        name: 'amount',
        label: 'درآمد سالانه',
        required: true,
        weight: 0.35,
        prompt: 'درآمد سالانه کسب‌وکار خود را وارد کنید.',
        examples: ['۴ میلیارد ریال', '۵۰۰ میلیون تومان'],
      },
      {
        name: 'businessType',
        label: 'نوع فعالیت',
        required: true,
        weight: 0.3,
        prompt: 'نوع فعالیت خود را بنویسید:',
        examples: ['عمده فروشی', 'خرده فروشی', 'تولیدی', 'خدماتی'],
      },
      {
        name: 'year',
        label: 'سال مالیاتی',
        required: true,
        weight: 0.15,
        prompt: 'سال مالیاتی مورد نظر کدام است؟',
        examples: ['۱۴۰۳', '۱۴۰۴'],
      },
      {
        name: 'hasPartner',
        label: 'شریک',
        required: false,
        weight: 0.1,
        prompt: 'آیا شریک دارید؟',
        examples: ['بله ۲ نفر', 'خیر'],
      },
      {
        name: 'businessCode',
        label: 'کد اینتاکد',
        required: false,
        weight: 0.1,
        prompt: 'کد اینتاکد ۷ رقمی خود را دارید؟',
        examples: ['۱۰۱۰۱۰۲', 'ندارم'],
      },
    ],
  },
  {
    type: 'INHERITANCE',
    label: 'مالیات بر ارث',
    slots: [
      {
        name: 'amount',
        label: 'ارزش ترکه',
        required: true,
        weight: 0.4,
        prompt: 'ارزش ترکه (دارایی متوفی) چقدر است؟',
        examples: ['۱۰ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال مالیاتی',
        required: true,
        weight: 0.2,
        prompt: 'سال فوت متوفی یا سال مالیاتی؟',
        examples: ['۱۴۰۳'],
      },
      {
        name: 'heirType',
        label: 'نوع وارث',
        required: true,
        weight: 0.25,
        prompt: 'وارث چه نسبتی با متوفی دارد؟',
        examples: ['پدر', 'مادر', 'فرزند', 'همسر', 'برادر'],
      },
      {
        name: 'propertyType',
        label: 'نوع دارایی',
        required: false,
        weight: 0.15,
        prompt: 'دارایی شامل چه مواردی است؟',
        examples: ['ملک', 'حساب بانکی', 'خودرو', 'سهام'],
      },
    ],
  },
  {
    type: 'CORPORATE',
    label: 'مالیات شرکت',
    slots: [
      {
        name: 'amount',
        label: 'درآمد مشمول',
        required: true,
        weight: 0.4,
        prompt: 'درآمد مشمول مالیات شرکت را وارد کنید.',
        examples: ['۵۰ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال مالیاتی',
        required: true,
        weight: 0.2,
        prompt: 'سال مالیاتی مورد نظر؟',
        examples: ['۱۴۰۳'],
      },
      {
        name: 'companyType',
        label: 'نوع شرکت',
        required: false,
        weight: 0.2,
        prompt: 'نوع شرکت چیست؟',
        examples: ['سهامی خاص', 'سئو محدود', 'تعاونی'],
      },
    ],
  },
  {
    type: 'TRANSFER',
    label: 'مالیات نقل و انتقال',
    slots: [
      {
        name: 'amount',
        label: 'ارزش ملک',
        required: true,
        weight: 0.4,
        prompt: 'ارزش ملک مورد نظر چقدر است؟',
        examples: ['۵ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال',
        required: true,
        weight: 0.2,
        prompt: 'سال انتقال یا سال مالیاتی؟',
        examples: ['۱۴۰۳'],
      },
      {
        name: 'transferType',
        label: 'نوع انتقال',
        required: false,
        weight: 0.2,
        prompt: 'انتقال به چه صورت است؟',
        examples: ['فروش', 'هبه', '交换'],
      },
    ],
  },
  {
    type: 'VAT',
    label: 'مالیات بر ارزش افزوده',
    slots: [
      {
        name: 'amount',
        label: 'فروش',
        required: true,
        weight: 0.4,
        prompt: 'مبلغ فروش یا درآمد مشمول را وارد کنید.',
        examples: ['۱۰ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال',
        required: true,
        weight: 0.2,
        prompt: 'دوره مالیاتی (فصل/سال)؟',
        examples: ['بهار ۱۴۰۳'],
      },
    ],
  },
  {
    type: 'PROPERTY',
    label: 'مالیات املاک',
    slots: [
      {
        name: 'amount',
        label: 'ارزش ملک',
        required: true,
        weight: 0.4,
        prompt: 'ارزش ملک چقدر است؟',
        examples: ['۳ میلیارد ریال'],
      },
      {
        name: 'year',
        label: 'سال',
        required: true,
        weight: 0.2,
        prompt: 'سال مورد نظر؟',
        examples: ['۱۴۰۳'],
      },
      {
        name: 'usage',
        label: 'نوع استفاده',
        required: false,
        weight: 0.2,
        prompt: 'ملک مسکونی، تجاری یا اداری است؟',
        examples: ['مسکونی', 'تجاری'],
      },
    ],
  },
];

export function getSlotConfig(calcType: string): CalcSlotConfig | undefined {
  return CALC_SLOTS.find((s) => s.type === calcType);
}
