import React, { useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedIconProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverScale?: number;
  tapScale?: number;
  rotate?: number;
}

export function AnimatedIcon({
  children,
  className,
  onClick,
  hoverScale = 1.15,
  tapScale = 0.9,
  rotate = 0,
}: AnimatedIconProps) {
  const scale = useSpring(1, { stiffness: 400, damping: 25 });
  const rotation = useSpring(0, { stiffness: 300, damping: 20 });

  const handleMouseEnter = useCallback(() => {
    scale.set(hoverScale);
    if (rotate) {
      rotation.set(rotate);
    }
  }, [hoverScale, rotate, scale, rotation]);

  const handleMouseLeave = useCallback(() => {
    scale.set(1);
    rotation.set(0);
  }, [scale, rotation]);

  const handleTap = useCallback(() => {
    scale.set(tapScale);
    setTimeout(() => scale.set(hoverScale), 100);
  }, [tapScale, hoverScale, scale]);

  return (
    <motion.div
      className={cn('inline-flex cursor-pointer select-none', className)}
      style={{ scale, rotate: rotation }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTap={handleTap}
      onClick={onClick}
      whileTap={{ scale: tapScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

interface BouncyIconProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function BouncyIcon({ children, className, onClick }: BouncyIconProps) {
  return (
    <motion.div
      className={cn('inline-flex cursor-pointer select-none', className)}
      onClick={onClick}
      whileHover={{ scale: 1.2, rotate: 5 }}
      whileTap={{ scale: 0.85, rotate: -5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      {children}
    </motion.div>
  );
}

interface PulseIconProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function PulseIcon({ children, className, active = false }: PulseIconProps) {
  return (
    <motion.div
      className={cn('inline-flex relative', className)}
      animate={active ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    >
      {children}
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  );
}

interface FloatIconProps {
  children: React.ReactNode;
  className?: string;
  floatY?: number[];
}

export function FloatIcon({ children, className, floatY = [0, -5, 0] }: FloatIconProps) {
  return (
    <motion.div
      className={cn('inline-flex', className)}
      animate={{ y: floatY }}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
