import prisma from './prisma.js';

export const CANONICAL_DOMAIN = 'https://www.nexra3d.in';

export interface RouteSEOData {
  title: string;
  description: string;
  canonicalUrl: string;
  bodyHtml: string;
  jsonLd?: any;
}

export async function getRouteSEOData(path: string, query: Record<string, any>): Promise<RouteSEOData> {
  const cleanPath = path.toLowerCase().trim().replace(/\/$/, '') || '/';

  // 1. Product Detail Page: /shop?product=... or /shop?productId=...
  if (cleanPath === '/shop' && (query.product || query.productId)) {
    const productKey = String(query.product || query.productId).trim();
    try {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: productKey },
            { id: productKey }
          ]
        },
        include: {
          category: true,
          variants: true
        }
      });

      if (product) {
        const prodName = product.name;
        const prodDesc = product.description || `Custom high-precision 3D printed ${prodName} by NEXRA 3D in India.`;
        const prodCat = product.category?.name || '3D Printed Products';
        const price = Number(product.price || 0);
        const mrp = Number(product.mrp || product.price || 0);
        const inStock = Number(product.stockQuantity || (product as any).stock || 0) > 0;
        const canonical = `${CANONICAL_DOMAIN}/shop?product=${encodeURIComponent(product.slug || product.id)}`;
        const specs = (product.specifications as Record<string, any>) || {};

        let specsHtml = '';
        if (Object.keys(specs).length > 0) {
          specsHtml = `
          <section class="seo-specs my-6">
            <h2 class="text-xl font-bold mb-3 text-slate-900">Product Specifications</h2>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
              ${Object.entries(specs)
                .map(([k, v]) => `<div class="border-b border-slate-200 pb-1"><dt class="font-semibold text-slate-800">${k}:</dt><dd class="text-slate-600">${String(v)}</dd></div>`)
                .join('')}
            </dl>
          </section>`;
        }

        let optionsHtml = '';
        if (product.variants && product.variants.length > 0) {
          optionsHtml = `
          <section class="seo-options my-6">
            <h2 class="text-xl font-bold mb-3 text-slate-900">Available Options</h2>
            <p class="text-sm text-slate-600 mb-2">Choose from multiple sizes, colours, and custom finishes:</p>
            <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">
              ${product.variants
                .map((v: any) => `<li>${v.name || 'Standard Variant'} — ₹${Number(v.price).toLocaleString('en-IN')}${v.stockQuantity ? ` (${v.stockQuantity} in stock)` : ''}</li>`)
                .join('')}
            </ul>
          </section>`;
        }

        const bodyHtml = `
        <article class="max-w-4xl mx-auto px-4 py-8">
          <nav aria-label="Breadcrumb" class="text-xs text-slate-500 mb-4 flex items-center space-x-2">
            <a href="/" class="hover:underline">Home</a>
            <span>/</span>
            <a href="/shop" class="hover:underline">Shop</a>
            <span>/</span>
            <a href="/shop?category=${encodeURIComponent(product.category?.slug || product.category?.id || '')}" class="hover:underline">${prodCat}</a>
            <span>/</span>
            <span class="text-slate-800 font-semibold">${prodName}</span>
          </nav>

          <header class="mb-6">
            <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">${prodCat}</span>
            <h1 class="text-3xl sm:text-4xl font-black text-slate-900">${prodName}</h1>
            <p class="text-lg font-bold text-slate-900 mt-2">
              ₹${price.toLocaleString('en-IN')}
              ${mrp > price ? `<span class="text-sm text-slate-400 line-through ml-2">₹${mrp.toLocaleString('en-IN')}</span>` : ''}
              <span class="ml-3 text-xs px-2.5 py-0.5 rounded-full ${inStock ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-rose-100 text-rose-800 font-semibold'}">
                ${inStock ? 'In Stock' : 'Made to Order'}
              </span>
            </p>
          </header>

          <section class="seo-details my-6">
            <h2 class="text-xl font-bold mb-3 text-slate-900">Product Details</h2>
            <p class="text-base text-slate-700 leading-relaxed">${prodDesc}</p>
          </section>

          ${specsHtml}
          ${optionsHtml}

          <section class="seo-about my-6">
            <h2 class="text-xl font-bold mb-3 text-slate-900">About This 3D Printed Product</h2>
            <p class="text-sm text-slate-600 leading-relaxed">
              Every ${prodName} is individually crafted using state-of-the-art additive manufacturing at the NEXRA 3D studio in Hyderabad, India. We use premium biocompatible PLA, heat-resistant PETG, or ultra-fine photopolymer resin with layer heights down to 0.08mm. Each product undergoes careful hand-finishing and rigorous quality inspection prior to protective packaging and express dispatch across India.
            </p>
          </section>

          <section class="seo-related my-6 pt-6 border-t border-slate-200">
            <h2 class="text-xl font-bold mb-3 text-slate-900">Related 3D Printed Products</h2>
            <p class="text-sm text-slate-600 mb-3">Explore similar items and complementary custom creations:</p>
            <div class="flex flex-wrap gap-2">
              <a href="/shop" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800">All 3D Printed Products</a>
              <a href="/shop?category=${encodeURIComponent(product.category?.slug || product.category?.id || '')}" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800">More in ${prodCat}</a>
              <a href="/custom-orders" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800">Custom Orders Showcase</a>
              <a href="/services" class="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800">Custom 3D Printing Services</a>
            </div>
          </section>
        </article>
        `;

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: prodName,
          description: prodDesc,
          image: product.imageUrl || 'https://www.nexra3d.in/logo.png',
          sku: product.sku || product.id,
          offers: {
            '@type': 'Offer',
            price: price,
            priceCurrency: 'INR',
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
            url: canonical
          }
        };

        return {
          title: `${prodName} | 3D Printed Products | NEXRA 3D`,
          description: prodDesc.slice(0, 155),
          canonicalUrl: canonical,
          bodyHtml,
          jsonLd
        };
      }
    } catch (_) {}
  }

  // 2. Category Page: /shop?category=...
  if (cleanPath === '/shop' && query.category) {
    const catKey = String(query.category).trim();
    try {
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: catKey },
            { id: catKey }
          ]
        },
        include: {
          products: {
            take: 12,
            select: { id: true, name: true, slug: true, price: true, imageUrl: true }
          }
        }
      });

      if (category) {
        const catName = category.name;
        const canonical = `${CANONICAL_DOMAIN}/shop?category=${encodeURIComponent(category.slug || category.id)}`;
        const bodyHtml = `
        <article class="max-w-5xl mx-auto px-4 py-8">
          <nav aria-label="Breadcrumb" class="text-xs text-slate-500 mb-4 flex items-center space-x-2">
            <a href="/" class="hover:underline">Home</a>
            <span>/</span>
            <a href="/shop" class="hover:underline">Shop</a>
            <span>/</span>
            <span class="text-slate-800 font-semibold">${catName}</span>
          </nav>

          <header class="mb-8">
            <h1 class="text-3xl sm:text-4xl font-black text-slate-900">3D Printed ${catName}</h1>
            <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
              Discover our handcrafted collection of high-detail 3D printed ${catName.toLowerCase()}. Crafted with micron-level precision using premium polymers, custom finishing, and prompt pan-India delivery from NEXRA 3D.
            </p>
          </header>

          <section class="seo-cat-intro my-6">
            <h2 class="text-2xl font-bold mb-3 text-slate-900">3D Printed ${catName} & Custom Options</h2>
            <p class="text-sm text-slate-700 leading-relaxed mb-4">
              At NEXRA 3D, our ${catName.toLowerCase()} range combines modern additive manufacturing with meticulous hand-craftsmanship. Whether you are looking for custom dimensions, unique color palettes, or personalized engravings, each piece is engineered for structural durability, visual appeal, and enduring quality.
            </p>
          </section>

          <section class="seo-cat-products my-6">
            <h2 class="text-2xl font-bold mb-4 text-slate-900">Explore Our 3D Printed ${catName}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              ${(category.products || [])
                .map(
                  (p: any) => `
                <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <h3 class="font-bold text-slate-900 text-sm mb-1">
                    <a href="/shop?product=${encodeURIComponent(p.slug || p.id)}" class="hover:text-cyan-600 transition-colors">${p.name}</a>
                  </h3>
                  <p class="text-xs font-bold text-slate-700">₹${Number(p.price).toLocaleString('en-IN')}</p>
                  <a href="/shop?product=${encodeURIComponent(p.slug || p.id)}" class="inline-block mt-2 text-xs font-semibold text-cyan-600 hover:underline">View Product Details &rarr;</a>
                </div>`
                )
                .join('')}
            </div>
          </section>

          <section class="seo-cat-custom my-8 pt-6 border-t border-slate-200">
            <h2 class="text-2xl font-bold mb-3 text-slate-900">Customisation Options</h2>
            <p class="text-sm text-slate-700 leading-relaxed mb-4">
              Need personalized sizing, custom lighting wattages, or dedicated branding for ${catName.toLowerCase()}? NEXRA 3D supports customized dimensional scaling, multiple filament colors, and photo-to-3D carvings.
            </p>
            <div class="flex flex-wrap gap-3">
              <a href="/shop" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Browse Full Shop</a>
              <a href="/services" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">Request Custom Service</a>
              <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Contact NEXRA 3D</a>
            </div>
          </section>
        </article>
        `;

        return {
          title: `3D Printed ${catName} & Custom Options | NEXRA 3D`,
          description: `Shop high-precision 3D printed ${catName.toLowerCase()}, personalized gifts, and custom creations in India with express shipping from NEXRA 3D.`,
          canonicalUrl: canonical,
          bodyHtml
        };
      }
    } catch (_) {}
  }

  // 3. Shop Page: /shop
  if (cleanPath === '/shop') {
    return {
      title: '3D Printed Products & Custom Gifts | NEXRA 3D',
      description: 'Browse our complete catalog of personalized lithophane lamps, customized gifts, divine idols, home decor, and anime collectibles crafted in India.',
      canonicalUrl: `${CANONICAL_DOMAIN}/shop`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">3D Printed Products & Custom Gifts</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Welcome to the NEXRA 3D catalog. Explore precision 3D-printed creations including customized photo lithophane lamps, divine idols, home decor, desk accessories, and collectibles crafted with high-resolution additive technology in Hyderabad, India.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Explore All 3D Printed Products</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            Every product in our store is manufactured with rigorous quality controls using premium PLA, PETG, and photopolymer resins. We cater to individual shoppers seeking meaningful personalized gifts as well as bulk and corporate orders with pan-India delivery.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-4 text-slate-900">Popular 3D Printing Categories</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <a href="/shop?category=lamps" class="p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-500 transition-colors">
              <h3 class="font-bold text-slate-900 mb-1">3D Printed Lamps</h3>
              <p class="text-xs text-slate-600">Customized photo lithophanes, cylinder lamps, and warm night lights.</p>
            </a>
            <a href="/shop?category=gifts" class="p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-500 transition-colors">
              <h3 class="font-bold text-slate-900 mb-1">Personalized Gifts</h3>
              <p class="text-xs text-slate-600">Custom keychains, nameplates, anniversary gifts, and keepsake statues.</p>
            </a>
            <a href="/shop?category=idols" class="p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-500 transition-colors">
              <h3 class="font-bold text-slate-900 mb-1">Divine Idols & Decor</h3>
              <p class="text-xs text-slate-600">Intricately detailed idols, temple decor, and spiritual artifacts.</p>
            </a>
          </div>
        </section>

        <section class="my-6 pt-6 border-t border-slate-200">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Customization & Materials</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            Need a bespoke size, unique color combination, or corporate logo branding on your 3D printed items? We accommodate custom requirements with rapid turnaround times.
          </p>
          <div class="flex flex-wrap gap-3">
            <a href="/custom-orders" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">View Custom Orders Showcase</a>
            <a href="/services" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Our 3D Printing Services</a>
            <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Contact Support</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 4. Services Page: /services
  if (cleanPath === '/services') {
    return {
      title: 'Custom 3D Printing Services in India | NEXRA 3D',
      description: 'End-to-end 3D printing, custom design personalization, photo lithophane carving, and on-demand rapid prototyping services across India.',
      canonicalUrl: `${CANONICAL_DOMAIN}/services`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">Custom 3D Printing Services in India</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            NEXRA 3D offers professional additive manufacturing and custom 3D printing services across India. From individual CAD file manufacturing to industrial prototyping and low-volume production, we bring ideas into physical reality with micron-level accuracy.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Rapid Prototyping</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            Verify form, fit, and functional assembly in record time. Our rapid prototyping services support rapid turnaround with high-grade engineering polymers including Tough PLA, PETG, ABS, and Polycarbonate. Eliminate costly retooling errors with early-stage dimensional validation.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Industrial 3D Printing</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            Deploy additive manufacturing for jigs, fixtures, drone frames, robotic end-effectors, and functional enclosures. With build volumes accommodating small to large-scale parts and layer resolutions from 0.08mm to 0.28mm, our industrial printing delivers robust mechanical performance.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Engineering Applications</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            We collaborate closely with hardware startups, product designers, academic institutions, and manufacturing enterprises across India. We accept standard 3D CAD files (.STL, .OBJ, .STEP, .IGES) and provide rapid design-for-additive-manufacturing (DFAM) guidance.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Custom 3D Printing</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            Beyond industrial parts, we specialize in consumer personalization: custom photo lithophane lamps, bespoke architectural scale models, customized figurines, and personalized corporate merchandise.
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <a href="/custom-orders" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">View Showcase & Portfolio</a>
            <a href="/shop" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Shop Catalog</a>
            <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Request Custom Quote</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 5. Custom Orders Showcase: /custom-orders
  if (cleanPath === '/custom-orders') {
    return {
      title: 'Custom 3D Printing Showcase & Portfolio | NEXRA 3D',
      description: 'Explore completed bespoke 3D-printed creations crafted by NEXRA 3D, including lithophanes, engineering prototypes, and verified customer reviews.',
      canonicalUrl: `${CANONICAL_DOMAIN}/custom-orders`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">Custom 3D Printing Showcase & Portfolio</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Discover bespoke creations, commissioned projects, and custom additive manufacturing achievements delivered by NEXRA 3D to customers and businesses across India.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Bespoke 3D Printed Creations</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            Our custom portfolio features a diverse range of completed projects: from personalized portrait lithophanes that reveal photographs through warm backlighting, to scale architectural models, customized trophies, and bespoke cosplay props.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Custom Order Process</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-3">
            Getting your custom 3D printed idea manufactured with NEXRA 3D is simple, transparent, and secure:
          </p>
          <ol class="list-decimal pl-5 text-sm text-slate-700 space-y-1">
            <li><strong>Submit Details:</strong> Send your photographs, 2D sketches, or 3D CAD files via our quote tool or WhatsApp.</li>
            <li><strong>Engineering Review:</strong> We review the geometry, recommend optimal materials, and provide a clear quote.</li>
            <li><strong>Precision Printing:</strong> Your creation is printed with high-resolution additive technology and hand-finished.</li>
            <li><strong>Pan-India Express Dispatch:</strong> Securely packaged and shipped directly to your doorstep with tracking.</li>
          </ol>
        </section>

        <section class="my-6 pt-6 border-t border-slate-200">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Custom Lamp and Lithophane Showcases</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            Lithophanes are one of our signature custom specialties. By varying thickness layer-by-layer, gray tones and highlights emerge organically when illuminated.
          </p>
          <div class="flex flex-wrap gap-3">
            <a href="/shop?category=lamps" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">Order a Custom Lamp</a>
            <a href="/services" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Explore Services</a>
            <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Contact Us</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 6. About Page: /about
  if (cleanPath === '/about') {
    return {
      title: 'About NEXRA 3D — Custom 3D Printing in India | NEXRA 3D',
      description: 'Discover NEXRA 3D - creating handcrafted, precision personalized 3D printed lamps, gifts, and decor across India.',
      canonicalUrl: `${CANONICAL_DOMAIN}/about`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">About NEXRA 3D — Custom 3D Printing in India</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            NEXRA 3D is a brand of VL Technologies Pvt Ltd, dedicated to pioneering precision additive manufacturing and customized 3D-printed lifestyle products in India.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Our Story & Mission</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            Founded with a passion for digital fabrication and design excellence, NEXRA 3D bridges the gap between digital CAD design and tangible physical artifacts. We believe customized manufacturing should be accessible, affordable, and crafted with uncompromising standards of quality.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Precision Additive Manufacturing in India</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            Operating from our advanced fabrication studio in Hyderabad, Telangana, we utilize industrial FDM and SLA additive systems capable of producing intricate geometries, smooth surface finishes, and durable structural parts in biodegradable PLA, tough PETG, engineering ABS, and UV photopolymer resins.
          </p>
        </section>

        <section class="my-6 pt-6 border-t border-slate-200">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Commitment to Quality & Innovation</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            Every creation is inspected by hand before dispatch. We take pride in delivering memorable personalized gifts, stunning lithophane lamps, and reliable industrial prototypes with express shipping to customers across India.
          </p>
          <div class="flex flex-wrap gap-3">
            <a href="/shop" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Browse Shop</a>
            <a href="/services" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">Our Services</a>
            <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Contact Support</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 7. Contact Page: /contact
  if (cleanPath === '/contact') {
    return {
      title: 'Contact NEXRA 3D — Custom 3D Printing & Support | NEXRA 3D',
      description: 'Get in touch with NEXRA 3D for personalized gifts, custom printing orders, CAD quotes, and customer support in India.',
      canonicalUrl: `${CANONICAL_DOMAIN}/contact`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">Contact NEXRA 3D — Custom 3D Printing & Support</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Have questions about custom 3D printing, personalized lithophane lamps, material specifications, or CAD manufacturing? Our engineering and support team is here to assist you.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Business & Facility Information</h2>
          <ul class="text-sm text-slate-700 space-y-2">
            <li><strong>Address:</strong> Plot no 484, TNGOs Colony, Gachibowli, Hyderabad, Telangana - 500032, India</li>
            <li><strong>Phone / WhatsApp:</strong> +91 8886149998 / +91 8886159998</li>
            <li><strong>Email:</strong> nexra3d@gmail.com</li>
            <li><strong>Business Hours:</strong> Monday – Saturday: 9:00 AM – 7:00 PM IST</li>
          </ul>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Customer Support & Order Inquiries</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            For existing orders, order tracking, custom requests, or corporate gifting inquiries, connect with us instantly on WhatsApp or send us your details online.
          </p>
          <div class="flex flex-wrap gap-3">
            <a href="https://wa.me/918886149998" target="_blank" rel="noopener noreferrer" class="text-xs font-bold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Chat on WhatsApp</a>
            <a href="/shop" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Visit Shop</a>
            <a href="/services" class="text-xs font-bold px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400">Request CAD Quote</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 8. Privacy Policy: /privacy-policy
  if (cleanPath === '/privacy-policy') {
    return {
      title: 'Privacy Policy | NEXRA 3D',
      description: 'Learn how NEXRA 3D protects your privacy, personal data, CAD files, and intellectual property.',
      canonicalUrl: `${CANONICAL_DOMAIN}/privacy-policy`,
      bodyHtml: `
      <article class="max-w-5xl mx-auto px-4 py-8">
        <header class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900">Privacy Policy | NEXRA 3D</h1>
          <p class="text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
            This Privacy Statement explains how NEXRA 3D ("Data Fiduciary") collects, uses, processes, stores, and protects personal data and proprietary 3D CAD files.
          </p>
        </header>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Information Collection & Intellectual Property</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            We collect contact and shipping details strictly for order fulfillment, live package tracking, and customer communication. Client-uploaded photographs for lithophanes and proprietary 3D CAD models (STL, OBJ, STEP) remain the exclusive intellectual property of the customer and are handled under strict confidentiality.
          </p>
        </section>

        <section class="my-6">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Payment Security & Order Processing</h2>
          <p class="text-sm text-slate-700 leading-relaxed">
            All online transactions are securely encrypted and processed via RBI-licensed payment gateways (including Razorpay). NEXRA 3D does not store credit card or debit card numbers on our servers.
          </p>
        </section>

        <section class="my-6 pt-6 border-t border-slate-200">
          <h2 class="text-2xl font-bold mb-3 text-slate-900">Your Rights & Contact Information</h2>
          <p class="text-sm text-slate-700 leading-relaxed mb-4">
            You may request access to, correction of, or deletion of your personal data at any time by contacting our privacy grievance officer at nexra3d@gmail.com.
          </p>
          <div class="flex flex-wrap gap-3">
            <a href="/" class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Return to Home</a>
            <a href="/contact" class="text-xs font-bold px-4 py-2 border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100">Contact Us</a>
          </div>
        </section>
      </article>
      `
    };
  }

  // 9. Default: Homepage (/)
  return {
    title: '3D Printing & Custom 3D Printing Services in India | NEXRA 3D',
    description: 'Custom 3D printing services, personalized photo lithophane lamps, customized gifts, divine idols, and precision 3D printed products in India | NEXRA 3D',
    canonicalUrl: `${CANONICAL_DOMAIN}/`,
    bodyHtml: `
    <header class="border-b border-slate-200 bg-white py-4 px-4 sm:px-8">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a href="/" class="text-xl font-black text-slate-900 tracking-tight">NEXRA 3D</a>
        <nav class="flex items-center space-x-4 text-xs font-bold text-slate-700">
          <a href="/" class="hover:text-cyan-600">Home</a>
          <a href="/shop" class="hover:text-cyan-600">Shop Products</a>
          <a href="/services" class="hover:text-cyan-600">Custom Services</a>
          <a href="/custom-orders" class="hover:text-cyan-600">Custom Orders</a>
          <a href="/about" class="hover:text-cyan-600">About</a>
          <a href="/contact" class="hover:text-cyan-600">Contact</a>
        </nav>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <section class="hero text-center sm:text-left space-y-4 max-w-4xl">
        <span class="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
          NEXRA 3D — Premier Additive Manufacturing Studio
        </span>
        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
          3D Printing &amp; Custom 3D Printing Services in India
        </h1>
        <p class="text-base sm:text-lg text-slate-700 leading-relaxed max-w-3xl">
          NEXRA 3D provides state-of-the-art 3D printing services, personalized lithophane night lamps, bespoke corporate gifts, sacred idols, and rapid prototyping solutions. Headquartered in Hyderabad, Telangana, we serve creators, hobbyists, startups, and engineering firms across India with fast nationwide express delivery.
        </p>
        <div class="flex flex-wrap gap-4 pt-2">
          <a href="/shop" class="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl transition-all shadow-md text-sm">
            Shop 3D Printed Products
          </a>
          <a href="/services" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm">
            Explore 3D Printing Services
          </a>
          <a href="/custom-orders" class="border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-6 py-3 rounded-xl transition-all text-sm">
            Custom Orders Portfolio
          </a>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Custom 3D Printing Services</h2>
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed">
          Our on-demand custom 3D printing services support rapid design iteration, functional assemblies, and custom parts. Upload your CAD designs (.STL, .OBJ, .STEP) or work directly with our engineering team to select optimal infill densities, wall thicknesses, and high-performance filaments like PLA+, PETG, ABS, TPU, and UV photopolymer resins with tolerances down to ±0.1mm.
        </p>
        <div class="flex gap-3">
          <a href="/services" class="text-xs font-bold text-cyan-700 hover:underline">Learn more about our Custom 3D Printing Services &rarr;</a>
          <a href="/contact" class="text-xs font-bold text-slate-600 hover:underline">Request an instant quote &rarr;</a>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">3D Printed Products</h2>
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed">
          Browse our extensive catalog of handcrafted 3D printed items. Each product is produced with fine layer lines, calibrated mechanical precision, and vibrant eco-friendly polymers. From ergonomic desk accessories and planters to articulated dragon figures and decorative home pieces, our products bring functional art into modern spaces.
        </p>
        <a href="/shop" class="text-xs font-bold text-cyan-700 hover:underline inline-block">Browse all 3D printed products &rarr;</a>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Personalized 3D Printed Gifts</h2>
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed">
          Celebrate birthdays, anniversaries, weddings, and milestones with custom 3D printed gifts. We personalize customized lithophanes, custom keychains, custom name signs, and personalized photo sculptures that turn cherished memories into timeless keepsakes.
        </p>
        <a href="/custom-orders" class="text-xs font-bold text-cyan-700 hover:underline inline-block">View personalized gift portfolio &rarr;</a>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">3D Printed Lamps &amp; Custom Lamps</h2>
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed">
          NEXRA 3D is renowned for customized photo lithophane lamps. By engineering micro-variations in wall thickness, your uploaded photographs become glowing three-dimensional portraits when illuminated by warm LED light. Available in cylinder, square, bedside, and moon lamp configurations.
        </p>
        <a href="/shop?category=lamps" class="text-xs font-bold text-cyan-700 hover:underline inline-block">Explore 3D printed lamps &rarr;</a>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Industrial 3D Printing &amp; Prototyping</h2>
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed">
          Accelerate your engineering workflow with functional rapid prototypes, electronics enclosures, robotics brackets, and lightweight drone components. We support rapid validation runs so you can test physical ergonomics and fit before mass tooling.
        </p>
        <a href="/services" class="text-xs font-bold text-cyan-700 hover:underline inline-block">Industrial additive manufacturing solutions &rarr;</a>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900">Why Choose NEXRA 3D</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 class="font-bold text-slate-900 mb-1">Micron Precision</h3>
            <p class="text-xs text-slate-600">Calibrated commercial printers delivering clean layer resolution from 0.08mm to 0.2mm.</p>
          </div>
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 class="font-bold text-slate-900 mb-1">Premium Polymers</h3>
            <p class="text-xs text-slate-600">Non-toxic biodegradable PLA+, durable PETG, temperature-resistant ABS, and resin.</p>
          </div>
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 class="font-bold text-slate-900 mb-1">Pan-India Express Delivery</h3>
            <p class="text-xs text-slate-600">Secure packaging and reliable courier partners shipping directly from Hyderabad across India.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-slate-900 text-slate-400 py-8 px-4 sm:px-8 mt-16 text-xs">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; ${new Date().getFullYear()} NEXRA 3D (VL Technologies Pvt Ltd). All rights reserved.</p>
        <div class="flex flex-wrap gap-4 font-bold text-slate-300">
          <a href="/shop" class="hover:text-white">Shop</a>
          <a href="/services" class="hover:text-white">Services</a>
          <a href="/custom-orders" class="hover:text-white">Custom Orders</a>
          <a href="/about" class="hover:text-white">About Us</a>
          <a href="/contact" class="hover:text-white">Contact</a>
          <a href="/privacy-policy" class="hover:text-white">Privacy Policy</a>
        </div>
      </div>
    </footer>
    `
  };
}

export function injectSEOIntoHtml(
  templateHtml: string,
  seoData: RouteSEOData
): string {
  let html = templateHtml;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${seoData.title}</title>`);

  // Replace Meta Description
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
      `<meta name="description" content="${seoData.description.replace(/"/g, '&quot;')}" />`
    );
  } else {
    html = html.replace(
      '</head>',
      `  <meta name="description" content="${seoData.description.replace(/"/g, '&quot;')}" />\n</head>`
    );
  }

  // Replace Canonical Link
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
      `<link rel="canonical" href="${seoData.canonicalUrl}" />`
    );
  } else {
    html = html.replace(
      '</head>',
      `  <link rel="canonical" href="${seoData.canonicalUrl}" />\n</head>`
    );
  }

  // Replace OpenGraph Title & Description
  html = html.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${seoData.title.replace(/"/g, '&quot;')}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${seoData.description.replace(/"/g, '&quot;')}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:url" content="${seoData.canonicalUrl}" />`
  );

  // Replace Twitter Title & Description
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${seoData.title.replace(/"/g, '&quot;')}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${seoData.description.replace(/"/g, '&quot;')}" />`
  );

  // If JSON-LD provided, append it to <head>
  if (seoData.jsonLd) {
    const jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(seoData.jsonLd, null, 2)}\n    </script>\n`;
    html = html.replace('</head>', `${jsonLdScript}</head>`);
  }

  // Inject crawlable body into <div id="root">...</div>
  // Ensure that React still hydrates/mounts into <div id="root">
  if (html.includes('<!-- SEO_ROOT_START -->') && html.includes('<!-- SEO_ROOT_END -->')) {
    html = html.replace(
      /<!-- SEO_ROOT_START -->[\s\S]*?<!-- SEO_ROOT_END -->/i,
      `<!-- SEO_ROOT_START -->\n${seoData.bodyHtml}\n<!-- SEO_ROOT_END -->`
    );
  } else {
    const rootDivRegex = /<div\s+id="root">\s*<\/div>/i;
    if (rootDivRegex.test(html)) {
      html = html.replace(rootDivRegex, `<div id="root">${seoData.bodyHtml}</div>`);
    } else {
      html = html.replace(/<div\s+id="root">[\s\S]*?<\/div>/i, `<div id="root">${seoData.bodyHtml}</div>`);
    }
  }

  return html;
}
