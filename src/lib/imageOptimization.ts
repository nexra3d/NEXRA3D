/**
 * Image Optimization Utilities for NEXRA 3D
 * Converts images to next-gen formats (AVIF and WebP) with JPEG fallback,
 * generates responsive srcSets, and applies quality/width constraints.
 */

export interface OptimizedImageSources {
  avifSrc: string;
  webpSrc: string;
  jpegSrc: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  jpegSrcSet?: string;
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'crop' | 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  widths?: number[];
}

/**
 * Parses and transforms Unsplash URLs to AVIF, WebP, and JPEG
 */
function optimizeUnsplashUrl(url: string, format: 'avif' | 'webp' | 'jpg', width?: number, quality = 80): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('fm', format);
    urlObj.searchParams.set('auto', 'compress');
    urlObj.searchParams.set('q', String(format === 'avif' ? Math.min(quality, 75) : quality));
    
    if (width) {
      urlObj.searchParams.set('w', String(width));
    }
    if (!urlObj.searchParams.has('fit')) {
      urlObj.searchParams.set('fit', 'crop');
    }
    return urlObj.toString();
  } catch {
    // If relative or non-standard URL, use query string manipulation
    const separator = url.includes('?') ? '&' : '?';
    let base = url.replace(/([?&])fm=[^&]*/g, '').replace(/([?&])auto=[^&]*/g, '');
    if (width) {
      base = base.replace(/([?&])w=\d+/g, '');
    }
    const wParam = width ? `&w=${width}` : '';
    return `${base}${separator}fm=${format}&auto=compress&q=${format === 'avif' ? 75 : quality}${wParam}`;
  }
}

/**
 * Transforms Cloudinary URLs to AVIF, WebP, and JPEG
 */
function optimizeCloudinaryUrl(url: string, format: 'avif' | 'webp' | 'jpg', width?: number, quality = 80): string {
  if (!url.includes('/upload/')) return url;
  
  const widthParam = width ? `,w_${width}` : '';
  const transform = `f_${format},q_${quality > 80 ? 'auto:good' : 'auto'}${widthParam}`;
  
  // Replace existing f_ or w_ transformations in /upload/.../
  if (url.includes('/upload/f_') || url.includes('/upload/w_')) {
    return url.replace(/\/upload\/[^/]+\//, `/upload/${transform}/`);
  }
  return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Generates AVIF, WebP, and JPEG fallback URLs for any given image source
 */
export function getOptimizedImageSources(
  rawUrl?: string | null,
  options: ImageOptimizationOptions = {}
): OptimizedImageSources {
  const defaultFallback = 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&q=80&w=800';
  const url = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') ? rawUrl.trim() : defaultFallback;
  const { width, quality = 80, widths = [320, 480, 640, 800, 1024, 1280] } = options;

  // Unsplash Optimization
  if (url.includes('images.unsplash.com')) {
    const avifSrc = optimizeUnsplashUrl(url, 'avif', width, quality);
    const webpSrc = optimizeUnsplashUrl(url, 'webp', width, quality);
    const jpegSrc = optimizeUnsplashUrl(url, 'jpg', width, quality);

    const avifSrcSet = widths.map((w) => `${optimizeUnsplashUrl(url, 'avif', w, quality)} ${w}w`).join(', ');
    const webpSrcSet = widths.map((w) => `${optimizeUnsplashUrl(url, 'webp', w, quality)} ${w}w`).join(', ');
    const jpegSrcSet = widths.map((w) => `${optimizeUnsplashUrl(url, 'jpg', w, quality)} ${w}w`).join(', ');

    return { avifSrc, webpSrc, jpegSrc, avifSrcSet, webpSrcSet, jpegSrcSet };
  }

  // Cloudinary Optimization
  if (url.includes('res.cloudinary.com')) {
    const avifSrc = optimizeCloudinaryUrl(url, 'avif', width, quality);
    const webpSrc = optimizeCloudinaryUrl(url, 'webp', width, quality);
    const jpegSrc = optimizeCloudinaryUrl(url, 'jpg', width, quality);

    const avifSrcSet = widths.map((w) => `${optimizeCloudinaryUrl(url, 'avif', w, quality)} ${w}w`).join(', ');
    const webpSrcSet = widths.map((w) => `${optimizeCloudinaryUrl(url, 'webp', w, quality)} ${w}w`).join(', ');
    const jpegSrcSet = widths.map((w) => `${optimizeCloudinaryUrl(url, 'jpg', w, quality)} ${w}w`).join(', ');

    return { avifSrc, webpSrc, jpegSrc, avifSrcSet, webpSrcSet, jpegSrcSet };
  }

  // Local or static image paths (e.g., /logo.svg or /nexra-logo.jpeg or relative assets)
  if (url.endsWith('.svg') || url.startsWith('data:image/svg+xml')) {
    // Vectors don't need AVIF/WebP rasterization
    return {
      avifSrc: url,
      webpSrc: url,
      jpegSrc: url
    };
  }

  // Check if URL ends with jpg/jpeg/png
  const isJpgOrPng = /\.(jpe?g|png)(\?.*)?$/i.test(url);
  if (isJpgOrPng) {
    const avifSrc = url.replace(/\.(jpe?g|png)(\?.*)?$/i, '.avif$2');
    const webpSrc = url.replace(/\.(jpe?g|png)(\?.*)?$/i, '.webp$2');
    return {
      avifSrc,
      webpSrc,
      jpegSrc: url
    };
  }

  // Generic or Data URL fallback
  return {
    avifSrc: url,
    webpSrc: url,
    jpegSrc: url
  };
}
