import Link from "next/link";
export const metadata = { title: "Terms and conditions | Jazba Fuels LLP", alternates: {canonical: "/terms"} };
export default function Terms() {
  return (
    <main className="legal wrap">
      <Link className="back-link" href="/">
        ← Back to Jazba Fuels
      </Link>
      <h1>Terms and conditions</h1>
      <h2>Website information</h2>
      <p>
        This website introduces Jazba Fuels LLP and provides a channel for
        corporate inquiries. Information is general in nature. Service
        availability, delivery arrangements, commercial terms, product
        specifications and pricing must be confirmed directly with the company.
      </p>
      <h2>Corporate inquiries</h2>
      <p>
        Submitting the contact form does not place a fuel order, create a supply
        contract or confirm availability. Do not send passwords, payment details
        or unnecessary sensitive information through the inquiry form.
      </p>
      <h2>Upcoming mobile application</h2>
      <p>
        App concepts and planned features are indicative and may change. “Coming
        Soon” and testing statuses do not indicate a public release. Use only
        official published distribution links when available.
      </p>
      <h2>Responsible use</h2>
      <p>
        Do not submit unlawful content, attempt unauthorised access, interfere
        with the website, or misuse its forms and downloads. Company branding
        and supplied photographs remain the property of their respective rights
        holders.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this website may be sent through the{" "}
        <Link href="/#contact">corporate inquiry form</Link> or to the company
        office shown on the website. These website terms do not replace
        individually agreed commercial contracts.
      </p>
    </main>
  );
}
