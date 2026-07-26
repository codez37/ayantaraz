import Link from 'next/link';

const cards = [
  { href: '/admin/dashboard', title: 'داشبورد مدیریتی', desc: 'نمای کلی کاربران، محتوا، سفارش‌ها و مشاوره‌ها' },
  { href: '/admin/contents', title: 'محتوا و مینی‌بوک', desc: 'ساخت، آپلود، انتشار و بایگانی محتوای آموزشی' },
  { href: '/admin/consultations', title: 'مسیر مشاوره', desc: 'پیگیری درخواست‌ها، وضعیت تماس و تکمیل پرونده' },
  { href: '/admin/chatbot', title: 'دانشنامه چت‌بات', desc: 'مدیریت داده‌های پاسخگویی هوشمند' },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gold-gradient">پنل مدیریت</h1>
        <p className="mt-2 text-sm text-gray-500">دسترسی کامل به عملیات اصلی تولید، محتوا، مشاوره و پشتیبانی.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-[#C9A227]/10 bg-[#121212] p-5 transition hover:border-[#C9A227]/35 hover:shadow-lg hover:shadow-[#C9A227]/10"
          >
            <h2 className="font-black text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
