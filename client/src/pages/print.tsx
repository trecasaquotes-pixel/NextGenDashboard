import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Printer, Archive } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { formatINR, safeN } from "@/lib/money";
import { defaultTerms, renderTerms } from "@/lib/terms";
import { dateFormat } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { htmlToPdfBytes, downloadBytesAs } from "@/lib/pdf";
import { sortByRoom, sortRoomEntries } from "@/lib/roomOrder";

export default function Print() {
  const [match, params] = useRoute("/quotation/:id/print");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"interiors" | "false-ceiling">("interiors");

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

  const { data: quotation, isLoading: quotationLoading, error: quotationError } = useQuery<Quotation>({
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

  // Status update mutations
  const markAsSentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, { status: "sent" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      toast({
        title: "Status Updated",
        description: "Quote marked as sent",
      });
    },
  });

  const markAsAcceptedMutation = useMutation({
    mutationFn: async () => {
      const now = Date.now();
      const currentSignoff = quotation?.signoff || {
        client: { name: "", signature: "", signedAt: undefined },
        trecasa: { name: "Authorized Signatory", title: "For TRECASA DESIGN STUDIO", signature: "", signedAt: undefined },
        accepted: false,
        acceptedAt: undefined
      };
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, {
        status: "accepted",
        signoff: {
          ...currentSignoff,
          accepted: true,
          acceptedAt: now,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      toast({
        title: "Status Updated",
        description: "Quote marked as accepted",
      });
    },
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async (type: "interiors" | "false-ceiling") => {
    if (!quotation) return;
    
    setIsGeneratingPDF(true);
    
    // Try server-side PDF generation first (Puppeteer)
    try {
      toast({
        title: "Generating PDF...",
        description: "Creating high-quality PDF on server",
      });

      const response = await fetch(`/api/quotations/${quotationId}/pdf/${type}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const typeLabel = type === "interiors" ? "Interiors" : "FalseCeiling";
        link.download = `TRECASA_${quotation.quoteId}_${typeLabel}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Server-generated PDF downloaded successfully",
        });
        setIsGeneratingPDF(false);
        return;
      }
      
      // Server failed, fall back to client-side
      console.warn(`Server PDF generation failed (${response.status}), falling back to client-side`);
      toast({
        title: "Switching to client-side...",
        description: "Server unavailable, using browser fallback",
      });
    } catch (serverError) {
      console.error('Server PDF error:', serverError);
      toast({
        title: "Switching to client-side...",
        description: "Server unavailable, using browser fallback",
      });
    }
    
    // Client-side fallback (html2pdf)
    try {
      const elementId = type === "interiors" ? "print-interiors-root" : "print-fc-root";
      const element = document.getElementById(elementId);
      
      if (!element) {
        throw new Error(`Element ${elementId} not found`);
      }

      const pdfBytes = await htmlToPdfBytes(element);
      const typeLabel = type === "interiors" ? "Interiors" : "FalseCeiling";
      const filename = `TRECASA_${quotation.quoteId}_${typeLabel}.pdf`;
      
      await downloadBytesAs(filename, pdfBytes);

      toast({
        title: "Success",
        description: "Client-generated PDF downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadAgreementPack = async () => {
    if (!quotation) return;
    
    setIsGeneratingPDF(true);
    
    // Try server-side PDF generation first
    try {
      toast({
        title: "Generating Agreement Pack...",
        description: "Creating merged PDF with all sections",
      });

      const response = await fetch(`/api/quotations/${quotationId}/pdf/agreement-pack`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TRECASA_${quotation.quoteId}_AgreementPack.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Server-generated Agreement Pack downloaded successfully",
        });
        setIsGeneratingPDF(false);
        return;
      }
      
      // Server failed, fall back to client-side merging
      console.warn(`Server Agreement Pack generation failed (${response.status}), falling back to client-side`);
      toast({
        title: "Switching to client-side...",
        description: "Generating and merging PDFs in browser",
      });
    } catch (serverError) {
      console.error('Server Agreement Pack error:', serverError);
      toast({
        title: "Switching to client-side...",
        description: "Generating and merging PDFs in browser",
      });
    }
    
    // Client-side fallback: Generate and merge PDFs
    try {
      const { PDFDocument } = await import('pdf-lib');
      
      // Check if both elements exist (they might not due to tab visibility)
      const interiorsEl = document.getElementById("print-interiors-root");
      const fcEl = document.getElementById("print-fc-root");
      
      if (!interiorsEl || !fcEl) {
        throw new Error("Agreement Pack requires both Interiors and FC content. Please download individual PDFs instead or use server-side generation when available.");
      }
      
      // Generate Interiors PDF
      const interiorsPdfBytes = await htmlToPdfBytes(interiorsEl);
      
      // Generate False Ceiling PDF
      const fcPdfBytes = await htmlToPdfBytes(fcEl);
      
      // Merge PDFs
      const mergedPdf = await PDFDocument.create();
      
      const interiorsDoc = await PDFDocument.load(interiorsPdfBytes);
      const interiorPages = await mergedPdf.copyPages(interiorsDoc, interiorsDoc.getPageIndices());
      interiorPages.forEach(page => mergedPdf.addPage(page));
      
      const fcDoc = await PDFDocument.load(fcPdfBytes);
      const fcPages = await mergedPdf.copyPages(fcDoc, fcDoc.getPageIndices());
      fcPages.forEach(page => mergedPdf.addPage(page));
      
      const mergedPdfBytes = await mergedPdf.save();
      
      await downloadBytesAs(`TRECASA_${quotation.quoteId}_AgreementPack.pdf`, new Uint8Array(mergedPdfBytes));

      toast({
        title: "Success",
        description: "Client-generated Agreement Pack downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating Agreement Pack:", error);
      toast({
        title: "Agreement Pack Unavailable",
        description: error instanceof Error ? error.message : "Please download individual PDFs instead.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!match) {
    return null;
  }

  // Show error if quotation query failed
  if (quotationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error loading quotation</p>
          <p className="text-sm text-muted-foreground">{String(quotationError)}</p>
          <Button onClick={() => navigate("/")}>Back to Quotes</Button>
        </div>
      </div>
    );
  }

  // Show loading state while auth or quotation is loading
  if (authLoading || quotationLoading || !quotation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {authLoading ? "Authenticating..." : "Loading quotation..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Note: We'll calculate actual subtotals after grouping items by room (see below)

  // Group items by room
  const interiorsByRoom = interiorItems.reduce((acc, item) => {
    const room = item.roomType || "Other";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {} as Record<string, InteriorItem[]>);

  const falseCeilingByRoom = falseCeilingItems.reduce((acc, item) => {
    const room = item.roomType || "Other";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {} as Record<string, FalseCeilingItem[]>);

  // Compute room totals for summary tables (Part 2A requirement)
  const interiorsRoomTotals = sortByRoom(
    Object.entries(interiorsByRoom).map(([room, items]) => ({
      room,
      total: items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
    }))
  );

  const fcRoomTotals = sortByRoom(
    Object.entries(falseCeilingByRoom).map(([room, items]) => ({
      room,
      total: items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
    }))
  );

  // Use server-calculated subtotals when available (more reliable), fallback to recalculation
  const serverInteriorsSubtotal = safeN(quotation?.totals?.interiorsSubtotal);
  const serverFcSubtotal = safeN(quotation?.totals?.fcSubtotal);
  const serverGrandSubtotal = safeN(quotation?.totals?.grandSubtotal);
  
  // Fallback: Calculate from room totals if server totals not available
  const calculatedInteriorsSubtotal = interiorsRoomTotals.reduce((sum, { total }) => sum + total, 0);
  const calculatedFcSubtotal = fcRoomTotals.reduce((sum, { total }) => sum + total, 0);
  const calculatedGrandSubtotal = calculatedInteriorsSubtotal + calculatedFcSubtotal;

  // Use server totals if available, otherwise use calculated
  const interiorsSubtotal = serverInteriorsSubtotal > 0 ? serverInteriorsSubtotal : calculatedInteriorsSubtotal;
  const fcSubtotal = serverFcSubtotal > 0 ? serverFcSubtotal : calculatedFcSubtotal;
  const grandSubtotal = serverGrandSubtotal > 0 ? serverGrandSubtotal : calculatedGrandSubtotal;
  const discountValue = safeN(quotation.discountValue);
  
  // Calculate discount allocation for each tab
  let interiorsDiscountAmount = 0;
  let fcDiscountAmount = 0;
  
  if (quotation.discountType === 'percent') {
    // Percentage discount: apply same percentage to each tab
    interiorsDiscountAmount = (interiorsSubtotal * discountValue) / 100;
    fcDiscountAmount = (fcSubtotal * discountValue) / 100;
  } else {
    // Fixed discount: allocate proportionally based on each tab's share of grand total
    if (grandSubtotal > 0) {
      const interiorsShare = interiorsSubtotal / grandSubtotal;
      const fcShare = fcSubtotal / grandSubtotal;
      interiorsDiscountAmount = discountValue * interiorsShare;
      fcDiscountAmount = discountValue * fcShare;
    }
  }
  
  // Interiors PDF calculations
  const interiorsDiscounted = Math.max(0, interiorsSubtotal - interiorsDiscountAmount);
  const interiorsGst = interiorsDiscounted * 0.18;
  const interiorsFinalTotal = interiorsDiscounted + interiorsGst;
  
  // False Ceiling PDF calculations
  const fcDiscounted = Math.max(0, fcSubtotal - fcDiscountAmount);
  const fcGst = fcDiscounted * 0.18;
  const fcFinalTotal = fcDiscounted + fcGst;

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Screen view with navigation */}
      <div className="print:hidden">
        <AppHeader />
        <QuotationHeader quotationId={quotationId!} currentStep="print" />
      </div>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Screen navigation */}
          <div className="print:hidden flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
                data-testid="button-back-to-estimate"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Estimate
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/quotation/${quotationId}/estimate#terms`)}
                data-testid="button-edit-terms"
              >
                Edit Terms & Conditions
              </Button>
              <Button 
                variant="default" 
                onClick={() => navigate(`/quotation/${quotationId}/agreement`)}
                data-testid="button-view-agreement"
              >
                View Agreement
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  window.location.href = `/api/quotations/${quotationId}/backup/download`;
                }}
                data-testid="button-download-backup-zip"
              >
                <Archive className="mr-2 h-4 w-4" />
                Download Backup ZIP
              </Button>
              <Button 
                variant="default"
                onClick={handleDownloadAgreementPack}
                disabled={isGeneratingPDF}
                data-testid="button-download-agreement-pack"
              >
                <Printer className="mr-2 h-4 w-4" />
                {isGeneratingPDF ? "Generating..." : "Download Agreement Pack"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <Badge 
                variant={
                  quotation.status === "accepted" ? "default" : 
                  quotation.status === "sent" ? "secondary" :
                  quotation.status === "rejected" ? "destructive" :
                  "outline"
                }
                className={
                  quotation.status === "accepted" ? "bg-green-600 hover:bg-green-700" :
                  quotation.status === "sent" ? "bg-blue-600 hover:bg-blue-700" :
                  quotation.status === "rejected" ? "" :
                  ""
                }
                data-testid="badge-quote-status"
              >
                {quotation.status === "draft" && "Draft"}
                {quotation.status === "sent" && "Sent"}
                {quotation.status === "accepted" && "Accepted"}
                {quotation.status === "rejected" && "Rejected"}
              </Badge>

              {/* Status Action Buttons */}
              {quotation.status !== "sent" && quotation.status !== "accepted" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsSentMutation.mutate()}
                  disabled={markAsSentMutation.isPending}
                  data-testid="button-mark-as-sent"
                >
                  Mark as Sent
                </Button>
              )}
              {quotation.status !== "accepted" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => markAsAcceptedMutation.mutate()}
                  disabled={markAsAcceptedMutation.isPending}
                  data-testid="button-mark-as-accepted"
                >
                  Mark as Accepted
                </Button>
              )}
            </div>
          </div>

          {/* Tabs for screen view */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 print:hidden">
              <TabsTrigger value="interiors" data-testid="tab-print-interiors">Interiors</TabsTrigger>
              <TabsTrigger value="false-ceiling" data-testid="tab-print-false-ceiling">False Ceiling</TabsTrigger>
            </TabsList>

            {/* Interiors Tab - Always rendered, visibility controlled by CSS */}
            <div className={activeTab === "interiors" ? "block space-y-6" : "hidden"}>
              {/* Download Button - Screen only */}
              <div className="print:hidden">
                <Button 
                  onClick={() => handleDownloadPDF("interiors")}
                  size="lg"
                  disabled={isGeneratingPDF}
                  data-testid="button-download-interiors-pdf"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  {isGeneratingPDF ? "Generating..." : "Download Interiors PDF"}
                </Button>
              </div>

              {/* Print Content */}
              <div id="print-interiors-root" className="print-content bg-white text-black" data-pdf-ready="true">
                {/* Professional Cover Page - Shows in PDF only */}
                <div className="cover-page">
                  <div className="cover-logo">TRECASA</div>
                  <div className="cover-tagline">Design Studio</div>
                  
                  <div className="cover-divider"></div>
                  
                  <div className="cover-title">
                    Interior Design<br/>Quotation
                  </div>
                  
                  <div className="cover-divider"></div>
                  
                  <div className="cover-details">
                    <div className="mb-3">
                      <strong>For:</strong> {quotation.clientName || "Valued Client"}
                    </div>
                    <div className="mb-3">
                      <strong>Project:</strong> {quotation.projectName || "Untitled Project"}
                    </div>
                    <div className="mb-3">
                      <strong>Quote ID:</strong> {quotation.quoteId}
                    </div>
                    <div>
                      <strong>Date:</strong> {currentDate}
                    </div>
                  </div>
                  
                  <div className="cover-footer">
                    H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad<br/>
                    contact@trecasainfra.com | +91 9059784422
                  </div>
                </div>
                
                {/* PDF Header - Legacy (hidden in print, Puppeteer injects its own) */}
                <div className="cover-header pdf-header bg-[#154734] text-white rounded-t-lg print:rounded-none" style={{minHeight: '110px', padding: '16px 24px', fontFamily: "'Montserrat', Arial, sans-serif", lineHeight: '1.3'}}>
                  <div className="grid grid-cols-[70%_30%] gap-4">
                    {/* Left Column */}
                    <div>
                      {/* Company Name */}
                      <h1 className="text-[15pt] font-semibold uppercase tracking-wide mb-1" style={{letterSpacing: '0.4px'}}>
                        TRECASA DESIGN STUDIO
                      </h1>
                      
                      {/* Company Address */}
                      <p className="text-[8.5pt] mb-2">
                        H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad, Telangana - 500049
                      </p>
                      
                      {/* Client and Project Details */}
                      <div className="text-[9pt] mt-2 space-y-0.5">
                        <div>
                          <span className="font-medium">Client Name:</span> <span>{quotation.clientName || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium">Project Address:</span> <span>{quotation.projectAddress || "N/A"}</span>
                        </div>
                      </div>
                      
                      {/* Greeting Line */}
                      <p className="text-[9.5pt] italic mt-1" style={{fontFamily: "'Playfair Display', Georgia, serif", color: '#EAEAEA', lineHeight: '1.2'}}>
                        Hi {quotation.clientName || "Valued Client"} & Family
                      </p>
                    </div>
                    
                    {/* Right Column */}
                    <div className="text-right">
                      {/* Contact Details */}
                      <div className="mb-2">
                        <p className="text-[8.5pt] mb-0.5">contact@trecasainfra.com</p>
                        <p className="text-[8.5pt] font-semibold">+91 9059784422</p>
                      </div>
                      
                      {/* Issue Date and Quote ID */}
                      <div className="text-[9pt] font-medium mt-2 space-y-1">
                        <div>
                          <span style={{opacity: 0.8}}>Issue Date:</span> <span className="ml-1">{currentDate}</span>
                        </div>
                        <div>
                          <span style={{opacity: 0.8}}>Quote ID:</span> <span className="ml-1">{quotation.quoteId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Footer - Universal Footer */}
                <div className="pdf-footer bg-white border-t border-[#C7A948] flex items-center justify-center" style={{height: '40px', padding: '10px 0', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                  <div className="text-center text-[8pt] text-[#666666]">
                    © 2025 TRECASA DESIGN STUDIO <span className="mx-2">|</span> www.trecasadesignstudio.com <span className="mx-2">|</span> @trecasa.designstudio <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-600 ml-2" style={{verticalAlign: 'middle'}}></span>
                  </div>
                </div>

                {/* PDF Body - Content */}
                <div className="pdf-body print-body-content" style={{padding: '10px 14px', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                  
                  {/* Room Totals Summary - Professional */}
                  <section className="summary-section" style={{marginTop: '10px'}}>
                    <div className="bg-[#154734] text-white px-3 py-1.5 font-semibold text-[11px]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      Roomwise Summary — Interiors
                    </div>
                    <table className="summary-table w-full border-collapse text-[9.5px]">
                      <thead>
                        <tr className="bg-[#154734] text-white">
                          <th className="px-3 py-2 text-left font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Room</th>
                          <th className="px-3 py-2 text-right font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interiorsRoomTotals.map(({room, total}, idx) => (
                          <tr key={room} className="border-b border-gray-200">
                            <td className="px-3 py-2 text-left" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{room}</td>
                            <td className="px-3 py-2 text-right font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{formatINR(total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#FAF8F1] border-t border-[#C7A948]">
                          <td className="px-3 py-2.5 text-left font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Total</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{formatINR(interiorsSubtotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>

                  {/* Price Summary Section */}
                  <section className="price-summary-section" style={{marginTop: '14px'}}>
                    <div className="bg-[#154734] text-[#C7A948] px-3 py-1 font-medium text-[10.5px]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      Price Summary (Interiors)
                    </div>
                    <div className="border border-gray-200 px-3 py-2 text-[9.5px] space-y-1.5" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatINR(interiorsSubtotal)}</span>
                      </div>
                      {interiorsDiscountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):</span>
                          <span className="font-medium">-{formatINR(interiorsDiscountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>GST (18%):</span>
                        <span className="font-medium">{formatINR(interiorsGst)}</span>
                      </div>
                    </div>
                    <div className="bg-[#F8F3D9] border-t-2 border-[#154734] border-b border-[#C7A948] px-3 py-1.5 flex justify-between text-[11.5px] font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      <span>Final Quote Value:</span>
                      <span>{formatINR(interiorsFinalTotal)}</span>
                    </div>
                  </section>

                  {/* Payment Breakdown Section */}
                  <section className="payment-breakdown-section" style={{marginTop: '14px'}}>
                    <h3 className="text-[10pt] font-medium text-[#154734] mb-2" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Payment Breakdown</h3>
                    <div className="text-[9.5px] space-y-0.5" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      <div className="flex justify-between py-1">
                        <span>Token Advance – 10%</span>
                        <span className="font-medium">{formatINR(interiorsFinalTotal * 0.10)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Design Finalisation – 60%</span>
                        <span className="font-medium">{formatINR(interiorsFinalTotal * 0.60)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Mid Execution – 25%</span>
                        <span className="font-medium">{formatINR(interiorsFinalTotal * 0.25)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>After Handover – 5%</span>
                        <span className="font-medium">{formatINR(interiorsFinalTotal * 0.05)}</span>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section C: Detailed Room-wise Breakdown */}
                  <div className="space-y-1 page-break-before" style={{marginTop: '16px'}}>
                    <h3 className="text-[11pt] font-bold text-[#1A1A1A] mb-1.5" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>Detailed Room-wise Breakdown</h3>
                    
                    {sortRoomEntries(Object.entries(interiorsByRoom)).map(([room, items], roomIdx) => {
                      const roomTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
                      
                      return (
                        <section key={room} className="room-block" style={{marginTop: roomIdx === 0 ? '0' : '14px'}}>
                          <h4 className="text-[11pt] font-semibold text-[#154734] mb-1" style={{lineHeight: '1.4', fontFamily: "'Playfair Display', Georgia, serif"}}>{room}</h4>
                          <table className="w-full border-collapse text-[8.5pt]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                            <thead>
                              <tr style={{backgroundColor: '#F2F2F2', height: '26px'}}>
                                <th className="text-left font-semibold" style={{padding: '6px 8px', width: '35mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Description</th>
                                <th className="text-center font-semibold" style={{padding: '6px 5px', width: '18mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>L×H×W</th>
                                <th className="text-center font-semibold" style={{padding: '6px 5px', width: '13mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>SQFT</th>
                                <th className="text-left font-semibold" style={{padding: '6px 5px', width: '22mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Core</th>
                                <th className="text-left font-semibold" style={{padding: '6px 5px', width: '22mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Finish</th>
                                <th className="text-left font-semibold" style={{padding: '6px 5px', width: '18mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>HW</th>
                                <th className="text-right font-semibold" style={{padding: '6px 5px', width: '20mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Rate (₹/sft)</th>
                                <th className="text-right font-semibold" style={{padding: '6px 5px', width: '24mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={item.id} style={{minHeight: '24px', borderBottom: '0.6pt solid #EAEAEA'}}>
                                  <td style={{padding: '5px 6px', color: '#111111', fontSize: '8pt'}}>{item.description || "N/A"}</td>
                                  <td className="text-center font-mono tabular-nums" style={{padding: '5px 4px', color: '#111111', fontSize: '7.5pt'}}>
                                    {item.length || "-"}×{item.height || "-"}×{item.width || "-"}
                                  </td>
                                  <td className="text-center font-mono tabular-nums" style={{padding: '5px 4px', color: '#111111', fontSize: '8pt'}}>{item.sqft || "0.00"}</td>
                                  <td style={{padding: '5px 4px', color: '#111111', fontSize: '7.5pt'}}>{item.material || "-"}</td>
                                  <td style={{padding: '5px 4px', color: '#111111', fontSize: '7.5pt'}}>{item.finish || "-"}</td>
                                  <td style={{padding: '5px 4px', color: '#111111', fontSize: '7.5pt'}}>{item.hardware || "-"}</td>
                                  <td className="text-right font-mono tabular-nums" style={{padding: '5px 4px', color: '#111111', fontSize: '8pt'}}>
                                    ₹{item.unitPrice || "0"}{item.isRateOverridden ? "*" : ""}
                                  </td>
                                  <td className="text-right font-mono tabular-nums" style={{padding: '5px 4px', color: '#111111', fontSize: '8pt'}}>₹{item.totalPrice || "0"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Room Subtotal Bar */}
                          <div className="flex justify-between items-center text-white font-medium text-[9.5pt]" style={{backgroundColor: '#154734', padding: '6px 10px', height: '26px', lineHeight: '1.2', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                            <span>Room Subtotal:</span>
                            <span>{formatINR(roomTotal)}</span>
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  {/* Custom Rate Legend (if any rates are overridden) */}
                  {interiorItems.some(item => item.isRateOverridden) && (
                    <div className="text-[8px] text-gray-600 mt-2 mb-4 break-inside-avoid">
                      <span className="font-semibold">*</span> Custom rate applied
                    </div>
                  )}

                  {/* Section D: Notes/Terms */}
                  <div className="space-y-1 break-inside-avoid page-break-before" style={{marginTop: '14px'}}>
                    <h3 className="text-[10pt] font-medium text-[#154734] mb-2" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>TERMS & CONDITIONS</h3>
                    <ul className="text-[9.5px] space-y-1 list-disc list-inside text-gray-700" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      {(() => {
                        const terms = quotation.terms?.interiors;
                        
                        // Calculate validity expiration date
                        const validDays = Number(terms?.vars?.validDays || 15);
                        const quoteDate = quotation.createdAt ? new Date(quotation.createdAt) : new Date();
                        const expiryDate = new Date(quoteDate);
                        expiryDate.setDate(expiryDate.getDate() + validDays);
                        const validUntilDate = dateFormat(expiryDate.getTime());
                        
                        const lines = terms?.useDefault
                          ? renderTerms(defaultTerms.default_interiors, {
                              clientName: quotation.clientName,
                              projectName: quotation.projectName,
                              quoteId: quotation.quoteId,
                              validUntilDate,
                              ...terms.vars
                            }, interiorItems.map(item => ({
                              material: item.material,
                              finish: item.finish,
                              hardware: item.hardware
                            })))
                          : (terms?.customText || "").split('\n').filter(line => line.trim());
                        return lines.map((line, idx) => {
                          // Check if line has a title (text before first colon)
                          const colonIndex = line.indexOf(':');
                          if (colonIndex > 0 && colonIndex < 50) { // Title should be reasonable length
                            const title = line.substring(0, colonIndex + 1);
                            const rest = line.substring(colonIndex + 1);
                            return <li key={idx}><strong>{title}</strong>{rest}</li>;
                          }
                          return <li key={idx}>{line}</li>;
                        });
                      })()}
                    </ul>
                  </div>

                  {/* Signatures */}
                  <div className="mt-2 border border-gray-300 rounded-lg p-3 space-y-2 break-inside-avoid" data-testid="signature-block-interiors">
                    <h3 className="text-sm font-semibold text-[#154734] border-t-2 border-[#C7A948] pt-2 border-b border-gray-300 pb-1" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>SIGNATURES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Client Signature */}
                      <div className="space-y-2 break-inside-avoid">
                        <p className="text-[8px] uppercase text-gray-600 tracking-wide" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>Client</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[8px] text-gray-500">Name:</p>
                            <p className="text-xs font-medium">{quotation.signoff?.client?.name || quotation.clientName || "_____________"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Signature:</p>
                            {quotation.signoff?.client?.signature ? (
                              <p className="text-sm font-serif italic text-gray-800">{quotation.signoff.client.signature}</p>
                            ) : (
                              <p className="text-xs text-gray-400">_____________</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Date:</p>
                            <p className="text-xs">
                              {quotation.signoff?.client?.signedAt ? dateFormat(quotation.signoff.client.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Trecasa Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-[8px] uppercase text-gray-600 tracking-wide" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>
                          {quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO"}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[8px] text-gray-500">Name:</p>
                            <p className="text-xs font-medium">{quotation.signoff?.trecasa?.name || "Authorized Signatory"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Signature:</p>
                            {quotation.signoff?.trecasa?.signature ? (
                              <p className="text-sm font-serif italic text-gray-800">{quotation.signoff.trecasa.signature}</p>
                            ) : (
                              <p className="text-xs text-gray-400">_____________</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Date:</p>
                            <p className="text-xs">
                              {quotation.signoff?.trecasa?.signedAt ? dateFormat(quotation.signoff.trecasa.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* False Ceiling Tab - Always rendered, visibility controlled by CSS */}
            <div className={activeTab === "false-ceiling" ? "block space-y-6" : "hidden"}>
              {/* Download Button - Screen only */}
              <div className="print:hidden">
                <Button 
                  onClick={() => handleDownloadPDF("false-ceiling")}
                  size="lg"
                  disabled={isGeneratingPDF}
                  data-testid="button-download-fc-pdf"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  {isGeneratingPDF ? "Generating..." : "Download False Ceiling PDF"}
                </Button>
              </div>

              {/* Print Content */}
              <div id="print-fc-root" className="print-content bg-white text-black" data-pdf-ready="true">
                {/* Professional Cover Page - Shows in PDF only */}
                <div className="cover-page">
                  <div className="cover-logo">TRECASA</div>
                  <div className="cover-tagline">Design Studio</div>
                  
                  <div className="cover-divider"></div>
                  
                  <div className="cover-title">
                    False Ceiling<br/>Quotation
                  </div>
                  
                  <div className="cover-divider"></div>
                  
                  <div className="cover-details">
                    <div className="mb-3">
                      <strong>For:</strong> {quotation.clientName || "Valued Client"}
                    </div>
                    <div className="mb-3">
                      <strong>Project:</strong> {quotation.projectName || "Untitled Project"}
                    </div>
                    <div className="mb-3">
                      <strong>Quote ID:</strong> {quotation.quoteId}
                    </div>
                    <div>
                      <strong>Date:</strong> {currentDate}
                    </div>
                  </div>
                  
                  <div className="cover-footer">
                    H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad<br/>
                    contact@trecasainfra.com | +91 9059784422
                  </div>
                </div>
                
                {/* PDF Header - Legacy (hidden in print, Puppeteer injects its own) */}
                <div className="cover-header pdf-header bg-[#154734] text-white rounded-t-lg print:rounded-none" style={{minHeight: '110px', padding: '16px 24px', fontFamily: "'Montserrat', Arial, sans-serif", lineHeight: '1.3'}}>
                  <div className="grid grid-cols-[70%_30%] gap-4">
                    {/* Left Column */}
                    <div>
                      {/* Company Name */}
                      <h1 className="text-[15pt] font-semibold uppercase tracking-wide mb-1" style={{letterSpacing: '0.4px'}}>
                        TRECASA DESIGN STUDIO
                      </h1>
                      
                      {/* Company Address */}
                      <p className="text-[8.5pt] mb-2">
                        H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad, Telangana - 500049
                      </p>
                      
                      {/* Client and Project Details */}
                      <div className="text-[9pt] mt-2 space-y-0.5">
                        <div>
                          <span className="font-medium">Client Name:</span> <span>{quotation.clientName || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-medium">Project Address:</span> <span>{quotation.projectAddress || "N/A"}</span>
                        </div>
                      </div>
                      
                      {/* Greeting Line */}
                      <p className="text-[9.5pt] italic mt-1" style={{fontFamily: "'Playfair Display', Georgia, serif", color: '#EAEAEA', lineHeight: '1.2'}}>
                        Hi {quotation.clientName || "Valued Client"} & Family
                      </p>
                    </div>
                    
                    {/* Right Column */}
                    <div className="text-right">
                      {/* Contact Details */}
                      <div className="mb-2">
                        <p className="text-[8.5pt] mb-0.5">contact@trecasainfra.com</p>
                        <p className="text-[8.5pt] font-semibold">+91 9059784422</p>
                      </div>
                      
                      {/* Issue Date and Quote ID */}
                      <div className="text-[9pt] font-medium mt-2 space-y-1">
                        <div>
                          <span style={{opacity: 0.8}}>Issue Date:</span> <span className="ml-1">{currentDate}</span>
                        </div>
                        <div>
                          <span style={{opacity: 0.8}}>Quote ID:</span> <span className="ml-1">{quotation.quoteId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Footer - Universal Footer */}
                <div className="pdf-footer bg-white border-t border-[#C7A948] flex items-center justify-center" style={{height: '40px', padding: '10px 0', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                  <div className="text-center text-[8pt] text-[#666666]">
                    © 2025 TRECASA DESIGN STUDIO <span className="mx-2">|</span> www.trecasadesignstudio.com <span className="mx-2">|</span> @trecasa.designstudio <span className="inline-block w-[5px] h-[5px] rounded-full bg-red-600 ml-2" style={{verticalAlign: 'middle'}}></span>
                  </div>
                </div>

                {/* PDF Body - Content */}
                <div className="pdf-body print-body-content" style={{padding: '10px 14px', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                  
                  {/* Room Totals Summary - Professional */}
                  {fcRoomTotals.length > 0 && (
                    <>
                      <section className="summary-section" style={{marginTop: '10px'}}>
                        <div className="bg-[#154734] text-white px-3 py-1.5 font-semibold text-[11px]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                          Roomwise Summary — False Ceiling
                        </div>
                        <table className="summary-table w-full border-collapse text-[9.5px]">
                          <thead>
                            <tr className="bg-[#154734] text-white">
                              <th className="px-3 py-1.5 text-center font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Room</th>
                              <th className="px-3 py-1.5 text-right font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fcRoomTotals.map(({room, total}) => (
                              <tr key={room} className="border-b border-gray-200">
                                <td className="px-2 py-1 text-left" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{room}</td>
                                <td className="px-2 py-1 text-right font-medium" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{formatINR(total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#FAF8F1] border-t border-[#C7A948]">
                              <td className="px-2 py-2 text-left font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Total</td>
                              <td className="px-2 py-2 text-right font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>{formatINR(fcSubtotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </section>
                    </>
                  )}

                  {/* Price Summary Section */}
                  {fcRoomTotals.length > 0 && (
                    <section className="price-summary-section" style={{marginTop: '14px'}}>
                      <div className="bg-[#154734] text-[#C7A948] px-3 py-1 font-medium text-[10.5px]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                        Price Summary (False Ceiling)
                      </div>
                      <div className="border border-gray-200 px-3 py-2 text-[9.5px] space-y-1.5" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-medium">{formatINR(fcSubtotal)}</span>
                        </div>
                        {fcDiscountAmount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):</span>
                            <span className="font-medium">-{formatINR(fcDiscountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>GST (18%):</span>
                          <span className="font-medium">{formatINR(fcGst)}</span>
                        </div>
                      </div>
                      <div className="bg-[#F8F3D9] border-t-2 border-[#154734] border-b border-[#C7A948] px-3 py-1.5 flex justify-between text-[11.5px] font-semibold text-[#154734]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                        <span>Final Quote Value:</span>
                        <span>{formatINR(fcFinalTotal)}</span>
                      </div>
                    </section>
                  )}

                  {/* Payment Breakdown Section */}
                  {fcRoomTotals.length > 0 && (
                    <section className="payment-breakdown-section" style={{marginTop: '14px'}}>
                      <h3 className="text-[10pt] font-medium text-[#154734] mb-2" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>Payment Breakdown</h3>
                      <div className="text-[9.5px] space-y-0.5" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                        <div className="flex justify-between py-1">
                          <span>Token Advance – 10%</span>
                          <span className="font-medium">{formatINR(fcFinalTotal * 0.10)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Design Finalisation – 60%</span>
                          <span className="font-medium">{formatINR(fcFinalTotal * 0.60)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Mid Execution – 25%</span>
                          <span className="font-medium">{formatINR(fcFinalTotal * 0.25)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>After Handover – 5%</span>
                          <span className="font-medium">{formatINR(fcFinalTotal * 0.05)}</span>
                        </div>
                      </div>
                    </section>
                  )}
                  
                  {/* Section C: Detailed Room-wise Breakdown - False Ceiling */}
                  {falseCeilingItems.length > 0 && (
                    <div className="space-y-1 page-break-before" style={{marginTop: '16px'}}>
                      <h3 className="text-[11pt] font-bold text-[#1A1A1A] mb-1.5" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>Detailed Room-wise Breakdown</h3>
                      
                      {sortRoomEntries(Object.entries(falseCeilingByRoom)).map(([room, items], roomIdx) => {
                        const roomArea = items.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);
                        const roomTotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
                        
                        return (
                          <section key={room} className="room-block" style={{marginTop: roomIdx === 0 ? '0' : '14px'}}>
                            <h4 className="text-[11pt] font-semibold text-[#154734] mb-1" style={{lineHeight: '1.4', fontFamily: "'Playfair Display', Georgia, serif"}}>{room}</h4>
                            <table className="w-full border-collapse text-[9pt]" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                              <thead>
                                <tr style={{backgroundColor: '#F2F2F2', height: '26px'}}>
                                  <th className="text-left font-semibold" style={{padding: '6px 10px', width: '60mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Description</th>
                                  <th className="text-center font-semibold" style={{padding: '6px 8px', width: '20mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>L×W</th>
                                  <th className="text-center font-semibold" style={{padding: '6px 8px', width: '20mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>SQFT</th>
                                  <th className="text-right font-semibold" style={{padding: '6px 8px', width: '25mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Price (₹/sft)</th>
                                  <th className="text-right font-semibold" style={{padding: '6px 10px', width: '30mm', borderBottom: '1px solid #E0E0E0', fontSize: '8pt'}}>Total (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const unitPrice = parseFloat(item.unitPrice || "0");
                                  const total = parseFloat(item.totalPrice || "0");
                                  
                                  return (
                                    <tr key={item.id} style={{minHeight: '24px', borderBottom: '0.6pt solid #EAEAEA'}}>
                                      <td style={{padding: '5px 8px', color: '#111111', fontSize: '8pt'}}>{item.description || "N/A"}</td>
                                      <td className="text-center font-mono tabular-nums" style={{padding: '5px 6px', color: '#111111', fontSize: '7.5pt'}}>
                                        {item.length || "-"}×{item.width || "-"}
                                      </td>
                                      <td className="text-center font-mono tabular-nums" style={{padding: '5px 6px', color: '#111111', fontSize: '8pt'}}>{item.area || "0.00"}</td>
                                      <td className="text-right font-mono tabular-nums" style={{padding: '5px 6px', color: '#111111', fontSize: '8pt'}}>₹{unitPrice.toFixed(2)}</td>
                                      <td className="text-right font-mono tabular-nums" style={{padding: '5px 8px', color: '#111111', fontSize: '8pt'}}>{formatINR(total)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {/* Room Subtotal Bar */}
                            <div className="flex justify-between items-center text-white font-medium text-[9.5pt]" style={{backgroundColor: '#154734', padding: '6px 10px', height: '26px', lineHeight: '1.2', fontFamily: "'Montserrat', Arial, sans-serif"}}>
                              <span>Room Total:</span>
                              <span>{formatINR(roomTotal)}</span>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}

                  {/* Section C: OTHERS */}
                  {otherItems.length > 0 && (
                    <div className="space-y-1 break-inside-avoid">
                      <h3 className="text-sm font-semibold text-[#154734] border-b border-gray-300 pb-1">OTHERS</h3>
                      <table className="w-full text-xs zebra-table">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1.5 text-left">Item Type</th>
                            <th className="px-2 py-1.5 text-left">Description</th>
                            <th className="px-2 py-1.5 text-center w-28">Type</th>
                            <th className="px-2 py-1.5 text-right w-32">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {otherItems.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-1.5 font-semibold">{item.itemType || "N/A"}</td>
                              <td className="px-2 py-1.5">{item.description || "N/A"}</td>
                              <td className="px-2 py-1.5 text-center capitalize">{item.valueType || "lumpsum"}</td>
                              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{item.value || "0"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section D: Summary */}
                  <div className="summary-totals space-y-1 break-inside-avoid">
                    <h3 className="text-sm font-semibold text-[#154734] border-b border-gray-300 pb-1">SUMMARY</h3>
                    <table className="w-full max-w-md ml-auto text-xs">
                      <tbody>
                        <tr className="row">
                          <td className="py-1 text-right pr-4">False Ceiling Subtotal:</td>
                          <td className="py-1 text-right font-mono tabular-nums font-semibold">{formatINR(fcSubtotal)}</td>
                        </tr>
                        {fcDiscountAmount > 0 && (
                          <tr className="row">
                            <td className="py-1 text-right pr-4">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="py-1 text-right font-mono tabular-nums text-red-600">-{formatINR(fcDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr className="row">
                          <td className="py-1 text-right pr-4">GST (18%):</td>
                          <td className="py-1 text-right font-mono tabular-nums">{formatINR(fcGst)}</td>
                        </tr>
                        <tr className="final-total row border-t-2 border-[#C7A948]">
                          <td className="py-3 text-right pr-4">
                            <div className="text-[8px] text-[#154734] mb-1" style={{fontFamily: "'Montserrat', sans-serif"}}>Final False Ceiling Quote</div>
                          </td>
                          <td className="py-3 text-right">
                            <div className="text-sm font-bold tabular-nums" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>
                              <span className="text-[#C42021]">₹</span>
                              <span className="text-[#154734]">{formatINR(fcFinalTotal).replace('₹', '')}</span>
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1" style={{fontFamily: "'Montserrat', sans-serif"}}>Rounded off to nearest rupee</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notes/Terms */}
                  <div className="space-y-1 break-inside-avoid page-break-before" style={{marginTop: '14px'}}>
                    <h3 className="text-[10pt] font-medium text-[#154734] mb-2" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>TERMS & CONDITIONS</h3>
                    <ul className="text-[9.5px] space-y-1 list-disc list-inside text-gray-700" style={{fontFamily: "'Montserrat', Arial, sans-serif"}}>
                      {(() => {
                        const terms = quotation.terms?.falseCeiling;
                        
                        // Calculate validity expiration date
                        const validDays = Number(terms?.vars?.validDays || 15);
                        const quoteDate = quotation.createdAt ? new Date(quotation.createdAt) : new Date();
                        const expiryDate = new Date(quoteDate);
                        expiryDate.setDate(expiryDate.getDate() + validDays);
                        const validUntilDate = dateFormat(expiryDate.getTime());
                        
                        const lines = terms?.useDefault
                          ? renderTerms(defaultTerms.default_false_ceiling, {
                              clientName: quotation.clientName,
                              projectName: quotation.projectName,
                              quoteId: quotation.quoteId,
                              validUntilDate,
                              ...terms.vars
                            }, interiorItems.map(item => ({
                              material: item.material,
                              finish: item.finish,
                              hardware: item.hardware
                            })))
                          : (terms?.customText || "").split('\n').filter(line => line.trim());
                        return lines.map((line, idx) => {
                          // Check if line has a title (text before first colon)
                          const colonIndex = line.indexOf(':');
                          if (colonIndex > 0 && colonIndex < 50) { // Title should be reasonable length
                            const title = line.substring(0, colonIndex + 1);
                            const rest = line.substring(colonIndex + 1);
                            return <li key={idx}><strong>{title}</strong>{rest}</li>;
                          }
                          return <li key={idx}>{line}</li>;
                        });
                      })()}
                    </ul>
                  </div>

                  {/* Signatures */}
                  <div className="mt-2 border border-gray-300 rounded-lg p-3 space-y-2 break-inside-avoid" data-testid="signature-block-false-ceiling">
                    <h3 className="text-sm font-semibold text-[#154734] border-t-2 border-[#C7A948] pt-2 border-b border-gray-300 pb-1" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>SIGNATURES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Client Signature */}
                      <div className="space-y-2 break-inside-avoid">
                        <p className="text-[8px] uppercase text-gray-600 tracking-wide" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>Client</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[8px] text-gray-500">Name:</p>
                            <p className="text-xs font-medium">{quotation.signoff?.client?.name || quotation.clientName || "_____________"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Signature:</p>
                            {quotation.signoff?.client?.signature ? (
                              <p className="text-sm font-serif italic text-gray-800">{quotation.signoff.client.signature}</p>
                            ) : (
                              <p className="text-xs text-gray-400">_____________</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Date:</p>
                            <p className="text-xs">
                              {quotation.signoff?.client?.signedAt ? dateFormat(quotation.signoff.client.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Trecasa Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-[8px] uppercase text-gray-600 tracking-wide" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500}}>
                          {quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO"}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[8px] text-gray-500">Name:</p>
                            <p className="text-xs font-medium">{quotation.signoff?.trecasa?.name || "Authorized Signatory"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Signature:</p>
                            {quotation.signoff?.trecasa?.signature ? (
                              <p className="text-sm font-serif italic text-gray-800">{quotation.signoff.trecasa.signature}</p>
                            ) : (
                              <p className="text-xs text-gray-400">_____________</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-500">Date:</p>
                            <p className="text-xs">
                              {quotation.signoff?.trecasa?.signedAt ? dateFormat(quotation.signoff.trecasa.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </main>

      <div className="print:hidden">
        <AppFooter />
      </div>
    </div>
  );
}
