import React from 'react';
import { ArrowRight, Layers, Sparkles, Lamp, Gift, Cpu, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

interface HomeSEOSectionsProps {
  onNavigateShop: () => void;
  onNavigateServices: () => void;
  onNavigateCustomOrders: () => void;
  onNavigateCategory: (categorySlug: string) => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
}

export const HomeSEOSections: React.FC<HomeSEOSectionsProps> = ({
  onNavigateShop,
  onNavigateServices,
  onNavigateCustomOrders,
  onNavigateCategory,
  onNavigateAbout,
  onNavigateContact
}) => {
  return (
    <section className="mt-16 space-y-16 border-t border-slate-200/80 pt-16">
      {/* 1. Custom 3D Printing Services */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Cpu className="w-3.5 h-3.5" />
            <span>Industrial & Consumer Additive Manufacturing</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Custom 3D Printing Services
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Our on-demand custom 3D printing services support rapid design iteration, functional assemblies, and custom parts. Upload your CAD designs (.STL, .OBJ, .STEP) or work directly with our engineering team to select optimal infill densities, wall thicknesses, and high-performance filaments like PLA+, PETG, ABS, TPU, and UV photopolymer resins with tolerances down to ±0.1mm.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="/services"
              onClick={(e) => {
                e.preventDefault();
                onNavigateServices();
              }}
              className="inline-flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>Explore Custom 3D Printing Services</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onNavigateContact();
              }}
              className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors py-3 px-2 cursor-pointer"
            >
              <span>Request an instant CAD quote</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid of Highlight Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 2. 3D Printed Products */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              3D Printed Products
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Browse our extensive catalog of handcrafted 3D printed items. Each product is produced with fine layer lines, calibrated mechanical precision, and vibrant eco-friendly polymers. From ergonomic desk accessories and planters to articulated dragon figures and decorative home pieces, our products bring functional art into modern spaces.
            </p>
          </div>
          <div>
            <a
              href="/shop"
              onClick={(e) => {
                e.preventDefault();
                onNavigateShop();
              }}
              className="inline-flex items-center text-xs font-black text-cyan-600 hover:text-cyan-700 tracking-wide uppercase group cursor-pointer"
            >
              <span>Browse All 3D Printed Products</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* 3. Personalized 3D Printed Gifts */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
              <Gift className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Personalized 3D Printed Gifts
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Celebrate birthdays, anniversaries, weddings, and milestones with custom 3D printed gifts. We personalize customized lithophanes, custom keychains, custom name signs, and personalized photo sculptures that turn cherished memories into timeless keepsakes tailored to your exact specifications.
            </p>
          </div>
          <div>
            <a
              href="/custom-orders"
              onClick={(e) => {
                e.preventDefault();
                onNavigateCustomOrders();
              }}
              className="inline-flex items-center text-xs font-black text-pink-600 hover:text-pink-700 tracking-wide uppercase group cursor-pointer"
            >
              <span>Explore Personalized Gifts & Showcase</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* 4. 3D Printed Lamps & Custom Lamps */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Lamp className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              3D Printed Lamps &amp; Custom Lamps
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              NEXRA 3D is renowned for customized photo lithophane lamps. By engineering micro-variations in wall thickness, your uploaded photographs become glowing three-dimensional portraits when illuminated by warm LED light. Available in cylinder, square, bedside, and moon lamp configurations with custom wooden or 3D bases.
            </p>
          </div>
          <div>
            <a
              href="/shop?category=lamps"
              onClick={(e) => {
                e.preventDefault();
                onNavigateCategory('lamps');
              }}
              className="inline-flex items-center text-xs font-black text-amber-600 hover:text-amber-700 tracking-wide uppercase group cursor-pointer"
            >
              <span>Shop 3D Printed Lamps &amp; Custom Lamps</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* 5. Industrial 3D Printing & Prototyping */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Industrial 3D Printing &amp; Prototyping
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Accelerate your engineering workflow with functional rapid prototypes, electronics enclosures, robotics brackets, and lightweight drone components. We support rapid validation runs so you can test physical ergonomics and fit before mass tooling, serving startups, hardware designers, and enterprises across India.
            </p>
          </div>
          <div>
            <a
              href="/services"
              onClick={(e) => {
                e.preventDefault();
                onNavigateServices();
              }}
              className="inline-flex items-center text-xs font-black text-emerald-600 hover:text-emerald-700 tracking-wide uppercase group cursor-pointer"
            >
              <span>Explore Industrial Prototyping Solutions</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>

      {/* 6. Why Choose NEXRA 3D */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-black text-cyan-600 uppercase tracking-widest block mb-1">Guaranteed Craftsmanship</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Why Choose NEXRA 3D
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            We merge additive manufacturing technology with rigorous quality assurance to deliver superior finished products across India.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Micron Precision</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Layer heights down to 0.08mm for crisp detail, smooth contours, and structural integrity.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Engineering Materials</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Biocompatible PLA+, heat-resistant PETG, rugged ABS, and high-resolution photopolymer resins.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Pan-India Shipping</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reliable courier delivery with end-to-end tracking dispatched directly from Hyderabad.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Personalized Support</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instant communication via WhatsApp (+91-8886149998) and email for rapid assistance.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-4 border-t border-slate-200/80 text-xs">
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              onNavigateAbout();
            }}
            className="font-bold text-slate-700 hover:text-cyan-600 transition-colors"
          >
            About NEXRA 3D &rarr;
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigateContact();
            }}
            className="font-bold text-slate-700 hover:text-cyan-600 transition-colors"
          >
            Contact &amp; Facility Information &rarr;
          </a>
          <a
            href="/shop"
            onClick={(e) => {
              e.preventDefault();
              onNavigateShop();
            }}
            className="font-bold text-slate-700 hover:text-cyan-600 transition-colors"
          >
            Browse Products &rarr;
          </a>
        </div>
      </div>
    </section>
  );
};
