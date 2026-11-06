import { siteUrl } from "../lib/seo";

type StructuredDataProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

function serialize(data: StructuredDataProps["data"]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function StructuredData({ data }: StructuredDataProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />;
}

export const chaufxOrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "ChaufX",
  url: siteUrl,
  logo: `${siteUrl}/icon.png`,
  email: "info@chaufx.ca",
  telephone: "+1-365-688-5536",
  description: "ChaufX connects customers with approved professional drivers who drive the customer's own vehicle."
};

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteUrl).toString()
    }))
  };
}
