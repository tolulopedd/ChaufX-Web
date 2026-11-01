import type { Metadata } from "next";

export const siteUrl = "https://chaufx.ca";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      type: "website",
      url: path,
      title: `${title} | ChaufX`,
      description,
      siteName: "ChaufX"
    }
  };
}

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
