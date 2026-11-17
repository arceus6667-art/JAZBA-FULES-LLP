"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  Mail,
  ChartNoAxesCombined,
  Smartphone,
  Megaphone,
  Settings,
  ScrollText,
  Database,
  ArrowUpRight,
  LoaderCircle,
  Upload,
  Download,
} from "lucide-react";
import Brand from "./Brand";
const TrafficChart = dynamic(() => import("./TrafficChart"), {
  ssr: false,
  loading: () => <p>Loading chart…</p>,
});
// API payloads are validated at the server boundary. The dashboard renders the API's resource-specific records.
type Row = Record<string, any>;
const sections = [
  ["overview", "Overview", LayoutDashboard],
  ["messages", "Corporate messages", Mail],
  ["analytics", "Website insights", ChartNoAxesCombined],
  ["releases", "App management", Smartphone],
  ["announcements", "Announcements", Megaphone],
  ["settings", "Website settings", Settings],
  ["logs", "Activity logs", ScrollText],
  ["backup", "Backup management", Database],
] as const;
const date = (v: string) =>
  new Date(v).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
const day = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
export default function Admin() {
  const [session, setSession] = useState<Row | null | undefined>(undefined),
    [tab, setTab] = useState("overview"),
    [data, setData] = useState<any>(null),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [selected, setSelected] = useState<Row | null>(null),
    [checked, setChecked] = useState<string[]>([]),
    [files, setFiles] = useState<Row[]>([]),
    [traffic, setTraffic] = useState<Row | null>(null),
    [preset, setPreset] = useState("Last 30 days");
  const version = useRef(0),
    activeTab = useRef(tab);
  const alert = (text: string, error = false) => {
    setNotice(text);
    setFailed(error);
  };
  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`/api/admin/${path}`, {
        method,
        cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) setSession(null);
        throw new Error(result.error || "Request failed.");
      }
      return result;
    },
    [],
  );
  useEffect(() => {
    api("session")
      .then(setSession)
      .catch(() => setSession(null));
  }, [api]);
  const params = useCallback(
    () =>
      new URLSearchParams({
        ...(tab === "messages" && q ? { q } : {}),
        ...(status && tab === "messages" ? { status } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page: String(page),
      }).toString(),
    [tab, q, status, from, to, page],
  );
  const load = useCallback(async () => {
    if (!session || activeTab.current !== tab) return;
    const requestVersion = ++version.current;
    setBusy(true);
    try {
      if (tab === "backup") {
        setData({});
        return;
      }
      const [result, chart, library] = await Promise.all([
        api(`${tab}?${params()}`),
        tab === "overview" ? api("analytics") : null,
        tab === "releases" || tab === "announcements" ? api("files") : null,
      ]);
      if (version.current !== requestVersion) return;
      setData(result);
      if (chart) setTraffic(chart);
      if (library) setFiles(library);
    } catch (e) {
      if (version.current === requestVersion) alert((e as Error).message, true);
    } finally {
      if (version.current === requestVersion) setBusy(false);
    }
  }, [api, params, session, tab]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function save(path: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      await api(path, method, body);
      alert("Changes saved.");
      setSelected(null);
      await load();
      return true;
    } catch (e) {
      alert((e as Error).message, true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove(resource: string, id: string) {
    if (!confirm("Permanently delete this record? This cannot be undone."))
      return;
    await save(`${resource}/${id}`, undefined, "DELETE");
  }
  function changeTab(id: string) {
    version.current++;
    activeTab.current = id;
    setTab(id);
    setData(null);
    setSelected(null);
    setNotice("");
    setQ("");
    setStatus("");
    setPage(1);
    setFrom("");
    setTo("");
    setChecked([]);
  }
  async function download(path: string, name: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/${path}`);
      if (!r.ok) {
        const v = await r.json();
        throw new Error(v.error);
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      alert("Download prepared.");
    } catch (e) {
      alert((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.set("file", f);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setFiles(await api("files"));
      alert(`Uploaded ${f.name}. File integrity recorded.`);
    } catch (e) {
      alert((e as Error).message, true);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  if (session === undefined)
    return (
      <div className="admin-login">
        <p role="status">Checking your session…</p>
      </div>
    );
  if (!session)
    return <Login onLogin={async () => setSession(await api("session"))} />;
  const title = sections.find((s) => s[0] === tab)?.[1];
  function rangePreset(label: string, days: number, offset = 0) {
    const end = new Date(Date.now() - offset * 86400000);
    setFrom(day(new Date(+end - (days - 1) * 86400000)));
    setTo(day(end));
    setPreset(label);
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <p>JAZBA COMMAND CENTRE</p>
        <nav aria-label="Administration">
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={tab === id ? "active" : ""}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <button
          className="logout"
          onClick={async () => {
            try {
              await api("logout", "POST");
              setSession(null);
            } catch (e) {
              alert((e as Error).message, true);
            }
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <h1>{title}</h1>
            <p>{session.email} · Times shown in India Standard Time</p>
          </div>
          <a href="/" target="_blank">
            View website <ArrowUpRight size={15} />
          </a>
        </div>
        {notice && (
          <div
            role={failed ? "alert" : "status"}
            className={`admin-toast ${failed ? "admin-error" : ""}`}
          >
            {notice}
          </div>
        )}
        {busy && (
          <p className="admin-meta" role="status">
            <LoaderCircle className="spin" size={14} /> Working…
          </p>
        )}
        {data && tab === "overview" && (
          <>
            <div className="admin-stats">
              {[
                ["Total page views", data.views, "Measured with consent"],
                [
                  "Estimated unique visitors",
                  data.visitors,
                  "Anonymous visitor identifiers",
                ],
                [
                  "Today’s visitors",
                  data.todayVisitors,
                  "Estimated unique visitors",
                ],
                ["Last 7 days", data.weekVisitors, "Estimated unique visitors"],
                ["This month", data.monthVisitors, "Estimated unique visitors"],
                [
                  "Corporate messages",
                  data.messages,
                  "All submitted inquiries",
                ],
                ["Unread messages", data.unread, "Status: New"],
                [
                  "Published announcements",
                  data.announcements,
                  "Visible on the website",
                ],
              ].map(([label, value, note]) => (
                <div className="admin-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
            <div className="admin-grid">
              <section className="admin-panel">
                <h2>Seven-day traffic</h2>
                {traffic && <TrafficChart data={traffic.traffic.slice(-7)} />}
              </section>
              <section className="admin-panel">
                <h2>Monthly traffic</h2>
                {traffic && <TrafficChart data={traffic.traffic} bars />}
              </section>
            </div>
            <div className="admin-grid">
              <section className="admin-panel">
                <h2>Recent inquiries</h2>
                {data.recent.length ? (
                  data.recent.map((m: Row) => (
                    <div className="admin-record" key={m.id}>
                      <strong>
                        {m.fullName} · {m.companyName}
                      </strong>
                      <p>{m.subject}</p>
                      <span className="tag">{m.status}</span>
                    </div>
                  ))
                ) : (
                  <Empty text="No inquiries yet." />
                )}
              </section>
              <section className="admin-panel">
                <h2>App publication status</h2>
                <span className="tag">
                  {data.release?.releaseStatus || "Coming Soon"}
                </span>
                <p className="admin-meta">
                  {data.release
                    ? `${data.release.applicationName} · Version ${data.release.version}`
                    : "No release has been published."}
                </p>
                <h3>Recent administrative activity</h3>
                {data.logs.map((l: Row) => (
                  <p className="admin-meta" key={l.id}>
                    {l.action} · {date(l.timestamp)}
                  </p>
                ))}
              </section>
            </div>
          </>
        )}
        {tab === "messages" && (
          <section className="admin-panel">
            <div className="toolbar">
              <input
                aria-label="Search messages"
                placeholder="Search name, email or company"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="Message status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {["New", "Read", "Responded", "Resolved", "Archived"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
              <input
                aria-label="Messages from date"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
              <input
                aria-label="Messages to date"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  download(
                    `messages-export?${params()}${checked.map((id) => `&id=${id}`).join("")}`,
                    "jazba-messages.csv",
                  )
                }
              >
                <Download size={14} />
                {checked.length ? "Export selected" : "Export filtered"}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows.map((m: Row) => (
                    <tr key={m.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select message from ${m.fullName}`}
                          checked={checked.includes(m.id)}
                          onChange={(e) =>
                            setChecked((c) =>
                              e.target.checked
                                ? [...c, m.id]
                                : c.filter((id) => id !== m.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        {m.fullName}
                        <small>{m.companyName}</small>
                        <small>{m.email}</small>
                      </td>
                      <td>{m.subject}</td>
                      <td>
                        <span className="tag">{m.status}</span>
                      </td>
                      <td>{date(m.createdAt)}</td>
                      <td>
                        <button onClick={() => setSelected({ ...m })}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.total === 0 && <Empty text="No matching inquiries." />}
            <div className="pagination">
              <span>{data?.total || 0} messages</span>
              <button
                disabled={page === 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                disabled={!data || page * 15 >= data.total || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
            {selected && (
              <div className="admin-record">
                <h2>{selected.subject}</h2>
                <p>
                  <strong>{selected.fullName}</strong> · {selected.companyName}
                  <br />
                  <a href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a> · {selected.contactNumber}
                </p>
                <p className="preserve">{selected.message}</p>
                <p className="admin-meta">
                  Privacy consent: {selected.consent ? "Yes" : "No"} ·{" "}
                  {date(selected.createdAt)} · ID {selected.id}
                </p>
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(
                      `messages/${selected.id}`,
                      {
                        status: selected.status,
                        administrativeNotes: selected.administrativeNotes,
                      },
                      "PATCH",
                    );
                  }}
                >
                  <label>
                    Status
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({ ...selected, status: e.target.value })
                      }
                    >
                      {["New", "Read", "Responded", "Resolved", "Archived"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Private administrative notes
                    <textarea
                      rows={4}
                      value={selected.administrativeNotes}
                      maxLength={10000}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          administrativeNotes: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="actions">
                    <button className="button primary" disabled={busy}>
                      Save changes
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setSelected(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="button secondary danger"
                      disabled={busy}
                      onClick={() => remove("messages", selected.id)}
                    >
                      Delete permanently
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}
        {tab === "analytics" && (
          <>
            <section className="admin-panel">
              <div className="toolbar">
                <div className="date-presets">
                  {[
                    ["Today", 1, 0],
                    ["Yesterday", 1, 1],
                    ["Last 7 days", 7, 0],
                    ["Last 30 days", 30, 0],
                    ["Last 90 days", 90, 0],
                  ].map(([label, n, offset]) => (
                    <button
                      key={label}
                      className={preset === label ? "active" : ""}
                      onClick={() =>
                        rangePreset(String(label), Number(n), Number(offset))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  aria-label="Analytics start date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPreset("Custom");
                  }}
                />
                <input
                  type="date"
                  aria-label="Analytics end date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPreset("Custom");
                  }}
                />
                <button
                  className="button secondary"
                  onClick={() =>
                    download(
                      `analytics-export?${params()}`,
                      "jazba-analytics.csv",
                    )
                  }
                >
                  Export daily totals
                </button>
              </div>
              <p>
                Consent-based measurement. Page views are recorded events.
                Visitor and returning-visitor counts are estimates, affected by
                cookie deletion and declined consent. No fingerprinting or raw
                IP storage.
              </p>
            </section>
            {data && (
              <>
                <div className="admin-stats">
                  {[
                    ["Page views", data.pageViews],
                    ["Estimated visitors", data.uniqueVisitors],
                    ["Estimated returning", data.returningVisitors],
                    ["Inquiries", data.inquiries],
                  ].map(([label, value]) => (
                    <div className="admin-stat" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-grid">
                  <section className="admin-panel">
                    <h2>Traffic over time</h2>
                    <TrafficChart data={data.traffic} />
                  </section>
                  <section className="admin-panel">
                    <h2>Daily page views and inquiries</h2>
                    <TrafficChart data={data.traffic} bars />
                  </section>
                  {[
                    ["Device distribution", data.devices],
                    ["Browser distribution", data.browsers],
                    ["Operating systems", data.systems],
                    ["Referral sources", data.referrers],
                    ["Most visited pages", data.pages],
                  ].map(([label, values]) => (
                    <section className="admin-panel" key={label}>
                      <h2>{label}</h2>
                      <MetricList rows={values} />
                    </section>
                  ))}
                  <section className="admin-panel">
                    <h2>Visitor estimates</h2>
                    <MetricList
                      rows={[
                        {
                          name: "New visitors in this period",
                          value: data.uniqueVisitors - data.returningVisitors,
                        },
                        {
                          name: "Returning visitors",
                          value: data.returningVisitors,
                        },
                      ]}
                    />
                    <p className="admin-meta">
                      Average observed activity span:{" "}
                      {data.averageObservedSeconds} seconds. This is a capped
                      estimate, not exact time spent.
                    </p>
                  </section>
                </div>
              </>
            )}
          </>
        )}
        {(tab === "announcements" || tab === "releases") && (
          <>
            <section className="admin-panel">
              <div className="toolbar">
                <button
                  className="button primary"
                  onClick={() =>
                    setSelected(
                      tab === "announcements"
                        ? {
                            title: "",
                            description: "",
                            category: "Corporate update",
                            imagePath: "",
                            status: "Draft",
                          }
                        : {
                            applicationName: "Jazba Fuels",
                            version: "",
                            description: "",
                            releaseNotes: "",
                            releaseStatus: "Coming Soon",
                            publicationStatus: "Draft",
                            fileId: "",
                            iconPath: "",
                            screenshotPaths: "[]",
                            releaseDate: "",
                          },
                    )
                  }
                >
                  New {tab === "announcements" ? "announcement" : "app update"}
                </button>
                <span className="admin-meta">
                  Drafts remain private. Published updates appear on the
                  website.
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {tab === "announcements"
                          ? "Title"
                          : "Application / version"}
                      </th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.map((r: Row) => (
                      <tr key={r.id}>
                        <td>
                          {r.title || `${r.applicationName} · ${r.version}`}
                        </td>
                        <td>
                          <span className="tag">
                            {r.status || r.publicationStatus}
                          </span>
                          {r.releaseStatus && <small>{r.releaseStatus}</small>}
                        </td>
                        <td>{date(r.updatedAt)}</td>
                        <td>
                          <button onClick={() => setSelected({ ...r })}>
                            Edit / preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.length === 0 && (
                <Empty text="No records yet. Create a draft when you have an approved update." />
              )}
            </section>
            {selected && (
              <section className="admin-panel">
                <h2>
                  {selected.id ? "Edit" : "Create"}{" "}
                  {tab === "announcements" ? "announcement" : "app update"}
                </h2>
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(
                      `${tab}${selected.id ? `/${selected.id}` : ""}`,
                      tab === "releases"
                        ? {
                            ...selected,
                            screenshotPaths: JSON.parse(
                              selected.screenshotPaths || "[]",
                            ),
                            fileId: selected.fileId || null,
                            releaseDate: selected.releaseDate || null,
                          }
                        : selected,
                      selected.id ? "PATCH" : "POST",
                    );
                  }}
                >
                  {(tab === "announcements"
                    ? ["title", "description"]
                    : [
                        "applicationName",
                        "version",
                        "description",
                        "releaseNotes",
                      ]
                  ).map((key) => (
                    <label key={key}>
                      {human(key)}
                      {key === "description" || key === "releaseNotes" ? (
                        <textarea
                          rows={4}
                          required={key === "description"}
                          minLength={key === "description" ? 10 : 0}
                          maxLength={key === "releaseNotes" ? 5000 : 3000}
                          value={selected[key] || ""}
                          onChange={(e) =>
                            setSelected({ ...selected, [key]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          required
                          value={selected[key] || ""}
                          maxLength={key === "version" ? 40 : 160}
                          onChange={(e) =>
                            setSelected({ ...selected, [key]: e.target.value })
                          }
                        />
                      )}
                    </label>
                  ))}
                  {tab === "announcements" ? (
                    <>
                      <label>
                        Category
                        <select
                          value={selected.category}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              category: e.target.value,
                            })
                          }
                        >
                          {[
                            "Corporate update",
                            "Application development",
                            "Release announcement",
                            "Important notice",
                            "Maintenance",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <ImageSelect
                        files={files}
                        label="Announcement image"
                        value={selected.imagePath}
                        onChange={(v) =>
                          setSelected({ ...selected, imagePath: v })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <label>
                        Application status
                        <select
                          value={selected.releaseStatus}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              releaseStatus: e.target.value,
                            })
                          }
                        >
                          {[
                            "Coming Soon",
                            "Under Development",
                            "Internal Testing",
                            "Beta Testing",
                            "Released",
                            "Temporarily Unavailable",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Release date
                        <input
                          type="date"
                          value={selected.releaseDate?.slice(0, 10) || ""}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              releaseDate: e.target.value,
                            })
                          }
                        />
                      </label>
                      <ImageSelect
                        files={files}
                        label="Official app icon"
                        value={selected.iconPath}
                        onChange={(v) =>
                          setSelected({ ...selected, iconPath: v })
                        }
                      />
                      <label>
                        App screenshots (select up to six)
                        <select
                          multiple
                          value={JSON.parse(selected.screenshotPaths || "[]")}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              screenshotPaths: JSON.stringify(
                                Array.from(e.target.selectedOptions)
                                  .map((o) => o.value)
                                  .slice(0, 6),
                              ),
                            })
                          }
                        >
                          {files
                            .filter((f) => f.mime.startsWith("image/"))
                            .map((f) => (
                              <option key={f.id} value={`/api/media/${f.id}`}>
                                {f.originalName}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Verified Android APK
                        <select
                          value={selected.fileId || ""}
                          onChange={(e) =>
                            setSelected({ ...selected, fileId: e.target.value })
                          }
                        >
                          <option value="">No APK · announcement only</option>
                          {files
                            .filter(
                              (f) => f.mime.includes("android") && f.verified,
                            )
                            .map((f) => (
                              <option value={f.id} key={f.id}>
                                {f.originalName}
                              </option>
                            ))}
                        </select>
                      </label>
                      <p>
                        “Released” publication requires a scanned APK signed
                        with the configured official certificate. No download
                        link appears for planned releases.
                      </p>
                    </>
                  )}
                  <label>
                    Publication status
                    <select
                      value={selected.status || selected.publicationStatus}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [tab === "announcements"
                            ? "status"
                            : "publicationStatus"]: e.target.value,
                        })
                      }
                    >
                      {["Draft", "Published", "Archived"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <div className="actions">
                    <button className="button primary" disabled={busy}>
                      Save{" "}
                      {selected.status === "Published" ||
                      selected.publicationStatus === "Published"
                        ? "and publish"
                        : "changes"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setSelected(null)}
                    >
                      Cancel
                    </button>
                    {selected.id && (
                      <button
                        className="button secondary danger"
                        type="button"
                        onClick={() => remove(tab, selected.id)}
                      >
                        Delete record
                      </button>
                    )}
                  </div>
                </form>
                <div className="admin-preview">
                  <p className="eyebrow">
                    PUBLIC CONTENT PREVIEW · NOT YET SAVED
                  </p>
                  {(selected.imagePath || selected.iconPath) && (
                    <img
                      alt="Content preview"
                      src={selected.imagePath || selected.iconPath}
                    />
                  )}
                  <h3>{selected.title || selected.applicationName}</h3>
                  <p className="preserve">{selected.description}</p>
                  {selected.releaseStatus && (
                    <span className="tag">{selected.releaseStatus}</span>
                  )}
                </div>
              </section>
            )}
            <section className="admin-panel">
              <h2>Private file library</h2>
              <p>
                Images: JPEG, PNG or WebP, up to 5 MB. APK: up to 50 MB, with
                malware scan and official signature verification. Files stay
                private until referenced by published content.
              </p>
              <label className="button secondary" style={{ marginTop: 16 }}>
                <Upload size={16} />
                Upload file
                <input
                  aria-label="Upload official file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.apk"
                  disabled={busy}
                  onChange={upload}
                  style={{ maxWidth: 230 }}
                />
              </label>
              {files.map((f) => (
                <div className="file-row" key={f.id}>
                  <div>
                    <strong>{f.originalName}</strong>
                    <p>
                      {(f.size / 1024).toFixed(1)} KB · {f.verificationNote}
                    </p>
                    <code>SHA-256: {f.checksum}</code>
                  </div>
                  <a
                    className="button secondary"
                    href={`/api/media/${f.id}`}
                    target="_blank"
                  >
                    View
                  </a>
                  <button
                    className="button secondary danger"
                    onClick={async () => {
                      if (!confirm("Permanently remove this file?")) return;
                      try {
                        const response = await fetch(`/api/media/${f.id}`, {
                          method: "DELETE",
                        });
                        if (!response.ok)
                          throw new Error((await response.json()).error);
                        setFiles(await api("files"));
                        alert("File removed.");
                      } catch (e) {
                        alert((e as Error).message, true);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
        {tab === "settings" && data && (
          <section className="admin-panel">
            <h2>Approved public information</h2>
            <p className="admin-settings-note">
              Blank fields use the company information supplied by the client.
              Original branding assets are protected and cannot be removed here.
            </p>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                void save(
                  "settings",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              {[
                "companyDescription",
                "officeAddress",
                "contactEmail",
                "contactPhone",
                "maintenanceNotice",
                "seoTitle",
                "seoDescription",
                "footerInformation",
              ].map((key) => (
                <label key={key}>
                  {human(key)}
                  {[
                    "companyDescription",
                    "officeAddress",
                    "seoDescription",
                    "footerInformation",
                  ].includes(key) ? (
                    <textarea
                      name={key}
                      defaultValue={data[key] || ""}
                      maxLength={3000}
                      rows={3}
                    />
                  ) : (
                    <input
                      name={key}
                      defaultValue={data[key] || ""}
                      maxLength={3000}
                      type={key === "contactEmail" ? "email" : "text"}
                    />
                  )}
                </label>
              ))}
              <button className="button primary" disabled={busy}>
                Save website settings
              </button>
            </form>
          </section>
        )}
        {tab === "logs" && data && (
          <section className="admin-panel">
            <h2>Latest administrative activity</h2>
            <p className="admin-meta">
              Most recent 200 events. Audit records are retained in the
              database.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Administrator</th>
                    <th>Action</th>
                    <th>Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((l: Row) => (
                    <tr key={l.id}>
                      <td>{date(l.timestamp)}</td>
                      <td>{l.administrator.email}</td>
                      <td>{l.action}</td>
                      <td>
                        {l.entityType}
                        <small>{l.entityId}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.length && (
              <Empty text="No recorded administrative actions." />
            )}
          </section>
        )}
        {tab === "backup" && (
          <section className="admin-panel">
            <h2>Database and file backup</h2>
            <p>
              Download an authenticated backup containing a consistent SQLite
              snapshot, stored application files and a timestamped SHA-256
              manifest. Database integrity and file checksums are checked before
              download.
            </p>
            <p style={{ marginTop: 15 }}>
              Pause administrative writes while creating the backup to keep
              uploaded-file metadata consistent. Keep the archive encrypted and
              access restricted; it includes corporate inquiries and
              administrator password hashes.
            </p>
            <button
              className="button primary"
              disabled={busy}
              style={{ marginTop: 24 }}
              onClick={() =>
                download("backup", `jazba-backup-${day(new Date())}.tar.gz`)
              }
            >
              <Download size={16} />
              Download verified backup
            </button>
            <h3 style={{ marginTop: 30 }}>Restore process</h3>
            <p>
              Stop the application, extract into a private folder, run{" "}
              <code>node scripts/verify-backup.mjs &lt;folder&gt;</code>, then
              replace the database and storage directory. Restart, revoke old
              sessions, and verify access. Detailed steps and scheduled backup
              instructions are in the repository README.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="admin-login">
      <div>
        <Brand />
        <h1>Jazba Command Centre</h1>
        <p>Private administrator access</p>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                  Object.fromEntries(new FormData(e.currentTarget)),
                ),
              });
              const v = await r.json();
              if (!r.ok) throw new Error(v.error);
              await onLogin();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Administrator email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in securely"}
            <ArrowUpRight size={16} />
          </button>
        </form>
        <a href="/" className="login-back">
          Return to the website
        </a>
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="admin-empty">{text}</div>;
}
function human(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (v) => v.toUpperCase());
}
function MetricList({ rows }: { rows: Row[] }) {
  return rows.length ? (
    <div className="metric-list">
      {rows.map((r) => (
        <div key={r.name}>
          <span>{r.name}</span>
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  ) : (
    <Empty text="No data recorded for this period." />
  );
}
function ImageSelect({
  files,
  label,
  value,
  onChange,
}: {
  files: Row[];
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">No image</option>
        {files
          .filter((f) => f.mime.startsWith("image/"))
          .map((f) => (
            <option value={`/api/media/${f.id}`} key={f.id}>
              {f.originalName}
            </option>
          ))}
      </select>
    </label>
  );
}
