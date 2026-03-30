import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <AnalyticsDashboard role={"sports-ambassador"} />
      </div>
    </div>
  );
}
