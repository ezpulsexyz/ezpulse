import { useTerminalContext } from "../TerminalContext";
import { MarketSection } from "./MarketSection";
import { SignalsSection } from "./SignalsSection";
import { ProjectsSection } from "./ProjectsSection";
import { RecordSection } from "./RecordSection";
import { ThesisSection } from "./ThesisSection";
import { WatchlistSection } from "./WatchlistSection";
import { IndexesSection } from "./IndexesSection";
import { PortfolioSection } from "./PortfolioSection";
import { SmartSection } from "./SmartSection";

const SECTIONS = {
  market: MarketSection,
  signals: SignalsSection,
  projects: ProjectsSection,
  record: RecordSection,
  thesis: ThesisSection,
  watchlist: WatchlistSection,
  indexes: IndexesSection,
  portfolio: PortfolioSection,
  smart: SmartSection,
} as const;

export function SectionRouter() {
  const { section } = useTerminalContext();
  const Section = SECTIONS[section];
  return (
    <main key={section} className="term-safe-x animate-fade-up px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      <Section />
    </main>
  );
}
