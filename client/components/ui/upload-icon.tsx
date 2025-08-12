import { cn } from '@/lib/utils';

interface UploadIconProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  alt?: string;
}

export function UploadIcon({ className, size = 'default', alt = 'Upload File' }: UploadIconProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    default: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <img 
      src="/images/Illustration.png" 
      alt={alt}
      className={cn(
        'object-contain',
        sizeClasses[size],
        className
      )}
    />
  );
}
