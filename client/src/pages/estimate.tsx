import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { ROOM_TYPES } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

export default function Estimate() {
  const [match, params] = useRoute("/quotation/:id/estimate");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

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

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  const interiorTotalSqft = interiorItems.reduce((sum, item) => sum + parseFloat(item.sqft || "0"), 0);
  const falseCeilingTotalArea = falseCeilingItems.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);

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
                  {ROOM_TYPES.map((roomType) => {
                    const roomItems = interiorItems.filter((item) => item.roomType === roomType);
                    if (roomItems.length === 0) return null;

                    const roomTotal = roomItems.reduce((sum, item) => sum + parseFloat(item.sqft || "0"), 0);

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

                  {/* Pricing Summary */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Total SQFT</span>
                      <span className="font-mono text-foreground font-semibold" data-testid="text-interior-sqft">
                        {interiorTotalSqft.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Subtotal</span>
                      <span className="font-mono text-foreground" data-testid="text-interior-subtotal">₹0.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Discount</span>
                      <span className="font-mono text-foreground" data-testid="text-interior-discount">0%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">GST (18%)</span>
                      <span className="font-mono text-foreground" data-testid="text-interior-gst">₹0.00</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-lg font-bold text-foreground">Final Quote</span>
                      <span className="text-xl font-bold font-mono text-primary" data-testid="text-interior-final">
                        ₹0.00
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
                  {ROOM_TYPES.map((roomType) => {
                    const roomItems = falseCeilingItems.filter((item) => item.roomType === roomType);
                    if (roomItems.length === 0) return null;

                    const roomTotal = roomItems.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);

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

                  {/* Pricing Summary */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Total Area</span>
                      <span className="font-mono text-foreground font-semibold" data-testid="text-ceiling-sqft">
                        {falseCeilingTotalArea.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Subtotal</span>
                      <span className="font-mono text-foreground" data-testid="text-ceiling-subtotal">₹0.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Discount</span>
                      <span className="font-mono text-foreground" data-testid="text-ceiling-discount">0%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">GST (18%)</span>
                      <span className="font-mono text-foreground" data-testid="text-ceiling-gst">₹0.00</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-lg font-bold text-foreground">Final Quote</span>
                      <span className="text-xl font-bold font-mono text-primary" data-testid="text-ceiling-final">
                        ₹0.00
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
