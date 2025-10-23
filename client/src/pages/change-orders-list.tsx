import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreVertical, FileText, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { ChangeOrder, Quotation } from "@shared/schema";
import { formatINR } from "@shared/formatters";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { safeN } from "@/lib/money";

export default function ChangeOrdersList() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChangeOrderId, setSelectedChangeOrderId] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  const { data: changeOrders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/change-orders"],
    enabled: isAuthenticated,
  });

  // Fetch quotations for selection
  const { data: quotations } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    enabled: isAuthenticated && createDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuotationId || !title.trim()) {
        throw new Error("Please select a quotation and enter a title");
      }

      const response = await apiRequest("POST", "/api/change-orders", {
        quotationId: selectedQuotationId,
        title: title.trim(),
        description: description.trim(),
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change Order Created",
        description: "The change order has been successfully created.",
      });
      setCreateDialogOpen(false);
      setSelectedQuotationId("");
      setTitle("");
      setDescription("");
      // Navigate to the new change order
      navigate(`/change-orders/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create change order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (changeOrderId: string) => {
      await apiRequest("DELETE", `/api/change-orders/${changeOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change Order Deleted",
        description: "The change order has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedChangeOrderId(null);
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
        description: "Failed to delete change order",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (changeOrderId: string) => {
    setSelectedChangeOrderId(changeOrderId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedChangeOrderId) {
      deleteMutation.mutate(selectedChangeOrderId);
    }
  };

  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    createMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-gray-500" },
      sent: { label: "Sent", className: "bg-blue-500" },
      approved: { label: "Approved", className: "bg-green-500" },
      rejected: { label: "Rejected", className: "bg-red-500" },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateTotal = (co: ChangeOrder) => {
    const subtotal = safeN(co.totals?.grandSubtotal);
    const discountType = co.discountType || "percent";
    const discountValue = safeN(co.discountValue);

    let discountAmount = 0;
    if (discountType === "percent") {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    const afterDiscount = subtotal - discountAmount;
    const gstAmount = (afterDiscount * 18) / 100;
    const total = afterDiscount + gstAmount;

    return total;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading change orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <DashboardTabs />

      <main className="flex-1 container-trecasa py-6 lg:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-change-orders">
              Change Orders
            </h1>
            <p className="text-muted-foreground">Manage project modifications and additions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateClick} data-testid="button-create-change-order">
              <Plus className="w-4 h-4 mr-2" />
              New Change Order
            </Button>
            <Button
              onClick={() => navigate("/quotes")}
              variant="outline"
              data-testid="button-back-to-quotes"
            >
              Back to Quotes
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {!changeOrders || changeOrders.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Change Orders</h3>
                <p className="text-muted-foreground mb-6">
                  Create change orders from your quotations to track project modifications
                </p>
                <Button onClick={handleCreateClick} data-testid="button-create-first-change-order">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Change Order
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CO ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeOrders.map((co) => (
                    <TableRow
                      key={co.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/change-orders/${co.id}`)}
                      data-testid={`row-change-order-${co.id}`}
                    >
                      <TableCell className="font-mono text-sm" data-testid={`text-co-id-${co.id}`}>
                        {co.changeOrderId}
                      </TableCell>
                      <TableCell data-testid={`text-title-${co.id}`}>{co.title}</TableCell>
                      <TableCell
                        className="font-mono text-sm"
                        data-testid={`text-quote-id-${co.id}`}
                      >
                        {co.quotation?.quoteId || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(co.status)}</TableCell>
                      <TableCell data-testid={`text-created-${co.id}`}>
                        {formatDate(co.createdAt?.toString())}
                      </TableCell>
                      <TableCell
                        className="text-right font-semibold"
                        data-testid={`text-amount-${co.id}`}
                      >
                        {formatINR(calculateTotal(co))}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-menu-${co.id}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/change-orders/${co.id}`)}
                              data-testid={`menu-edit-${co.id}`}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(co.id)}
                              className="text-destructive"
                              data-testid={`menu-delete-${co.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <AppFooter />

      {/* Create Change Order Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-change-order">
          <DialogHeader>
            <DialogTitle>Create Change Order</DialogTitle>
            <DialogDescription>
              Add a change order to track modifications to an existing quotation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quotation">Select Quotation</Label>
              <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                <SelectTrigger id="quotation" data-testid="select-quotation">
                  <SelectValue placeholder="Choose a quotation" />
                </SelectTrigger>
                <SelectContent>
                  {quotations?.map((quote) => (
                    <SelectItem
                      key={quote.id}
                      value={quote.id}
                      data-testid={`option-quotation-${quote.id}`}
                    >
                      {quote.quoteId} - {quote.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Additional Kitchen Cabinets"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Detailed explanation of changes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="textarea-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!selectedQuotationId || !title.trim() || createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Change Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the change order and all
              its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
