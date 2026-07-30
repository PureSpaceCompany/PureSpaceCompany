"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ size = "md", variant = "light", className }: LogoProps) {
  const iconSize = { sm: 28, md: 36, lg: 48 }[size];
  const textSize = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];
  const textColor = variant === "light" ? "text-white" : "text-gray-900";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* SVG mark: sun with sparkle rays — StayShine */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer glow ring */}
        <circle cx="20" cy="20" r="19" fill="url(#logoGradient)" opacity="0.12" />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="logoGradient2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
        </defs>

        {/* Sun core */}
        <circle cx="20" cy="20" r="7.5" fill="url(#logoGradient)" />

        {/* Cardinal rays */}
        <rect x="19" y="3" width="2" height="6" rx="1" fill="url(#logoGradient)" />
        <rect x="19" y="31" width="2" height="6" rx="1" fill="url(#logoGradient)" />
        <rect x="3" y="19" width="6" height="2" rx="1" fill="url(#logoGradient)" />
        <rect x="31" y="19" width="6" height="2" rx="1" fill="url(#logoGradient)" />

        {/* Diagonal rays (shorter) */}
        <rect x="28.6" y="8.1" width="2" height="5" rx="1" fill="url(#logoGradient2)" transform="rotate(45 29.6 10.1)" />
        <rect x="7.4" y="26.9" width="2" height="5" rx="1" fill="url(#logoGradient2)" transform="rotate(45 8.4 28.9)" />
        <rect x="8.1" y="8.1" width="2" height="5" rx="1" fill="url(#logoGradient2)" transform="rotate(-45 9.1 10.1)" />
        <rect x="26.9" y="26.9" width="2" height="5" rx="1" fill="url(#logoGradient2)" transform="rotate(-45 27.9 28.9)" />

        {/* Sparkle accent — top right */}
        <path d="M32 8 L33 6 L34 8 L36 9 L34 10 L33 12 L32 10 L30 9 Z" fill="#fde047" opacity="0.9" />
      </svg>

      {/* Wordmark */}
      <span className={cn("font-bold tracking-tight", textSize, textColor)}>
        Stay<span className="text-orange-400">Shine</span>
      </span>
    </div>
  );
}

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="20" cy="20" r="19" fill="url(#lmGrad)" opacity="0.15" />
      <defs>
        <linearGradient id="lmGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id="lmGrad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#fca5a5" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="7.5" fill="url(#lmGrad)" />
      <rect x="19" y="3" width="2" height="6" rx="1" fill="url(#lmGrad)" />
      <rect x="19" y="31" width="2" height="6" rx="1" fill="url(#lmGrad)" />
      <rect x="3" y="19" width="6" height="2" rx="1" fill="url(#lmGrad)" />
      <rect x="31" y="19" width="6" height="2" rx="1" fill="url(#lmGrad)" />
      <rect x="28.6" y="8.1" width="2" height="5" rx="1" fill="url(#lmGrad2)" transform="rotate(45 29.6 10.1)" />
      <rect x="7.4" y="26.9" width="2" height="5" rx="1" fill="url(#lmGrad2)" transform="rotate(45 8.4 28.9)" />
      <rect x="8.1" y="8.1" width="2" height="5" rx="1" fill="url(#lmGrad2)" transform="rotate(-45 9.1 10.1)" />
      <rect x="26.9" y="26.9" width="2" height="5" rx="1" fill="url(#lmGrad2)" transform="rotate(-45 27.9 28.9)" />
      <path d="M32 8 L33 6 L34 8 L36 9 L34 10 L33 12 L32 10 L30 9 Z" fill="#fde047" opacity="0.9" />
    </svg>
  );
}
