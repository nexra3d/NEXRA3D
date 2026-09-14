import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, ArrowUpDown, Check, Filter, ChevronLeft, ChevronRight, PlusCircle, LayoutGrid, Layers } from 'lucide-react';
import { Product, Category, ProductFilterState } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  filters: ProductFilterState;
  onFilterChange: (filters: ProductFilterState) => void;
  wishlistProductIds: string[];
  onToggleWishlist: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  filters,
  onFilterChange,
  wishlistProductIds,
  onToggleWishlist,
  onAddToCart,
  onQuickView,
  isLoading = false
}) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [paginationMode, setPaginationMode] = useState<'pages' | 'infinite'>('pages');

  const safeProducts = Array.isArray(products) ? products : [];
  const safeWishlistIds = Array.isArray(wishlistProductIds) ? wishlistProductIds : [];
  const displayCategories = Array.isArray(categories) ? categories : [];

  // Reset pagination on filter changes or catalog updates
  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(pageSize);
  }, [filters, pageSize, safeProducts.length]);

  const totalProducts = safeProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));

  // Determine which products to display based on mode
  const displayedProducts = paginationMode === 'infinite'
    ? safeProducts.slice(0, visibleCount)
    : safeProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const startItem = totalProducts === 0 ? 0 : paginationMode === 'infinite' ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = paginationMode === 'infinite' ? Math.min(visibleCount, totalProducts) : Math.min(currentPage * pageSize, totalProducts);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + pageSize, totalProducts));
  };

  // Collect all unique brands from catalog
  const availableBrands = Array.from(new Set(safeProducts.map((p) => p.brand))) as string[];

  // Selected Category Object
  const selectedCategoryObj = displayCategories.find((c) => c.id === filters.categoryId || c.slug === filters.categoryId);

  const handleBrandToggle = (brandName: string) => {
    const currentBrands = filters.brands || [];
    const updated = currentBrands.includes(brandName)
      ? currentBrands.filter((b) => b !== brandName)
      : [...currentBrands, brandName];
    onFilterChange({ ...filters, brands: updated });
  };

  const handleClearFilters = () => {
    onFilterChange({
      categoryId: undefined,
      subcategoryId: undefined,
      searchQuery: '',
      minPrice: undefined,
      maxPrice: undefined,
      brands: [],
      minRating: undefined,
      inStockOnly: false,
      onSaleOnly: false,
      sortBy: 'popular'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Product Catalog</span>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {safeProducts.length} Products Found
            </span>
          </h2>
          {filters.searchQuery && (
            <p className="text-xs text-slate-500 mt-1">
              Search results for <strong className="text-indigo-600">"{filters.searchQuery}"</strong>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="lg:hidden flex items-center space-x-1.5 bg-slate-100 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:bg-slate-200 cursor-pointer"
          >
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filters</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort By:</span>
            <select
              value={filters.sortBy || 'popular'}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
              className="bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Sidebar + Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar (Desktop & Mobile drawer) */}
        <div
          className={`space-y-6 lg:block ${
            isMobileFilterOpen ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto animate-in slide-in-from-bottom' : 'hidden'
          }`}
        >
          {isMobileFilterOpen && (
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 lg:hidden">
              <h3 className="font-extrabold text-slate-900 text-base">Filter Catalog</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Filters</span>
              </span>
              <button
                onClick={handleClearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Category
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => onFilterChange({ ...filters, categoryId: undefined, subcategoryId: undefined })}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    !filters.categoryId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Categories
                </button>
                {displayCategories.map((c, idx) => {
                  const isSelected = filters.categoryId === c.id || filters.categoryId === c.slug;
                  return (
                    <button
                      key={c.id ? `cat-${c.id}-${idx}` : `cat-${idx}`}
                      onClick={() => onFilterChange({ ...filters, categoryId: c.id, subcategoryId: undefined })}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory Filter if category is selected */}
            {selectedCategoryObj && Array.isArray(selectedCategoryObj.subcategories) && selectedCategoryObj.subcategories.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Subcategory
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => onFilterChange({ ...filters, subcategoryId: undefined })}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      !filters.subcategoryId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Subcategories
                  </button>
                  {selectedCategoryObj.subcategories.map((sub, idx) => (
                    <button
                      key={sub.id ? `sub-${sub.id}-${idx}` : `sub-${idx}`}
                      onClick={() => onFilterChange({ ...filters, subcategoryId: sub.id })}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        filters.subcategoryId === sub.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range Filter */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Price Range (₹)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) =>
                    onFilterChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) =>
                    onFilterChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Brands Checkboxes */}
            {availableBrands.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Brands
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {availableBrands.map((brandName, idx) => {
                    const isChecked = (filters.brands || []).includes(brandName);
                    return (
                      <label key={brandName ? `brand-${brandName}-${idx}` : `brand-${idx}`} className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBrandToggle(brandName)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{brandName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Toggles: In-Stock & On-Sale */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-800 font-semibold">
                <span>In-Stock Only</span>
                <input
                  type="checkbox"
                  checked={Boolean(filters.inStockOnly)}
                  onChange={(e) => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-800 font-semibold">
                <span>On-Sale Items</span>
                <input
                  type="checkbox"
                  checked={Boolean(filters.onSaleOnly)}
                  onChange={(e) => onFilterChange({ ...filters, onSaleOnly: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Product Cards Grid Area */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={`skel-${idx}`} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 animate-pulse">
                  <div className="w-full h-52 bg-slate-200/80 rounded-xl" />
                  <div className="h-4 bg-slate-200/80 rounded w-1/3" />
                  <div className="h-5 bg-slate-200/80 rounded w-3/4" />
                  <div className="h-4 bg-slate-200/80 rounded w-1/4" />
                  <div className="h-10 bg-slate-200/80 rounded-xl w-full mt-2" />
                </div>
              ))}
            </div>
          ) : safeProducts.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayedProducts.map((p, idx) => (
                  <ProductCard
                    key={p.id ? `prod-${p.id}-${idx}` : `prod-${idx}`}
                    product={p}
                    isWishlisted={safeWishlistIds.includes(p.id)}
                    onToggleWishlist={onToggleWishlist}
                    onAddToCart={onAddToCart}
                    onQuickView={onQuickView}
                  />
                ))}
              </div>

              {/* Pagination Controls - Default 20 items per page with Load More & Next Page */}
              {totalProducts > pageSize && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Showing</span>
                      <span className="font-bold text-slate-900">{startItem}–{endItem}</span>
                      <span className="text-slate-500">of</span>
                      <span className="font-bold text-slate-900">{totalProducts}</span>
                      <span className="text-slate-500">products</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500 text-xs">Per Page:</span>
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                        {[20, 40, 60].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              setPageSize(size);
                              setCurrentPage(1);
                              setVisibleCount(size);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              pageSize === size
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60 ml-2">
                        <button
                          onClick={() => setPaginationMode('pages')}
                          title="Page Numbers View"
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            paginationMode === 'pages'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPaginationMode('infinite')}
                          title="Load More View"
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            paginationMode === 'infinite'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {paginationMode === 'infinite' ? (
                    <div className="pt-2 text-center">
                      {visibleCount < totalProducts ? (
                        <button
                          onClick={handleLoadMore}
                          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-6 py-3 rounded-xl transition-all border border-indigo-200/70 shadow-xs cursor-pointer text-xs"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Load More ({Math.min(pageSize, totalProducts - visibleCount)} remaining)</span>
                        </button>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium py-1">All {totalProducts} products loaded</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <div className="hidden sm:flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            if (totalPages <= 7) return true;
                            if (pageNum === 1 || pageNum === totalPages) return true;
                            if (Math.abs(pageNum - currentPage) <= 1) return true;
                            return false;
                          })
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;
                            return (
                              <React.Fragment key={pageNum}>
                                {showEllipsis && <span className="px-2 text-slate-400 text-xs">...</span>}
                                <button
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    currentPage === pageNum
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Products Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  We couldn't find any products matching your selected filters. Try resetting search or adjusting price limits.
                </p>
              </div>
              <button
                onClick={handleClearFilters}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
