interface PrismaClient {
  taxBracket: {
    upsert: (args: {
      where: {
        year_type_bracketOrder: {
          year: number;
          type: string;
          bracketOrder: number;
        };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  taxRule: {
    upsert: (args: {
      where: { ruleKey: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

export async function seedTaxEngine(prisma: PrismaClient): Promise<void> {
  const year = 1403;

  const salaryBrackets = [
    {
      bracketOrder: 1,
      minAmount: 0,
      maxAmount: 12000000,
      rate: 0,
      description: 'معافیت پایه حقوق ماهانه ۱۴۰۳',
      metadata: { annualExemption: 144000000, isExempt: true },
    },
    {
      bracketOrder: 2,
      minAmount: 12000001,
      maxAmount: 30000000,
      rate: 10,
      description: 'نرخ ۱۰٪ پله دوم حقوق',
    },
    {
      bracketOrder: 3,
      minAmount: 30000001,
      maxAmount: 60000000,
      rate: 15,
      description: 'نرخ ۱۵٪ پله سوم حقوق',
    },
    {
      bracketOrder: 4,
      minAmount: 60000001,
      maxAmount: 120000000,
      rate: 20,
      description: 'نرخ ۲۰٪ پله چهارم حقوق',
    },
    {
      bracketOrder: 5,
      minAmount: 120000001,
      maxAmount: 200000000,
      rate: 25,
      description: 'نرخ ۲۵٪ پله پنجم حقوق',
    },
    {
      bracketOrder: 6,
      minAmount: 200000001,
      maxAmount: null,
      rate: 30,
      description: 'نرخ ۳۰٪ پله ششم حقوق',
    },
  ];

  for (const bracket of salaryBrackets) {
    await prisma.taxBracket.upsert({
      where: {
        year_type_bracketOrder: {
          year,
          type: 'SALARY',
          bracketOrder: bracket.bracketOrder,
        },
      },
      create: {
        year,
        type: 'SALARY',
        bracketOrder: bracket.bracketOrder,
        minAmount: BigInt(bracket.minAmount),
        maxAmount:
          bracket.maxAmount !== null ? BigInt(bracket.maxAmount) : null,
        rate: bracket.rate,
        description: bracket.description,
        metadata: bracket.metadata,
      },
      update: {
        minAmount: BigInt(bracket.minAmount),
        maxAmount:
          bracket.maxAmount !== null ? BigInt(bracket.maxAmount) : null,
        rate: bracket.rate,
        description: bracket.description,
        metadata: bracket.metadata,
      },
    });
  }

  await prisma.taxBracket.upsert({
    where: {
      year_type_bracketOrder: { year, type: 'RENTAL', bracketOrder: 1 },
    },
    create: {
      year,
      type: 'RENTAL',
      bracketOrder: 1,
      minAmount: BigInt(0),
      maxAmount: null,
      rate: 25,
      description: 'نرخ پایه اجاره (ماده ۵۳)',
      metadata: {},
    },
    update: {
      rate: 25,
      maxAmount: null,
    },
  });

  await prisma.taxBracket.upsert({
    where: {
      year_type_bracketOrder: { year, type: 'CORPORATE', bracketOrder: 1 },
    },
    create: {
      year,
      type: 'CORPORATE',
      bracketOrder: 1,
      minAmount: BigInt(0),
      maxAmount: null,
      rate: 25,
      description: 'نرخ اشخاص حقوقی',
      metadata: {},
    },
    update: {
      rate: 25,
    },
  });

  const rules = [
    {
      ruleKey: 'RENTAL_COST_DEDUCTION',
      type: 'RENTAL',
      description: '25% deduction for rental costs',
      condition: { type: 'always' },
      action: {
        type: 'DEDUCTION',
        params: { percent: 25, label: 'هزینه‌ها و استهلاکات' },
      },
    },
    {
      ruleKey: 'RENTAL_RESIDENTIAL_DISCOUNT',
      type: 'RENTAL',
      description: '40% discount for residential rental',
      condition: { type: 'property_residential' },
      action: {
        type: 'DISCOUNT',
        params: {
          percent: 40,
          label: 'تخفیف املاک مسکونی',
          ref: 'ماده ۵۳ تبصره',
        },
      },
    },
    {
      ruleKey: 'INHERITANCE_HEIR_CLASS_MULTIPLIER',
      type: 'INHERITANCE',
      description: 'Heir class 2 multiplier: 2x',
      condition: { type: 'heir_class', class: 2 },
      action: { type: 'MULTIPLIER', params: { factor: 2.0 } },
    },
    {
      ruleKey: 'INHERITANCE_HEIR_CLASS_MULTIPLIER_3',
      type: 'INHERITANCE',
      description: 'Heir class 3 multiplier: 4x',
      condition: { type: 'heir_class', class: 3 },
      action: { type: 'MULTIPLIER', params: { factor: 4.0 } },
    },
    {
      ruleKey: 'TRANSFER_PROPERTY_RATE',
      type: 'TRANSFER',
      description: '5% transfer property rate',
      condition: { type: 'asset_type', asset: 'PROPERTY' },
      action: {
        type: 'PERCENTAGE_RATE',
        params: { rate: 5.0, ref: 'ماده ۹۵' },
      },
    },
  ];

  for (const rule of rules) {
    const now = new Date();
    await prisma.taxRule.upsert({
      where: { ruleKey: rule.ruleKey },
      create: {
        type: rule.type,
        ruleKey: rule.ruleKey,
        description: rule.description,
        condition: rule.condition,
        action: rule.action,
        priority: 0,
        effectiveFrom: now,
        effectiveTo: null,
        isActive: true,
      },
      update: {
        description: rule.description,
        condition: rule.condition,
        action: rule.action,
      },
    });
  }
}
