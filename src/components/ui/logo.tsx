"use client";

import { cn } from "@/lib/utils";

// Brand palette
// Navy:  #163A70
// Gold:  #C8A46A
// Cream: #FAF8F3

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ size = "md", variant = "light", className }: LogoProps) {
  const iconSize = { sm: 32, md: 42, lg: 56 }[size];
  const textSize = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];
  const navyColor = variant === "light" ? "#FAF8F3" : "#163A70";
  const wordmarkStay = variant === "light" ? "#FAF8F3" : "#163A70";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={iconSize} variant={variant} />
      <span className={cn("font-bold tracking-wide leading-none", textSize)} style={{ color: wordmarkStay }}>
        Stay<span style={{ color: "#C8A46A" }}>Shine</span>
      </span>
    </div>
  );
}

export function LogoMark({ size = 42, variant = "light", className }: { size?: number; variant?: "light" | "dark"; className?: string }) {
  const navy = "#163A70";
  const gold = "#C8A46A";
  const goldLight = "#D9BB8A";
  const bg = variant === "light" ? "none" : "none";

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
        <linearGradient id="goldGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="100%" stopColor={gold} />
        </linearGradient>
        <linearGradient id="sGrad" x1="20" y1="10" x2="60" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={navy} />
          <stop offset="60%" stopColor={navy} />
          <stop offset="100%" stopColor="#1e4f96" />
        </linearGradient>
      </defs>

      {/* Gold arc ring — open circle, gap at bottom-right */}
      <path
        d="M 40 8 A 32 32 0 1 1 68 50"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* S letterform — navy, serif-style paths */}
      {/* Upper curve of S */}
      <path
        d="M 52 22 C 52 18 48 15 42 15 C 34 15 28 20 28 27 C 28 33 32 36 40 39 C 48 42 52 45 52 52 C 52 59 46 64 38 64 C 30 64 26 60 24 56"
        stroke="url(#sGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lower tail of S */}
      <path
        d="M 28 58 C 28 62 32 65 38 65"
        stroke="url(#sGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gold shadow/accent layer — offset S in gold behind */}
      <path
        d="M 55 25 C 55 21 51 18 45 18 C 37 18 31 23 31 30 C 31 36 35 39 43 42 C 51 45 55 48 55 55 C 55 62 49 67 41 67"
        stroke="url(#goldGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* House roofline — navy, positioned bottom-right of S */}
      <path
        d="M 47 55 L 58 44 L 69 55"
        stroke={navy}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* House window grid */}
      <rect x="55" y="55" width="4" height="4" rx="0.5" fill={navy} opacity="0.8" />
      <rect x="60" y="55" width="4" height="4" rx="0.5" fill={navy} opacity="0.8" />
      <rect x="55" y="60" width="4" height="4" rx="0.5" fill={navy} opacity="0.8" />
      <rect x="60" y="60" width="4" height="4" rx="0.5" fill={navy} opacity="0.8" />

      {/* 4-point sparkle — large, top-right */}
      <g transform="translate(63, 30)">
        <path d="M 0 -7 L 1.2 -1.2 L 7 0 L 1.2 1.2 L 0 7 L -1.2 1.2 L -7 0 L -1.2 -1.2 Z" fill={gold} />
      </g>
      {/* 4-point sparkle — small, mid-right */}
      <g transform="translate(71, 40)">
        <path d="M 0 -4 L 0.7 -0.7 L 4 0 L 0.7 0.7 L 0 4 L -0.7 0.7 L -4 0 L -0.7 -0.7 Z" fill={gold} opacity="0.8" />
      </g>
      {/* tiny sparkle dot */}
      <circle cx="66" cy="46" r="1.5" fill={gold} opacity="0.6" />
    </svg>
  );
}
