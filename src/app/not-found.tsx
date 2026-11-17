import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap legal">
      <p className="eyebrow">JAZBA FUELS LLP · 404</p>
      <h1>Page not found.</h1>
      <p>The page may have moved or the address may be incorrect.</p>
      <Link className="button primary" href="/">
        Return to the website
      </Link>
    </main>
  );
}
