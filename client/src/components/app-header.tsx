import { useLocation } from "wouter";
import logoPath from "@assets/trecasa-logo.png";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RedDot } from "@/components/ui/red-dot";

export function AppHeader() {
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
    <header className="w-full">
      {/* Brand Bar */}
      <div style={{ backgroundColor: "#154734" }}>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <img src={logoPath} alt="TRECASA Logo" className="h-12 md:h-14" />
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide flex items-center">
                TRECASA DESIGN STUDIO
                <RedDot size="md" className="translate-y-[-0.3em]" />
              </h1>
            </div>
            <p
              className="text-sm md:text-base font-light tracking-wider"
              style={{ color: "#C7A948" }}
            >
              Luxury Interiors | Architecture | Build
            </p>
          </div>
        </div>
        <div className="w-full h-[2px]" style={{ backgroundColor: "#C7A948" }} />
      </div>

      {/* Navigation Tabs */}
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
    </header>
  );
}
