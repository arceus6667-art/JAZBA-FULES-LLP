import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: "Jazba Fuels LLP | Doorstep Diesel Delivery",
  description:
    "Mumbai-based commercial fuel logistics. Discover Jazba Fuels LLP and get in touch for corporate inquiries.",
  openGraph: {
    title: "Jazba Fuels LLP",
    description: "Doorstep Diesel Delivery · Mumbai",
    images: [
      {
        url: "/brand/delivery-truck.png",
        alt: "Jazba Fuels doorstep diesel delivery truck",
      },
    ],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
