"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  MapPin,
  Factory,
  Building2,
  HardHat,
  Truck,
  Warehouse,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Check,
  LoaderCircle,
} from "lucide-react";
import { COMPANY } from "@/lib/content-static";
import Brand from "./Brand";
import { createAdminShortcut } from "@/lib/shortcut.mjs";

type Release = {
  id: string;
  applicationName: string;
  version: string;
  description: string;
  releaseNotes: string;
  releaseStatus: string;
  iconPath: string;
  screenshotPaths: string;
  file: { id: string; verified: boolean } | null;
};
type PublicData = {
  settings: Record<string, string>;
  announcements: {
    id: string;
    title: string;
    description: string;
    category: string;
    imagePath: string;
    publishedAt: string;
  }[];
  release: Release | null;
};
const nav = [
  ["About us", "about"],
  ["Our business", "business"],
  ["Industries", "industries"],
  ["Why Us", "why-us"],
  ["Mobile app", "app"],
];
export default function Website({ data }: { data: PublicData }) {
  const [menu, setMenu] = useState(false),
    [cookie, setCookie] = useState<string | null>(null),
    [privacy, setPrivacy] = useState(false);
  useEffect(() => {
    const shortcut = createAdminShortcut();
    const down = (e: KeyboardEvent) => {
      const editing =
        e.target instanceof Element &&
        Boolean(
          e.target.closest('input,textarea,select,[contenteditable="true"]'),
        );
      if (shortcut.down(e.key, editing)) location.href = "/admin";
    };
    const up = (e: KeyboardEvent) => shortcut.up(e.key);
    const reset = () => shortcut.reset();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    const consent = document.cookie
      .split("; ")
      .find((c) => c.startsWith("jazba_analytics_consent="))
      ?.split("=")[1];
    setCookie("no");
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);
  useEffect(() => {
    if (
      true || cookie !== "yes" ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    const track = (heartbeat = false) =>
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: location.pathname,
          referrer: document.referrer,
          heartbeat,
        }),
        keepalive: true,
      }).catch(() => {});
    void track();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void track(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [cookie]);
  const consent = (value: string) => {
    document.cookie = `jazba_analytics_consent=${value}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setCookie(value);
    setPrivacy(false);
  };
  const release = data.release;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="topline">
        <div className="wrap">
          <span>MUMBAI, MAHARASHTRA</span>
          <span>
            Commercial fuel logistics <i /> Established 2021
          </span>
        </div>
      </div>
      <header>
        <div className="wrap header-inner">
          <Brand />
          <nav aria-label="Main navigation" className={menu ? "open" : ""}>
            <a href="#home" onClick={() => setMenu(false)}>
              Home
            </a>
            {nav.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <a
              href="#contact"
              className="nav-contact"
              onClick={() => setMenu(false)}
            >
              Contact us <ArrowUpRight size={16} />
            </a>
          </nav>
          <button
            className="menu-button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={menu ? "Close navigation" : "Open navigation"}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {data.settings.maintenanceNotice && (
        <div className="notice" role="status">
          {data.settings.maintenanceNotice}
        </div>
      )}
      <main id="main">
        <section className="hero wrap" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> ENERGY THAT MOVES BUSINESS
            </p>
            <h1>
              Doorstep
              <br />
              Diesel <span>Delivery.</span>
            </h1>
            <p className="hero-subtitle">
              Powering Mumbai.
              <br />
              Driving business forward.
            </p>
            <p className="hero-description">
              Premium-grade diesel delivered to your doorstep within 30 minutes. Associated with IndianOil, with a commitment to quality and professional service.
            </p>
            <div className="button-row">
              <a className="button primary" href="#business">
                Explore our business <ArrowUpRight size={18} />
              </a>
              <a className="text-link" href="#about">
                About Jazba Fuels <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-top">
              <span>JAZBA FUELS LLP</span>
              <span>01 / ON THE MOVE</span>
            </div>
            <div className="truck-photo">
              <img
                src="/brand/delivery-truck.webp"
                alt="Jazba Fuels doorstep diesel delivery truck"
                fetchPriority="high" width={1162} height={557} decoding="async"
              />
            </div>
            <div className="visual-bottom">
              <span>
                <MapPin size={15} /> Mumbai, India
              </span>
              <span>
                Doorstep diesel delivery <ArrowUpRight size={16} />
              </span>
            </div>
            <a className="app-teaser" href="#app">
              <span className="app-icon">
                <Smartphone size={22} />
              </span>
              <span>
                <small>A MORE CONNECTED EXPERIENCE</small>
                <strong>
                  Jazba Fuels app{" "}
                  <b>{release?.releaseStatus || "Coming Soon"}</b>
                </strong>
              </span>
              <ArrowUpRight size={19} />
            </a>
          </div>
        </section>
        <section className="highlights wrap" aria-label="Company at a glance">
          {[
            ["2021", "Established in Mumbai"],
            ["30 minutes", "Doorstep diesel delivery"],
            ["Premium-grade", "Quality-focused diesel supply"],
            ["IndianOil", "Associated with IndianOil"],
          ].map(([title, text]) => (
            <div key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </section>
        <section className="section wrap about" id="about">
          <div>
            <p className="eyebrow">01 — ABOUT JAZBA FUELS</p>
            <h2>
              A professional approach.
              <br />
              <span>A shared ambition.</span>
            </h2>
          </div>
          <div className="about-body">
            <p className="large-copy">
              {data.settings.companyDescription || COMPANY.description}
            </p>
            <p>
              We believe commercial fuel management should be clear, dependable
              and built around the needs of your business.
            </p>
            <div className="mission-grid">
              <div>
                <h3>Our mission</h3>
                <p>
                  To contribute to efficient and reliable commercial fuel
                  management through modern business practices.
                </p>
              </div>
              <div>
                <h3>Our vision</h3>
                <p>
                  To build a digitally connected and professionally managed fuel
                  logistics ecosystem.
                </p>
              </div>
            </div>
            <div className="leadership">
              <span>OUR DIRECTORS</span>
              <div className="partner-grid">
                <div>
                  <strong>Asmita J Angare</strong>
                  <small>Director</small><a href="tel:+918850049123">+91 88500 49123</a>
                </div>
                <div>
                  <strong>Jitendra Angare</strong>
                  <small>Director</small><a href="tel:+919321759374">+91 93217 59374</a>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="business-section" id="business">
          <div className="wrap section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 — OUR BUSINESS</p>
                <h2>
                  Built around
                  <br />
                  your business needs.
                </h2>
              </div>
              <p>
                A focused approach to commercial fuel logistics, supported by
                professional business practices and a digital vision.
              </p>
            </div>
            <div className="service-grid">
              {[
                [
                  "01",
                  Truck,
                  "Commercial fuel logistics",
                  "A business-focused approach to the coordination and movement of commercial fuel.",
                ],
                [
                  "02",
                  Factory,
                  "Industrial fuel management",
                  "Understanding the fuel-management requirements of industrial and commercial operations.",
                ],
                [
                  "03",
                  Smartphone,
                  "A connected future",
                  "Developing digital touchpoints for company information, support and account management.",
                ],
              ].map(([n, Icon, title, description]) => {
                const I = Icon as typeof Truck;
                return (
                  <article className="service" key={String(n)}>
                    <div className="service-top">
                      <I size={30} strokeWidth={1.3} />
                      <span>{String(n)}</span>
                    </div>
                    <h3>{String(title)}</h3>
                    <p>{String(description)}</p>
                    <a href="#contact">
                      Discuss your requirements <ArrowUpRight size={16} />
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section className="section wrap industries" id="industries">
          <div>
            <p className="eyebrow">03 — INDUSTRIES</p>
            <h2>
              Keeping industry
              <br />
              in perspective.
            </h2>
            <p>
              Every business has different requirements.
              <br />
              Start a conversation about yours.
            </p>
            <a className="text-link" href="#contact">
              Talk to our team <ArrowRight size={18} />
            </a>
          </div>
          <div className="industry-grid">
            {[
              [Factory, "Manufacturing"],
              [Building2, "Infrastructure"],
              [HardHat, "Construction"],
              [Truck, "Logistics"],
              [Warehouse, "Commercial establishments"],
              [ShieldCheck, "Industrial enterprises"],
            ].map(([Icon, title]) => {
              const I = Icon as typeof Factory;
              return (
                <div key={String(title)}>
                  <I size={23} strokeWidth={1.4} />
                  <span>{String(title)}</span>
                  <ChevronRight size={15} />
                </div>
              );
            })}
          </div>
        </section>
        <section className="why-section" id="why-us"><div className="wrap section"><div className="section-heading"><div><p className="eyebrow">04 — WHY US</p><h2>Quality fuel.<br/>Professional delivery.</h2></div><p>Jazba Fuels combines its association with IndianOil, premium-grade diesel and responsive doorstep service to support your business requirements.</p></div><div className="why-cards">{[
['01','Associated with IndianOil','Our association with IndianOil reflects our commitment to dependable fuel supply and professional service.'],
['02','Premium-grade diesel','We supply premium-grade diesel with an emphasis on purity, consistent quality and careful fuel handling.'],
['03','Delivery within 30 minutes','Receive diesel at your doorstep within 30 minutes, helping your business keep essential operations moving.'],
['04','Safe and reliable service','A dedicated approach to fuel handling, customer requirements and dependable doorstep delivery.']
].map(([number,title,description])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
        <section className="section wrap app-section" id="app">
          <div className="app-copy">
            <p className="eyebrow">05 — DIGITAL SERVICES</p>
            <span className="status-pill">
              <span />
              {release?.releaseStatus || "Coming Soon"}
            </span>
            <h2>
              The Jazba Fuels
              <br />
              Digital Platform.
            </h2>
            <p className="large-copy">
              A dedicated platform for
              <br />customer information and support.
            </p>
            <p>
              {release?.description ||
                "The Jazba Fuels mobile application is under development. The planned platform will provide a central point for company information, customer communication and service updates. Official launch details will be announced here."}
            </p>
            <div className="planned">
              {[
                "Company announcements",
                "Digital customer support",
                "Account management",
                "Application updates",
              ].map((f) => (
                <span key={f}>
                  <Check size={14} />
                  {f}
                </span>
              ))}
            </div>
            {release?.releaseStatus === "Released" && release.file?.verified ? (
              <a
                className="button primary"
                href={`/api/media/${release.file.id}`}
              >
                Download official Android app <ArrowUpRight size={18} />
              </a>
            ) : (
              <p className="muted-small">
                Application launch is forthcoming. Features shown are planned and will be confirmed at release.
              </p>
            )}
            {release?.releaseNotes && (
              <details>
                <summary>Version {release.version} · Release notes</summary>
                <p className="preserve">{release.releaseNotes}</p>
              </details>
            )}
            {release &&
              JSON.parse(release.screenshotPaths || "[]").length > 0 && (
                <div className="release-screenshots">
                  {JSON.parse(release.screenshotPaths).map(
                    (path: string, i: number) => (
                      <img
                        src={path}
                        alt={`Official app screenshot ${i + 1}`}
                        key={path}
                        loading="lazy"
                      />
                    ),
                  )}
                </div>
              )}
          </div>
          <div className="app-preview">
            <div className="preview-note">
              APPLICATION DEVELOPMENT <span>ILLUSTRATIVE INTERFACE</span>
            </div>
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-body">
                <img
                  src={release?.iconPath || "/brand/jazba-fuels-logo-640.webp"}
                  alt="Jazba Fuels app identity"
                  width={47}
                  height={47}
                />
                <p className="phone-label">JAZBA FUELS</p>
                <h3>
                  Your business.
                  <br />
                  Connected.
                </h3>
                <div className="phone-card">
                  <span>JAZBA FUELS DIGITAL SERVICES</span>
                  <strong>{release?.releaseStatus || "Coming soon"}</strong>
                  <p>
                    Company information.
                    <br />
                    Updates. Support.
                  </p>
                  <ArrowUpRight size={22} />
                </div>
                <div className="phone-row">
                  <span>Announcements</span>
                  <ChevronRight size={15} />
                </div>
                <div className="phone-row">
                  <span>Company information</span>
                  <ChevronRight size={15} />
                </div>
                <p className="phone-footer">Doorstep Diesel Delivery</p>
              </div>
            </div>
            <span className="preview-caption">
              Illustrative preview · Features may change
            </span>
          </div>
        </section>
        {data.announcements.length > 0 && (
          <section className="section wrap updates">
            <p className="eyebrow">FROM JAZBA FUELS</p>
            <h2>Company updates.</h2>
            <div className="updates-grid">
              {data.announcements.map((a) => (
                <article key={a.id}>
                  {a.imagePath && (
                    <img src={a.imagePath} alt="" loading="lazy" />
                  )}
                  <p className="eyebrow">{a.category}</p>
                  <h3>{a.title}</h3>
                  <p className="preserve">{a.description}</p>
                  <time dateTime={a.publishedAt}>
                    {new Date(a.publishedAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="contact-section" id="contact">
          <div className="wrap section contact-grid">
            <div>
              <p className="eyebrow">06 — CONTACT JAZBA FUELS</p>
              <h2>
                Good business
                <br />
                starts with a<br /> <span>conversation.</span>
              </h2>
              <p>
                Tell us about your organisation and requirements. Our team will
                get in touch.
              </p>
              <address>
                <MapPin size={23} />
                <div>
                  <strong>Visit our office</strong>
                  <p>{data.settings.officeAddress || COMPANY.address}</p>
                  <a
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.settings.officeAddress || COMPANY.address)}`}
                  >
                    Get directions <ArrowUpRight size={15} />
                  </a>
                </div>
              </address>
              <div className="delivery-contact"><span>DOORSTEP DELIVERY</span><a href="tel:+919004777892">+91 90047 77892</a><p>Premium-grade diesel · Delivery within 30 minutes</p></div>
              {data.settings.contactEmail && (
                <p>
                  <a href={`mailto:${data.settings.contactEmail}`}>
                    {data.settings.contactEmail}
                  </a>
                </p>
              )}
              {data.settings.contactPhone && (
                <p>
                  <a
                    href={`tel:${data.settings.contactPhone.replace(/[^+\d]/g, "")}`}
                  >
                    {data.settings.contactPhone}
                  </a>
                </p>
              )}
            </div>
            <ContactForm />
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap footer-main">
          <div>
            <Brand />
            <p>
              Professional fuel logistics.
              <br />A more connected future.
            </p>
          </div>
          <div>
            <span className="footer-title">EXPLORE</span>
            <a href="#about">About us</a>
            <a href="#business">Our business</a>
            <a href="#industries">Industries</a><a href="#why-us">Why Us</a>
            <a href="#app">Mobile app</a>
          </div>
          <div className="footer-address">
            <span className="footer-title">JAZBA FUELS LLP</span>
            <p>{data.settings.officeAddress || COMPANY.address}</p>
            <p>
              LLPIN: AAV-6067
              <br />
              Incorporated: 27 January 2021
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {new Date().getFullYear()} Jazba Fuels LLP. All rights reserved.
          </span>
          <div>
            <a href="/privacy">Privacy policy</a>
            <a href="/terms">Terms &amp; conditions</a>
            <button onClick={() => window.alert("This Sites preview does not collect analytics.")}>Cookie preferences</button>
          </div>
        </div>
        {data.settings.footerInformation && (
          <p className="wrap muted-small">{data.settings.footerInformation}</p>
        )}
      </footer>
      {(cookie === "ask" || privacy) && (
        <aside className="cookie-banner" aria-label="Privacy preferences">
          <div>
            <strong>Your privacy, your choice.</strong>
            <p>
              Optional first-party analytics help us understand website usage.
              No advertising or fingerprinting.{" "}
              <a href="/privacy">Privacy policy</a>
            </p>
          </div>
          <button className="button secondary" onClick={() => consent("no")}>
            Essential only
          </button>
          <button className="button primary" onClick={() => consent("yes")}>
            Allow analytics
          </button>
        </aside>
      )}
    </>
  );
}
function ContactForm(){return <><form className="contact-form" action="/api/contact" method="post"><h3>Corporate inquiry</h3><p>Fields marked * are required.</p><div className="form-grid">{[['fullName','Full name','text','name',100,2],['email','Email address','email','email',254,3],['companyName','Company name','text','organization',150,2],['contactNumber','Contact number','tel','tel',25,7]].map(([name,label,type,complete,max,min])=><label key={name}>{label} *<input name={String(name)} type={String(type)} autoComplete={String(complete)} required minLength={Number(min)} maxLength={Number(max)}/></label>)}</div><label>Subject *<input name="subject" required minLength={3} maxLength={160}/></label><label>How can we help? *<textarea name="message" rows={4} required minLength={3} maxLength={5000}/><small className="muted-small">At least 3 characters.</small></label><div className="honeypot" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="checkbox-label"><input type="checkbox" name="consent" required/><span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer">privacy policy</a> and consent to Jazba Fuels LLP using my details to respond to this inquiry. *</span></label><p id="contact-error" className="error" role="alert" hidden/><button type="submit" className="button primary submit-button">Send inquiry <ArrowUpRight size={18}/></button><span className="form-note">Your details are used to respond to your inquiry.</span><noscript><p>Please enable JavaScript to submit this form, or call +91 90047 77892.</p></noscript></form><dialog className="success-dialog" aria-labelledby="inquiry-success-heading"><div className="success-mark"><Check size={28}/></div><h3 id="inquiry-success-heading">Thank you for getting in touch.</h3><p>Thank you for contacting Jazba Fuels LLP. We will reach you very shortly.</p><p id="inquiry-reference" className="muted-small"/><button type="button" className="button primary dialog-close">Done <Check size={17}/></button></dialog></>;}
