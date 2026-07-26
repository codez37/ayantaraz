import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'درباره آیان تراز | تیم متخصص حسابداری و مالیات',
  description:
    'آیان تراز با تیمی از متخصصان حسابداری و مالیات با بیش از ۱۵ سال تجربه، خدمات حرفه‌ای مالی و مالیاتی ارائه می‌دهد.',
  alternates: {
    canonical: 'https://ayantaraz.ir/about',
  },
  openGraph: {
    title: 'درباره آیان تراز | تیم متخصص حسابداری و مالیات',
    description:
      'آیان تراز با تیمی از متخصصان حسابداری و مالیات با بیش از ۱۵ سال تجربه، خدمات حرفه‌ای مالی و مالیاتی ارائه می‌دهد.',
    url: 'https://ayantaraz.ir/about',
    siteName: 'آیان تراز',
    images: [
      {
        url: 'https://ayantaraz.ir/og-image-about.png',
        width: 1200,
        height: 630,
        alt: 'آیان تراز - درباره ما',
      },
    ],
    locale: 'fa_IR',
    type: 'website',
  },
};

const team = [
  { name: 'دکتر محمد رضایی', role: 'مدیر عامل', desc: 'دکترای حسابداری با ۲۰ سال سابقه' },
  { name: 'مهندس سارا احمدی', role: 'مدیر مالیاتی', desc: 'کارشناس ارشد مالیات با ۱۵ سال تجربه' },
  { name: 'دکتر علی کریمی', role: 'مشاور ارشد', desc: 'دکترای مدیریت مالی از دانشگاه تهران' },
  { name: 'مریم حسینی', role: 'مدیر آموزش', desc: 'کارشناس ارشد حسابداری و مدرس دانشگاه' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1C1C1C] to-[#121212] py-16 md:py-24">
        <div className="container-mobile text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
            درباره <span className="text-gold-gradient">آیان تراز</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            تیمی از متخصصان حسابداری و مالیات با بیش از ۱۵ سال تجربه در کنار شما
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container-mobile py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
              داستان <span className="text-gold-gradient">ما</span>
            </h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                آیان تراز در سال ۱۳۸۸ با هدف ارائه خدمات حرفه‌ای حسابداری و مشاوره مالیاتی آغاز به کار کرد. ما معتقدیم
                شفافیت مالی و رعایت قوانین مالیاتی کلید موفقیت هر کسب‌وکاری است.
              </p>
              <p>
                تیم ما متشکل از حسابداران رسمی، مشاوران مالیاتی و اساتید دانشگاه است که با به‌روزترین دانش و تجربه در
                کنار شما هستند.
              </p>
              <p>
                امروز آیان تراز به یکی از معتبرترین برندهای مشاوره مالی و حسابداری در ایران تبدیل شده و به بیش از ۵۰۰
                کسب‌وکار در سراسر کشور خدمات ارائه می‌دهد.
              </p>
            </div>
          </div>
          <div className="card-dark p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-3">مأموریت ما</h3>
            <p className="text-gray-400 leading-relaxed">
              توانمندسازی کسب‌وکارها با ارائه خدمات حرفه‌ای مالی و مالیاتی، تا بتوانند با اطمینان و آگاهی بیشتری مسیر
              رشد خود را طی کنند.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-[#121212] p-4 rounded-xl">
                <div className="text-2xl font-black text-gold-gradient">۱۵+</div>
                <div className="text-xs text-gray-500">سال تجربه</div>
              </div>
              <div className="bg-[#121212] p-4 rounded-xl">
                <div className="text-2xl font-black text-gold-gradient">۵۰۰+</div>
                <div className="text-xs text-gray-500">مشتری</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#0B0B0C] py-16">
        <div className="container-mobile">
          <h2 className="text-2xl md:text-3xl font-black text-gold-gradient text-center mb-12">ارزش‌های ما</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎯', title: 'دقت', desc: 'بالاترین استانداردهای دقت در خدمات' },
              { icon: '🔒', title: 'امنیت', desc: 'حفظ محرمانگی اطلاعات مالی شما' },
              { icon: '⚡', title: 'سرعت', desc: 'پاسخگویی سریع به نیازهای شما' },
              { icon: '🤝', title: 'اعتماد', desc: 'رابطه صادقانه و شفاف با مشتریان' },
            ].map((v) => (
              <div key={v.title} className="card-dark p-5 text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-white font-bold mb-1">{v.title}</h3>
                <p className="text-gray-500 text-xs">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container-mobile py-16">
        <h2 className="text-2xl md:text-3xl font-black text-gold-gradient text-center mb-12">تیم ما</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {team.map((m) => (
            <div key={m.name} className="card-dark p-5 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#C9A227] to-[#FFA000] rounded-full mx-auto mb-3 flex items-center justify-center text-white font-black text-xl">
                {m.name[0]}
              </div>
              <h3 className="text-white font-bold text-sm">{m.name}</h3>
              <p className="text-[#C9A227] text-xs font-bold mt-1">{m.role}</p>
              <p className="text-gray-500 text-xs mt-2">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1C1C1C] to-[#121212] py-16 text-center">
        <div className="container-mobile">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">آماده همکاری با ما هستید؟</h2>
          <p className="text-gray-300 mb-8">با تیم ما تماس بگیرید یا درخواست مشاوره ثبت کنید</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/consultation" className="btn-gold">
              ثبت درخواست مشاوره
            </Link>
            <Link href="/contact" className="btn-outline-gold">
              تماس با ما
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
