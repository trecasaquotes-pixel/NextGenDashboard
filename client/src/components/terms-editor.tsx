import { useState, useEffect } from "react";
import type { Quotation } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { defaultTerms, renderTerms, type TermsTemplateId } from "@/lib/terms";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TermsEditorProps {
  quotation: Quotation;
}

export function TermsEditor({ quotation }: TermsEditorProps) {
  const [activeTab, setActiveTab] = useState<"interiors" | "false-ceiling">("interiors");
  const [isSaving, setIsSaving] = useState(false);

  // Interiors state
  const [interiorsUseDefault, setInteriorsUseDefault] = useState(
    quotation.terms?.interiors?.useDefault ?? true,
  );
  const [interiorsVars, setInteriorsVars] = useState({
    validDays: quotation.terms?.interiors?.vars?.validDays ?? 15,
    warrantyMonths: quotation.terms?.interiors?.vars?.warrantyMonths ?? 12,
    paymentSchedule:
      quotation.terms?.interiors?.vars?.paymentSchedule ?? "50% booking, 40% mid, 10% handover",
  });
  const [interiorsCustom, setInteriorsCustom] = useState(
    quotation.terms?.interiors?.customText ?? "",
  );

  // False Ceiling state
  const [fcUseDefault, setFcUseDefault] = useState(
    quotation.terms?.falseCeiling?.useDefault ?? true,
  );
  const [fcVars, setFcVars] = useState({
    validDays: quotation.terms?.falseCeiling?.vars?.validDays ?? 15,
    warrantyMonths: quotation.terms?.falseCeiling?.vars?.warrantyMonths ?? 12,
    paymentSchedule:
      quotation.terms?.falseCeiling?.vars?.paymentSchedule ?? "50% booking, 40% mid, 10% handover",
  });
  const [fcCustom, setFcCustom] = useState(quotation.terms?.falseCeiling?.customText ?? "");

  // Render preview for interiors
  const interiorsPreview = interiorsUseDefault
    ? renderTerms(defaultTerms.default_interiors, {
        clientName: quotation.clientName,
        projectName: quotation.projectName,
        quoteId: quotation.quoteId,
        ...interiorsVars,
      })
    : interiorsCustom.split("\n").filter((line) => line.trim());

  // Render preview for false ceiling
  const fcPreview = fcUseDefault
    ? renderTerms(defaultTerms.default_false_ceiling, {
        clientName: quotation.clientName,
        projectName: quotation.projectName,
        quoteId: quotation.quoteId,
        ...fcVars,
      })
    : fcCustom.split("\n").filter((line) => line.trim());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedTerms = {
        interiors: {
          useDefault: interiorsUseDefault,
          templateId: "default_interiors",
          customText: interiorsCustom,
          vars: interiorsVars,
        },
        falseCeiling: {
          useDefault: fcUseDefault,
          templateId: "default_false_ceiling",
          customText: fcCustom,
          vars: fcVars,
        },
      };

      await apiRequest("PATCH", `/api/quotations/${quotation.id}`, { terms: updatedTerms });

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotation.id}`] });

      toast({
        title: "Terms updated",
        description: "Terms & Conditions have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving terms:", error);
      toast({
        title: "Error",
        description: "Failed to save Terms & Conditions.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full" data-testid="card-terms-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Terms & Conditions</CardTitle>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-terms">
            {isSaving ? "Saving..." : "Save Terms"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interiors" data-testid="tab-interiors-terms">
              Interiors Terms
            </TabsTrigger>
            <TabsTrigger value="false-ceiling" data-testid="tab-fc-terms">
              False Ceiling Terms
            </TabsTrigger>
          </TabsList>

          {/* Interiors Terms Tab */}
          <TabsContent value="interiors" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={interiorsUseDefault}
                onCheckedChange={setInteriorsUseDefault}
                id="interiors-use-default"
                data-testid="switch-interiors-use-default"
              />
              <Label htmlFor="interiors-use-default">Use default template</Label>
            </div>

            {interiorsUseDefault ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="interiors-valid-days">Validity (days)</Label>
                    <Input
                      id="interiors-valid-days"
                      type="number"
                      value={interiorsVars.validDays}
                      onChange={(e) =>
                        setInteriorsVars({
                          ...interiorsVars,
                          validDays: parseInt(e.target.value) || 15,
                        })
                      }
                      data-testid="input-interiors-valid-days"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interiors-warranty">Warranty (months)</Label>
                    <Input
                      id="interiors-warranty"
                      type="number"
                      value={interiorsVars.warrantyMonths}
                      onChange={(e) =>
                        setInteriorsVars({
                          ...interiorsVars,
                          warrantyMonths: parseInt(e.target.value) || 12,
                        })
                      }
                      data-testid="input-interiors-warranty"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="interiors-payment">Payment Schedule</Label>
                    <Input
                      id="interiors-payment"
                      value={interiorsVars.paymentSchedule}
                      onChange={(e) =>
                        setInteriorsVars({ ...interiorsVars, paymentSchedule: e.target.value })
                      }
                      data-testid="input-interiors-payment"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="interiors-custom">Custom Terms (one per line)</Label>
                <Textarea
                  id="interiors-custom"
                  value={interiorsCustom}
                  onChange={(e) => setInteriorsCustom(e.target.value)}
                  placeholder="Enter custom terms, one per line..."
                  rows={8}
                  data-testid="textarea-interiors-custom"
                />
              </div>
            )}

            <div>
              <Label>Preview</Label>
              <div className="mt-2 p-4 bg-muted rounded-md">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {interiorsPreview.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* False Ceiling Terms Tab */}
          <TabsContent value="false-ceiling" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={fcUseDefault}
                onCheckedChange={setFcUseDefault}
                id="fc-use-default"
                data-testid="switch-fc-use-default"
              />
              <Label htmlFor="fc-use-default">Use default template</Label>
            </div>

            {fcUseDefault ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fc-valid-days">Validity (days)</Label>
                    <Input
                      id="fc-valid-days"
                      type="number"
                      value={fcVars.validDays}
                      onChange={(e) =>
                        setFcVars({ ...fcVars, validDays: parseInt(e.target.value) || 15 })
                      }
                      data-testid="input-fc-valid-days"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fc-warranty">Warranty (months)</Label>
                    <Input
                      id="fc-warranty"
                      type="number"
                      value={fcVars.warrantyMonths}
                      onChange={(e) =>
                        setFcVars({ ...fcVars, warrantyMonths: parseInt(e.target.value) || 12 })
                      }
                      data-testid="input-fc-warranty"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="fc-payment">Payment Schedule</Label>
                    <Input
                      id="fc-payment"
                      value={fcVars.paymentSchedule}
                      onChange={(e) => setFcVars({ ...fcVars, paymentSchedule: e.target.value })}
                      data-testid="input-fc-payment"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="fc-custom">Custom Terms (one per line)</Label>
                <Textarea
                  id="fc-custom"
                  value={fcCustom}
                  onChange={(e) => setFcCustom(e.target.value)}
                  placeholder="Enter custom terms, one per line..."
                  rows={8}
                  data-testid="textarea-fc-custom"
                />
              </div>
            )}

            <div>
              <Label>Preview</Label>
              <div className="mt-2 p-4 bg-muted rounded-md">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {fcPreview.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
