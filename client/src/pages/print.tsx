import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { ROOM_TYPES } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";

export default function Print() {
  const [match, params] = useRoute("/quotation/:id/print");
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportInteriorsPDF = () => {
    toast({
      title: "PDF Export",
      description: "Interiors PDF export will be implemented soon",
    });
  };

  const handleExportFalseCeilingPDF = () => {
    toast({
      title: "PDF Export",
      description: "False Ceiling PDF export will be implemented soon",
    });
  };

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  const interiorTotalSqft = interiorItems.reduce((sum, item) => sum + parseFloat(item.sqft || "0"), 0);
  const falseCeilingTotalArea = falseCeilingItems.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <QuotationHeader quotationId={quotationId!} currentStep="print" />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Action Buttons - Hide on print */}
          <div className="print:hidden mb-6 flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/quotation/${quotationId}/estimate`)} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Estimate
            </Button>
            <div className="flex-1"></div>
            <Button variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExportInteriorsPDF} data-testid="button-export-interiors">
              <Download className="mr-2 h-4 w-4" />
              Export Interiors PDF
            </Button>
            <Button onClick={handleExportFalseCeilingPDF} data-testid="button-export-ceiling">
              <Download className="mr-2 h-4 w-4" />
              Export False Ceiling PDF
            </Button>
          </div>

          {/* Print Content */}
          <div className="space-y-8">
            {/* Header - Visible on print */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center print:bg-gray-800">
                  <span className="text-primary-foreground font-bold text-xl print:text-white">T</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">TRECASA</h1>
              </div>
              <p className="text-muted-foreground">Interior Design Quotation</p>
            </div>

            {/* Project Information */}
            <Card className="print:border print:border-gray-300">
              <CardHeader className="border-b border-card-border print:border-gray-300">
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Project Name</p>
                    <p className="font-semibold text-foreground" data-testid="text-print-project-name">
                      {quotation?.projectName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Client Name</p>
                    <p className="font-semibold text-foreground">{quotation?.clientName}</p>
                  </div>
                  {quotation?.clientEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="font-semibold text-foreground">{quotation.clientEmail}</p>
                    </div>
                  )}
                  {quotation?.clientPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="font-semibold text-foreground">{quotation.clientPhone}</p>
                    </div>
                  )}
                  {quotation?.projectAddress && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Address</p>
                      <p className="font-semibold text-foreground">{quotation.projectAddress}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-semibold text-foreground">
                      {quotation?.createdAt && new Date(quotation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interiors Section */}
            <Card className="print:border print:border-gray-300 print:break-inside-avoid">
              <CardHeader className="border-b border-card-border print:border-gray-300">
                <CardTitle>Interiors</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {ROOM_TYPES.map((roomType) => {
                  const roomItems = interiorItems.filter((item) => item.roomType === roomType);
                  if (roomItems.length === 0) return null;

                  const roomTotal = roomItems.reduce((sum, item) => sum + parseFloat(item.sqft || "0"), 0);

                  return (
                    <div key={roomType} className="mb-6 last:mb-0 print:break-inside-avoid">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-muted print:border-gray-300">
                        <h4 className="font-semibold text-foreground">{roomType}</h4>
                        <span className="text-sm font-mono text-muted-foreground">{roomTotal.toFixed(2)} SQFT</span>
                      </div>
                      <div className="space-y-3">
                        {roomItems.map((item) => (
                          <div key={item.id} className="pl-4 space-y-1">
                            <div className="flex items-start justify-between">
                              <p className="text-foreground font-medium">{item.description || "Item"}</p>
                              <span className="font-mono text-sm text-muted-foreground ml-4">{item.sqft} SQFT</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Material:</span> {item.material}
                              </div>
                              <div>
                                <span className="font-medium">Finish:</span> {item.finish}
                              </div>
                              <div>
                                <span className="font-medium">Hardware:</span> {item.hardware}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Dimensions: {item.length || 0} × {item.height || item.width || 0} ft
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {interiorItems.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border print:border-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">Total Interior SQFT</span>
                      <span className="text-2xl font-bold font-mono text-primary print:text-gray-800">
                        {interiorTotalSqft.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {interiorItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No interior items</p>
                )}
              </CardContent>
            </Card>

            {/* False Ceiling Section */}
            <Card className="print:border print:border-gray-300 print:break-inside-avoid">
              <CardHeader className="border-b border-card-border print:border-gray-300">
                <CardTitle>False Ceiling</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {ROOM_TYPES.map((roomType) => {
                  const roomItems = falseCeilingItems.filter((item) => item.roomType === roomType);
                  if (roomItems.length === 0) return null;

                  const roomTotal = roomItems.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);

                  return (
                    <div key={roomType} className="mb-6 last:mb-0 print:break-inside-avoid">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-muted print:border-gray-300">
                        <h4 className="font-semibold text-foreground">{roomType}</h4>
                        <span className="text-sm font-mono text-muted-foreground">{roomTotal.toFixed(2)} SQFT</span>
                      </div>
                      <div className="space-y-3">
                        {roomItems.map((item) => (
                          <div key={item.id} className="pl-4 space-y-1">
                            <div className="flex items-start justify-between">
                              <p className="text-foreground font-medium">{item.description || "Ceiling"}</p>
                              <span className="font-mono text-sm text-muted-foreground ml-4">{item.area} SQFT</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Area: {item.length} × {item.width} ft
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* OTHERS in False Ceiling Section */}
                {otherItems.length > 0 && (
                  <div className="mb-6 print:break-inside-avoid">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-muted print:border-gray-300">
                      <h4 className="font-semibold text-foreground">OTHERS</h4>
                    </div>
                    <div className="space-y-2 pl-4">
                      {otherItems.map((item) => (
                        <div key={item.id} className="flex items-start justify-between">
                          <div>
                            <p className="text-foreground font-medium">{item.itemType}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <span className="font-mono text-sm text-muted-foreground ml-4">
                            {item.valueType === "count" ? `${item.value} units` : item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {falseCeilingItems.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border print:border-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">Total Ceiling Area</span>
                      <span className="text-2xl font-bold font-mono text-primary print:text-gray-800">
                        {falseCeilingTotalArea.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {falseCeilingItems.length === 0 && otherItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No false ceiling items</p>
                )}
              </CardContent>
            </Card>

            {/* Footer - Print only */}
            <div className="hidden print:block text-center pt-8 border-t border-gray-300 text-sm text-gray-600">
              <p>TRECASA - Interior Design Quotations</p>
              <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
