import TrendWatchSubnav from "@/components/trend-watch-subnav";
import TrendWatchHeader from "@/components/trend-watch-header";

export default function TrendWatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="trendwatch-theme -m-4 min-h-[calc(100vh-4rem)] space-y-5 bg-[#0b0c10] p-4 sm:-m-6 sm:p-6">
      <TrendWatchHeader />
      <TrendWatchSubnav />
      {children}
    </div>
  );
}
