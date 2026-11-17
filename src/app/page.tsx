import { publicContent } from "@/lib/content";
import Website from "@/components/Website";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { settings } = await publicContent();
  return {
    title: settings.seoTitle || "Jazba Fuels LLP | Doorstep Diesel Delivery",
    description:
      settings.seoDescription ||
      "Mumbai-based commercial fuel logistics. Connect with Jazba Fuels LLP.",
  };
}
export default async function Home() {
  const data = await publicContent();
  return <Website data={JSON.parse(JSON.stringify(data))} />;
}
