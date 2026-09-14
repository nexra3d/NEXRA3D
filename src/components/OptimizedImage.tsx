import React, { useState } from 'react';
import { getOptimizedImageSources, ImageOptimizationOptions } from '../lib/imageOptimization';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  pictureClassName?: string;
  width?: number;
  height?: number;
  quality?: number;
  widths?: number[];
  sizes?: string;
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  className = '',
  pictureClassName = 'w-full h-full block',
  width,
  height,
  quality,
  widths,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  fallbackSrc = 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&q=80&w=800',
  referrerPolicy = 'no-referrer',
  onError,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  const activeSrc = hasError ? fallbackSrc : src;
  const optimizationOptions: ImageOptimizationOptions = {
    width,
    height,
    quality,
    widths
  };

  const { avifSrcSet, webpSrcSet, avifSrc, webpSrc, jpegSrc } = getOptimizedImageSources(
    activeSrc,
    optimizationOptions
  );

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && activeSrc !== fallbackSrc) {
      setHasError(true);
    }
    if (onError) {
      onError(e);
    }
  };

  // If SVGs or data URLs, picture source elements are not needed
  const isSvgOrData = activeSrc.endsWith('.svg') || activeSrc.startsWith('data:');

  if (isSvgOrData) {
    return (
      <img
        src={activeSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy={referrerPolicy}
        className={className}
        width={width}
        height={height}
        onError={handleError}
        {...rest}
      />
    );
  }

  return (
    <picture className={pictureClassName}>
      {/* 1. Next-Gen AVIF: Highest compression & quality efficiency */}
      <source
        type="image/avif"
        srcSet={avifSrcSet || avifSrc}
        sizes={sizes}
      />
      
      {/* 2. Next-Gen WebP: Universal modern browser compatibility */}
      <source
        type="image/webp"
        srcSet={webpSrcSet || webpSrc}
        sizes={sizes}
      />
      
      {/* 3. Progressive JPEG Fallback with Native Lazy-Loading for Below-The-Fold Images */}
      <img
        src={jpegSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy={referrerPolicy}
        className={className}
        width={width}
        height={height}
        onError={handleError}
        {...rest}
      />
    </picture>
  );
};
