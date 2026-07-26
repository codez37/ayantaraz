import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حریم خصوصی | آیان تراز',
  description: 'سیاست حریم خصوصی و حفاظت از اطلاعات شخصی کاربران آیان تراز',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">حریم خصوصی</h1>
      <div className="prose-dark space-y-6 text-gray-400 leading-relaxed">
        <p>
          در آیان تراز، حفاظت از اطلاعات شخصی کاربران اولویت ماست. این سیاست توضیح می‌دهد که چگونه اطلاعات شما را
          جمع‌آوری، استفاده و محافظت می‌کنیم.
        </p>

        <h2 className="text-xl font-bold text-white mt-8">جمع‌آوری اطلاعات</h2>
        <p>
          ما تنها اطلاعاتی را جمع‌آوری می‌کنیم که برای ارائه خدمات ضروری است، از جمله شماره تلفن برای احراز هویت و
          اطلاعات پروفایل که شما ارائه می‌دهید.
        </p>

        <h2 className="text-xl font-bold text-white mt-8">استفاده از اطلاعات</h2>
        <p>اطلاعات شما صرفاً برای ارائه و بهبود خدمات، ارتباط با شما و پشتیبانی استفاده می‌شود.</p>

        <h2 className="text-xl font-bold text-white mt-8">محافظت از اطلاعات</h2>
        <p>
          ما از تکنیک‌های امنیتی استاندارد برای محافظت از اطلاعات شما استفاده می‌کنیم. اطلاعات شما به هیچ عنوان به اشخاص
          ثالث فروخته یا اجاره داده نمی‌شود.
        </p>

        <h2 className="text-xl font-bold text-white mt-8">تماس با ما</h2>
        <p>برای سوالات مربوط به حریم خصوصی با ما از طریق صفحه تماس در ارتباط باشید.</p>
      </div>
    </div>
  );
}
