// ezpulse · Kickstart token metadata (project logos from kickstart.easya.io/token/{ca})
// Deploy: supabase functions deploy kickstart-token --no-verify-jwt

const KICKSTART_ORIGIN = "https://kickstart.easya.io";
const SAMPLE_CA = "FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY";

const CORS_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept",
};

type Rec = Record<string, unknown>;

let cachedBuildId: string | null = null;
let buildIdFetchedAt = 0;
const BUILD_ID_TTL_MS = 60 * 60 * 1000;

async function resolveBuildId(): Promise<string | null> {
  if (cachedBuildId && Date.now() - buildIdFetchedAt < BUILD_ID_TTL_MS) {
    return cachedBuildId;
  }

  try {
    const res = await fetch(`${KICKSTART_ORIGIN}/token/${SAMPLE_CA}`, {
      headers: { accept: "text/html" },
    });
    if (!res.ok) return cachedBuildId;
    const html = await res.text();
    const match = html.match(/"buildId":"([^"]+)"/);
    if (match?.[1]) {
      cachedBuildId = match[1];
      buildIdFetchedAt = Date.now();
      return cachedBuildId;
    }
  } catch {
    // keep previous build id if available
  }

  return cachedBuildId;
}

async function fetchKickstartIcon(ca: string, buildId: string): Promise<string | null> {
  try {
    const res = await fetch(`${KICKSTART_ORIGIN}/_next/data/${buildId}/token/${encodeURIComponent(ca)}.json`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Rec;
    const pageProps = data.pageProps as Rec | undefined;
    const ogToken = pageProps?.ogToken as Rec | undefined;
    const icon = ogToken?.icon;
    return typeof icon === "string" && icon.trim() ? icon.trim() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const raw =
    url.searchParams.get("cas") ??
    url.searchParams.get("ca") ??
    url.searchParams.get("mint") ??
    "";
  const cas = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (!cas.length) {
    return new Response(JSON.stringify({ ok: false, error: "missing ca/cas query param" }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const buildId = await resolveBuildId();
  if (!buildId) {
    return new Response(JSON.stringify({ ok: false, error: "kickstart build id unavailable" }), {
      status: 502,
      headers: CORS_HEADERS,
    });
  }

  const icons: Record<string, string> = {};
  await Promise.all(
    cas.map(async (ca) => {
      const icon = await fetchKickstartIcon(ca, buildId);
      if (icon) icons[ca] = icon;
    }),
  );

  return new Response(JSON.stringify({ ok: true, icons }), {
    status: 200,
    headers: { ...CORS_HEADERS, "cache-control": "public, max-age=3600" },
  });
});