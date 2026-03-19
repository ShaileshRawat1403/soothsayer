import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-20 w-20',
  };

  const ringSizes = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
    xl: 'p-3',
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer Glow */}
      <div className={cn(
        "absolute inset-0 rounded-[30%] bg-primary/20 blur-xl animate-pulse duration-[3000ms]",
        sizeClasses[size]
      )} />
      
      {/* Logo Container */}
      <div className={cn(
        "relative flex items-center justify-center rounded-[30%] bg-primary text-primary-foreground shadow-xl shadow-primary/20 overflow-hidden group",
        sizeClasses[size],
        ringSizes[size]
      )}>
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* The Eye / Lens Symbol */}
        <div className="relative w-full h-full border-2 border-primary-foreground/30 rounded-full flex items-center justify-center">
          <div className="w-[60%] h-[60%] border border-primary-foreground/50 rounded-full flex items-center justify-center overflow-hidden">
            <div className="w-[40%] h-[40%] bg-primary-foreground rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
          </div>
          
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 w-full h-px bg-white/40 shadow-[0_0_4px_rgba(255,255,255,0.5)] -translate-y-4 animate-[scanning_4s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
