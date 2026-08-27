"use client";

import Image from "next/image";
import Link from "next/link";

type AdminBrandProps = {
  href?: string;
  theme?: "light" | "dark";
  compact?: boolean;
  variant?: "default" | "login";
};

export function AdminBrand({ href = "/dashboard", theme = "light", compact = false, variant = "default" }: AdminBrandProps) {
  const isLoginBrand = variant === "login";
  const logoSrc =
    isLoginBrand
      ? "/chaufx-login-logo.png"
      : theme === "dark"
        ? "/chaufx-logo-dark.png"
        : "/chaufx-logo-light.png";
  const logoSize = isLoginBrand ? "h-12 w-44 md:h-14 md:w-52" : compact ? "h-14 w-14" : "h-16 w-16";
  const logoSizes = isLoginBrand ? "(min-width: 768px) 208px, 176px" : compact ? "56px" : "64px";

  return (
    <Link href={href} className="inline-flex items-center">
      <div className={`relative ${isLoginBrand ? "" : "overflow-hidden rounded-2xl"} ${logoSize}`}>
        <Image src={logoSrc} alt="ChaufX" fill sizes={logoSizes} className="object-contain" priority />
      </div>
    </Link>
  );
}
