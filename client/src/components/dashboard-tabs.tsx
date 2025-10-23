import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DashboardTabs() {
  const [location, navigate] = useLocation();

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (location.startsWith("/change-orders")) return "change-orders";
    if (location.startsWith("/projects") || location.startsWith("/business-expenses"))
      return "projects";
    if (location.startsWith("/analytics")) return "business";
    return "projects"; // Default to Projects & Expenses
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    switch (value) {
      case "change-orders":
        navigate("/change-orders");
        break;
      case "projects":
        navigate("/projects");
        break;
      case "business":
        navigate("/analytics");
        break;
    }
  };

  return (
    <div className="border-b bg-background">
      <div className="container-trecasa">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 h-12">
            <TabsTrigger
              value="change-orders"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              data-testid="tab-change-orders"
            >
              Change Orders
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              data-testid="tab-projects"
            >
              Projects & Expenses
            </TabsTrigger>
            <TabsTrigger
              value="business"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              data-testid="tab-business"
            >
              Business & Insights
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
