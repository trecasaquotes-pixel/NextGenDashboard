import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Percent, IndianRupee, CheckCircle2, Download, Save, Share2, FileEdit, Briefcase, TrendingUp } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { TermsEditor } from "@/components/terms-editor";
import { SignoffEditor } from "@/components/signoff-editor";
import { ApproveQuoteDialog } from "@/components/approve-quote-dialog";
import { ShareLinkDialog } from "@/components/share-link-dialog";
import { AgreementCard } from "@/components/agreement-card";
import { formatINR, safeN } from "@/lib/money";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { sortRoomNames } from "@/lib/roomOrder";

export default function Estimate() {
  const [match, params] = useRoute("/quotation/:id/estimate");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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

  const { data: quotation } = useQuery<Quotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: interiorItems = [] } = useQuery<InteriorItem[]>({
    queryKey: [`/api/quotations/${quotationId}/interior-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: falseCeilingItems = [] } = useQuery<FalseCeilingItem[]>({
    queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: otherItems = [] } = useQuery<OtherItem[]>({
    queryKey: [`/api/quotations/${quotationId}/other-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: changeOrders = [] } = useQuery<any[]>({
    queryKey: [`/api/quotations/${quotationId}/change-orders`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: project } = useQuery<any>({
    queryKey: [`/api/quotations/${quotationId}/project`],
    enabled: !!quotationId && isAuthenticated && quotation?.status === "approved",
    retry: false,
  });

  // Local state for discount
  const [discountType, setDiscountType] = useState<string>(quotation?.discountType || "percent");
  const [discountValue, setDiscountValue] = useState<string>(quotation?.discountValue || "0");

  // Sync local state with quotation data
  useEffect(() => {
    if (quotation) {
      setDiscountType(quotation.discountType || "percent");
      setDiscountValue(quotation.discountValue || "0");
    }
  }, [quotation]);

  // Update discount mutation
  const updateDiscount = useMutation({
    mutationFn: async ({ discountType, discountValue }: { discountType: string; discountValue: string }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, { discountType, discountValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
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
      }
    },
  });

  // Handle discount changes
  const handleDiscountTypeChange = (newType: string) => {
    setDiscountType(newType);
    updateDiscount.mutate({ discountType: newType, discountValue });
  };

  const handleDiscountValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDiscountValue(value);
  };

  const handleDiscountBlur = () => {
    updateDiscount.mutate({ discountType, discountValue });
  };

  // Export ZIP mutation
  const exportZip = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/quotations/${quotationId}/export-zip`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to export ZIP');
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trecasa_Quote_${quotation?.quoteId}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Quote exported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export quote",
        variant: "destructive",
      });
    },
  });

  // Save snapshot mutation
  const saveSnapshot = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/quotations/${quotationId}/snapshot`, {});
    },
    onSuccess: () => {
      toast({
        title: "Snapshot Saved",
        description: "Current rates and settings have been captured",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save snapshot",
        variant: "destructive",
      });
    },
  });

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  // Get totals from quotation
  const interiorsSubtotal = safeN(quotation?.totals?.interiorsSubtotal);
  const fcSubtotal = safeN(quotation?.totals?.fcSubtotal);
  const grandSubtotal = safeN(quotation?.totals?.grandSubtotal);

  // Calculate discount amount
  const discountAmount = discountType === "percent" 
    ? (grandSubtotal * safeN(discountValue)) / 100 
    : safeN(discountValue);

  // Calculate discounted amount (prevent negative)
  const discounted = Math.max(0, grandSubtotal - discountAmount);

  // Calculate GST (18%)
  const gstAmount = discounted * 0.18;

  // Calculate final total
  const finalTotal = discounted + gstAmount;

  // Extract unique room types from items and sort them
  const interiorRoomTypes = sortRoomNames(Array.from(new Set(interiorItems.map(item => item.roomType))));
  const fcRoomTypes = sortRoomNames(Array.from(new Set(falseCeilingItems.map(item => item.roomType))));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <QuotationHeader quotationId={quotationId!} currentStep="estimate" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interiors Summary */}
            <Card>
              <CardHeader className="border-b border-card-border">
                <CardTitle className="text-xl">Interiors Summary</CardTitle>
                <CardDescription>Interior work estimate</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Room breakdown */}
                  {interiorRoomTypes.map((roomType) => {
                    const roomItems = interiorItems.filter((item) => item.roomType === roomType);
                    if (roomItems.length === 0) return null;

                    const roomTotal = roomItems.reduce((sum, item) => sum + safeN(item.sqft), 0);

                    return (
                      <div key={roomType} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-muted">
                          <h4 className="font-semibold text-foreground">{roomType}</h4>
                          <span className="text-sm font-mono text-muted-foreground">{roomTotal.toFixed(2)} SQFT</span>
                        </div>
                        <div className="space-y-2">
                          {roomItems.map((item) => (
                            <div key={item.id} className="flex items-start justify-between text-sm">
                              <div className="flex-1">
                                <p className="text-foreground">{item.description || "Item"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.material} • {item.finish} • {item.hardware}
                                </p>
                              </div>
                              <span className="font-mono text-muted-foreground ml-4">{item.sqft} SQFT</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {interiorItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No interior items added yet
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-foreground">Subtotal</span>
                      <span className="text-xl font-bold font-mono text-foreground" data-testid="text-interior-subtotal">
                        {formatINR(interiorsSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* False Ceiling Summary */}
            <Card>
              <CardHeader className="border-b border-card-border">
                <CardTitle className="text-xl">False Ceiling Summary</CardTitle>
                <CardDescription>False ceiling work estimate</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Room breakdown */}
                  {fcRoomTypes.map((roomType) => {
                    const roomItems = falseCeilingItems.filter((item) => item.roomType === roomType);
                    if (roomItems.length === 0) return null;

                    const roomTotal = roomItems.reduce((sum, item) => sum + safeN(item.area), 0);

                    return (
                      <div key={roomType} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-muted">
                          <h4 className="font-semibold text-foreground">{roomType}</h4>
                          <span className="text-sm font-mono text-muted-foreground">{roomTotal.toFixed(2)} SQFT</span>
                        </div>
                        <div className="space-y-2">
                          {roomItems.map((item) => (
                            <div key={item.id} className="flex items-start justify-between text-sm">
                              <div className="flex-1">
                                <p className="text-foreground">{item.description || "Ceiling"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.length} × {item.width} ft
                                </p>
                              </div>
                              <span className="font-mono text-muted-foreground ml-4">{item.area} SQFT</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* OTHERS Section */}
                  {otherItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-muted">
                        <h4 className="font-semibold text-foreground">OTHERS</h4>
                      </div>
                      <div className="space-y-2">
                        {otherItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-sm">
                            <div className="flex-1">
                              <p className="text-foreground">{item.itemType}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            <span className="font-mono text-muted-foreground ml-4">
                              {item.valueType === "count" ? `${item.value} units` : item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {falseCeilingItems.length === 0 && otherItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No false ceiling items added yet
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-foreground">Subtotal</span>
                      <span className="text-xl font-bold font-mono text-foreground" data-testid="text-fc-subtotal">
                        {formatINR(fcSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Summary */}
          <Card>
            <CardHeader className="border-b border-card-border">
              <CardTitle className="text-xl">Overall Summary</CardTitle>
              <CardDescription>Final quotation with discount and GST</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-2xl">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-lg">
                  <span className="text-foreground">Subtotal</span>
                  <span className="font-mono font-semibold text-foreground" data-testid="text-grand-subtotal">
                    {formatINR(grandSubtotal)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="discount-value" className="text-foreground mb-2 block">Discount</Label>
                    <div className="flex gap-2">
                      <Select value={discountType} onValueChange={handleDiscountTypeChange}>
                        <SelectTrigger className="w-32" data-testid="select-discount-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">
                            <div className="flex items-center gap-2">
                              <Percent className="h-4 w-4" />
                              <span>Percent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="amount">
                            <div className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4" />
                              <span>Amount</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="discount-value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountValue}
                        onChange={handleDiscountValueChange}
                        onBlur={handleDiscountBlur}
                        className="flex-1"
                        data-testid="input-discount-value"
                      />
                    </div>
                  </div>
                  <div className="text-right pt-8">
                    <span className="font-mono text-destructive" data-testid="text-discount-amount">
                      -{formatINR(discountAmount)}
                    </span>
                  </div>
                </div>

                {/* GST */}
                <div className="flex items-center justify-between">
                  <span className="text-foreground">GST (18%)</span>
                  <span className="font-mono text-foreground" data-testid="text-gst-amount">
                    {formatINR(gstAmount)}
                  </span>
                </div>

                {/* Final Total */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-2xl font-bold text-foreground">Final Total</span>
                  <span className="text-3xl font-bold font-mono text-primary" data-testid="text-final-total">
                    {formatINR(finalTotal)}
                  </span>
                </div>

                {/* Disclaimer */}
                <div className="pt-4 text-sm text-muted-foreground italic">
                  All rates are inclusive of margin. GST extra as applicable.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Orders Section */}
          <Card>
            <CardHeader className="border-b border-card-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Change Orders</CardTitle>
                  <CardDescription>Track project modifications and additions</CardDescription>
                </div>
                <Button
                  onClick={() => navigate(`/quotation/${quotationId}/change-orders/new`)}
                  size="sm"
                  data-testid="button-create-change-order"
                >
                  <FileEdit className="w-4 h-4 mr-2" />
                  Create Change Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {changeOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No change orders yet</p>
                  <p className="text-sm">Create a change order to track project modifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {changeOrders.map((co: any) => {
                    const subtotal = safeN(co.totals?.grandSubtotal);
                    const discountAmt = co.discountType === "percent" 
                      ? (subtotal * safeN(co.discountValue)) / 100
                      : safeN(co.discountValue);
                    const afterDiscount = subtotal - discountAmt;
                    const gst = (afterDiscount * 18) / 100;
                    const total = afterDiscount + gst;

                    return (
                      <div
                        key={co.id}
                        className="p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => navigate(`/change-orders/${co.id}`)}
                        data-testid={`change-order-${co.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-semibold">{co.title}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                co.status === "approved" ? "bg-green-500 text-white" :
                                co.status === "sent" ? "bg-blue-500 text-white" :
                                co.status === "rejected" ? "bg-red-500 text-white" :
                                "bg-gray-500 text-white"
                              }`}>
                                {co.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{co.changeOrderId}</p>
                            {co.description && (
                              <p className="text-sm text-muted-foreground mt-1">{co.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold font-mono">{formatINR(total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {co.items?.length || 0} items
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Read-only banner if approved */}
          {quotation?.status === "approved" && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Quote Approved — Locked</strong>
                <br />
                This quote has been approved and is locked to preserve the snapshot used in the agreement. 
                No further edits are allowed.
              </p>
            </div>
          )}

          {/* Terms & Conditions Editor */}
          {quotation && <TermsEditor quotation={quotation} />}

          {/* Sign & Status */}
          {quotation && <SignoffEditor quotationId={quotationId!} quotation={quotation} />}

          {/* Agreement Card (if approved) */}
          {quotation?.status === "approved" && (
            <AgreementCard
              quotationId={quotationId!}
              approvedAt={quotation.approvedAt || undefined}
              approvedBy={quotation.approvedBy || undefined}
            />
          )}

          {/* Project Link Card (if approved and project exists) */}
          {quotation?.status === "approved" && project && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Project Created</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    data-testid="button-view-project"
                  >
                    View Project & Expenses
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Project ID</div>
                    <div className="font-mono font-semibold">{project.projectId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Contract Amount</div>
                    <div className="font-semibold">{formatINR(parseFloat(project.contractAmount || "0"))}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Current Status</div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${parseFloat(project.profitLoss || "0") >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-semibold ${parseFloat(project.profitLoss || "0") >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(project.profitLoss || "0") >= 0 ? 'Profitable' : 'Loss'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export & Snapshot Actions */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-3">
              <Button
                onClick={() => exportZip.mutate()}
                disabled={exportZip.isPending}
                variant="outline"
                data-testid="button-export-zip"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportZip.isPending ? "Exporting..." : "Export ZIP"}
              </Button>
              
              {quotation?.status !== "approved" && (
                <Button
                  onClick={() => saveSnapshot.mutate()}
                  disabled={saveSnapshot.isPending}
                  variant="outline"
                  data-testid="button-save-snapshot"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveSnapshot.isPending ? "Saving..." : "Save Snapshot"}
                </Button>
              )}

              <Button
                onClick={() => setShowShareDialog(true)}
                variant="outline"
                data-testid="button-share-link"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share with Client
              </Button>
            </div>

            {/* Approve Button (if not approved) */}
            {quotation?.status !== "approved" && (
              <Button
                onClick={() => setShowApproveDialog(true)}
                size="lg"
                data-testid="button-approve-quote"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Approve Quote & Generate Agreement
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/quotation/${quotationId}/scope`)}
              data-testid="button-back-to-scope"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scope
            </Button>
            <Button 
              onClick={() => navigate(`/quotation/${quotationId}/print`)}
              data-testid="button-continue-print"
            >
              Continue to Print
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Approve Quote Dialog */}
          <ApproveQuoteDialog
            open={showApproveDialog}
            onOpenChange={setShowApproveDialog}
            quotationId={quotationId!}
          />

          {/* Share Link Dialog */}
          <ShareLinkDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            quoteId={quotationId!}
            clientToken={quotation?.clientToken}
            clientTokenExpiresAt={quotation?.clientTokenExpiresAt}
          />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
