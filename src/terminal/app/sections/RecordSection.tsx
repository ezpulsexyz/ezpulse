import { useTerminalContext } from "../TerminalContext";
import { TrackRecord } from "../components/TrackRecord";

export function RecordSection() {
  const { feed, openToken } = useTerminalContext();
  return <TrackRecord onOpen={(ca) => { const c = feed.find((x) => x.ca === ca); if (c) openToken(c); }} />;
}
