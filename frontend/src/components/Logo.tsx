"use client";

import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number | "sm" | "md" | "lg";
  showText?: boolean;
  orientation?: "horizontal" | "vertical";
  variant?: "badge" | "combined";
}

export default function Logo({
  className = "",
  size = 48,
  showText = true,
  orientation = "horizontal",
  variant = "combined"
}: LogoProps) {
  const numSize = typeof size === "number" ? size : size === "sm" ? 36 : size === "lg" ? 64 : 48;

  if (variant === "badge" || !showText) {
    return (
      <div 
        className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-[0_0_20px_rgba(204,153,51,0.35)] border border-amber-500/30 ${className}`} 
        style={{ width: numSize, height: numSize }}
      >
        <Image
          src="/images/logo.png"
          alt="Logo Sabor Chugurano"
          width={numSize}
          height={numSize}
          className="w-full h-full object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${orientation === "vertical" ? "flex-col text-center" : ""} ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-[0_0_20px_rgba(204,153,51,0.4)] border border-amber-500/40 p-0.5 bg-zinc-950"
        style={{ width: numSize, height: numSize }}
      >
        <Image
          src="/images/logo.png"
          alt="Logo Sabor Chugurano"
          width={numSize}
          height={numSize}
          className="w-full h-full object-cover rounded-full"
          priority
        />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-black text-lg tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500">
            SABOR CHUGURANO
          </span>
        </div>
        <span className="text-[10px] block text-amber-400 font-bold tracking-widest uppercase">
          Restaurante • Menú &amp; Carta
        </span>
      </div>
    </div>
  );
}

