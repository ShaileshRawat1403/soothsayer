import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <motion.div
      className={cn('animate-spin-slow', sizeMap[size], className)}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
}

interface BouncingDotsProps {
  className?: string;
}

export function BouncingDots({ className }: BouncingDotsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ y: [0, -8, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface PulseRingProps {
  className?: string;
  color?: string;
}

export function PulseRing({ className, color = 'currentColor' }: PulseRingProps) {
  return (
    <div className={cn('relative', className)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/40 animate-pulse-ring"
        style={{ animationDelay: '0.5s' }}
      />
      <div className="relative h-3 w-3 rounded-full bg-primary" />
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 rounded bg-muted animate-shimmer"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            delay: i * 0.1,
          }}
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
