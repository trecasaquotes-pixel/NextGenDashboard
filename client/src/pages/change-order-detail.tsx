import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Plus, Trash2, FileText, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatINR } from "@shared/formatters";
import { safeN } from "@/lib/money";
import type { ChangeOrder, ChangeOrderItem, Quotation } from "@shared/schema";

interface ChangeOrderItemRow extends Partial<ChangeOrderItem> {
  tempId?: string;
}

export default function ChangeOrderDetail() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/change-orders/:id");
  const [, quotationParams] = useRoute("/quotation/:quotationId/change-orders/new");
  
  const isNewChangeOrder = !match;
  const changeOrderId = params?.id;
  const quotationId = quotationParams?.quotationId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("0");
  const [items, setItems] = useState<ChangeOrderItemRow[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState(quotationId || "");

  // Fetch quotations for dropdown
  const { data: quotations } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    enabled: isAuthenticated && isNewChangeOrder,
  });

  // Fetch existing change order
  const { data: changeOrder, isLoading: coLoading } = useQuery<any>({
    queryKey: ["/api/change-orders", changeOrderId],
    enabled: isAuthenticated && !!changeOrderId,
  });

  // Load data when change order is fetched
  useEffect(() => {
    if (changeOrder) {
      setTitle(changeOrder.title || "");
      setDescription(changeOrder.description || "");
      setStatus(changeOrder.status || "draft");
      setDiscountType(changeOrder.discountType || "percent");
      setDiscountValue(changeOrder.discountValue?.toString() || "0");
      setSelectedQuotationId(changeOrder.quotationId || "");
      setItems(changeOrder.items || []);
    }
  }, [changeOrder]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/change-orders", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change Order Created",
        description: "The change order has been created successfully.",
      });
      navigate(`/change-orders/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create change order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/change-orders/${changeOrderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders", changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change Order Updated",
        description: "The change order has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update change order",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest("POST", `/api/change-orders/${changeOrderId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders", changeOrderId] });
      toast({
        title: "Item Added",
        description: "The item has been added successfully.",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/change-order-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders", changeOrderId] });
      toast({
        title: "Item Deleted",
        description: "The item has been deleted successfully.",
      });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title for the change order",
        variant: "destructive",
      });
      return;
    }

    if (isNewChangeOrder) {
      if (!selectedQuotationId) {
        toast({
          title: "Validation Error",
          description: "Please select a quotation",
          variant: "destructive",
        });
        return;
      }
      createMutation.mutate({
        title,
        description,
        quotationId: selectedQuotationId,
        status,
        discountType,
        discountValue,
      });
    } else {
      updateMutation.mutate({
        title,
        description,
        status,
        discountType,
        discountValue,
      });
    }
  };

  const addNewItem = () => {
    if (isNewChangeOrder) {
      toast({
        title: "Save First",
        description: "Please save the change order before adding items",
        variant: "destructive",
      });
      return;
    }

    const newItem: ChangeOrderItemRow = {
      tempId: `temp-${Date.now()}`,
      changeOrderId: changeOrderId!,
      itemType: "interior",
      changeType: "addition",
      roomType: "Kitchen",
      description: "",
      calc: "SQFT",
      buildType: "handmade",
      material: "Generic Ply",
      finish: "Generic Laminate",
      hardware: "Nimmi",
      length: "0",
      height: "0",
      width: "0",
      sqft: "0",
      unitPrice: "0",
      totalPrice: "0",
    };

    addItemMutation.mutate(newItem);
  };

  const deleteItem = (itemId: string) => {
    deleteItemMutation.mutate(itemId);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + safeN(item.totalPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = discountType === "percent" 
      ? (subtotal * safeN(discountValue)) / 100
      : safeN(discountValue);
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = (afterDiscount * 18) / 100;
    return afterDiscount + gstAmount;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: "Draft", className: "bg-gray-500" },
      sent: { label: "Sent", className: "bg-blue-500" },
      approved: { label: "Approved", className: "bg-green-500" },
      rejected: { label: "Rejected", className: "bg-red-500" },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (authLoading || coLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/change-orders")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="heading-change-order">
                  {isNewChangeOrder ? "New Change Order" : changeOrder?.changeOrderId}
                </h1>
                <p className="text-muted-foreground">
                  {isNewChangeOrder ? "Create a new change order" : "Edit change order details"}
                </p>
              </div>
            </div>
            {!isNewChangeOrder && getStatusBadge(status)}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Change Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isNewChangeOrder && (
                  <div className="space-y-2">
                    <Label htmlFor="quotation">Select Quotation</Label>
                    <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                      <SelectTrigger id="quotation" data-testid="select-quotation">
                        <SelectValue placeholder="Select a quotation" />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations?.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.quoteId} - {q.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Additional Kitchen Cabinets"
                    data-testid="input-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the changes in detail..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {isNewChangeOrder ? "Create Change Order" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {!isNewChangeOrder && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Change Order Items</CardTitle>
                    <Button onClick={addNewItem} size="sm" data-testid="button-add-item">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4" />
                      <p>No items added yet. Click "Add Item" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id || item.tempId}
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                          data-testid={`item-${item.id}`}
                        >
                          <div>
                            <p className="font-semibold">{item.description || "Untitled Item"}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.roomType} • {item.changeType === "addition" ? "Addition" : "Credit"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-semibold">{formatINR(safeN(item.totalPrice))}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItem(item.id!)}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold" data-testid="text-subtotal">
                      {formatINR(calculateSubtotal())}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label>Discount:</Label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="w-32" data-testid="select-discount-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-32"
                      data-testid="input-discount-value"
                    />
                    <Button onClick={handleSave} size="sm" variant="outline" data-testid="button-apply-discount">
                      Apply
                    </Button>
                  </div>

                  <div className="flex justify-between text-lg font-bold border-t pt-4">
                    <span>Total (incl. 18% GST):</span>
                    <span data-testid="text-total">
                      {formatINR(calculateTotal())}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
