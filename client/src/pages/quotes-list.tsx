import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, FileText, Layers, Calculator, Printer, LogOut, Archive, Download, Settings, LayoutTemplate, Tag, Paintbrush, Sliders, History, Trash2, TrendingUp, Briefcase, Building2, Copy, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import type { Quotation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { formatINR, safeN } from "@/lib/money";
import { NewQuotationDialog } from "@/components/new-quotation-dialog";

export default function QuotesList() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showNewQuotationDialog, setShowNewQuotationDialog] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      await apiRequest("DELETE", `/api/quotations/${quotationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Quotation Deleted",
        description: "The quotation has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const response = await apiRequest("POST", `/api/quotations/${quotationId}/duplicate`, {});
      return response.json();
    },
    onSuccess: (data: Quotation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Quotation Duplicated",
        description: `Created duplicate with Quote ID: ${data.quoteId}`,
      });
      navigate(`/quotation/${data.id}/info`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to duplicate quotation",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground border-muted-foreground/20";
      case "sent":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "accepted":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/20";
    }
  };

  const getQuoteTotal = (quotation: Quotation): string => {
    // Always show grand subtotal (without GST)
    return formatINR(safeN(quotation.totals?.grandSubtotal));
  };

  const getDaysSince = (date: string | Date): number => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getFollowUpStatus = (quotation: Quotation): { needsFollowUp: boolean; message: string; urgency: 'low' | 'medium' | 'high' } => {
    const daysSinceUpdated = getDaysSince(quotation.updatedAt!);
    const daysSinceCreated = getDaysSince(quotation.createdAt!);
    
    // For sent quotations, use updatedAt as proxy for when it was sent
    if (quotation.status === "sent") {
      if (daysSinceUpdated >= 7) {
        return { needsFollowUp: true, message: `${daysSinceUpdated}d awaiting response`, urgency: 'high' };
      } else if (daysSinceUpdated >= 3) {
        return { needsFollowUp: true, message: `${daysSinceUpdated}d awaiting response`, urgency: 'medium' };
      } else {
        return { needsFollowUp: false, message: `${daysSinceUpdated}d ago`, urgency: 'low' };
      }
    }
    
    if (quotation.status === "draft" && daysSinceCreated >= 14) {
      return { needsFollowUp: true, message: `Draft ${daysSinceCreated}d old`, urgency: 'medium' };
    }
    
    return { needsFollowUp: false, message: '', urgency: 'low' };
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Navigation Bar with User Menu */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/change-orders")} data-testid="button-change-orders">
                <FileText className="mr-2 h-4 w-4" />
                <span>Change Orders</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/projects")} data-testid="button-projects">
                <Briefcase className="mr-2 h-4 w-4" />
                <span>Projects & Expenses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/business-expenses")} data-testid="button-business-expenses">
                <Building2 className="mr-2 h-4 w-4" />
                <span>Business Expenses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/analytics")} data-testid="button-analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Business Insights</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/rates")} data-testid="button-admin-rates">
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin - Rates</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/templates")} data-testid="button-admin-templates">
                <LayoutTemplate className="mr-2 h-4 w-4" />
                <span>Admin - Templates</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/brands")} data-testid="button-admin-brands">
                <Tag className="mr-2 h-4 w-4" />
                <span>Admin - Brands & Add-ons</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/painting-fc")} data-testid="button-admin-painting-fc">
                <Paintbrush className="mr-2 h-4 w-4" />
                <span>Admin - Painting & FC</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/global-rules")} data-testid="button-admin-global-rules">
                <Sliders className="mr-2 h-4 w-4" />
                <span>Admin - Global Rules</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/audit")} data-testid="button-admin-audit">
                <History className="mr-2 h-4 w-4" />
                <span>Admin - Audit Log</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/api/logout" className="cursor-pointer" data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Quotations</h2>
              <p className="text-muted-foreground mt-1">Manage your interior design quotations</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = '/api/backup/all-data';
                }}
                data-testid="button-download-all-data"
              >
                <Download className="mr-2 h-4 w-4" />
                Download All Data
              </Button>
              <Button
                onClick={() => setShowNewQuotationDialog(true)}
                data-testid="button-new-quotation"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Quotation
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : quotations && quotations.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total (₹)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id} data-testid={`quote-row-${quotation.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`quote-id-${quotation.id}`}>
                        {quotation.quoteId}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-project-name-${quotation.id}`}>
                        {quotation.projectName}
                      </TableCell>
                      <TableCell data-testid={`text-client-name-${quotation.id}`}>
                        {quotation.clientName}
                      </TableCell>
                      <TableCell data-testid={`text-category-${quotation.id}`}>
                        {quotation.projectType || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(quotation.status)} data-testid={`status-${quotation.id}`}>
                            {quotation.status}
                          </Badge>
                          {(() => {
                            const followUp = getFollowUpStatus(quotation);
                            if (followUp.needsFollowUp) {
                              return (
                                <div className="flex items-center gap-1" title={followUp.message}>
                                  {followUp.urgency === 'high' ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" data-testid={`alert-high-${quotation.id}`} />
                                  ) : (
                                    <Clock className="h-4 w-4 text-orange-500" data-testid={`alert-medium-${quotation.id}`} />
                                  )}
                                  <span className="text-xs text-muted-foreground">{followUp.message}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold" data-testid={`total-${quotation.id}`}>
                        {getQuoteTotal(quotation)}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-created-${quotation.id}`}>
                        {new Date(quotation.createdAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => duplicateMutation.mutate(quotation.id)}
                            disabled={duplicateMutation.isPending}
                            title="Duplicate quotation"
                            data-testid={`button-duplicate-${quotation.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${quotation.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => navigate(`/quotation/${quotation.id}/info`)}
                              data-testid={`action-edit-${quotation.id}`}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View/Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate(`/quotation/${quotation.id}/scope`)}
                              data-testid={`action-scope-${quotation.id}`}
                            >
                              <Layers className="mr-2 h-4 w-4" />
                              Scope
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate(`/quotation/${quotation.id}/estimate`)}
                              data-testid={`action-estimate-${quotation.id}`}
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              Estimate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigate(`/quotation/${quotation.id}/print`)}
                              data-testid={`action-print-${quotation.id}`}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Print
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                window.location.href = `/api/quotations/${quotation.id}/backup/download`;
                              }}
                              data-testid={`action-backup-${quotation.id}`}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Download Backup ZIP
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                  data-testid={`action-delete-${quotation.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete quotation "{quotation.quoteId}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`cancel-delete-${quotation.id}`}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(quotation.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`confirm-delete-${quotation.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No quotations yet</h3>
                <p className="text-muted-foreground mb-6">Get started by creating your first quotation</p>
                <Button
                  onClick={() => setShowNewQuotationDialog(true)}
                  data-testid="button-create-first"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Quotation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AppFooter />

      <NewQuotationDialog
        open={showNewQuotationDialog}
        onOpenChange={setShowNewQuotationDialog}
        onSuccess={(quotation) => navigate(`/quotation/${quotation.id}/info`)}
      />
    </div>
  );
}
