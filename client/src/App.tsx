import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import QuotesList from "@/pages/quotes-list";
import ProjectInfo from "@/pages/project-info";
import Scope from "@/pages/scope";
import Estimate from "@/pages/estimate";
import Print from "@/pages/print";
import Agreement from "@/pages/agreement";
import AdminRates from "@/pages/admin/rates";
import AdminTemplates from "@/pages/admin/templates";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={() => <Redirect to="/quotes" />} />
          <Route path="/dashboard" component={() => <Redirect to="/quotes" />} />
          <Route path="/quotations" component={() => <Redirect to="/quotes" />} />
          <Route path="/quotes" component={QuotesList} />
          <Route path="/quotation/:id/info" component={ProjectInfo} />
          <Route path="/quotation/:id/scope" component={Scope} />
          <Route path="/quotation/:id/estimate" component={Estimate} />
          <Route path="/quotation/:id/print" component={Print} />
          <Route path="/quotation/:id/agreement" component={Agreement} />
          <Route path="/admin/rates" component={AdminRates} />
          <Route path="/admin/templates" component={AdminTemplates} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
