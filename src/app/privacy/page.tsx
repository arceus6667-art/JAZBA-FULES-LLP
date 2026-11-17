import Link from "next/link";
export const metadata = { title: "Privacy policy | Jazba Fuels LLP" };
export default function Privacy() {
  return (
    <main className="legal wrap">
      <Link className="back-link" href="/">
        ← Back to Jazba Fuels
      </Link>
      <h1>Privacy policy</h1>
      <p>
        Jazba Fuels LLP uses this website to share company information and
        receive corporate inquiries.
      </p>
      <h2>Information you submit</h2>
      <p>
        The inquiry form collects your name, email, company name, contact
        number, subject, message and consent. We use these details to respond to
        your inquiry and manage the resulting business correspondence.
        Authorised administrators can access and manage inquiries.
      </p>
      <h2>Optional website analytics</h2>
      <p>
        With your permission, we record page views and a random anonymous
        visitor identifier in a first-party cookie for up to 90 days. We record
        broad device, browser and operating-system categories, referral
        hostname, and activity timestamps. We do not use advertising trackers or
        browser fingerprinting. Visitor counts and activity duration are
        estimates.
      </p>
      <p>
        Declining optional analytics does not prevent you from using the site or
        sending inquiries. We respect Do Not Track and Global Privacy Control
        signals. Change your choice using “Cookie preferences” in the footer.
        Your preference cookie lasts up to one year.
      </p>
      <h2>Security and retention</h2>
      <p>
        Administrator access uses authenticated sessions. Inquiry records and
        backups are restricted to authorised administrators. Records are kept
        while needed for the inquiry or related business records and can be
        removed by an administrator. Technical abuse-prevention counters expire
        after their rate-limit window; raw IP addresses are not saved in the
        analytics database.
      </p>
      <h2>Your requests</h2>
      <p>
        For access, correction or deletion requests, use the{" "}
        <Link href="/#contact">corporate inquiry form</Link> or write to Jazba
        Fuels LLP, Shop No. 9, Ashapura Shopping Center, C.S.C. Road-02,
        Opposite SVC Bank, Anand Nagar, Dahisar East, Mumbai – 400068. Include
        enough information to identify your prior inquiry. Identity verification
        may be required.
      </p>
      <h2>External links and app releases</h2>
      <p>
        External sites, including map services, apply their own privacy
        practices. A mobile application, when released, may have its own privacy
        notice. This policy describes this website only.
      </p>
    </main>
  );
}
