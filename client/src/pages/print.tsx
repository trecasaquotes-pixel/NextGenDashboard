import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { formatINR, safeN } from "@/lib/money";
import { defaultTerms, renderTerms } from "@/lib/terms";

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

  const handlePrint = (type: "interiors" | "false-ceiling") => {
    setActiveTab(type);
    // Small delay to ensure tab content is rendered
    setTimeout(() => {
      window.print();
    }, 100);
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
          <div className="print:hidden flex items-center gap-3">
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
                  onClick={() => handlePrint("interiors")}
                  size="lg"
                  data-testid="button-download-interiors-pdf"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Download Interiors PDF
                </Button>
              </div>

              {/* Print Content */}
              <div className="print-content bg-white text-black">
                {/* Branded Header */}
                <div className="print-header bg-[#013220] text-white p-6 rounded-t-lg print:rounded-none">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">TRECASA DESIGN STUDIO 🔴</h1>
                      <p className="text-[#C9A74E] text-sm">Luxury Interiors | Architecture | Build</p>
                    </div>
                    <div className="text-right text-sm space-y-1">
                      <p><strong>Client:</strong> {quotation.clientName || "N/A"}</p>
                      <p><strong>Quote ID:</strong> {quotation.quoteId}</p>
                      <p><strong>Date:</strong> {currentDate}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                  {/* Title */}
                  <div className="text-center border-b-2 border-[#C9A74E] pb-4">
                    <h2 className="text-2xl font-bold text-[#013220]">INTERIORS QUOTATION</h2>
                  </div>

                  {/* Section A: Project Summary */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">PROJECT SUMMARY</h3>
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

                  {/* Section B: Room-wise Breakdown */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">ROOM-WISE BREAKDOWN</h3>
                    
                    {Object.entries(interiorsByRoom).map(([room, items]) => {
                      const roomTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
                      
                      return (
                        <div key={room} className="break-inside-avoid">
                          <h4 className="font-semibold text-[#013220] mb-2">{room}</h4>
                          <table className="w-full text-sm border-collapse zebra-table">
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
                              <tr className="bg-[#013220] text-white font-semibold">
                                <td colSpan={6} className="border border-gray-300 px-2 py-2 text-right">Room Subtotal:</td>
                                <td className="border border-gray-300 px-2 py-2 text-right font-mono">{formatINR(roomTotal)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section C: Summary */}
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">SUMMARY</h3>
                    <table className="w-full max-w-md ml-auto text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-right pr-4">Interiors Subtotal:</td>
                          <td className="py-1 text-right font-mono font-semibold">{formatINR(interiorsSubtotal)}</td>
                        </tr>
                        {interiorsDiscountAmount > 0 && (
                          <tr>
                            <td className="py-1 text-right pr-4">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="py-1 text-right font-mono text-red-600">-{formatINR(interiorsDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-1 text-right pr-4">GST (18%):</td>
                          <td className="py-1 text-right font-mono">{formatINR(interiorsGst)}</td>
                        </tr>
                        <tr className="border-t-2 border-[#C9A74E]">
                          <td className="py-2 text-right pr-4 text-lg font-bold text-[#013220]">Final Interiors Quote:</td>
                          <td className="py-2 text-right font-mono text-lg font-bold text-[#013220]">{formatINR(interiorsFinalTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section D: Notes/Terms */}
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">TERMS & CONDITIONS</h3>
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
                </div>

                {/* Branded Footer */}
                <div className="print-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t-2 border-[#C9A74E] rounded-b-lg print:rounded-none">
                  <p>© 2025 TRECASA DESIGN STUDIO 🔴 | www.trecasadesignstudio.com | @trecasa.designstudio</p>
                </div>
              </div>
            </TabsContent>

            {/* False Ceiling Tab */}
            <TabsContent value="false-ceiling" className="space-y-6">
              {/* Download Button - Screen only */}
              <div className="print:hidden">
                <Button 
                  onClick={() => handlePrint("false-ceiling")}
                  size="lg"
                  data-testid="button-download-fc-pdf"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Download False Ceiling PDF
                </Button>
              </div>

              {/* Print Content */}
              <div className="print-content bg-white text-black">
                {/* Branded Header */}
                <div className="print-header bg-[#013220] text-white p-6 rounded-t-lg print:rounded-none">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">TRECASA DESIGN STUDIO 🔴</h1>
                      <p className="text-[#C9A74E] text-sm">Luxury Interiors | Architecture | Build</p>
                    </div>
                    <div className="text-right text-sm space-y-1">
                      <p><strong>Client:</strong> {quotation.clientName || "N/A"}</p>
                      <p><strong>Quote ID:</strong> {quotation.quoteId}</p>
                      <p><strong>Date:</strong> {currentDate}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                  {/* Title */}
                  <div className="text-center border-b-2 border-[#C9A74E] pb-4">
                    <h2 className="text-2xl font-bold text-[#013220]">FALSE CEILING QUOTATION</h2>
                  </div>

                  {/* Section A: Project Summary */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">PROJECT SUMMARY</h3>
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

                  {/* Section B: Room-wise False Ceiling Breakdown */}
                  {falseCeilingItems.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">ROOM-WISE FALSE CEILING BREAKDOWN</h3>
                      
                      {Object.entries(falseCeilingByRoom).map(([room, items]) => {
                        const roomArea = items.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);
                        
                        return (
                          <div key={room} className="break-inside-avoid">
                            <h4 className="font-semibold text-[#013220] mb-2">{room}</h4>
                            <table className="w-full text-sm border-collapse zebra-table">
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
                                <tr className="bg-[#013220] text-white font-semibold">
                                  <td colSpan={3} className="border border-gray-300 px-2 py-2 text-right">Room Area:</td>
                                  <td className="border border-gray-300 px-2 py-2 text-center font-mono">{roomArea.toFixed(2)} SQFT</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Section C: OTHERS */}
                  {otherItems.length > 0 && (
                    <div className="space-y-4 break-inside-avoid">
                      <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">OTHERS</h3>
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
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">SUMMARY</h3>
                    <table className="w-full max-w-md ml-auto text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-right pr-4">False Ceiling Subtotal:</td>
                          <td className="py-1 text-right font-mono font-semibold">{formatINR(fcSubtotal)}</td>
                        </tr>
                        {fcDiscountAmount > 0 && (
                          <tr>
                            <td className="py-1 text-right pr-4">
                              Discount ({quotation.discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):
                            </td>
                            <td className="py-1 text-right font-mono text-red-600">-{formatINR(fcDiscountAmount)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-1 text-right pr-4">GST (18%):</td>
                          <td className="py-1 text-right font-mono">{formatINR(fcGst)}</td>
                        </tr>
                        <tr className="border-t-2 border-[#C9A74E]">
                          <td className="py-2 text-right pr-4 text-lg font-bold text-[#013220]">Final False Ceiling Quote:</td>
                          <td className="py-2 text-right font-mono text-lg font-bold text-[#013220]">{formatINR(fcFinalTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notes/Terms */}
                  <div className="space-y-3 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-[#013220] border-b border-gray-300 pb-2">TERMS & CONDITIONS</h3>
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
                </div>

                {/* Branded Footer */}
                <div className="print-footer bg-gray-100 p-4 text-center text-sm text-gray-600 border-t-2 border-[#C9A74E] rounded-b-lg print:rounded-none">
                  <p>© 2025 TRECASA DESIGN STUDIO 🔴 | www.trecasadesignstudio.com | @trecasa.designstudio</p>
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
