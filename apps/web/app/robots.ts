import type { MetadataRoute } from "next";

const siteUrl = "https://chaufx.ca";

// These routes either require authentication, are transactional, or contain
// referral-specific content. They should remain available to users, but do not
// add value as search results.
const privateRoutes = [
  "/admin-booking",
  "/applications",
  "/blog-manager",
  "/booking",
  "/bookings",
  "/customer",
  "/dashboard",
  "/delete-account",
  "/driver/application-form",
  "/driver/apply",
  "/driver/background-check",
  "/driver/login",
  "/driver/status",
  "/drivers",
  "/feedback",
  "/first-ride-promotion",
  "/inquiry",
  "/login",
  "/memberships",
  "/messages",
  "/payment-cancelled",
  "/payment-complete",
  "/ref/",
  "/referral-partners",
  "/reports",
  "/reset-password",
  "/settings",
  "/settlements",
  "/trips",
  "/users",
  "/verify-email"
];

export default function robots(): MetadataRoute.Robots {
  const publicCrawlerRule = {
    allow: "/",
    disallow: privateRoutes
  };

  return {
    rules: [
      { userAgent: "*", ...publicCrawlerRule },
      // Explicitly permit the AI crawlers ChaufX wants to be discoverable by,
      // while preserving the same private-route exclusions as other crawlers.
      { userAgent: "GPTBot", ...publicCrawlerRule },
      { userAgent: "ChatGPT-User", ...publicCrawlerRule },
      { userAgent: "Google-Extended", ...publicCrawlerRule },
      { userAgent: "ClaudeBot", ...publicCrawlerRule },
      { userAgent: "PerplexityBot", ...publicCrawlerRule }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
