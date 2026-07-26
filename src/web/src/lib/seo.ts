const SITE_NAME = 'آیان تراز';

export function setPageTitle(title: string, suffix = SITE_NAME) {
  if (typeof document !== 'undefined') {
    document.title = `${title} | ${suffix}`;
  }
}

export function injectJsonLd(data: Record<string, unknown>) {
  if (typeof document === 'undefined') return;
  const id = `jsonld-${crypto.randomUUID().slice(0, 8)}`;
  const existing = document.getElementById(id);
  if (existing) return;
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function setPageMeta(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  publishedAt?: string;
}) {
  if (typeof document === 'undefined') return;

  document.title = `${opts.title} | ${SITE_NAME}`;

  const setMeta = (attr: string, key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('name', 'description', opts.description);
  setMeta('property', 'og:title', opts.title);
  setMeta('property', 'og:description', opts.description);
  setMeta('property', 'og:url', opts.url);
  setMeta('property', 'og:type', opts.type || 'article');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'fa_IR');

  if (opts.image) {
    setMeta('property', 'og:image', opts.image);
    setMeta('name', 'twitter:image', opts.image);
  }

  setMeta('name', 'twitter:card', opts.image ? 'summary_large_image' : 'summary');
  setMeta('name', 'twitter:title', opts.title);
  setMeta('name', 'twitter:description', opts.description);

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = opts.url;
}
