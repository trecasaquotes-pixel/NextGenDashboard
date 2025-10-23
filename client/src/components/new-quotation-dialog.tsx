import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, LayoutTemplate, FileText, Sparkles } from "lucide-react";
import type { TemplateSummary, Quotation } from "@shared/schema";

interface NewQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (quotation: Quotation) => void;
}

export function NewQuotationDialog({ open, onOpenChange, onSuccess }: NewQuotationDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "details">("choose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("New Project");
  const [clientName, setClientName] = useState("Client Name");
  const [buildType, setBuildType] = useState<"handmade" | "factory">("handmade");

  // Fetch active templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<TemplateSummary[]>({
    queryKey: ["/api/admin/templates?active=1"],
    enabled: open && step === "choose",
  });

  // Create quotation mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // Create quotation
      const response = await apiRequest("POST", "/api/quotations", {
        projectName,
        projectType: "Villa",
        clientName,
        clientPhone: "",
        projectAddress: "",
        buildType,
        status: "draft",
      });
      const newQuotation: Quotation = await response.json();

      // Apply template if selected
      if (selectedTemplateId) {
        await apiRequest("POST", `/api/quotations/${newQuotation.id}/apply-template`, {
          templateId: selectedTemplateId,
          mode: "merge",
        });

        // Also apply FC defaults
        await apiRequest("POST", `/api/quotations/${newQuotation.id}/apply-fc-defaults`, {});
      }

      return newQuotation;
    },
    onSuccess: (data: Quotation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });

      const message = selectedTemplateId
        ? "Quotation created with template applied"
        : "New quotation created";

      toast({
        title: "Success",
        description: message,
      });

      // Reset state
      setStep("choose");
      setSelectedTemplateId(null);
      setProjectName("New Project");
      setClientName("Client Name");
      setBuildType("handmade");

      onSuccess(data);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setStep("details");
  };

  const handleBack = () => {
    setStep("choose");
  };

  const handleCreate = () => {
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {step === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick Start
              </DialogTitle>
              <DialogDescription>
                Choose a template to speed up your quotation, or start from scratch
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Start Blank Option */}
                <Card
                  className="cursor-pointer hover-elevate active-elevate-2 border-2 border-border hover:border-primary/50 transition-colors"
                  onClick={() => handleTemplateSelect(null)}
                  data-testid="card-blank-quotation"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Start from Scratch
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Create a blank quotation and add items manually
                    </CardDescription>
                  </CardHeader>
                </Card>

                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length > 0 ? (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Available Templates
                      </h4>
                      <div className="space-y-3">
                        {templates.map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover-elevate active-elevate-2 border-2 border-border hover:border-primary/50 transition-colors"
                            onClick={() => handleTemplateSelect(template.id)}
                            data-testid={`card-template-${template.id}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                              {template.category && (
                                <CardDescription className="text-sm">
                                  Pre-configured rooms and items for{" "}
                                  {template.category.toLowerCase()} projects
                                </CardDescription>
                              )}
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Quotation Details</DialogTitle>
              <DialogDescription>
                {selectedTemplateId
                  ? "Set basic details for your new quotation with selected template"
                  : "Set basic details for your new quotation"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                  data-testid="input-client-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="build-type">Build Type</Label>
                <Select
                  value={buildType}
                  onValueChange={(value: "handmade" | "factory") => setBuildType(value)}
                >
                  <SelectTrigger id="build-type" data-testid="select-build-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="handmade">Handmade</SelectItem>
                    <SelectItem value="factory">Factory Finish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplateId && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                  <p className="text-sm text-muted-foreground">
                    <LayoutTemplate className="h-4 w-4 inline mr-1" />
                    Template will be applied with rooms and items
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createMutation.isPending}
                data-testid="button-back"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-create-quotation"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Quotation"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
