import { useEffect } from 'react';

export const CANONICAL_DOMAIN = 'https://www.nexra3d.in';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  noindex?: boolean;
  productSchema?: any;
  serviceSchema?: any;
  organizationSchema?: any;
  breadcrumbSchema?: any;
  websiteSchema?: any;
}

export function computeCanonicalUrl(providedUrl?: string): string {
  if (providedUrl) {
    if (providedUrl.startsWith('http://') || providedUrl.startsWith('https://')) {
      try {
        const parsed = new URL(providedUrl);
        const normPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
        return `${CANONICAL_DOMAIN}${normPath || '/'}${parsed.search}`;
      } catch {
        return `${CANONICAL_DOMAIN}/`;
      }
    }
    const cleanRel = providedUrl.startsWith('/') ? providedUrl : `/${providedUrl}`;
    const [pathPart, queryPart] = cleanRel.split('?');
    const normalizedPath = pathPart === '/' ? '/' : pathPart.replace(/\/+$/, '');
    return `${CANONICAL_DOMAIN}${normalizedPath === '/' && !queryPart ? '/' : normalizedPath}${queryPart ? `?${queryPart}` : ''}`;
  }

  if (typeof window !== 'undefined') {
    const rawPath = window.location.pathname || '/';
    const normPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
    const searchParams = new URLSearchParams(window.location.search);
    const cleanParams = new URLSearchParams();

    // Preserve only canonical query parameters
    const prod = searchParams.get('product') || searchParams.get('productId');
    if (prod) cleanParams.set('product', prod);

    const cat = searchParams.get('category');
    if (cat) cleanParams.set('category', cat);

    const srv = searchParams.get('service');
    if (srv) cleanParams.set('service', srv);

    const queryStr = cleanParams.toString();
    return `${CANONICAL_DOMAIN}${normPath === '/' && !queryStr ? '/' : normPath}${queryStr ? `?${queryStr}` : ''}`;
  }

  return `${CANONICAL_DOMAIN}/`;
}

export function useSEO({
  title = '3D Printing & Custom 3D Printing Services | NEXRA 3D',
  description = 'Custom 3D printing services, personalized photo lithophane lamps, customized gifts, divine idols, and precision 3D printed products in India | NEXRA 3D',
  keywords = '3D printing, custom 3D printing, 3D printed lamps, personalized 3D printing, 3D printing services India, custom 3D printed gifts, lithophane lamps, NEXRA 3D',
  image = 'https://www.nexra3d.in/logo.png',
  url,
  noindex = false,
  productSchema,
  serviceSchema,
  organizationSchema,
  breadcrumbSchema,
  websiteSchema
}: SEOProps) {
  useEffect(() => {
    // 1. Set Page Title
    const formattedTitle = title.includes('NEXRA 3D') ? title : `${title} | NEXRA 3D`;
    document.title = formattedTitle;

    // Helper to update or create meta tag
    const updateMeta = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=');
        element.setAttribute(attrName, attrVal.replace(/"/g, ''));
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    // 2. Robots Directives (index/noindex)
    updateMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow');

    // 3. Standard Meta Description & Keywords
    updateMeta('meta[name="description"]', 'content', description);
    updateMeta('meta[name="keywords"]', 'content', keywords);

    // 4. Absolute Image URL
    const canonicalImage = image.startsWith('http')
      ? image
      : `${CANONICAL_DOMAIN}${image.startsWith('/') ? '' : '/'}${image}`;

    // 5. Canonical URL
    const canonicalUrl = computeCanonicalUrl(url);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 6. OpenGraph Meta Tags
    updateMeta('meta[property="og:site_name"]', 'content', 'NEXRA 3D');
    updateMeta('meta[property="og:locale"]', 'content', 'en_IN');
    updateMeta('meta[property="og:type"]', 'content', productSchema ? 'product' : 'website');
    updateMeta('meta[property="og:title"]', 'content', formattedTitle);
    updateMeta('meta[property="og:description"]', 'content', description);
    updateMeta('meta[property="og:url"]', 'content', canonicalUrl);
    updateMeta('meta[property="og:image"]', 'content', canonicalImage);

    // 7. Twitter Card Meta Tags
    updateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', 'content', formattedTitle);
    updateMeta('meta[name="twitter:description"]', 'content', description);
    updateMeta('meta[name="twitter:image"]', 'content', canonicalImage);

    // 8. Structured Data Graph (Schema.org)
    const defaultOrgSchema = organizationSchema || {
      '@type': 'Organization',
      '@id': `${CANONICAL_DOMAIN}/#organization`,
      name: 'NEXRA 3D',
      legalName: 'VL Technologies Pvt Ltd (NEXRA 3D)',
      url: `${CANONICAL_DOMAIN}/`,
      logo: `${CANONICAL_DOMAIN}/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-8886149998',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Telugu']
      }
    };

    const defaultWebSiteSchema = websiteSchema || {
      '@type': 'WebSite',
      '@id': `${CANONICAL_DOMAIN}/#website`,
      name: 'NEXRA 3D',
      url: `${CANONICAL_DOMAIN}/`,
      publisher: { '@id': `${CANONICAL_DOMAIN}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${CANONICAL_DOMAIN}/shop?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

    const graphItems: any[] = [defaultOrgSchema, defaultWebSiteSchema];
    if (productSchema) graphItems.push(productSchema);
    if (serviceSchema) graphItems.push(serviceSchema);
    if (breadcrumbSchema) graphItems.push(breadcrumbSchema);

    const schemaGraph = {
      '@context': 'https://schema.org',
      '@graph': graphItems
    };

    let script = document.getElementById('nexra-jsonld-schema') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'nexra-jsonld-schema';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaGraph);
  }, [
    title,
    description,
    keywords,
    image,
    url,
    noindex,
    productSchema,
    serviceSchema,
    organizationSchema,
    breadcrumbSchema,
    websiteSchema
  ]);
}
