import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, Trash2, FileText, Sparkles } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { ROOM_TYPES, OTHER_ITEM_TYPES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QuotationHeader } from "@/components/quotation-header";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { TemplateModal } from "@/components/template-modal";
import { ApplyTemplateModal } from "@/components/apply-template-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateRate, calculateAmount, type BuildType, type CoreMaterial, type FinishMaterial, type HardwareBrand } from "@/lib/rates";
import { calculateQuoteTotals } from "@/lib/calculateTotals";
import { formatINR } from "@/lib/money";
import { getEffectiveBuildType } from "@/lib/pricing";

// Brand options for dropdowns
const CORE_MATERIALS: CoreMaterial[] = [
  "Generic Ply",
  "Century Ply",
  "Green Ply",
  "Kitply",
  "HDHMR",
  "BWP",
  "MDF",
  "HDF",
];

const FINISH_MATERIALS: FinishMaterial[] = [
  "Generic Laminate",
  "Greenlam",
  "Merino",
  "Century Laminate",
  "Duco",
  "PU",
  "Acrylic",
  "Veneer",
  "Fluted Panel",
  "Back Painted Glass",
  "CNC Finish",
];

const HARDWARE_BRANDS: HardwareBrand[] = [
  "Nimmi",
  "Ebco",
  "Hettich",
  "Hafele",
  "Sleek",
  "Blum",
];

const BUILD_TYPES: { value: BuildType; label: string }[] = [
  { value: "handmade", label: "Work-on-Site" },
  { value: "factory", label: "Factory Finish" },
];

