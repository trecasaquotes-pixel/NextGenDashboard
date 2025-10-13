import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

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

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <QuotationHeader quotationId={quotationId!} currentStep="print" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* PDF Preview Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interiors PDF Preview */}
            <Card>
              <CardHeader className="border-b border-card-border">
                <CardTitle className="text-xl">Interiors PDF</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Preview Box */}
                  <div 
                    className="bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 min-h-[400px] flex items-center justify-center"
                    data-testid="preview-interiors-pdf"
                  >
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary font-bold text-2xl">T</span>
                      </div>
                      <p className="text-muted-foreground font-medium">PDF Preview</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Header &amp; Footer with TRECASA logo • Content will render later
                      </p>
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button 
                    className="w-full" 
                    disabled
                    data-testid="button-download-interiors-pdf"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Interiors PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* False Ceiling PDF Preview */}
            <Card>
              <CardHeader className="border-b border-card-border">
                <CardTitle className="text-xl">False Ceiling PDF</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Preview Box */}
                  <div 
                    className="bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 min-h-[400px] flex items-center justify-center"
                    data-testid="preview-ceiling-pdf"
                  >
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary font-bold text-2xl">T</span>
                      </div>
                      <p className="text-muted-foreground font-medium">PDF Preview</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Header &amp; Footer with TRECASA logo • Content will render later
                      </p>
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button 
                    className="w-full" 
                    disabled
                    data-testid="button-download-ceiling-pdf"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download False Ceiling PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
              data-testid="button-back-to-estimate"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Estimate
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
