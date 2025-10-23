import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation } from "@shared/schema";
import { createRoot } from "react-dom/client";
import { formatDisplayDate } from "@shared/formatters";
import logoPath from "@assets/trecasa-logo.png";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { htmlToPdfBytes, mergePdfBytes, downloadBytesAs } from "@/lib/pdf";
import { AnnexureTitle } from "@/components/annexure-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { renderTerms, defaultTerms } from "@/lib/terms";


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

  const { data: agreementData } = useQuery<any>({
    queryKey: [`/api/agreements/${quotationId}`],
    enabled: !!quotationId && isAuthenticated,
  });

  const updateAnnexureMutation = useMutation({
    mutationFn: async (data: {
      includeAnnexureInteriors?: boolean;
      includeAnnexureFC?: boolean;
    }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
    },
  });

  // Agreement Editor state
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [customMaterials, setCustomMaterials] = useState<{ coreMaterials: string[], finishes: string[], hardware: string[] }>({
    coreMaterials: [],
    finishes: [],
    hardware: [],
  });
  const [customSpecs, setCustomSpecs] = useState("");
  const [customPaymentSchedule, setCustomPaymentSchedule] = useState<Array<{ label: string, percent: number }>>([]);

  // Initialize editor with existing customizations
  useEffect(() => {
    if (agreementData?.customizations) {
      setCustomMaterials(agreementData.customizations.materials || { coreMaterials: [], finishes: [], hardware: [] });
      setCustomSpecs(agreementData.customizations.specs || "");
      setCustomPaymentSchedule(agreementData.customizations.paymentSchedule || []);
    } else if (agreementData) {
      // Use defaults from agreementData
      setCustomMaterials({
        coreMaterials: agreementData.materials?.coreMaterials || [],
        finishes: agreementData.materials?.finishes || [],
        hardware: agreementData.materials?.hardware || [],
      });
      setCustomPaymentSchedule(agreementData.paymentSchedule?.map((p: any) => ({ label: p.label, percent: p.percent })) || []);
    }
  }, [agreementData]);

  const saveCustomizationsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/agreements/${quotationId}/customizations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agreements/${quotationId}`] });
      toast({
        title: "Success",
        description: "Agreement customizations saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save customizations",
        variant: "destructive",
      });
    },
  });

  const handleSaveCustomizations = () => {
    saveCustomizationsMutation.mutate({
      materials: customMaterials,
      specs: customSpecs,
      paymentSchedule: customPaymentSchedule.length > 0 ? customPaymentSchedule : undefined,
    });
  };

  const handleDownloadPack = async () => {
    if (!quotation) return;

    setIsGenerating(true);

    try {
      toast({
        title: "Generating Agreement Pack...",
        description: "Creating Service Agreement with Annexures A & B",
      });

      const response = await fetch(`/api/quotations/${quotationId}/pdf/agreement-pack`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TRECASA_${quotation.quoteId}_AgreementPack.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Agreement Pack downloaded successfully",
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("Error generating Agreement Pack:", error);
      toast({
        title: "Failed to Generate Agreement Pack",
        description: error instanceof Error ? error.message : "Please try again or contact support",
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

  const currentDate = formatDisplayDate(new Date());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="container-trecasa py-6 lg:py-8 flex-1">
        <div className="space-y-6">
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
                  onCheckedChange={(checked) =>
                    updateAnnexureMutation.mutate({ includeAnnexureInteriors: checked as boolean })
                  }
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
                  disabled={!agreementData?.falseCeiling?.hasItems}
                  onCheckedChange={(checked) =>
                    updateAnnexureMutation.mutate({ includeAnnexureFC: checked as boolean })
                  }
                  data-testid="checkbox-include-annexure-fc"
                />
                <label htmlFor="include-fc" className="text-sm font-medium cursor-pointer">
                  Include Annexure B — False Ceiling Quotation
                  {!agreementData?.falseCeiling?.hasItems && (
                    <span className="text-xs text-muted-foreground ml-2">(No FC items)</span>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Agreement Editor */}
          <Card className="print:hidden" data-testid="card-agreement-editor">
            <CardHeader className="cursor-pointer hover-elevate" onClick={() => setEditorExpanded(!editorExpanded)}>
              <div className="flex items-center justify-between">
                <CardTitle>Agreement Customizations (Optional)</CardTitle>
                {editorExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            {editorExpanded && (
              <CardContent className="space-y-6">
                {/* Materials Section */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Materials & Brands</Label>
                  <p className="text-sm text-muted-foreground">
                    Customize materials list (leave blank to use defaults from quotation items)
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="core-materials">Core Materials (one per line)</Label>
                      <Textarea
                        id="core-materials"
                        value={customMaterials.coreMaterials.join('\n')}
                        onChange={(e) => setCustomMaterials({
                          ...customMaterials,
                          coreMaterials: e.target.value.split('\n').filter(s => s.trim())
                        })}
                        placeholder="e.g., High-Density MDF&#10;Marine Ply&#10;Particle Board"
                        rows={4}
                        data-testid="textarea-custom-core-materials"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finishes">Finishes (one per line)</Label>
                      <Textarea
                        id="finishes"
                        value={customMaterials.finishes.join('\n')}
                        onChange={(e) => setCustomMaterials({
                          ...customMaterials,
                          finishes: e.target.value.split('\n').filter(s => s.trim())
                        })}
                        placeholder="e.g., Acrylic&#10;PU&#10;Laminate"
                        rows={4}
                        data-testid="textarea-custom-finishes"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hardware">Hardware (one per line)</Label>
                      <Textarea
                        id="hardware"
                        value={customMaterials.hardware.join('\n')}
                        onChange={(e) => setCustomMaterials({
                          ...customMaterials,
                          hardware: e.target.value.split('\n').filter(s => s.trim())
                        })}
                        placeholder="e.g., Hettich&#10;Ebco&#10;Hafele"
                        rows={4}
                        data-testid="textarea-custom-hardware"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Specs Section */}
                <div className="space-y-2">
                  <Label htmlFor="custom-specs">Custom Specifications (Optional)</Label>
                  <Textarea
                    id="custom-specs"
                    value={customSpecs}
                    onChange={(e) => setCustomSpecs(e.target.value)}
                    placeholder="Add any additional specifications or notes for this agreement..."
                    rows={3}
                    data-testid="textarea-custom-specs"
                  />
                </div>

                {/* Payment Schedule Section */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Payment Schedule</Label>
                  <p className="text-sm text-muted-foreground">
                    Customize payment schedule (percentages must sum to 100%). Leave empty to use default schedule.
                  </p>
                  {customPaymentSchedule.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`schedule-label-${idx}`}>Label</Label>
                        <Input
                          id={`schedule-label-${idx}`}
                          value={item.label}
                          onChange={(e) => {
                            const newSchedule = [...customPaymentSchedule];
                            newSchedule[idx].label = e.target.value;
                            setCustomPaymentSchedule(newSchedule);
                          }}
                          placeholder="e.g., Token Advance"
                          data-testid={`input-schedule-label-${idx}`}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label htmlFor={`schedule-percent-${idx}`}>%</Label>
                        <Input
                          id={`schedule-percent-${idx}`}
                          type="number"
                          min="0"
                          max="100"
                          value={item.percent}
                          onChange={(e) => {
                            const newSchedule = [...customPaymentSchedule];
                            newSchedule[idx].percent = parseFloat(e.target.value) || 0;
                            setCustomPaymentSchedule(newSchedule);
                          }}
                          data-testid={`input-schedule-percent-${idx}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newSchedule = customPaymentSchedule.filter((_, i) => i !== idx);
                          setCustomPaymentSchedule(newSchedule);
                        }}
                        data-testid={`button-remove-schedule-${idx}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomPaymentSchedule([...customPaymentSchedule, { label: "", percent: 0 }]);
                    }}
                    data-testid="button-add-schedule-item"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Schedule Item
                  </Button>
                  {customPaymentSchedule.length > 0 && (
                    <p className="text-sm font-medium">
                      Total: {customPaymentSchedule.reduce((sum, item) => sum + item.percent, 0)}%
                      {Math.abs(customPaymentSchedule.reduce((sum, item) => sum + item.percent, 0) - 100) > 0.01 && (
                        <span className="text-destructive ml-2">(Must equal 100%)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSaveCustomizations}
                    disabled={saveCustomizationsMutation.isPending}
                    data-testid="button-save-customizations"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveCustomizationsMutation.isPending ? "Saving..." : "Save Customizations"}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Agreement Document */}
          <div id="print-agreement-root" className="bg-white text-black" data-pdf-ready="true">
            {/* Universal Header - Official Trecasa Style */}
            <div
              className="bg-[#154734] text-white rounded-t-lg print:rounded-none"
              style={{
                minHeight: "110px",
                padding: "16px 24px",
                fontFamily: "'Montserrat', Arial, sans-serif",
                lineHeight: "1.3",
              }}
            >
              <div className="grid grid-cols-[70%_30%] gap-4">
                {/* Left Column */}
                <div>
                  {/* Logo and Company Name */}
                  <div className="flex items-center gap-3 mb-1">
                    <img 
                      src={logoPath} 
                      alt="TRECASA Logo" 
                      style={{ height: "40px", width: "auto" }} 
                    />
                    <h1
                      className="text-[15pt] font-semibold uppercase tracking-wide"
                      style={{ letterSpacing: "0.4px" }}
                    >
                      TRECASA DESIGN STUDIO
                    </h1>
                  </div>

                  {/* Company Address */}
                  <p className="text-[8.5pt] mb-2">
                    H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad, Telangana -
                    500049
                  </p>

                  {/* Client and Project Details */}
                  <div className="text-[9pt] mt-2 space-y-0.5">
                    <div>
                      <span className="font-medium">Client Name:</span>{" "}
                      <span>{quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : (quotation.clientName || "N/A")}</span>
                    </div>
                    <div>
                      <span className="font-medium">Project Address:</span>{" "}
                      <span>{quotation.projectAddress || "N/A"}</span>
                    </div>
                  </div>

                  {/* Greeting Line */}
                  <p
                    className="text-[9.5pt] italic mt-1"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: "#EAEAEA",
                      lineHeight: "1.2",
                    }}
                  >
                    Hi {quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : (quotation.clientName || "Valued Client")} & Family
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
                      <span style={{ opacity: 0.8 }}>Issue Date:</span>{" "}
                      <span className="ml-1">{currentDate}</span>
                    </div>
                    <div>
                      <span style={{ opacity: 0.8 }}>Quote ID:</span>{" "}
                      <span className="ml-1">{quotation.quoteId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Title */}
              <div className="text-center border-b-2 border-[#C7A948] pb-4">
                <h2 className="text-2xl font-bold text-[#154734]">SERVICE AGREEMENT</h2>
              </div>

              {/* Agreement Content */}
              <div className="space-y-6 text-sm">
                <p>
                  This Agreement is entered into on <strong>{currentDate}</strong> between:
                </p>

                <div className="ml-4 space-y-2">
                  <p>
                    <strong>TRECASA DESIGN STUDIO</strong> (hereinafter referred to as "Service
                    Provider")
                  </p>
                  <p className="text-xs text-gray-600">
                    Address: [Service Provider Address]
                    <br />
                    Contact: www.trecasadesignstudio.com | @trecasa.designstudio
                  </p>
                </div>

                <p>AND</p>

                <div className="ml-4 space-y-2">
                  <p>
                    <strong>{quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : quotation.clientName}</strong> (hereinafter referred to as "Client")
                  </p>
                  <p className="text-xs text-gray-600">
                    Project: {quotation.projectName}
                    <br />
                    Address: {quotation.projectAddress || "N/A"}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">1. SCOPE OF WORK</h3>
                  <p className="ml-4">
                    The Service Provider agrees to provide interior design and execution services as
                    detailed in the attached quotations:
                  </p>
                  <ul className="ml-8 list-disc space-y-1">
                    {quotation.includeAnnexureInteriors && (
                      <li>Annexure A — Interiors Quotation (see attached)</li>
                    )}
                    {/* Show FC annexure only if FC items exist with non-zero totals */}
                    {quotation.includeAnnexureFC && agreementData?.falseCeiling?.hasItems && (
                      <li>Annexure B — False Ceiling Quotation (see attached)</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">2. PROJECT TIMELINE</h3>
                  <p className="ml-4">
                    The project shall commence upon receipt of the advance payment and completion
                    shall be as mutually agreed upon by both parties in writing.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">3. PAYMENT TERMS</h3>
                  <p className="ml-4">
                    The Client agrees to make payments as per the following schedule
                    {agreementData?.falseCeiling?.hasItems ? " (combined total for Interiors and False Ceiling)" : ""}:
                  </p>
                  {agreementData?.paymentSchedule && (
                    <ul className="ml-8 list-disc space-y-1">
                      {agreementData.paymentSchedule.map((payment: any, idx: number) => (
                        <li key={idx}>
                          {payment.label} — ₹
                          {(payment.amount / 100).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!agreementData?.paymentSchedule && (
                    <ul className="ml-8 list-disc space-y-1">
                      <li>Token Advance – 10% upon agreement signing</li>
                      <li>Design Finalisation – 60% upon design approval</li>
                      <li>Mid Execution – 25% upon completion of 50% of the work</li>
                      <li>After Handover – 5% upon project completion</li>
                    </ul>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">4. WARRANTY</h3>
                  <p className="ml-4">
                    The Service Provider provides a warranty period of 12 months from the date of
                    project handover against manufacturing defects. Normal wear and tear is not
                    covered under warranty.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">5. MODIFICATIONS</h3>
                  <p className="ml-4">
                    Any modifications to the agreed scope of work must be communicated in writing
                    and may result in additional charges and timeline extensions.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">6. TERMINATION</h3>
                  <p className="ml-4">
                    Either party may terminate this agreement with 15 days written notice. In case
                    of termination by the Client, payments made are non-refundable and work
                    completed till date shall be billed proportionately.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0E2F1B] text-base">7. GOVERNING LAW</h3>
                  <p className="ml-4">
                    This Agreement shall be governed by and construed in accordance with the laws of
                    India. Any disputes arising shall be subject to the jurisdiction of courts in
                    [City].
                  </p>
                </div>

                {/* Terms & Conditions Section */}
                <div className="space-y-6 mt-8 pt-6 border-t-2">
                  <h3 className="font-semibold text-[#0E2F1B] text-lg">TERMS & CONDITIONS</h3>
                  
                  {/* Interiors T&C */}
                  {quotation.includeAnnexureInteriors && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-[#0E2F1B] text-base">
                        A. Interior Works Terms & Conditions
                      </h4>
                      <div className="ml-4 space-y-3">
                        {(() => {
                          const terms = quotation.terms?.interiors;
                          const renderedTerms = terms?.useDefault
                            ? renderTerms(
                                defaultTerms.default_interiors,
                                {
                                  clientName: quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : quotation.clientName,
                                  projectName: quotation.projectName,
                                  quoteId: quotation.quoteId,
                                  validDays: terms.vars?.validDays ?? 15,
                                  warrantyMonths: terms.vars?.warrantyMonths ?? 12,
                                  paymentSchedule: terms.vars?.paymentSchedule ?? "50% booking, 40% mid, 10% handover",
                                },
                                agreementData?.materials ? [
                                  ...agreementData.materials.coreMaterials.map((m: string) => ({ category: "Core Materials", brand: m })),
                                  ...agreementData.materials.finishes.map((m: string) => ({ category: "Finishes", brand: m })),
                                  ...agreementData.materials.hardware.map((m: string) => ({ category: "Hardware", brand: m })),
                                ] : undefined
                              )
                            : terms?.customText?.split("\n").filter((line: string) => line.trim()) ?? [];
                          
                          return renderedTerms.map((term: string, idx: number) => (
                            <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                              {term}
                            </p>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* False Ceiling T&C */}
                  {quotation.includeAnnexureFC && agreementData?.falseCeiling?.hasItems && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-[#0E2F1B] text-base">
                        B. False Ceiling Works Terms & Conditions
                      </h4>
                      <div className="ml-4 space-y-3">
                        {(() => {
                          const terms = quotation.terms?.falseCeiling;
                          const renderedTerms = terms?.useDefault
                            ? renderTerms(
                                defaultTerms.default_false_ceiling,
                                {
                                  clientName: quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : quotation.clientName,
                                  projectName: quotation.projectName,
                                  quoteId: quotation.quoteId,
                                  validDays: terms.vars?.validDays ?? 15,
                                  warrantyMonths: terms.vars?.warrantyMonths ?? 12,
                                  paymentSchedule: terms.vars?.paymentSchedule ?? "50% booking, 40% mid, 10% handover",
                                }
                              )
                            : terms?.customText?.split("\n").filter((line: string) => line.trim()) ?? [];
                          
                          return renderedTerms.map((term: string, idx: number) => (
                            <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                              {term}
                            </p>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Materials & Brands */}
                {agreementData?.materials &&
                  (agreementData.materials.coreMaterials.length > 0 ||
                    agreementData.materials.finishes.length > 0 ||
                    agreementData.materials.hardware.length > 0) && (
                    <div className="space-y-4 mt-8 p-4 bg-gray-50 rounded">
                      <h3 className="font-semibold text-[#0E2F1B] text-base">MATERIALS & BRANDS</h3>
                      {agreementData.materials.coreMaterials.length > 0 && (
                        <div className="ml-4">
                          <p className="font-medium text-sm mb-1">Core Materials:</p>
                          <ul className="ml-6 list-disc space-y-0.5 text-xs">
                            {agreementData.materials.coreMaterials.map(
                              (material: string, idx: number) => (
                                <li key={idx}>{material}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                      {agreementData.materials.finishes.length > 0 && (
                        <div className="ml-4">
                          <p className="font-medium text-sm mb-1">Finishes:</p>
                          <ul className="ml-6 list-disc space-y-0.5 text-xs">
                            {agreementData.materials.finishes.map((finish: string, idx: number) => (
                              <li key={idx}>{finish}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {agreementData.materials.hardware.length > 0 && (
                        <div className="ml-4">
                          <p className="font-medium text-sm mb-1">Hardware:</p>
                          <ul className="ml-6 list-disc space-y-0.5 text-xs">
                            {agreementData.materials.hardware.map((hw: string, idx: number) => (
                              <li key={idx}>{hw}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                {/* Signatures */}
                <div className="mt-12 pt-8 border-t-2 border-gray-300">
                  <div
                    className="grid grid-cols-2 gap-8 break-inside-avoid"
                    data-testid="signature-block-agreement"
                  >
                    {/* Client Signature */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-4">
                        Client Acceptance
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Name:</p>
                          <p className="text-sm">
                            {quotation.signoff?.client?.name ||
                              (quotation.clientSuffix ? `${quotation.clientSuffix} ${quotation.clientName}` : quotation.clientName) ||
                              "_____________"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Signature:</p>
                          {quotation.signoff?.client?.signature ? (
                            <p className="text-lg font-serif italic text-gray-800">
                              {quotation.signoff.client.signature}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">_____________</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date:</p>
                          <p className="text-sm">
                            {quotation.signoff?.client?.signedAt
                              ? formatDisplayDate(new Date(quotation.signoff.client.signedAt))
                              : "_____________"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TRECASA Signature */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-600 mb-4">
                        Trecasa Design Studio – Authorized Signatory
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Title:</p>
                          <p className="text-sm">
                            {quotation.signoff?.trecasa?.title ||
                              "Trecasa Design Studio – Authorized Signatory"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Name:</p>
                          <p className="text-sm">
                            {quotation.signoff?.trecasa?.name ||
                              "Trecasa Design Studio – Authorized Signatory"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Signature:</p>
                          {quotation.signoff?.trecasa?.signature ? (
                            <p className="text-lg font-serif italic text-gray-800">
                              {quotation.signoff.trecasa.signature}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">_____________</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date:</p>
                          <p className="text-sm">
                            {quotation.signoff?.trecasa?.signedAt
                              ? formatDisplayDate(new Date(quotation.signoff.trecasa.signedAt))
                              : "_____________"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Universal Footer */}
              <div
                className="bg-white border-t border-[#C7A948] p-4 flex items-center justify-center rounded-b-lg print:rounded-none mt-8"
                style={{
                  height: "40px",
                  padding: "10px 0",
                  fontFamily: "'Montserrat', Arial, sans-serif",
                }}
              >
                <div className="text-center text-[8pt] text-[#666666]">
                  © 2025 TRECASA DESIGN STUDIO <span className="mx-2">|</span>{" "}
                  www.trecasadesignstudio.com <span className="mx-2">|</span> @trecasa.designstudio{" "}
                  <span
                    className="inline-block w-[5px] h-[5px] rounded-full bg-red-600 ml-2"
                    style={{ verticalAlign: "middle" }}
                  ></span>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Print Roots (for PDF capture) */}
          <div className="hidden">
            {/* These will be populated by the print page components when needed */}
            <div id="print-interiors-root" className="hidden-print-content"></div>
            <div id="print-fc-root" className="hidden-print-content"></div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <AppFooter />
      </div>
    </div>
  );
}
