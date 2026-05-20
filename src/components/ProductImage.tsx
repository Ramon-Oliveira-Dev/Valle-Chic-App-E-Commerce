import type { ImgHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'className' | 'src'> & {
  src: string;
  className?: string;
  imageClassName?: string;
};

export default function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  ...props
}: ProductImageProps) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-primary/40', className)}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-45"
        referrerPolicy={props.referrerPolicy}
      />
      <div className="absolute inset-0 bg-primary/15" />
      <img
        src={src}
        alt={alt}
        className={cn('relative z-10 h-full w-full object-contain', imageClassName)}
        {...props}
      />
    </div>
  );
}
