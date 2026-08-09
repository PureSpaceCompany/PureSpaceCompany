"use client";

import { cn } from "@/lib/utils";

// Brand palette
// Forest Green: #1A3D2B
// Mint:         #4CAF82
// Light Cream:  #F3FAF6

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ size = "md", variant = "light", className }: LogoProps) {
  const textSize = { sm: "text-base", md: "text-xl", lg: "text-2xl" }[size];
  const wordmarkColor = variant === "light" ? "#F3FAF6" : "#1A3D2B";

  return (
    <div className={cn("flex items-center", className)}>
      <span className={cn("font-bold tracking-wide leading-none", textSize)} style={{ color: wordmarkColor }}>
        Pure<span style={{ color: "#4CAF82" }}>Space</span>
      </span>
    </div>
  );
}

export function LogoMark({ size = 42, variant = "light", className }: { size?: number; variant?: "light" | "dark"; className?: string }) {
  const green = "#1A3D2B";
  const mint = "#4CAF82";
  const mintLight = "#7DDBA8";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="mintGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={mintLight} />
          <stop offset="100%" stopColor={mint} />
        </linearGradient>
        <linearGradient id="greenGrad" x1="20" y1="10" x2="60" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={green} />
          <stop offset="60%" stopColor={green} />
          <stop offset="100%" stopColor="#265c40" />
        </linearGradient>
      </defs>

      {/* Mint arc ring — open circle, gap at bottom-right */}
      <path
        d="M 40 8 A 32 32 0 1 1 68 50"
        stroke="url(#mintGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* P letterform — green */}
      <path
        d="M 26 20 L 26 60"
        stroke="url(#greenGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 26 20 C 26 20 50 20 50 32 C 50 44 26 44 26 44"
        stroke="url(#greenGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Mint accent layer */}
      <path
        d="M 29 23 C 29 23 52 23 52 35 C 52 47 29 47 29 47"
        stroke="url(#mintGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.45"
      />

      {/* House roofline */}
      <path
        d="M 47 55 L 58 44 L 69 55"
        stroke={green}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* House window grid */}
      <rect x="55" y="55" width="4" height="4" rx="0.5" fill={green} opacity="0.8" />
      <rect x="60" y="55" width="4" height="4" rx="0.5" fill={green} opacity="0.8" />
      <rect x="55" y="60" width="4" height="4" rx="0.5" fill={green} opacity="0.8" />
      <rect x="60" y="60" width="4" height="4" rx="0.5" fill={green} opacity="0.8" />

      {/* 4-point sparkle — large, top-right */}
      <g transform="translate(63, 30)">
        <path d="M 0 -7 L 1.2 -1.2 L 7 0 L 1.2 1.2 L 0 7 L -1.2 1.2 L -7 0 L -1.2 -1.2 Z" fill={mint} />
      </g>
      {/* 4-point sparkle — small, mid-right */}
      <g transform="translate(71, 40)">
        <path d="M 0 -4 L 0.7 -0.7 L 4 0 L 0.7 0.7 L 0 4 L -0.7 0.7 L -4 0 L -0.7 -0.7 Z" fill={mint} opacity="0.8" />
      </g>
      {/* tiny sparkle dot */}
      <circle cx="66" cy="46" r="1.5" fill={mint} opacity="0.6" />
    </svg>
  );
}
