import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Download, AlertCircle, FileText } from "lucide-react";
import { formatINR } from "@shared/formatters";

export default function ClientQuotePortal() {
  const [match, params] = useRoute("/client/:quoteId");
  const [, navigate] = useLocation();
  const quoteId = params?.quoteId;
  const { toast } = useToast();

  // Get token from URL query
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [clientName, setClientName] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch quote info using token
  const { data: quoteInfo, isLoading, error } = useQuery({
    queryKey: ['/api/client-quote', quoteId, 'info'],
    queryFn: async () => {
      const response = await fetch(`/api/client-quote/${quoteId}/info?token=${token}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load quote");
      }
      return await response.json();
    },
    enabled: !!quoteId && !!token,
  });

  // Accept quote mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/client-quote/${quoteId}/accept?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept quote");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote Accepted",
        description: "Thank you for accepting the quotation. Your agreement is ready to download.",
      });
      // Download agreement PDF
      if (data.agreementUrl) {
        window.open(data.agreementUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept quote",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!clientName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to sign and accept the quotation.",
        variant: "destructive",
      });
      return;
    }
    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-medium">Loading quotation...</div>
        </div>
      </div>
    );
  }

  if (error || !quoteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              {error?.message || "Unable to load quotation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The link may be invalid, expired, or the quote may no longer be available.
              Please contact TRECASA Design Studio for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, totals, terms, status, pdfUrls } = quoteInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container-trecasa py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TRECASA DESIGN STUDIO</h1>
              <p className="text-sm text-muted-foreground">Luxury Interiors | Architecture | Build</p>
            </div>
            {status === "approved" && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Approved</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-trecasa py-6 lg:py-8 max-w-4xl mx-auto">
        {/* Project Info */}
        <Card className="mb-6" data-testid="card-project-info">
          <CardHeader>
            <CardTitle>Quotation for {project.name}</CardTitle>
            <CardDescription>
              Client: {project.clientName} | Address: {project.siteAddress}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Financial Summary */}
        <Card className="mb-6" data-testid="card-financial-summary">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interiors */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Interiors</span>
                <span className="font-mono">{formatINR(totals.interiors.grandTotal)}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1 ml-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatINR(totals.interiors.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({totals.interiors.gstPercent}%):</span>
                  <span className="font-mono">{formatINR(totals.interiors.gstAmount)}</span>
                </div>
              </div>
            </div>

            {/* False Ceiling */}
            {totals.fc && (
              <>
                <Separator />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">False Ceiling</span>
                    <span className="font-mono">{formatINR(totals.fc.grandTotal)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatINR(totals.fc.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST ({totals.fc.gstPercent}%):</span>
                      <span className="font-mono">{formatINR(totals.fc.gstAmount)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Discount */}
            {totals.discount.amount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Discount {totals.discount.type === "percent" ? `(${totals.discount.value}%)` : ""}
                  </span>
                  <span className="font-mono text-green-600">
                    -{formatINR(totals.discount.amount)}
                  </span>
                </div>
              </>
            )}

            {/* Grand Total */}
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-lg font-bold font-mono">{formatINR(totals.grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        {terms && terms.length > 0 && (
          <Card className="mb-6" data-testid="card-terms">
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {terms.map((term: string, index: number) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Download PDFs */}
        <Card className="mb-6" data-testid="card-pdfs">
          <CardHeader>
            <CardTitle>Download Documents</CardTitle>
            <CardDescription>
              Download detailed quotations for review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open(pdfUrls.interiors, '_blank')}
              data-testid="button-download-interiors"
            >
              <FileText className="mr-2 h-4 w-4" />
              Download Interiors Quotation
            </Button>
            {pdfUrls.fc && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(pdfUrls.fc, '_blank')}
                data-testid="button-download-fc"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download False Ceiling Quotation
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Accept Quote */}
        {status !== "approved" ? (
          <Card data-testid="card-accept">
            <CardHeader>
              <CardTitle>Accept Quotation</CardTitle>
              <CardDescription>
                Enter your name below to digitally sign and accept this quotation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Your Full Name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter your full name"
                  data-testid="input-client-name"
                />
              </div>
              <Button
                onClick={handleAccept}
                disabled={acceptMutation.isPending || !clientName.trim()}
                className="w-full"
                data-testid="button-accept-quote"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {acceptMutation.isPending ? "Processing..." : "Accept & Sign Quotation"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              This quotation has been approved. You can download the agreement PDF from the documents section above.
            </AlertDescription>
          </Alert>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-card">
        <div className="container-trecasa text-center text-sm text-muted-foreground">
          <p>© 2024 TRECASA Design Studio. All rights reserved.</p>
          <p className="mt-1">Contact: info@trecasa.com | +91 98765 43210</p>
        </div>
      </footer>
    </div>
  );
}
