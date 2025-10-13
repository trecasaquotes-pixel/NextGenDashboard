import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, FileText, Layers, Calculator, Printer, LogOut } from "lucide-react";
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

export default function QuotesList() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/quotations", {
        projectName: "New Project",
        projectType: "Villa",
        clientName: "Client Name",
        clientPhone: "",
        projectAddress: "",
        status: "draft",
      });
      const newQuotation = await response.json();
      return newQuotation;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
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
        description: "Failed to create quotation",
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

  const calculateFinalTotal = (quotation: Quotation): number => {
    const grandSubtotal = safeN(quotation.totals?.grandSubtotal);
    const discountValue = safeN(quotation.discountValue);
    const discountType = quotation.discountType || "percent";

    // Calculate discount amount
    const discountAmount = discountType === "percent" 
      ? (grandSubtotal * discountValue) / 100 
      : discountValue;

    // Calculate discounted amount (prevent negative)
    const discounted = Math.max(0, grandSubtotal - discountAmount);

    // Calculate GST (18%)
    const gstAmount = discounted * 0.18;

    // Calculate final total
    return discounted + gstAmount;
  };

  const getQuoteTotal = (quotation: Quotation): string => {
    // If discount is applied, show final total with GST
    if (quotation.discountValue && safeN(quotation.discountValue) > 0) {
      return formatINR(calculateFinalTotal(quotation));
    }
    // Otherwise show grand subtotal
    return formatINR(safeN(quotation.totals?.grandSubtotal));
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
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-new-quotation"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Button>
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
                      <TableCell className="font-medium">{quotation.projectName}</TableCell>
                      <TableCell>{quotation.clientName}</TableCell>
                      <TableCell>{quotation.projectType || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(quotation.status)} data-testid={`status-${quotation.id}`}>
                          {quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold" data-testid={`total-${quotation.id}`}>
                        {getQuoteTotal(quotation)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(quotation.createdAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
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
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
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
    </div>
  );
}
