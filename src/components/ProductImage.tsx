import React, { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'className' | 'src'> & {
  src?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80';

export default function ProductImage({
  src,
  alt = 'Produto',
  className,
  imageClassName,
  fallbackSrc = DEFAULT_FALLBACK,
  ...props
}: ProductImageProps) {
  const initialSrc = src && src.trim() !== '' ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  // Synchronize when src prop changes
  React.useEffect(() => {
    if (src && src.trim() !== '') {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-primary/40', className)}>
      <img
        src={imgSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-45 pointer-events-none"
        onError={handleError}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
      <img
        src={imgSrc}
        alt={alt}
        className={cn('relative z-10 h-full w-full object-contain transition-opacity duration-300', imageClassName)}
        onError={handleError}
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
}
