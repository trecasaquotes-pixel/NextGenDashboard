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

export default function Print() {
  const [match, params] = useRoute("/quotation/:id/print");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"interiors" | "false-ceiling">("interiors");

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
    try {
      const elementId = type === "interiors" ? "print-interiors-root" : "print-fc-root";
      const element = document.getElementById(elementId);
      
      if (!element) {
        throw new Error(`Element ${elementId} not found`);
      }

      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your PDF",
      });

      const pdfBytes = await htmlToPdfBytes(element);
      const typeLabel = type === "interiors" ? "Interiors" : "FalseCeiling";
      const filename = `TRECASA_${quotation.quoteId}_${typeLabel}.pdf`;
      
      await downloadBytesAs(filename, pdfBytes);

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
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

  if (!match || authLoading || !isAuthenticated || !quotation) {
    return null;
  }

  // Calculate totals for each PDF separately
  const interiorsSubtotal = safeN(quotation.totals?.interiorsSubtotal);
  const fcSubtotal = safeN(quotation.totals?.fcSubtotal);
  const grandSubtotal = safeN(quotation.totals?.grandSubtotal);
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
  const interiorsRoomTotals = Object.entries(interiorsByRoom).map(([room, items]) => ({
    room,
    total: items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  }));

  const fcRoomTotals = Object.entries(falseCeilingByRoom).map(([room, items]) => ({
    room,
    total: items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  }));

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

            {/* Interiors Tab */}
            <TabsContent value="interiors" className="space-y-6">
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
                {/* PDF Header - Fixed */}
                <div className="pdf-header bg-[#0E2F1B] text-white p-6 rounded-t-lg print:rounded-none">
                  <div className="brand-row flex items-center justify-between">
                    <div className="brand-left">
                      <h1 className="text-3xl font-bold mb-2">TRECASA DESIGN STUDIO</h1>
                      <p className="text-[#D1B77C] text-sm">Luxury Interiors | Architecture | Build</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm space-y-1 header-meta">
                        <div><strong>Client:</strong> {quotation.clientName || "N/A"}</div>
                        <div><strong>Quote ID:</strong> {quotation.quoteId}</div>
                        <div><strong>Date:</strong> {currentDate}</div>
                        <div><strong>Project:</strong> {quotation.projectName || "N/A"}</div>
                      </div>
                      <div className="brand-right">
                        <span className="status-dot" aria-hidden="true" style={{width: '10px', height: '10px', background: '#C42021', borderRadius: '50%', display: 'inline-block', transform: 'translateY(1px)'}}></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Footer - Fixed */}
                <div className="pdf-footer">
                  <div>© 2025 TRECASA DESIGN STUDIO</div>
                  <div>www.trecasadesignstudio.com | @trecasa.designstudio</div>
                  <div className="flex items-center gap-2">
                    <span className="page-num"></span>
                    <span className="dot" style={{width: '8px', height: '8px', background: '#C42021', borderRadius: '50%', display: 'inline-block'}}></span>
                  </div>
                </div>

                {/* PDF Body - Content */}
                <div className="pdf-body p-8 space-y-8">
                  {/* Title */}
                  <div className="text-center border-b-2 border-[#D1B77C] pb-4">
                    <h2 className="text-2xl font-bold text-[#0E2F1B]">INTERIORS QUOTATION</h2>
                  </div>

                  {/* Room Totals Summary - Part 2A */}
                  <section className="summary-section space-y-6">
                    <h2 className="text-xl font-bold text-[#0F3A2B]" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>ROOM TOTALS — INTERIORS</h2>
                    <table className="summary-table w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#F3F6F5]">
                          <th className="border-b border-[#E6E6E6] px-3 py-2 text-left font-semibold">Room</th>
                          <th className="border-b border-[#E6E6E6] px-3 py-2 text-right font-semibold">Subtotal (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interiorsRoomTotals.map(({room, total}) => (
                          <tr key={room}>
                            <td className="border-b border-[#E6E6E6] px-3 py-2">{room}</td>
                            <td className="border-b border-[#E6E6E6] px-3 py-2 text-right font-mono">{formatINR(total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="summary-grand">
                          <td className="border-t-2 border-[#D1B77C] px-3 py-2 text-right font-bold">Interiors Subtotal</td>
                          <td className="border-t-2 border-[#D1B77C] px-3 py-2 text-right font-mono font-bold">{formatINR(interiorsSubtotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>

                  {/* Force detailed breakdown to start on fresh page */}
                  <div className="page-break"></div>

                  {/* Section A: Project Summary */}
                  <div className="space-y-3">
                    <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">PROJECT SUMMARY</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Client Name:</strong> {quotation.clientName || "N/A"}</p>
                        <p><strong>Project Category:</strong> {quotation.projectType || "N/A"}</p>
                      </div>
                      <div>
                        <p><strong>Address:</strong> {quotation.projectAddress || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Room Summary Table */}
                  <div className="space-y-3 break-inside-avoid page-break">
                    <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">ROOM SUMMARY</h3>
                    <table className="summary-table w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left">Room</th>
                          <th className="border border-gray-300 px-3 py-2 text-right">Area (SFT)</th>
                          <th className="border border-gray-300 px-3 py-2 text-right">Items</th>
                          <th className="border border-gray-300 px-3 py-2 text-right">Room Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(interiorsByRoom).map(([room, items]) => {
                          const roomArea = items.reduce((sum, item) => sum + Number(item.sqft || 0), 0);
                          const roomTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
                          return (
                            <tr key={room}>
                              <td className="border border-gray-300 px-3 py-2 text-left font-medium">{room}</td>
                              <td className="border border-gray-300 px-3 py-2 text-right font-mono">{roomArea.toFixed(2)}</td>
                              <td className="border border-gray-300 px-3 py-2 text-right font-mono">{items.length}</td>
                              <td className="border border-gray-300 px-3 py-2 text-right font-mono font-semibold">{formatINR(roomTotal)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right">Subtotal:</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatINR(interiorsSubtotal)}</td>
                        </tr>
                        {interiorsDiscountAmount > 0 && (
                          <tr>
                            <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono text-red-600">-{formatINR(interiorsDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right">GST (18%):</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatINR(interiorsGst)}</td>
                        </tr>
                        <tr className="bg-[#0E2F1B] text-white font-bold">
                          <td colSpan={3} className="border border-gray-300 px-3 py-3 text-right text-base">Grand Total:</td>
                          <td className="border border-gray-300 px-3 py-3 text-right font-mono text-base">{formatINR(interiorsFinalTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section C: Room-wise Breakdown */}
                  <div className="space-y-6 page-break-before">
                    <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">ROOM-WISE BREAKDOWN</h3>
                    
                    {Object.entries(interiorsByRoom).map(([room, items], roomIdx) => {
                      const roomTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
                      const isLastRoom = roomIdx === Object.entries(interiorsByRoom).length - 1;
                      
                      return (
                        <section key={room} className="room-block">
                          <h4 className="room-title font-semibold text-[#0E2F1B] mb-2" style={{margin: '10mm 0 4mm', fontFamily: "'Playfair Display', Georgia, serif"}}>{room}</h4>
                          <table className="room-table w-full text-sm border-collapse zebra-table">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                                <th className="border border-gray-300 px-2 py-1 text-center w-16">L</th>
                                <th className="border border-gray-300 px-2 py-1 text-center w-16">H</th>
                                <th className="border border-gray-300 px-2 py-1 text-center w-16">W</th>
                                <th className="border border-gray-300 px-2 py-1 text-center w-20">SQFT</th>
                                <th className="border border-gray-300 px-2 py-1 text-right w-24">Rate (₹/sft)</th>
                                <th className="border border-gray-300 px-2 py-1 text-right w-28">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-300 px-2 py-1">{item.description || "N/A"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{item.length || "-"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{item.height || "-"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{item.width || "-"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-center font-mono font-semibold">{item.sqft || "0.00"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{item.unitPrice || "0"}</td>
                                  <td className="border border-gray-300 px-2 py-1 text-right font-mono font-semibold">₹{item.totalPrice || "0"}</td>
                                </tr>
                              ))}
                              <tr className="room-subtotal bg-[#0F3A2B] text-white font-semibold">
                                <td colSpan={6} className="border border-[#0A2A1F] px-2 py-2 text-right">Room Subtotal:</td>
                                <td className="border border-[#0A2A1F] px-2 py-2 text-right font-mono">{formatINR(roomTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                      );
                    })}
                  </div>

                  {/* Section C: Summary */}
                  <div className="summary-totals space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">SUMMARY</h3>
                    <table className="w-full max-w-md ml-auto text-sm">
                      <tbody>
                        <tr className="row">
                          <td className="py-1 text-right pr-4">Interiors Subtotal:</td>
                          <td className="py-1 text-right font-mono font-semibold">{formatINR(interiorsSubtotal)}</td>
                        </tr>
                        {interiorsDiscountAmount > 0 && (
                          <tr className="row">
                            <td className="py-1 text-right pr-4">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="py-1 text-right font-mono text-red-600">-{formatINR(interiorsDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr className="row">
                          <td className="py-1 text-right pr-4">GST (18%):</td>
                          <td className="py-1 text-right font-mono">{formatINR(interiorsGst)}</td>
                        </tr>
                        <tr className="final-total row border-t-2 border-[#D1B77C]">
                          <td className="py-2 text-right pr-4 text-lg font-bold text-[#0E2F1B]" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>Final Interiors Quote:</td>
                          <td className="py-2 text-right font-mono text-lg font-bold text-[#0E2F1B]">{formatINR(interiorsFinalTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section D: Notes/Terms */}
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">TERMS & CONDITIONS</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                      {(() => {
                        const terms = quotation.terms?.interiors;
                        const lines = terms?.useDefault
                          ? renderTerms(defaultTerms.default_interiors, {
                              clientName: quotation.clientName,
                              projectName: quotation.projectName,
                              quoteId: quotation.quoteId,
                              ...terms.vars
                            })
                          : (terms?.customText || "").split('\n').filter(line => line.trim());
                        return lines.map((line, idx) => <li key={idx}>{line}</li>);
                      })()}
                    </ul>
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 border border-gray-300 rounded-lg p-6 space-y-4 break-inside-avoid" data-testid="signature-block-interiors">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">SIGNATURES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Client Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-xs font-semibold uppercase text-gray-600 tracking-wide">Client</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Name:</p>
                            <p className="text-sm font-medium">{quotation.signoff?.client?.name || quotation.clientName || "_____________"}</p>
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
                              {quotation.signoff?.client?.signedAt ? dateFormat(quotation.signoff.client.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Trecasa Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-xs font-semibold uppercase text-gray-600 tracking-wide">
                          {quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO"}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Name:</p>
                            <p className="text-sm font-medium">{quotation.signoff?.trecasa?.name || "Authorized Signatory"}</p>
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
                              {quotation.signoff?.trecasa?.signedAt ? dateFormat(quotation.signoff.trecasa.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* False Ceiling Tab */}
            <TabsContent value="false-ceiling" className="space-y-6">
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
                {/* PDF Header - Fixed */}
                <div className="pdf-header bg-[#0E2F1B] text-white p-6 rounded-t-lg print:rounded-none">
                  <div className="brand-row flex items-center justify-between">
                    <div className="brand-left">
                      <h1 className="text-3xl font-bold mb-2">TRECASA DESIGN STUDIO</h1>
                      <p className="text-[#D1B77C] text-sm">Luxury Interiors | Architecture | Build</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm space-y-1 header-meta">
                        <div><strong>Client:</strong> {quotation.clientName || "N/A"}</div>
                        <div><strong>Quote ID:</strong> {quotation.quoteId}</div>
                        <div><strong>Date:</strong> {currentDate}</div>
                        <div><strong>Project:</strong> {quotation.projectName || "N/A"}</div>
                      </div>
                      <div className="brand-right">
                        <span className="status-dot" aria-hidden="true" style={{width: '10px', height: '10px', background: '#C42021', borderRadius: '50%', display: 'inline-block', transform: 'translateY(1px)'}}></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Footer - Fixed */}
                <div className="pdf-footer">
                  <div>© 2025 TRECASA DESIGN STUDIO</div>
                  <div>www.trecasadesignstudio.com | @trecasa.designstudio</div>
                  <div className="flex items-center gap-2">
                    <span className="page-num"></span>
                    <span className="dot" style={{width: '8px', height: '8px', background: '#C42021', borderRadius: '50%', display: 'inline-block'}}></span>
                  </div>
                </div>

                {/* PDF Body - Content */}
                <div className="pdf-body p-8 space-y-8">
                  {/* Title */}
                  <div className="text-center border-b-2 border-[#D1B77C] pb-4">
                    <h2 className="text-2xl font-bold text-[#0E2F1B]">FALSE CEILING QUOTATION</h2>
                  </div>

                  {/* Room Totals Summary - Part 2A */}
                  {fcRoomTotals.length > 0 && (
                    <>
                      <section className="summary-section space-y-6">
                        <h2 className="text-xl font-bold text-[#0F3A2B]" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>ROOM TOTALS — FALSE CEILING</h2>
                        <table className="summary-table w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-[#F3F6F5]">
                              <th className="border-b border-[#E6E6E6] px-3 py-2 text-left font-semibold">Room</th>
                              <th className="border-b border-[#E6E6E6] px-3 py-2 text-right font-semibold">Subtotal (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fcRoomTotals.map(({room, total}) => (
                              <tr key={room}>
                                <td className="border-b border-[#E6E6E6] px-3 py-2">{room}</td>
                                <td className="border-b border-[#E6E6E6] px-3 py-2 text-right font-mono">{formatINR(total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="summary-grand">
                              <td className="border-t-2 border-[#D1B77C] px-3 py-2 text-right font-bold">False Ceiling Subtotal</td>
                              <td className="border-t-2 border-[#D1B77C] px-3 py-2 text-right font-mono font-bold">{formatINR(fcSubtotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </section>

                      {/* Force detailed breakdown to start on fresh page */}
                      <div className="page-break"></div>
                    </>
                  )}

                  {/* Section A: Project Summary */}
                  <div className="space-y-3">
                    <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">PROJECT SUMMARY</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Client Name:</strong> {quotation.clientName || "N/A"}</p>
                        <p><strong>Project Category:</strong> {quotation.projectType || "N/A"}</p>
                      </div>
                      <div>
                        <p><strong>Address:</strong> {quotation.projectAddress || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Room Summary Table */}
                  {falseCeilingItems.length > 0 && (
                    <div className="space-y-3 break-inside-avoid page-break">
                      <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">ROOM SUMMARY</h3>
                      <table className="summary-table w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left">Room</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">FC Area (SFT)</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(falseCeilingByRoom).map(([room, items]) => {
                            const roomArea = items.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);
                            return (
                              <tr key={room}>
                                <td className="border border-gray-300 px-3 py-2 text-left font-medium">{room}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">{roomArea.toFixed(2)}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">{items.length}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {/* Others Items Summary */}
                      {otherItems.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-[#0E2F1B] mb-2">Other Items</h4>
                          <table className="summary-table w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-3 py-2 text-left">Item Type</th>
                                <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                                <th className="border border-gray-300 px-3 py-2 text-center">Type</th>
                                <th className="border border-gray-300 px-3 py-2 text-right">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {otherItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="border border-gray-300 px-3 py-2 font-medium">{item.itemType || "N/A"}</td>
                                  <td className="border border-gray-300 px-3 py-2">{item.description || "N/A"}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-center capitalize">{item.valueType || "lumpsum"}</td>
                                  <td className="border border-gray-300 px-3 py-2 text-right font-mono">{item.value || "0"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Totals */}
                      <table className="summary-table w-full border-collapse text-sm mt-4">
                        <tbody>
                          <tr className="bg-gray-100 font-semibold">
                            <td colSpan={2} className="border border-gray-300 px-3 py-2 text-right">Subtotal:</td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatINR(fcSubtotal)}</td>
                          </tr>
                          {fcDiscountAmount > 0 && (
                            <tr>
                              <td colSpan={2} className="border border-gray-300 px-3 py-2 text-right">
                                Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-right font-mono text-red-600">-{formatINR(fcDiscountAmount)}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={2} className="border border-gray-300 px-3 py-2 text-right">GST (18%):</td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatINR(fcGst)}</td>
                          </tr>
                          <tr className="bg-[#0E2F1B] text-white font-bold">
                            <td colSpan={2} className="border border-gray-300 px-3 py-3 text-right text-base">Grand Total:</td>
                            <td className="border border-gray-300 px-3 py-3 text-right font-mono text-base">{formatINR(fcFinalTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section C: Room-wise False Ceiling Breakdown */}
                  {falseCeilingItems.length > 0 && (
                    <div className="space-y-6 page-break-before">
                      <h3 className="section-title text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">ROOM-WISE FALSE CEILING BREAKDOWN</h3>
                      
                      {Object.entries(falseCeilingByRoom).map(([room, items], roomIdx) => {
                        const roomArea = items.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);
                        const isLastRoom = roomIdx === Object.entries(falseCeilingByRoom).length - 1;
                        
                        return (
                          <section key={room} className="room-block">
                            <h4 className="room-title font-semibold text-[#0E2F1B] mb-2" style={{margin: '10mm 0 4mm', fontFamily: "'Playfair Display', Georgia, serif"}}>{room}</h4>
                            <table className="room-table w-full text-sm border-collapse zebra-table">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-20">L (ft)</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-20">W (ft)</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center w-24">Area (SQFT)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => (
                                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-2 py-1">{item.description || "N/A"}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-center font-mono">{item.length || "-"}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-center font-mono">{item.width || "-"}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-center font-mono font-semibold">{item.area || "0.00"}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[#0E2F1B] text-white font-semibold">
                                  <td colSpan={3} className="border border-gray-300 px-2 py-2 text-right">Room Area:</td>
                                  <td className="border border-gray-300 px-2 py-2 text-center font-mono">{roomArea.toFixed(2)} SQFT</td>
                                </tr>
                              </tbody>
                            </table>
                          </section>
                        );
                      })}
                    </div>
                  )}

                  {/* Section C: OTHERS */}
                  {otherItems.length > 0 && (
                    <div className="space-y-4 break-inside-avoid">
                      <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">OTHERS</h3>
                      <table className="w-full text-sm border-collapse zebra-table">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-2 py-1 text-left">Item Type</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                            <th className="border border-gray-300 px-2 py-1 text-center w-28">Type</th>
                            <th className="border border-gray-300 px-2 py-1 text-right w-32">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {otherItems.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold">{item.itemType || "N/A"}</td>
                              <td className="border border-gray-300 px-2 py-1">{item.description || "N/A"}</td>
                              <td className="border border-gray-300 px-2 py-1 text-center capitalize">{item.valueType || "lumpsum"}</td>
                              <td className="border border-gray-300 px-2 py-1 text-right font-mono">{item.value || "0"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section D: Summary */}
                  <div className="summary-totals space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">SUMMARY</h3>
                    <table className="w-full max-w-md ml-auto text-sm">
                      <tbody>
                        <tr className="row">
                          <td className="py-1 text-right pr-4">False Ceiling Subtotal:</td>
                          <td className="py-1 text-right font-mono font-semibold">{formatINR(fcSubtotal)}</td>
                        </tr>
                        {fcDiscountAmount > 0 && (
                          <tr className="row">
                            <td className="py-1 text-right pr-4">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="py-1 text-right font-mono text-red-600">-{formatINR(fcDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr className="row">
                          <td className="py-1 text-right pr-4">GST (18%):</td>
                          <td className="py-1 text-right font-mono">{formatINR(fcGst)}</td>
                        </tr>
                        <tr className="final-total row border-t-2 border-[#D1B77C]">
                          <td className="py-2 text-right pr-4 text-lg font-bold text-[#0E2F1B]" style={{fontFamily: "'Playfair Display', Georgia, serif"}}>Final False Ceiling Quote:</td>
                          <td className="py-2 text-right font-mono text-lg font-bold text-[#0E2F1B]">{formatINR(fcFinalTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notes/Terms */}
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">TERMS & CONDITIONS</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                      {(() => {
                        const terms = quotation.terms?.falseCeiling;
                        const lines = terms?.useDefault
                          ? renderTerms(defaultTerms.default_false_ceiling, {
                              clientName: quotation.clientName,
                              projectName: quotation.projectName,
                              quoteId: quotation.quoteId,
                              ...terms.vars
                            })
                          : (terms?.customText || "").split('\n').filter(line => line.trim());
                        return lines.map((line, idx) => <li key={idx}>{line}</li>);
                      })()}
                    </ul>
                  </div>

                  {/* Signatures */}
                  <div className="mt-8 border border-gray-300 rounded-lg p-6 space-y-4 break-inside-avoid" data-testid="signature-block-false-ceiling">
                    <h3 className="text-lg font-semibold text-[#0E2F1B] border-b border-gray-300 pb-2">SIGNATURES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Client Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-xs font-semibold uppercase text-gray-600 tracking-wide">Client</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Name:</p>
                            <p className="text-sm font-medium">{quotation.signoff?.client?.name || quotation.clientName || "_____________"}</p>
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
                              {quotation.signoff?.client?.signedAt ? dateFormat(quotation.signoff.client.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Trecasa Signature */}
                      <div className="space-y-3 break-inside-avoid">
                        <p className="text-xs font-semibold uppercase text-gray-600 tracking-wide">
                          {quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO"}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Name:</p>
                            <p className="text-sm font-medium">{quotation.signoff?.trecasa?.name || "Authorized Signatory"}</p>
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
                              {quotation.signoff?.trecasa?.signedAt ? dateFormat(quotation.signoff.trecasa.signedAt) : "_____________"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <div className="print:hidden">
        <AppFooter />
      </div>
    </div>
  );
}
