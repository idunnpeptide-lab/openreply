import TrendWatchSubnav from "@/components/trend-watch-subnav";
import TrendWatchHeader from "@/components/trend-watch-header";

export default function TrendWatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <TrendWatchHeader />

      <TrendWatchSubnav />
      {children}
    </div>
  );
}
