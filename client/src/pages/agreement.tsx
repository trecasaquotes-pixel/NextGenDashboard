import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation } from "@shared/schema";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { htmlToPdfBytes, mergePdfBytes, downloadBytesAs } from "@/lib/pdf";
import { AnnexureTitle } from "@/components/annexure-title";
import { createRoot } from "react-dom/client";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Agreement() {
  const [match, params] = useRoute("/quotation/:id/agreement");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: quotation } = useQuery<Quotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId && isAuthenticated,
  });

  const updateAnnexureMutation = useMutation({
    mutationFn: async (data: { includeAnnexureInteriors?: boolean; includeAnnexureFC?: boolean }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
    },
  });

  const handleDownloadPack = async () => {
    if (!quotation) return;
    
    // Check if required print roots exist
    const interiorsRoot = document.getElementById('print-interiors-root');
    const fcRoot = document.getElementById('print-fc-root');
    
    const missingRoots = [];
    if (quotation.includeAnnexureInteriors && !interiorsRoot) {
      missingRoots.push("Interiors");
    }
    if (quotation.includeAnnexureFC && !fcRoot) {
      missingRoots.push("False Ceiling");
    }
    
    if (missingRoots.length > 0) {
      toast({
        title: "Cannot Generate Agreement Pack",
        description: `Please visit the Print page first to load ${missingRoots.join(" and ")} quotation content.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    toast({
      title: "Generating Agreement Pack...",
      description: "Please wait while we prepare your PDF.",
    });

    try {
      console.log('[Agreement Pack] Starting PDF generation...');
      const pdfs: Uint8Array[] = [];

      // 1. Capture Agreement
      console.log('[Agreement Pack] Capturing Agreement PDF...');
      const agreementRoot = document.getElementById('print-agreement-root');
      if (!agreementRoot) {
        throw new Error("Agreement content not found");
      }
      
      const agreementPdf = await htmlToPdfBytes(agreementRoot);
      console.log('[Agreement Pack] Agreement PDF captured, size:', agreementPdf.length);
      pdfs.push(agreementPdf);

      // 2. Capture Annexure A (Interiors) if included
      if (quotation.includeAnnexureInteriors) {
        console.log('[Agreement Pack] Adding Annexure A (Interiors)...');
        // Create Annexure A title page
        const annexureADiv = document.createElement('div');
        annexureADiv.id = 'temp-annexure-a';
        annexureADiv.style.cssText = 'position: absolute; left: -10000px;';
        document.body.appendChild(annexureADiv);
        
        const rootA = createRoot(annexureADiv);
        rootA.render(
          <AnnexureTitle 
            letter="A" 
            title="Interiors Quotation" 
            quoteId={quotation.quoteId}
            clientName={quotation.clientName}
          />
        );
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));
        const annexureAPdf = await htmlToPdfBytes(annexureADiv);
        pdfs.push(annexureAPdf);
        
        // Cleanup
        rootA.unmount();
        document.body.removeChild(annexureADiv);

        // Capture Interiors PDF
        console.log('[Agreement Pack] Capturing Interiors PDF...');
        const interiorsRoot = document.getElementById('print-interiors-root')!;
        const interiorsPdf = await htmlToPdfBytes(interiorsRoot);
        console.log('[Agreement Pack] Interiors PDF captured, size:', interiorsPdf.length);
        pdfs.push(interiorsPdf);
      }

      // 3. Capture Annexure B (False Ceiling) if included
      if (quotation.includeAnnexureFC) {
        console.log('[Agreement Pack] Adding Annexure B (False Ceiling)...');
        // Create Annexure B title page
        const annexureBDiv = document.createElement('div');
        annexureBDiv.id = 'temp-annexure-b';
        annexureBDiv.style.cssText = 'position: absolute; left: -10000px;';
        document.body.appendChild(annexureBDiv);
        
        const rootB = createRoot(annexureBDiv);
        rootB.render(
          <AnnexureTitle 
            letter="B" 
            title="False Ceiling Quotation" 
            quoteId={quotation.quoteId}
            clientName={quotation.clientName}
          />
        );
        
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));
        const annexureBPdf = await htmlToPdfBytes(annexureBDiv);
        pdfs.push(annexureBPdf);
        
        // Cleanup
        rootB.unmount();
        document.body.removeChild(annexureBDiv);

        // Capture False Ceiling PDF
        console.log('[Agreement Pack] Capturing False Ceiling PDF...');
        const fcRoot = document.getElementById('print-fc-root')!;
        const fcPdf = await htmlToPdfBytes(fcRoot);
        console.log('[Agreement Pack] False Ceiling PDF captured, size:', fcPdf.length);
        pdfs.push(fcPdf);
      }

      // 4. Merge all PDFs
      console.log('[Agreement Pack] Merging', pdfs.length, 'PDFs...');
      const mergedPdf = await mergePdfBytes(pdfs);
      console.log('[Agreement Pack] Merged PDF size:', mergedPdf.length);

      // 5. Download
      const filename = `TRECASA_AgreementPack_${quotation.quoteId}.pdf`;
      console.log('[Agreement Pack] Downloading as:', filename);
      await downloadBytesAs(filename, mergedPdf);
      console.log('[Agreement Pack] Download triggered successfully');

      toast({
        title: "Agreement Pack Downloaded",
        description: "Your PDF has been successfully generated.",
      });
    } catch (error) {
      console.error("[Agreement Pack] Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate Agreement Pack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || !quotation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Navigation */}
          <div className="print:hidden flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
              data-testid="button-back-to-estimate"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Estimate
            </Button>

            <Button
              onClick={handleDownloadPack}
              disabled={isGenerating}
              size="lg"
              data-testid="button-download-agreement-pack"
            >
              <Download className="mr-2 h-5 w-5" />
              {isGenerating ? "Generating..." : "Download Agreement Pack"}
            </Button>
          </div>

          {/* Annexure Settings */}
          <Card className="print:hidden" data-testid="card-annexure-settings">
            <CardHeader>
              <CardTitle>Annexure Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-interiors"
                  checked={quotation.includeAnnexureInteriors ?? true}
                  onCheckedChange={(checked) => updateAnnexureMutation.mutate({ includeAnnexureInteriors: checked as boolean })}
                  data-testid="checkbox-include-annexure-interiors"
                />
                <label htmlFor="include-interiors" className="text-sm font-medium cursor-pointer">
                  Include Annexure A — Interiors Quotation
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-fc"
                  checked={quotation.includeAnnexureFC ?? true}
                  onCheckedChange={(checked) => updateAnnexureMutation.mutate({ includeAnnexureFC: checked as boolean })}
                  data-testid="checkbox-include-annexure-fc"
                />
                <label htmlFor="include-fc" className="text-sm font-medium cursor-pointer">
                  Include Annexure B — False Ceiling Quotation
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Agreement Document */}
          <div id="print-agreement-root" className="bg-white text-black" data-pdf-ready="true">
            {/* Branded Header */}
            <div className="bg-[#0E2F1B] text-white p-6 rounded-t-lg print:rounded-none">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">TRECASA DESIGN STUDIO</h1>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                  </div>
                  <p className="text-[#D1B77C] text-sm">Luxury Interiors | Architecture | Build</p>
                </div>
                <div className="text-right text-sm space-y-1">
                  <p><strong>Quote ID:</strong> {quotation.quoteId}</p>
                  <p><strong>Date:</strong> {currentDate}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Title */}
              <div className="text-center border-b-2 border-[#D1B77C] pb-4">
                <h2 className="text-2xl font-bold text-[#0E2F1B]">SERVICE AGREEMENT</h2>
              </div>

              {/* Agreement Content */}
              <div className="space-y-6 text-sm">
                <p>This Agreement is entered into on <strong>{currentDate}</strong> between:</p>

                <div className="ml-4 space-y-2">
                  <p><strong>TRECASA DESIGN STUDIO</strong> (hereinafter referred to as "Service Provider")</p>
                  <p className="text-xs text-gray-600">
                    Address: [Service Provider Address]<br />
                    Contact: www.trecasadesignstudio.com | @trecasa.designstudio
                  </p>
                </div>

                <p>AND</p>

                <div className="ml-4 space-y-2">
                  <p><strong>{quotation.clientName}</strong> (hereinafter referred to as "Client")</p>
                  <p className="text-xs text-gray-600">
                    Project: {quotation.projectName}<br />
                    Address: {quotation.projectAddress || "N/A"}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">1. SCOPE OF WORK</h3>
                  <p className="ml-4">
                    The Service Provider agrees to provide interior design and execution services as detailed in the attached quotations:
                  </p>
                  <ul className="ml-8 list-disc space-y-1">
                    {quotation.includeAnnexureInteriors && (
                      <li>Annexure A — Interiors Quotation (see attached)</li>
                    )}
                    {quotation.includeAnnexureFC && (
                      <li>Annexure B — False Ceiling Quotation (see attached)</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">2. PROJECT TIMELINE</h3>
                  <p className="ml-4">
                    The project shall commence upon receipt of the advance payment and completion shall be as mutually agreed upon by both parties in writing.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">3. PAYMENT TERMS</h3>
                  <p className="ml-4">
                    The Client agrees to make payments as per the schedule outlined in the attached quotations. Typically:
                  </p>
                  <ul className="ml-8 list-disc space-y-1">
                    <li>50% advance payment at the time of agreement signing</li>
                    <li>40% mid-term payment upon completion of 50% of the work</li>
                    <li>10% final payment upon project completion and handover</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">4. WARRANTY</h3>
                  <p className="ml-4">
                    The Service Provider provides a warranty period of 12 months from the date of project handover against manufacturing defects. Normal wear and tear is not covered under warranty.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">5. MODIFICATIONS</h3>
                  <p className="ml-4">
                    Any modifications to the agreed scope of work must be communicated in writing and may result in additional charges and timeline extensions.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">6. TERMINATION</h3>
                  <p className="ml-4">
                    Either party may terminate this agreement with 15 days written notice. In case of termination by the Client, payments made are non-refundable and work completed till date shall be billed proportionately.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">7. GOVERNING LAW</h3>
                  <p className="ml-4">
                    This Agreement shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the jurisdiction of courts in [City].
                  </p>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-8 border-t-2 border-gray-300">
                  <div className="grid grid-cols-2 gap-8 break-inside-avoid" data-testid="signature-block-agreement">
                    {/* Client Signature */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-4">Client Acceptance</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Name:</p>
                          <p className="text-sm">
                            {quotation.signoff?.client?.name || quotation.clientName || "_____________"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Signature:</p>
                          {quotation.signoff?.client?.signature ? (
                            <p className="text-lg font-serif italic text-gray-800">{quotation.signoff.client.signature}</p>
                          ) : (
                            <p className="text-sm text-gray-400">_____________</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date:</p>
                          <p className="text-sm">
                            {quotation.signoff?.client?.signedAt ? new Date(quotation.signoff.client.signedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : "_____________"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TRECASA Signature */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-4">For TRECASA DESIGN STUDIO</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Title:</p>
                          <p className="text-sm">{quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Name:</p>
                          <p className="text-sm">{quotation.signoff?.trecasa?.name || "Authorized Signatory"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Signature:</p>
                          {quotation.signoff?.trecasa?.signature ? (
                            <p className="text-lg font-serif italic text-gray-800">{quotation.signoff.trecasa.signature}</p>
                          ) : (
                            <p className="text-sm text-gray-400">_____________</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date:</p>
                          <p className="text-sm">
                            {quotation.signoff?.trecasa?.signedAt ? new Date(quotation.signoff.trecasa.signedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : "_____________"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Branded Footer */}
            <div className="bg-gray-100 p-4 text-center text-sm text-gray-600 border-t-2 border-[#D1B77C] rounded-b-lg print:rounded-none">
              <div className="flex items-center justify-center gap-2">
                <span>© 2025 TRECASA DESIGN STUDIO</span>
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>| www.trecasadesignstudio.com | @trecasa.designstudio</span>
              </div>
            </div>
          </div>

          {/* Hidden Print Roots (for PDF capture) */}
          <div className="hidden">
            {/* These will be populated by the print page components when needed */}
            <div id="print-interiors-root-hidden"></div>
            <div id="print-fc-root-hidden"></div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <AppFooter />
      </div>
    </div>
  );
}
