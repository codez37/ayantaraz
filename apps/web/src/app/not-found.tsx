import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-[#0B0B0C]">
      <h1 className="text-6xl font-black text-gold-gradient mb-4">۴۰۴</h1>
      <p className="text-xl text-gray-300 mb-8">صفحه‌ای که دنبال آن بودید پیدا نشد!</p>
      <Link href="/" className="btn-gold">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
