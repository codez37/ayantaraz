export interface ImageEntry {
  url: string;
  caption: string;
}

export function getImageSitemap(): ImageEntry[] {
  return [
    { url: '/logo.png', caption: 'لوگوی آیان تراز' },
    { url: '/thumbnails/video-1.jpg', caption: 'آموزش کامل تنظیم اظهارنامه مالیاتی' },
    { url: '/thumbnails/video-2.jpg', caption: 'آموزش اصول حسابداری مالی' },
    { url: '/thumbnails/video-3.jpg', caption: 'راهنمای جامع معافیت‌های مالیاتی' },
    { url: '/thumbnails/video-4.jpg', caption: 'تحلیل صورت‌های مالی پیشرفته' },
    { url: '/thumbnails/video-5.jpg', caption: 'آموزش محاسبه مالیات بر ارزش افزوده' },
    { url: '/thumbnails/video-6.jpg', caption: 'مدیریت ریسک و بودجه‌بندی شرکتی' },
    { url: '/thumbnails/video-7.jpg', caption: 'بستن حساب‌های سال مالی' },
    { url: '/thumbnails/video-8.jpg', caption: 'آموزش حقوق و دستمزد و بیمه' },
  ];
}
