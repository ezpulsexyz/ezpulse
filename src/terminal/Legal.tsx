const BLUE = "#2743f0";

export type LegalPage = "terms" | "privacy" | "disclaimer" | "cookies";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 text-xl font-semibold tracking-tight text-zinc-900 first:mt-0">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[14px] leading-relaxed text-zinc-600">{children}</p>;
}
function Li({ items }: { items: string[] }) {
  return (
    <ul className="mb-3 space-y-1.5">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-zinc-600">
          <span className="mt-0.5 text-indigo-400">·</span>{i}
        </li>
      ))}
    </ul>
  );
}

function Shell({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <div className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BLUE }}>{kicker}</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[13px] text-zinc-400">Effective February 2026 · ezpulse.xyz</p>
      </div>
      {children}
    </section>
  );
}

export default function Legal({ page }: { page: LegalPage }) {
  if (page === "terms") return (
    <Shell kicker="Legal" title="Terms of Service">
      <H2>1 · The service</H2>
      <P>ezpulse ("we") is an independent analytics and research platform for tokens launched on the EasyA Kickstart launchpad, operated at ezpulse.xyz. We display live market data, automated signals, and research tools. We do not operate a launchpad, custody assets, execute trades, or offer brokerage services of any kind.</P>

      <H2>2 · No affiliation</H2>
      <P>Pulse is not affiliated with, endorsed by, or operated by EasyA or EasyA Kickstart. "EasyA" and "Kickstart" are referenced solely to identify the ecosystem whose public on-chain data we analyze. Token launches shown here are governed by <a href="https://kickstart.easya.io/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-800">Kickstart's own terms</a>.</P>

      <H2>3 · Acceptable use</H2>
      <Li items={[
        "Don't scrape, resell, or redistribute the platform's output at scale without permission.",
        "Don't use the platform to manipulate markets, coordinate pumps, or mislead other participants.",
        "Don't probe, disrupt, or reverse-engineer the service infrastructure.",
        "Do use the data for your own research, content, and investment decisions — that's what it's for.",
      ]} />

      <H2>4 · No advice, no fiduciary duty</H2>
      <P>Nothing on ezpulse constitutes investment, financial, legal, or tax advice, or an offer or solicitation to buy or sell any asset. Signals, AI reads, indexes and rankings are automated interpretations of public data. We owe you no fiduciary duty. You alone are responsible for your decisions.</P>

      <H2>5 · Data accuracy</H2>
      <P>Market data is sourced from third-party public APIs (primarily DexScreener) and public blockchains. It may be delayed, incomplete, or wrong. We verify listing eligibility (the …EASY contract fingerprint) but cannot verify the conduct of any project or founder. The service is provided as-is, without warranty of any kind.</P>

      <H2>6 · Limitation of liability</H2>
      <P>To the maximum extent permitted by law, our total liability arising from your use of the service is limited to the amount you paid us — which, while Pulse is free, is zero. We are not liable for trading losses, data errors, downtime, or the actions of any project listed here.</P>

      <H2>7 · Changes</H2>
      <P>We may update these terms; material changes will be posted on this page with a new effective date. Continued use after changes constitutes acceptance.</P>

      <H2>8 · Contact</H2>
      <P>Questions: <a href="mailto:contact@ezpulse.xyz" className="font-semibold text-indigo-600 hover:text-indigo-800">contact@ezpulse.xyz</a></P>
    </Shell>
  );

  if (page === "privacy") return (
    <Shell kicker="Legal" title="Privacy Policy">
      <H2>The short version</H2>
      <P>ezpulse is built to know as little about you as possible. No account is required, no personal data is collected to browse, and your watchlist never leaves your device.</P>

      <H2>1 · What we store — and where</H2>
      <Li items={[
        "Watchlist and alert preferences: stored only in your browser's local storage. They never reach our servers — clearing your browser data deletes them permanently.",
        "Wallet addresses: if you use the wallet-connect preview, the address is held in memory for your session only and is not transmitted or persisted.",
        "Nothing else. No names, no emails, no accounts, no tracking profiles.",
      ]} />

      <H2>2 · Third-party data requests</H2>
      <P>Your browser fetches live market data directly from the DexScreener public API. That request exposes your IP address to DexScreener, as with any website you visit — their <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-800">privacy practices</a> govern that traffic. We do not proxy, log, or enrich it.</P>

      <H2>3 · Analytics</H2>
      <P>If we add analytics, it will be cookie-less and aggregate-only (page views, referrers, country). No cross-site tracking, no advertising identifiers, no fingerprinting — and this policy will be updated first.</P>

      <H2>4 · What we never do</H2>
      <Li items={[
        "Sell or rent any data — we don't have data worth selling.",
        "Track your trades or link wallets to identities.",
        "Use advertising cookies or third-party trackers.",
      ]} />

      <H2>5 · Your rights</H2>
      <P>Since we hold no personal data server-side, deletion is in your hands: clear your browser's local storage. For anything else, email <a href="mailto:contact@ezpulse.xyz" className="font-semibold text-indigo-600 hover:text-indigo-800">contact@ezpulse.xyz</a> — we respond within 30 days.</P>
    </Shell>
  );

  if (page === "disclaimer") return (
    <Shell kicker="Legal" title="Disclaimer">
      <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/60 p-5">
        <p className="text-[14px] font-semibold leading-relaxed text-red-800">
          Idea-coins launched on permissionless launchpads are among the most speculative assets that exist. Many will go to zero. Never invest money you cannot afford to lose entirely.
        </p>
      </div>

      <H2>1 · Not investment advice</H2>
      <P>Nothing on ezpulse — including signals, AI reads, conviction scores, indexes, rankings, or any other output — is investment advice or a recommendation to buy, sell, or hold any asset. All outputs are automated interpretations of public market data, generated without knowledge of your circumstances.</P>

      <H2>2 · Nature of the assets</H2>
      <Li items={[
        "Tokens shown here are not equity, ownership, revenue rights, or financial claims of any kind.",
        "EasyA Kickstart is a permissionless launchpad: anyone can launch, and launches are not vetted by EasyA, by Kickstart, or by us.",
        "Micro-cap tokens have thin liquidity — prices can move violently, and exits at displayed prices may be impossible.",
        "Past performance, momentum, and signals do not predict future results.",
      ]} />

      <H2>3 · Verification ≠ endorsement</H2>
      <P>Our "Verified" badge means exactly one thing: the project's X account is authorized — linked on-chain following Kickstart's address-in-bio model. It confirms the link only, not the project. It is not an audit, an endorsement, or a statement about the project's quality, legality, or the founder's intentions. Bonded status means even that link is not yet confirmed.</P>

      <H2>4 · Data limitations</H2>
      <P>All market data comes from third-party public APIs and may be delayed, incomplete, or inaccurate. Automated classification can make mistakes. Always verify the contract address independently — genuine Kickstart contracts end in <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] font-bold text-indigo-700">EASY</span> — before interacting with any token.</P>

      <H2>5 · Your responsibility</H2>
      <P>By using this site you accept that all investment decisions are yours alone, that you will do your own research, and that neither ezpulse nor its operators bear any responsibility for your outcomes. If you are in a jurisdiction where trading such assets is restricted, do not use this platform for trading decisions.</P>
    </Shell>
  );

  // cookies
  return (
    <Shell kicker="Legal" title="Cookie Policy">
      <H2>The short version</H2>
      <P>ezpulse sets <strong className="text-zinc-900">no cookies</strong>. None. This page exists so you don't have to take our word for it.</P>

      <H2>1 · What we use instead</H2>
      <P>The only browser storage we use is <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px]">localStorage</span>, for two things you explicitly create:</P>
      <Li items={[
        "easya-pulse:watchlist — the contract addresses you star",
        "easya-pulse:alerts — your alert preference toggles",
      ]} />
      <P>localStorage is not a cookie: it is never transmitted to any server, cannot be used to track you across sites, and is fully under your control. Clearing your browser data removes it instantly.</P>

      <H2>2 · No consent banner — here's why</H2>
      <P>Cookie consent banners are required for tracking technologies. Since we use no cookies, no advertising pixels, no fingerprinting and no cross-site identifiers, there is nothing to consent to — which is why you didn't see a banner.</P>

      <H2>3 · Third parties</H2>
      <P>Live market data and token images load directly from DexScreener's public API and CDN. Embedded charts on project pages are DexScreener iframes; any storage those embeds use is governed by DexScreener's own policies and is isolated from this site. We pass them no information about you.</P>

      <H2>4 · If this ever changes</H2>
      <P>If we ever introduce cookies (for example, for optional accounts), this page will list each cookie, its purpose, and its lifetime — and consent will be asked first where required. Watch this page's effective date.</P>

      <H2>Contact</H2>
      <P>Questions: <a href="mailto:contact@ezpulse.xyz" className="font-semibold text-indigo-600 hover:text-indigo-800">contact@ezpulse.xyz</a></P>
    </Shell>
  );
}
