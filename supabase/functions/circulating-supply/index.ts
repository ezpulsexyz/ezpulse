// ezpulse · circulating supply override endpoint
// Deploy: supabase functions deploy circulating-supply --no-verify-jwt

const CORS_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type, Accept",
};

type Rec = Record<string, unknown>;

const numeric = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const supplyFrom = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = numeric(value);
    if (typeof parsed === "number") return parsed;
  }
  return undefined;
};

const normalizeRow = (row: Rec): Rec | null => {
  const ca = String(row.address ?? row.mint ?? row.ca ?? row.token ?? "").trim();
  if (!ca) return null;
  const symbol = String(row.ticker ?? row.symbol ?? row.name ?? "").trim() || undefined;
  const circulatingSupply = supplyFrom(row.circulatingSupply, row.circulating_supply, row.circSupply, row.circulating);
  const totalSupply = supplyFrom(row.totalSupply, row.total_supply, row.maxSupply, row.max_supply, row.total_supply);
  const maxSupply = supplyFrom(row.maxSupply, row.max_supply);
  if (circulatingSupply === undefined && totalSupply === undefined && maxSupply === undefined) return null;
  return {
    ca,
    symbol,
    circulatingSupply,
    totalSupply,
    maxSupply,
  };
};

async function fetchSupplyRows(): Promise<Rec[]> {
  const urls = [
    "https://datapi.jup.ag/v1/pools/toptraded/24h?launchpads=easya-kickstart",
    "https://datapi.jup.ag/v1/pools/recent?launchpads=easya-kickstart",
    "https://datapi.jup.ag/v1/pools/toptrending/24h?launchpads=easya-kickstart",
  ];

  const rowsByCa = new Map<string, Rec>();

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const pools: Rec[] = Array.isArray((data as Rec).pools) ? (data as Rec).pools as Rec[] : [];
      for (const pool of pools) {
        const asset = pool.baseAsset as Rec | undefined;
        if (!asset) continue;
        const ca = String(asset.id ?? asset.address ?? asset.mint ?? "").trim();
        if (!ca) continue;

        const entry = normalizeRow({
          ca,
          symbol: asset.symbol,
          circulatingSupply: asset.circSupply ?? asset.circulatingSupply ?? asset.circulating ?? asset.circ_supply,
          totalSupply: asset.totalSupply ?? asset.maxSupply ?? asset.total_supply ?? asset.max_supply,
          maxSupply: asset.maxSupply ?? asset.max_supply,
        });

        if (!entry) continue;
        const lower = ca.toLowerCase();
        const existing = rowsByCa.get(lower);
        if (!existing || typeof entry.circulatingSupply === "number") {
          rowsByCa.set(lower, { ...existing, ...entry });
        }
      }
    } catch {
      // ignore and try next source
    }
  }

  return [...rowsByCa.values()];
}

function matchKey(item: Rec, key: string): boolean {
  const compare = String(key).trim().toLowerCase();
  return [item.ca, item.symbol]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .some((value) => value === compare);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get("token") ?? url.searchParams.get("ca") ?? url.searchParams.get("mint") ?? "").trim();
  const overrides = await fetchSupplyRows();

  if (query) {
    const item = overrides.find((row) => matchKey(row, query));
    if (!item) {
      return new Response(JSON.stringify({ ok: false, reason: "token not found" }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return new Response(JSON.stringify(item), { status: 200, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ data: overrides }), { status: 200, headers: CORS_HEADERS });
});
