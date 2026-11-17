import { db } from "./db";
export async function insights(from: Date, to: Date) {
  const [views, visitors, messages] = await Promise.all([
    db.pageView.findMany({
      where: { timestamp: { gte: from, lte: to } },
      select: { timestamp: true, pagePath: true, visitorSessionId: true },
    }),
    db.visitorSession.findMany({
      where: { pageViews: { some: { timestamp: { gte: from, lte: to } } } },
      select: {
        id: true,
        deviceType: true,
        browserType: true,
        operatingSystem: true,
        referralSource: true,
        firstSeenAt: true,
        lastSeenAt: true,
        visits: true,
      },
    }),
    db.corporateMessage.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
  ]);
  const date = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  const days: Record<
    string,
    { date: string; views: number; inquiries: number }
  > = {};
  for (let t = +from; t <= +to; t += 86400000) {
    const key = date(new Date(t));
    days[key] = { date: key, views: 0, inquiries: 0 };
  }
  for (const v of views) {
    const k = date(v.timestamp);
    days[k] ??= { date: k, views: 0, inquiries: 0 };
    days[k].views++;
  }
  for (const m of messages) {
    const k = date(m.createdAt);
    days[k] ??= { date: k, views: 0, inquiries: 0 };
    days[k].inquiries++;
  }
  const group = (values: string[]) =>
    Object.entries(
      values.reduce(
        (acc, v) => {
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    )
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  return {
    pageViews: views.length,
    uniqueVisitors: visitors.length,
    returningVisitors: visitors.filter(
      (v) => v.firstSeenAt < from || v.visits > 1,
    ).length,
    averageObservedSeconds: visitors.length
      ? Math.round(
          visitors.reduce(
            (sum, v) =>
              sum + Math.min(1800, (+v.lastSeenAt - +v.firstSeenAt) / 1000),
            0,
          ) / visitors.length,
        )
      : 0,
    traffic: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)),
    devices: group(visitors.map((v) => v.deviceType)),
    browsers: group(visitors.map((v) => v.browserType)),
    systems: group(visitors.map((v) => v.operatingSystem)),
    referrers: group(visitors.map((v) => v.referralSource)),
    pages: group(views.map((v) => v.pagePath)),
    inquiries: messages.length,
  };
}
