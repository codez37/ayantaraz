import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'قوانین و مقررات | آیان تراز',
  description: 'قوانین و مقررات استفاده از خدمات آیان تراز',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">قوانین و مقررات</h1>
      <div className="prose-dark space-y-6 text-gray-400 leading-relaxed">
        <p>با استفاده از خدمات آیان تراز، شما قوانین و مقررات زیر را می‌پذیرید.</p>

        <h2 className="text-xl font-bold text-white mt-8">شرایط استفاده</h2>
        <p>
          خدمات ما شامل مشاوره مالیاتی، حسابداری و آموزش مالی است. مسئولیت نهایی تصمیمات مالی بر عهده کاربر است و
          مشاوره‌های ارائه شده جایگزین مشاوره رسمی مالیاتی نیست.
        </p>

        <h2 className="text-xl font-bold text-white mt-8">پرداخت و بازگشت وجه</h2>
        <p>پرداخت‌ها به صورت دستی انجام می‌شود. در صورت نارضایتی از خدمات، بازگشت وجه طبق شرایط قابل بررسی است.</p>

        <h2 className="text-xl font-bold text-white mt-8">مسئولیت‌ها</h2>
        <p>
          کاربر مسئول حفظ امنیت حساب کاربری خود است. آیان تراز در قبال استفاده غیرمجاز از حساب کاربری مسئولیتی ندارد.
        </p>

        <h2 className="text-xl font-bold text-white mt-8">تغییرات قوانین</h2>
        <p>آیان تراز حق تغییر این قوانین را در هر زمان محفوظ می‌دارد. تغییرات از طریق وب‌سایت اطلاع‌رسانی می‌شود.</p>
      </div>
    </div>
  );
}
