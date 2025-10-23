import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, TrendingUp, TrendingDown, DollarSign, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Project {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  contractAmount: string;
  totalExpenses: string;
  profitLoss: string;
  status: string;
  startDate: string | null;
  quotation?: {
    quoteId: string;
  };
  expenses?: any[];
}

const newProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(200),
  clientName: z.string().min(1, "Client name is required").max(200),
  projectAddress: z.string().optional(),
  contractAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  notes: z.string().optional(),
});

type NewProjectData = z.infer<typeof newProjectSchema>;

export default function ProjectsList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<NewProjectData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      projectName: "",
      clientName: "",
      projectAddress: "",
      contractAmount: "",
      notes: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: NewProjectData) => {
      return await apiRequest("/api/projects", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create project",
      });
    },
  });

  const handleSubmit = (data: NewProjectData) => {
    createProjectMutation.mutate(data);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "on-hold":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const totalStats = projects.reduce(
    (acc, project) => {
      const contract = parseFloat(project.contractAmount || "0");
      const expenses = parseFloat(project.totalExpenses || "0");
      const profit = parseFloat(project.profitLoss || "0");

      return {
        totalRevenue: acc.totalRevenue + contract,
        totalExpenses: acc.totalExpenses + expenses,
        totalProfit: acc.totalProfit + profit,
      };
    },
    { totalRevenue: 0, totalExpenses: 0, totalProfit: 0 },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <DashboardTabs />

      <main className="flex-1 container-trecasa py-6 lg:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Projects & Expense Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor project profitability and expenses</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{projects.length} projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalStats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(totalStats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStats.totalProfit >= 0 ? "Profit" : "Loss"}
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Projects List */}
        {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Projects are automatically created when you approve a quotation.
            </p>
            <Link href="/quotes">
              <Button data-testid="button-view-quotes">View Quotations</Button>
            </Link>
          </CardContent>
        </Card>
        ) : (
          <div className="space-y-4">
          {projects.map((project) => {
            const profitLoss = parseFloat(project.profitLoss || "0");
            const isProfitable = profitLoss >= 0;

            return (
              <Card key={project.id} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-lg font-semibold"
                          data-testid={`text-project-name-${project.id}`}
                        >
                          {project.projectName}
                        </h3>
                        <Badge
                          className={getStatusColor(project.status)}
                          data-testid={`badge-status-${project.id}`}
                        >
                          {project.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Project ID:</span>
                          <span className="font-mono">{project.projectId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Client:</span>
                          <span>{project.clientName}</span>
                        </div>
                        {project.quotation && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Quote ID:</span>
                            <Link href={`/estimate/${project.quotation.quoteId}`}>
                              <span className="font-mono text-primary hover:underline cursor-pointer">
                                {project.quotation.quoteId}
                              </span>
                            </Link>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Expenses:</span>
                          <span>{project.expenses?.length || 0} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Contract</div>
                        <div
                          className="text-lg font-semibold"
                          data-testid={`text-contract-${project.id}`}
                        >
                          {formatCurrency(project.contractAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Profit/Loss</div>
                        <div
                          className={`text-lg font-semibold ${isProfitable ? "text-green-600" : "text-red-600"}`}
                          data-testid={`text-profit-loss-${project.id}`}
                        >
                          {isProfitable ? "+" : ""}
                          {formatCurrency(profitLoss)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="default" data-testid={`button-view-project-${project.id}`}>
                        View Details & Expenses
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}
      </main>

      <AppFooter />

      {/* New Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Manually create a new project. You can also create projects from approved quotations.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Villa Renovation"
                        {...field}
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Mr. John Doe"
                        {...field}
                        data-testid="input-client-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 123 Main St, Bangalore"
                        {...field}
                        data-testid="input-project-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g., 500000"
                        {...field}
                        data-testid="input-contract-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        {...field}
                        data-testid="input-project-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  data-testid="button-submit-project"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
