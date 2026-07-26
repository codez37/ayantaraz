import Link from 'next/link';

// ============================================
// Footer Component - Mobile-First Refactor
// ============================================

export default function Footer() {
  const year = new Date().getFullYear();

  // ==========================================
  // FOOTER SECTIONS
  // ==========================================
  const brandSection = {
    logo: (
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-[#C9A227] to-[#FFA000] rounded-lg flex items-center justify-center text-[#0B0B0C] font-black text-sm">
          آ
        </div>
        <span className="text-lg font-black bg-gradient-to-l from-[#C9A227] via-[#A0781E] to-[#FFA000] bg-clip-text text-transparent">
          آیان تراز
        </span>
      </div>
    ),
    description: 'ارائه خدمات حسابداری، مشاوره مالیاتی و آموزش مالی با تیمی متخصص و مجرب',
  };

  const servicesSection = {
    title: 'خدمات',
    links: [
      { href: '/services', label: 'خدمات ما' },
      { href: '/courses', label: 'دوره‌ها' },
      { href: '/consultation', label: 'مشاوره تخصصی' },
    ],
  };

  const quickAccessSection = {
    title: 'دسترسی سریع',
    links: [
      { href: '/articles', label: 'مقالات' },
      { href: '/videos', label: 'ویدیوها' },
      { href: '/minibooks', label: 'مینی‌بوک‌ها' },
      { href: '/about', label: 'درباره ما' },
      { href: '/contact', label: 'تماس' },
    ],
  };

  const contactSection = {
    title: 'اطلاعات تماس',
    items: [
      { label: 'تلفن', value: '۰۹۱۳۴۲۹۲۳۲۹' },
      { label: 'تلفن', value: '۰۹۹۱۸۵۶۳۷۲۵' },
      { label: 'ایمیل', value: 'samanbabaeiii20@gmail.com' },
      { label: 'اینستاگرام', value: '@samtaxco' },
      { label: 'تلگرام', value: '@samtax' },
    ],
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <footer className="bg-[#0B0B0C] border-t border-[#C9A227]/10 mt-16 md:mt-20">
      <div className="container-mobile py-8 md:py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section (Full width on mobile, 2 cols on tablet, 1 col on desktop) */}
          <div className="lg:col-span-1">
            {brandSection.logo}
            <p className="text-sm text-gray-500 leading-relaxed">{brandSection.description}</p>
          </div>

          {/* Services Section */}
          <div className="md:col-span-1">
            <h4 className="text-[#C9A227] font-bold mb-4 text-sm">{servicesSection.title}</h4>
            <div className="space-y-3">
              {servicesSection.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="
                    block text-sm text-gray-400
                    hover:text-[#C9A227]
                    transition-colors duration-200
                  "
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Access Section */}
          <div className="md:col-span-1">
            <h4 className="text-[#C9A227] font-bold mb-4 text-sm">{quickAccessSection.title}</h4>
            <div className="space-y-3">
              {quickAccessSection.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="
                    block text-sm text-gray-400
                    hover:text-[#C9A227]
                    transition-colors duration-200
                  "
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="md:col-span-1">
            <h4 className="text-[#C9A227] font-bold mb-4 text-sm">{contactSection.title}</h4>
            <div className="space-y-3 text-sm">
              {contactSection.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-gray-500">{item.label}:</span>
                  <span className="text-gray-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-[#C9A227]/10 mt-8 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600 text-center md:text-right">
              تمامی حقوق برای آیان تراز محفوظ است © {year}
            </p>
            <div className="flex gap-4 text-xs text-gray-600 justify-center md:justify-start">
              <Link href="/about" className="hover:text-[#C9A227] transition-colors">
                درباره ما
              </Link>
              <Link href="/contact" className="hover:text-[#C9A227] transition-colors">
                تماس
              </Link>
              <Link href="/privacy" className="hover:text-[#C9A227] transition-colors">
                حریم خصوصی
              </Link>
              <Link href="/terms" className="hover:text-[#C9A227] transition-colors">
                قوانین
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
