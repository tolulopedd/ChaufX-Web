import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChaufX Canada",
  description: "Personal driver platform for vehicle owners, drivers, and operators.",
  verification: {
    google: "0PH-nAjJKeDhuECn_eAqM1tm0jUIRQeDRkq7cqe5_Hw"
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png?v=8", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png?v=8"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TD8M2RCW');`
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TD8M2RCW"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