export default function Scope() {
  const [match, params] = useRoute("/quotation/:id/scope");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [totalsUpdatedAt, setTotalsUpdatedAt] = useState<number | null>(null);

  // Redirect if not authenticated
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

  const { data: interiorItems = [], isLoading: loadingInterior } = useQuery<InteriorItem[]>({
    queryKey: [`/api/quotations/${quotationId}/interior-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: falseCeilingItems = [], isLoading: loadingFalseCeiling } = useQuery<FalseCeilingItem[]>({
    queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  const { data: otherItems = [], isLoading: loadingOther } = useQuery<OtherItem[]>({
    queryKey: [`/api/quotations/${quotationId}/other-items`],
    enabled: !!quotationId && isAuthenticated,
  });

  // Interior item mutations
  const addInteriorItem = useMutation({
    mutationFn: async (data: Partial<InteriorItem>) => {
      await apiRequest("POST", `/api/quotations/${quotationId}/interior-items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/interior-items`] });
    },
    onError: handleMutationError,
  });

  const updateInteriorItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InteriorItem> }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}/interior-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/interior-items`] });
    },
    onError: handleMutationError,
  });

  const deleteInteriorItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotations/${quotationId}/interior-items/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/interior-items`] });
    },
    onError: handleMutationError,
  });

  // False ceiling mutations
  const addFalseCeilingItem = useMutation({
    mutationFn: async (data: Partial<FalseCeilingItem>) => {
      await apiRequest("POST", `/api/quotations/${quotationId}/false-ceiling-items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`] });
    },
    onError: handleMutationError,
  });

  const updateFalseCeilingItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FalseCeilingItem> }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}/false-ceiling-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`] });
    },
    onError: handleMutationError,
  });

  const deleteFalseCeilingItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotations/${quotationId}/false-ceiling-items/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`] });
    },
    onError: handleMutationError,
  });

  // Other items mutations
  const addOtherItem = useMutation({
    mutationFn: async (data: Partial<OtherItem>) => {
      await apiRequest("POST", `/api/quotations/${quotationId}/other-items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/other-items`] });
    },
    onError: handleMutationError,
  });

  const updateOtherItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OtherItem> }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}/other-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/other-items`] });
    },
    onError: handleMutationError,
  });

  const deleteOtherItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotations/${quotationId}/other-items/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/other-items`] });
    },
    onError: handleMutationError,
  });

  // Totals update mutation
  const updateQuoteTotals = useMutation({
    mutationFn: async (totals: { interiorsSubtotal: number; fcSubtotal: number; grandSubtotal: number; updatedAt: number }) => {
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, { totals });
    },
    onSuccess: (_, totals) => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      setTotalsUpdatedAt(totals.updatedAt);
    },
    onError: handleMutationError,
  });

  // Update all interior items when quotation buildType changes
  useEffect(() => {
    if (!quotation?.buildType || interiorItems.length === 0) {
      return;
    }

    const projectBuildType = quotation.buildType as BuildType;
    
    // Track which items need updating to batch them
    const itemsToUpdate: Array<{ id: string; data: any }> = [];
    
    interiorItems.forEach((item) => {
      const description = item.description || "";
      const expectedBuildType = getEffectiveBuildType(projectBuildType, description);
      
      // Only update if buildType doesn't match (pricing will be recalculated correctly)
      if (item.buildType !== expectedBuildType) {
        const sqft = parseFloat(item.sqft || "0");
        const expectedRate = calculateRate(
          expectedBuildType,
          (item.material || "Generic Ply") as CoreMaterial,
          (item.finish || "Generic Laminate") as FinishMaterial,
          (item.hardware || "Nimmi") as HardwareBrand
        );
        const expectedTotal = calculateAmount(expectedRate, sqft);
        
        itemsToUpdate.push({
          id: item.id,
          data: {
            buildType: expectedBuildType,
            unitPrice: expectedRate,
            totalPrice: expectedTotal,
          },
        });
      }
    });
    
    // Update items sequentially to avoid race conditions
    itemsToUpdate.forEach(({ id, data }) => {
      updateInteriorItem.mutate({ id, data });
    });
  }, [quotation?.buildType]);

  // Recalculate totals whenever items change
  useEffect(() => {
    if (interiorItems.length === 0 && falseCeilingItems.length === 0 && otherItems.length === 0) {
      return; // Skip if no items
    }

    const totals = calculateQuoteTotals(interiorItems, falseCeilingItems, otherItems);
    
    // Only update if totals have changed
    const currentTotals = quotation?.totals;
    if (
      !currentTotals ||
      currentTotals.interiorsSubtotal !== totals.interiorsSubtotal ||
      currentTotals.fcSubtotal !== totals.fcSubtotal ||
      currentTotals.grandSubtotal !== totals.grandSubtotal
    ) {
      updateQuoteTotals.mutate(totals);
    }
  }, [interiorItems, falseCeilingItems, otherItems]);

  function handleMutationError(error: Error) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    toast({
      title: "Error",
      description: "An error occurred. Please try again.",
      variant: "destructive",
    });
  }

  const calculateSqft = (length?: string | null, height?: string | null, width?: string | null) => {
    const l = parseFloat(length || "0");
    const h = parseFloat(height || "0");
    const w = parseFloat(width || "0");
    
    // Use L×H for vertical surfaces (cabinets, walls) - height takes precedence
    // Use L×W for horizontal surfaces (countertops, floors) - when only width is provided
    if (l > 0 && h > 0) return (l * h).toFixed(2);
    if (l > 0 && w > 0) return (l * w).toFixed(2);
    return "0.00";
  };

  const calculateArea = (length?: string | null, width?: string | null) => {
    const l = parseFloat(length || "0");
    const w = parseFloat(width || "0");
    return l > 0 && w > 0 ? (l * w).toFixed(2) : "0.00";
  };

  // Sanitize decimal input: allow digits and one dot, clamp to 2 decimals
  const sanitizeDecimalInput = (value: string): string => {
    // Allow only digits and one dot
    let sanitized = value.replace(/[^\d.]/g, '');
    
    // Ensure only one dot by keeping the first and removing all others
    const dotIndex = sanitized.indexOf('.');
    if (dotIndex !== -1) {
      sanitized = sanitized.slice(0, dotIndex + 1) + sanitized.slice(dotIndex + 1).replace(/\./g, '');
    }
    
    // Limit to 2 decimal places (recompute parts after fixing multiple dots)
    const parts = sanitized.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    return sanitized;
  };

  const handleInteriorFieldChange = (id: string, field: string, value: any) => {
    const item = interiorItems.find((i) => i.id === id);
    if (!item) return;

    // Convert empty strings to null for numeric fields
    const normalizedValue = value === "" ? null : value;
    const updatedData: any = { [field]: normalizedValue };

    // Get updated values for all fields
    const newLength = field === "length" ? normalizedValue : item.length;
    const newHeight = field === "height" ? normalizedValue : item.height;
    const newWidth = field === "width" ? normalizedValue : item.width;
    const newMaterial = (field === "material" ? normalizedValue : item.material) || "Generic Ply";
    const newFinish = (field === "finish" ? normalizedValue : item.finish) || "Generic Laminate";
    const newHardware = (field === "hardware" ? normalizedValue : item.hardware) || "Nimmi";
    
    // Get project-level buildType with special handling for wall highlights/paneling
    const projectBuildType = (quotation?.buildType as BuildType) || "handmade";
    const description = (field === "description" ? normalizedValue : item.description) || "";
    const effectiveBuildType = getEffectiveBuildType(projectBuildType, description);
    
    // Update item's buildType to match project (with special cases)
    if (field === "description" || !item.buildType || item.buildType !== effectiveBuildType) {
      updatedData.buildType = effectiveBuildType;
    }

    // Auto-reset override when buildType/material/finish/hardware changes
    const resetOverrideTriggers = ["material", "finish", "hardware", "description"];
    const shouldResetOverride = resetOverrideTriggers.includes(field) && item.isRateOverridden;
    
    if (shouldResetOverride) {
      updatedData.isRateOverridden = false;
      updatedData.rateOverride = null;
    }

    // Always recalculate sqft when dimensions change
    if (field === "length" || field === "height" || field === "width") {
      const calculatedSqft = calculateSqft(newLength, newHeight, newWidth);
      updatedData.sqft = calculatedSqft;
      
      // Also recalculate rateAuto and amount
      const sqftValue = parseFloat(calculatedSqft);
      const rateAuto = calculateRate(
        effectiveBuildType,
        newMaterial as CoreMaterial,
        newFinish as FinishMaterial,
        newHardware as HardwareBrand
      );
      
      // Compute effective rate (considering override)
      const effectiveRate = item.isRateOverridden && item.rateOverride 
        ? parseFloat(item.rateOverride.toString()) 
        : rateAuto;
      
      // Send as numbers, not strings
      updatedData.rateAuto = rateAuto;
      updatedData.unitPrice = effectiveRate;
      updatedData.totalPrice = calculateAmount(effectiveRate, sqftValue);
    } else if (field === "material" || field === "finish" || field === "hardware" || field === "description") {
      // Recalculate rate and amount when brand fields or description changes
      const sqft = parseFloat(item.sqft || "0");
      const rateAuto = calculateRate(
        effectiveBuildType,
        newMaterial as CoreMaterial,
        newFinish as FinishMaterial,
        newHardware as HardwareBrand
      );
      
      // Effective rate is always rateAuto after override reset
      const effectiveRate = shouldResetOverride ? rateAuto : (
        item.isRateOverridden && item.rateOverride 
          ? parseFloat(item.rateOverride.toString()) 
          : rateAuto
      );
      
      // Send as numbers, not strings
      updatedData.rateAuto = rateAuto;
      updatedData.unitPrice = effectiveRate;
      updatedData.totalPrice = calculateAmount(effectiveRate, sqft);
    }

    updateInteriorItem.mutate({ id, data: updatedData });
  };

  // Handler for manual rate override
  const handleRateOverride = (id: string, value: string) => {
    const item = interiorItems.find((i) => i.id === id);
    if (!item || item.calc !== 'SQFT') return;

    // Empty value resets to auto
    if (value === "" || value === null) {
      handleResetRateOverride(id);
      return;
    }

    // Parse and validate the override value
    const overrideValue = parseFloat(value);
    if (isNaN(overrideValue) || overrideValue < 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    // Always recalculate rateAuto for consistency
    const projectBuildType = (quotation?.buildType as BuildType) || "handmade";
    const description = item.description || "";
    const effectiveBuildType = getEffectiveBuildType(projectBuildType, description);
    const rateAuto = calculateRate(
      effectiveBuildType,
      (item.material || "Generic Ply") as CoreMaterial,
      (item.finish || "Generic Laminate") as FinishMaterial,
      (item.hardware || "Nimmi") as HardwareBrand
    );

    const updatedData: any = {
      isRateOverridden: true,
      rateOverride: overrideValue,
      rateAuto: rateAuto,
      unitPrice: overrideValue,
    };

    // Recalculate total with new override rate
    const sqft = parseFloat(item.sqft || "0");
    updatedData.totalPrice = calculateAmount(overrideValue, sqft);

    updateInteriorItem.mutate({ id, data: updatedData });
  };

  // Handler to reset rate override
  const handleResetRateOverride = (id: string) => {
    const item = interiorItems.find((i) => i.id === id);
    if (!item) return;

    const updatedData: any = {
      isRateOverridden: false,
      rateOverride: null,
    };

    // Recalculate amount with auto rate
    const sqft = parseFloat(item.sqft || "0");
    const rateAuto = item.rateAuto ? parseFloat(item.rateAuto.toString()) : 0;
    updatedData.unitPrice = rateAuto;
    updatedData.totalPrice = calculateAmount(rateAuto, sqft);

    updateInteriorItem.mutate({ id, data: updatedData });
  };

  const handleFalseCeilingFieldChange = (id: string, field: string, value: any) => {
    const item = falseCeilingItems.find((i) => i.id === id);
    if (!item) return;

    // Convert empty strings to null for numeric fields
    const normalizedValue = value === "" ? null : value;
    const updatedData: any = { [field]: normalizedValue };

    // Recalculate area if dimensions change
    if (field === "length" || field === "width") {
      const newLength = field === "length" ? normalizedValue : item.length;
      const newWidth = field === "width" ? normalizedValue : item.width;
      const calculatedArea = calculateArea(newLength, newWidth);
      updatedData.area = calculatedArea;
    }

    updateFalseCeilingItem.mutate({ id, data: updatedData });
  };

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <QuotationHeader quotationId={quotationId!} currentStep="scope" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(`/quotation/${quotationId}/info`)} className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project Info
          </Button>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Scope of Work</CardTitle>
                <CardDescription>Define interior items and false ceiling details</CardDescription>
              </div>
              {quotation?.projectType && !["Other", ""].includes(quotation.projectType) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateModal(true)}
                  data-testid="button-apply-template"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Apply Template
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Empty state when no items */}
              {interiorItems.length === 0 && falseCeilingItems.length === 0 && otherItems.length === 0 && !loadingInterior && !loadingFalseCeiling && !loadingOther && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">No items added yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Get started by applying a template based on your project category, or manually add items using the tabs below.
                    </p>
                  </div>
                  {quotation?.projectType && !["Other", ""].includes(quotation.projectType) && (
                    <Button
                      onClick={() => setShowTemplateModal(true)}
                      data-testid="button-load-template-empty"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Load Template
                    </Button>
                  )}
                </div>
              )}

              {/* Show tabs when there are items or loading */}
              {(interiorItems.length > 0 || falseCeilingItems.length > 0 || otherItems.length > 0 || loadingInterior || loadingFalseCeiling || loadingOther) && (
                <Tabs defaultValue="interiors" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="interiors" data-testid="tab-interiors">Interiors</TabsTrigger>
                    <TabsTrigger value="false-ceiling" data-testid="tab-false-ceiling">False Ceiling</TabsTrigger>
                  </TabsList>

                {/* Interiors Tab */}
                <TabsContent value="interiors" className="space-y-6 pb-24">
                  {Array.from(new Set(interiorItems.map(item => item.roomType).filter(Boolean))).sort().map((roomType) => {
                    const roomItems = interiorItems.filter((item) => item.roomType === roomType);
                    const totalSqft = roomItems.reduce((sum, item) => sum + parseFloat(item.sqft || "0"), 0);
                    const roomTotal = roomItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

                    return (
                      <div key={roomType} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{roomType}</h3>
                              {totalSqft > 0 && (
                                <p className="text-sm text-muted-foreground font-mono">Total: {totalSqft.toFixed(2)} SQFT</p>
                              )}
                            </div>
                            {roomTotal > 0 && (
                              <Badge variant="secondary" className="font-mono" data-testid={`badge-room-total-${roomType.toLowerCase()}`}>
                                Room Total: {formatINR(roomTotal)}
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addInteriorItem.mutate({
                              quotationId: quotationId!,
                              roomType,
                              buildType: (quotation?.buildType as BuildType) || "handmade",
                              material: "Generic Ply",
                              finish: "Generic Laminate",
                              hardware: "Nimmi",
                            })}
                            data-testid={`button-add-interior-${roomType.toLowerCase()}`}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>

                        {roomItems.length > 0 && (
                          <div className="border border-border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-auto px-2">Description</TableHead>
                                  <TableHead className="w-[80px] px-1">L (ft)</TableHead>
                                  <TableHead className="w-[80px] px-1">H (ft)</TableHead>
                                  <TableHead className="w-[80px] px-1">W (ft)</TableHead>
                                  <TableHead className="w-[60px] px-1">SQFT</TableHead>
                                  <TableHead className="w-[132px] px-1">Core Material</TableHead>
                                  <TableHead className="w-[132px] px-1">Finish</TableHead>
                                  <TableHead className="w-[92px] px-1">Hardware</TableHead>
                                  <TableHead className="w-[70px] px-1">Rate (₹/sft)</TableHead>
                                  <TableHead className="w-[90px] px-1">Amount (₹)</TableHead>
                                  <TableHead className="w-[40px] px-1"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {roomItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="px-2">
                                      <Input
                                        value={item.description || ""}
                                        onChange={(e) => handleInteriorFieldChange(item.id, "description", e.target.value)}
                                        placeholder="Item description"
                                        className="h-12 min-w-[180px]"
                                        data-testid={`input-description-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Input
                                        key={`length-${item.id}-${item.length}`}
                                        type="text"
                                        inputMode="decimal"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        placeholder="0.00"
                                        defaultValue={item.length || ""}
                                        onChange={(e) => {
                                          e.target.value = sanitizeDecimalInput(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          const currentValue = e.target.value;
                                          if (currentValue !== (item.length || "")) {
                                            handleInteriorFieldChange(item.id, "length", currentValue);
                                          }
                                        }}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                        }}
                                        className="w-full h-10 font-mono text-center"
                                        data-testid={`input-length-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Input
                                        key={`height-${item.id}-${item.height}`}
                                        type="text"
                                        inputMode="decimal"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        placeholder="0.00"
                                        defaultValue={item.height || ""}
                                        onChange={(e) => {
                                          e.target.value = sanitizeDecimalInput(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          const currentValue = e.target.value;
                                          if (currentValue !== (item.height || "")) {
                                            handleInteriorFieldChange(item.id, "height", currentValue);
                                          }
                                        }}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                        }}
                                        className="w-full h-10 font-mono text-center"
                                        data-testid={`input-height-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Input
                                        key={`width-${item.id}-${item.width}`}
                                        type="text"
                                        inputMode="decimal"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        placeholder="0.00"
                                        defaultValue={item.width || ""}
                                        onChange={(e) => {
                                          e.target.value = sanitizeDecimalInput(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          const currentValue = e.target.value;
                                          if (currentValue !== (item.width || "")) {
                                            handleInteriorFieldChange(item.id, "width", currentValue);
                                          }
                                        }}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                        }}
                                        className="w-full h-10 font-mono text-center"
                                        data-testid={`input-width-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <span className="font-mono text-sm font-semibold" data-testid={`text-sqft-${item.id}`}>
                                        {item.sqft || "0.00"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Select
                                        value={item.material || "Generic Ply"}
                                        onValueChange={(value) => handleInteriorFieldChange(item.id, "material", value)}
                                      >
                                        <SelectTrigger className="h-8" data-testid={`select-material-${item.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CORE_MATERIALS.map((material) => (
                                            <SelectItem key={material} value={material}>
                                              {material}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Select
                                        value={item.finish || "Generic Laminate"}
                                        onValueChange={(value) => handleInteriorFieldChange(item.id, "finish", value)}
                                      >
                                        <SelectTrigger className="h-8" data-testid={`select-finish-${item.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {FINISH_MATERIALS.map((finish) => (
                                            <SelectItem key={finish} value={finish}>
                                              {finish}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Select
                                        value={item.hardware || "Nimmi"}
                                        onValueChange={(value) => handleInteriorFieldChange(item.id, "hardware", value)}
                                      >
                                        <SelectTrigger className="h-8" data-testid={`select-hardware-${item.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {HARDWARE_BRANDS.map((hardware) => (
                                            <SelectItem key={hardware} value={hardware}>
                                              {hardware}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      {item.calc === 'SQFT' ? (
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            defaultValue={item.unitPrice || ""}
                                            key={`${item.id}-${item.unitPrice}-${item.isRateOverridden}`}
                                            onBlur={(e) => {
                                              const newValue = e.target.value;
                                              const currentRate = item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0;
                                              const newRate = newValue ? parseFloat(newValue) : 0;
                                              
                                              // Only update if value actually changed
                                              if (newValue === "" || newRate === 0) {
                                                handleResetRateOverride(item.id);
                                              } else if (newRate !== currentRate) {
                                                handleRateOverride(item.id, newValue);
                                              }
                                            }}
                                            min="0"
                                            max="999999"
                                            step="1"
                                            className="h-8 w-28 text-right font-mono text-sm"
                                            data-testid={`input-rate-${item.id}`}
                                          />
                                          {item.isRateOverridden && (
                                            <>
                                              <Badge variant="secondary" className="text-xs" data-testid={`badge-custom-${item.id}`}>Custom</Badge>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleResetRateOverride(item.id)}
                                                className="h-6 px-2 text-xs"
                                                data-testid={`button-reset-rate-${item.id}`}
                                              >
                                                ↺ Auto
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="font-mono text-sm text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <span className="font-mono text-sm font-semibold" data-testid={`text-amount-${item.id}`}>
                                        ₹{item.totalPrice || "0"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteInteriorItem.mutate(item.id)}
                                        data-testid={`button-delete-interior-${item.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Sticky Footer for Interiors Tab */}
                  <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-10">
                    <div className="container mx-auto px-4 py-4">
                      <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          Interiors Subtotal: <span className="font-mono text-lg ml-2" data-testid="text-interiors-subtotal">
                            {formatINR(quotation?.totals?.interiorsSubtotal || 0)}
                          </span>
                        </div>
                        <Button 
                          onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
                          data-testid="button-next-estimate-interiors"
                        >
                          Next → Estimate
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* False Ceiling Tab */}
                <TabsContent value="false-ceiling" className="space-y-6 pb-24">
                  {/* False Ceiling Items by Room */}
                  {Array.from(new Set(falseCeilingItems.map(item => item.roomType).filter(Boolean))).sort().map((roomType) => {
                    const roomItems = falseCeilingItems.filter((item) => item.roomType === roomType);
                    const totalArea = roomItems.reduce((sum, item) => sum + parseFloat(item.area || "0"), 0);

                    return (
                      <div key={roomType} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{roomType}</h3>
                              {totalArea > 0 && (
                                <p className="text-sm text-muted-foreground font-mono">Total: {totalArea.toFixed(2)} SQFT</p>
                              )}
                            </div>
                            {totalArea > 0 && (
                              <Badge variant="secondary" className="font-mono" data-testid={`badge-fc-room-area-${roomType.toLowerCase()}`}>
                                Room Area: {totalArea.toFixed(2)} SQFT
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addFalseCeilingItem.mutate({
                              quotationId: quotationId!,
                              roomType,
                            })}
                            data-testid={`button-add-ceiling-${roomType.toLowerCase()}`}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>

                        {roomItems.length > 0 && (
                          <div className="border border-border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-auto px-2">Description</TableHead>
                                  <TableHead className="w-[80px] px-1">Length (ft)</TableHead>
                                  <TableHead className="w-[80px] px-1">Width (ft)</TableHead>
                                  <TableHead className="w-[80px] px-1">Area (SQFT)</TableHead>
                                  <TableHead className="w-[40px] px-1"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {roomItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="px-2">
                                      <Input
                                        value={item.description || ""}
                                        onChange={(e) => handleFalseCeilingFieldChange(item.id, "description", e.target.value)}
                                        placeholder="Ceiling description"
                                        className="h-12 min-w-[200px]"
                                        data-testid={`input-ceiling-description-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Input
                                        key={`ceiling-length-${item.id}-${item.length}`}
                                        type="text"
                                        inputMode="decimal"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        placeholder="0.00"
                                        defaultValue={item.length || ""}
                                        onChange={(e) => {
                                          e.target.value = sanitizeDecimalInput(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          const currentValue = e.target.value;
                                          if (currentValue !== (item.length || "")) {
                                            handleFalseCeilingFieldChange(item.id, "length", currentValue);
                                          }
                                        }}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                        }}
                                        className="w-full h-10 font-mono text-center"
                                        data-testid={`input-ceiling-length-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Input
                                        key={`ceiling-width-${item.id}-${item.width}`}
                                        type="text"
                                        inputMode="decimal"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        placeholder="0.00"
                                        defaultValue={item.width || ""}
                                        onChange={(e) => {
                                          e.target.value = sanitizeDecimalInput(e.target.value);
                                        }}
                                        onBlur={(e) => {
                                          const currentValue = e.target.value;
                                          if (currentValue !== (item.width || "")) {
                                            handleFalseCeilingFieldChange(item.id, "width", currentValue);
                                          }
                                        }}
                                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                        }}
                                        className="w-full h-10 font-mono text-center"
                                        data-testid={`input-ceiling-width-${item.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <span className="font-mono text-sm font-semibold" data-testid={`text-ceiling-area-${item.id}`}>
                                        {item.area || "0.00"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="px-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteFalseCeilingItem.mutate(item.id)}
                                        data-testid={`button-delete-ceiling-${item.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* OTHERS Section */}
                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">OTHERS</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOtherItem.mutate({
                          quotationId: quotationId!,
                          itemType: "Paint",
                          valueType: "lumpsum",
                        })}
                        data-testid="button-add-other"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>

                    {otherItems.length > 0 && (
                      <div className="border border-border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[160px]">Item Type</TableHead>
                              <TableHead className="w-auto">Description</TableHead>
                              <TableHead className="w-[100px]">Type</TableHead>
                              <TableHead className="w-[90px]">Quantity</TableHead>
                              <TableHead className="w-[130px]">Price per Quantity</TableHead>
                              <TableHead className="w-[110px]">Total</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {otherItems.map((item) => {
                              const quantity = parseFloat(item.value || "0");
                              const pricePerQty = parseFloat(item.unitPrice || "0");
                              const total = quantity * pricePerQty;
                              
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Select
                                      value={item.itemType || ""}
                                      onValueChange={(value) => updateOtherItem.mutate({ id: item.id, data: { itemType: value } })}
                                    >
                                      <SelectTrigger className="h-8" data-testid={`select-other-type-${item.id}`}>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {OTHER_ITEM_TYPES.map((type) => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.description || ""}
                                      onChange={(e) => updateOtherItem.mutate({ id: item.id, data: { description: e.target.value } })}
                                      placeholder="Description"
                                      className="h-12 min-w-[200px]"
                                      data-testid={`input-other-description-${item.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={item.valueType || "lumpsum"}
                                      onValueChange={(value) => updateOtherItem.mutate({ id: item.id, data: { valueType: value } })}
                                    >
                                      <SelectTrigger className="h-8" data-testid={`select-other-value-type-${item.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lumpsum">Lumpsum</SelectItem>
                                        <SelectItem value="count">Quantity</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.value || ""}
                                      onChange={(e) => updateOtherItem.mutate({ id: item.id, data: { value: e.target.value } })}
                                      placeholder={item.valueType === "count" ? "Enter quantity" : "Enter amount"}
                                      className="h-8"
                                      data-testid={`input-other-value-${item.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={item.unitPrice || ""}
                                      onChange={(e) => updateOtherItem.mutate({ id: item.id, data: { unitPrice: e.target.value } })}
                                      placeholder="0.00"
                                      className="h-8"
                                      data-testid={`input-other-unit-price-${item.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-mono text-sm" data-testid={`text-other-total-${item.id}`}>
                                      {formatINR(total)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteOtherItem.mutate(item.id)}
                                      data-testid={`button-delete-other-${item.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  
                  {/* Sticky Footer for False Ceiling Tab */}
                  <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-10">
                    <div className="container mx-auto px-4 py-4">
                      <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          False Ceiling Subtotal: <span className="font-mono text-lg ml-2" data-testid="text-fc-subtotal">
                            {formatINR(quotation?.totals?.fcSubtotal || 0)}
                          </span>
                        </div>
                        <Button 
                          onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
                          data-testid="button-next-estimate-fc"
                        >
                          Next → Estimate
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                </Tabs>
              )}

              <div className="flex items-center justify-between gap-3 pt-6 border-t border-border mt-8">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/quotation/${quotationId}/info`)}
                    data-testid="button-back-to-info"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project Info
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowApplyTemplateModal(true)}
                    data-testid="button-apply-template-scope"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Apply Template
                  </Button>
                  <Button 
                    onClick={() => navigate(`/quotation/${quotationId}/estimate`)}
                    data-testid="button-continue-estimate"
                  >
                    Continue to Estimate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                
                {totalsUpdatedAt && quotation?.totals && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="text-xs">
                      Subtotal: <span className="font-mono font-semibold text-foreground">{formatINR(quotation.totals.grandSubtotal)}</span>
                    </span>
                    <span className="text-xs" data-testid="text-totals-updated">
                      Updated just now
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AppFooter />
      
      <TemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        quotationId={quotationId!}
        category={quotation?.projectType || ""}
        hasExistingItems={interiorItems.length > 0 || falseCeilingItems.length > 0 || otherItems.length > 0}
        onSuccess={() => {
          // Refresh the page or just close the modal - items will auto-refresh via query invalidation
        }}
      />

      <ApplyTemplateModal
        open={showApplyTemplateModal}
        onOpenChange={setShowApplyTemplateModal}
        quotationId={quotationId!}
        onSuccess={() => {
          // Items will auto-refresh via query invalidation
          queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/interior-items`] });
          queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`] });
        }}
      />
    </div>
  );
}
