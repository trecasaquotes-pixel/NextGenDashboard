import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import QuotesList from "@/pages/quotes-list";
import ChangeOrdersList from "@/pages/change-orders-list";
import ChangeOrderDetail from "@/pages/change-order-detail";
import ProjectsList from "@/pages/projects-list";
import ProjectDetail from "@/pages/project-detail";
import BusinessExpenses from "@/pages/business-expenses";
import Analytics from "@/pages/analytics";
import ProjectInfo from "@/pages/project-info";
import Scope from "@/pages/scope";
import Estimate from "@/pages/estimate";
import Print from "@/pages/print";
import Agreement from "@/pages/agreement";
import AdminRates from "@/pages/admin/rates";
import AdminTemplates from "@/pages/admin/templates";
import AdminTemplateEditor from "@/pages/admin/template-editor";
import AdminBrands from "@/pages/admin/brands";
import AdminPaintingFc from "@/pages/admin/painting-fc";
import AdminGlobalRules from "@/pages/admin/global-rules";
import AdminAuditLog from "@/pages/admin/audit-log";
import ClientQuotePortal from "@/pages/client-quote-portal";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Always register all routes and let each page handle auth internally
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/client/:quoteId" component={ClientQuotePortal} />
      
      {/* Protected routes - always registered, handle auth internally */}
      <Route path="/" component={() => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
        if (!isAuthenticated) return <Landing />;
        return <Redirect to="/quotes" />;
      }} />
      <Route path="/dashboard" component={() => <Redirect to="/quotes" />} />
      <Route path="/quotations" component={() => <Redirect to="/quotes" />} />
      <Route path="/quotes" component={QuotesList} />
      <Route path="/change-orders" component={ChangeOrdersList} />
      <Route path="/change-orders/:id" component={ChangeOrderDetail} />
      <Route path="/quotation/:quotationId/change-orders/new" component={ChangeOrderDetail} />
      <Route path="/projects" component={ProjectsList} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/business-expenses" component={BusinessExpenses} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/quotation/:id/info" component={ProjectInfo} />
      <Route path="/quotation/:id/scope" component={Scope} />
      <Route path="/quotation/:id/estimate" component={Estimate} />
      <Route path="/quotation/:id/print" component={Print} />
      <Route path="/quotation/:id/agreement" component={Agreement} />
      <Route path="/admin/rates" component={AdminRates} />
      <Route path="/admin/templates" component={AdminTemplates} />
      <Route path="/admin/templates/:id/edit" component={AdminTemplateEditor} />
      <Route path="/admin/brands" component={AdminBrands} />
      <Route path="/admin/painting-fc" component={AdminPaintingFc} />
      <Route path="/admin/global-rules" component={AdminGlobalRules} />
      <Route path="/admin/audit" component={AdminAuditLog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
