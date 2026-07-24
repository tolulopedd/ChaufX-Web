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
      ? "/chaufx-login-logo.png?v=9"
      : theme === "dark"
        ? "/chaufx-logo-dark.png?v=8"
        : "/chaufx-logo-light.png?v=8";
  const logoSize = isLoginBrand ? "h-12 w-44 md:h-14 md:w-52" : compact ? "h-14 w-14" : "h-16 w-16";

  return (
    <Link href={href} className="inline-flex items-center">
      <div className={`relative ${isLoginBrand ? "" : "overflow-hidden rounded-2xl"} ${logoSize}`}>
        <Image src={logoSrc} alt="ChaufX" fill className="object-contain" priority />
      </div>
    </Link>
  );
}
