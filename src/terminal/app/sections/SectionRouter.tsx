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
import { FeatureBoard } from "./FeatureBoard";

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
  roadmap: FeatureBoard,
} as const;

export function SectionRouter() {
  const { section } = useTerminalContext();
  const Section = SECTIONS[section as keyof typeof SECTIONS] || MarketSection;
  return (
    <main key={section} className="term-safe-x min-w-0 max-w-full overflow-x-clip px-2 py-3 sm:px-3 sm:py-4 lg:px-5">
      <Section />
    </main>
  );
}
