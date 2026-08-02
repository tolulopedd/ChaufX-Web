import Link from "next/link";

const quickLinks = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Become a Driver", href: "/driver/apply" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Policies", href: "/policies" },
  { label: "Privacy Policy", href: "/policies/privacy-policy" },
  { label: "Terms & Conditions", href: "/policies/terms-and-conditions" },
  { label: "Driver Agreement", href: "/policies/driver-contractor-agreement" }
] as const;

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="mb-6">
          <p className="text-lg font-semibold leading-7 tracking-[-0.04em] text-[#0F172A] md:text-xl md:leading-8 xl:whitespace-nowrap">
            ChaufX is Canada's trusted marketplace for professional drivers. Travel in the comfort of your own vehicle with confidence.
          </p>
        </div>

        <div className="mb-7 rounded-[26px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Quick Links</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-[#2563EB]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Copyright 2026 ChaufX. All rights reserved.</p>
            <div className="flex flex-col gap-1 text-sm text-slate-600 md:flex-row md:gap-4">
              <a href="tel:+16479197237" className="transition hover:text-[#2563EB]">
                +1 (647) 919-7237
              </a>
              <a href="mailto:info@chaufx.ca" className="transition hover:text-[#2563EB]">
                info@chaufx.ca
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-600">
            <a href="https://www.instagram.com/chaufx_" target="_blank" rel="noreferrer" className="transition hover:text-[#2563EB]">
              Instagram
            </a>
            <a href="https://www.facebook.com/share/1CVMM5orV5/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="transition hover:text-[#2563EB]">
              Facebook
            </a>
            <a
              href="https://www.linkedin.com/company/chaufx-inc/?lipi=urn%3Ali%3Apage%3Ad_flagship3_company_admin%3Bs38t2%2BF%2FQsixoBwjgBA%2FQg%3D%3D"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#2563EB]"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
