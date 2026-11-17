import Admin from "@/components/Admin";
export const metadata = {
  title: "Jazba Command Centre",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function AdminPage() {
  return <Admin />;
}
