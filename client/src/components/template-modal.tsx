import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getTemplateForCategory, type TemplateId } from "@/lib/templates";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type TemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  category: string;
  hasExistingItems?: boolean;
  onSuccess?: () => void;
};

type OptionalRoom = {
  key: string;
  label: string;
  checked: boolean;
};

export function TemplateModal({
  open,
  onOpenChange,
  quotationId,
  category,
  hasExistingItems = false,
  onSuccess,
}: TemplateModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"preview" | "customize" | "mode-select">("preview");
  const [mode, setMode] = useState<"append" | "replace" | null>(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [optionalRooms, setOptionalRooms] = useState<OptionalRoom[]>([
    { key: "Foyer", label: "Foyer", checked: false },
    { key: "Utility", label: "Utility", checked: false },
    { key: "Puja", label: "Puja", checked: false },
    { key: "Study", label: "Study", checked: false },
    { key: "Balcony", label: "Balcony", checked: false },
    { key: "Other", label: "Other", checked: false },
  ]);

  // Map category names to TemplateId
  const getCategoryTemplateId = (cat: string): TemplateId => {
    const mapping: Record<string, TemplateId> = {
      "1 BHK": "1BHK",
      "2 BHK": "2BHK",
      "3 BHK": "3BHK",
      "4 BHK": "4BHK",
      "Duplex": "Duplex",
      "Triplex": "Triplex",
      "Villa": "Villa",
      "Commercial": "Commercial",
    };
    return mapping[cat] || "3BHK";
  };

  const template = getTemplateForCategory(getCategoryTemplateId(category));

  // Get unique room names for preview
  const getUniqueRooms = () => {
    const interiorRooms = template.rooms
      .filter(r => r.tab === "Interiors" && r.defaultItems !== undefined) // Include Misc even if empty
      .map(r => r.label);
    const fcRooms = template.rooms
      .filter(r => r.tab === "FC" && r.fcLine)
      .map(r => r.label);
    return {
      interiors: Array.from(new Set(interiorRooms)),
      fc: Array.from(new Set(fcRooms)),
    };
  };

  const rooms = getUniqueRooms();

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ replaceExisting }: { replaceExisting: boolean }) => {
      // Step 1: If replacing, delete all existing items
      if (replaceExisting && hasExistingItems) {
        const [interiorItems, fcItems, otherItems] = await Promise.all([
          fetch(`/api/quotations/${quotationId}/interior-items`).then(r => r.json()),
          fetch(`/api/quotations/${quotationId}/false-ceiling-items`).then(r => r.json()),
          fetch(`/api/quotations/${quotationId}/other-items`).then(r => r.json()),
        ]);

        await Promise.all([
          ...interiorItems.map((item: any) => 
            apiRequest("DELETE", `/api/quotations/${quotationId}/interior-items/${item.id}`)
          ),
          ...fcItems.map((item: any) => 
            apiRequest("DELETE", `/api/quotations/${quotationId}/false-ceiling-items/${item.id}`)
          ),
          ...otherItems.map((item: any) => 
            apiRequest("DELETE", `/api/quotations/${quotationId}/other-items/${item.id}`)
          ),
        ]);
      }

      // Step 2: Get existing room names to avoid duplicates (only if appending)
      let existingRooms: Set<string> = new Set();
      if (!replaceExisting && hasExistingItems) {
        const [interiorItems, fcItems] = await Promise.all([
          fetch(`/api/quotations/${quotationId}/interior-items`).then(r => r.json()),
          fetch(`/api/quotations/${quotationId}/false-ceiling-items`).then(r => r.json()),
        ]);
        
        interiorItems.forEach((item: any) => {
          if (item.roomType) existingRooms.add(item.roomType);
        });
        fcItems.forEach((item: any) => {
          if (item.roomType) existingRooms.add(item.roomType);
        });
      }

      // Step 3: Get selected optional rooms
      const selectedOptionalRoomKeys = optionalRooms
        .filter(r => r.checked)
        .map(r => r.key);

      // Step 4: Create interior items
      const interiorPromises = template.rooms
        .filter(r => r.tab === "Interiors" && r.defaultItems && r.defaultItems.length > 0)
        .filter(r => !existingRooms.has(r.label)) // Skip if room exists (append mode)
        .filter(r => {
          // Include standard rooms or selected optional rooms
          const isOptional = ["Foyer", "Utility", "Puja", "Study", "Balcony", "Other"].includes(r.key);
          return !isOptional || selectedOptionalRoomKeys.includes(r.key);
        })
        .flatMap(room => 
          room.defaultItems!.map(item => {
            const itemData: any = {
              quotationId,
              roomType: room.label,
              description: item.description,
              calc: item.calc,
              buildType: item.buildType || "handmade",
              material: item.core || "Generic Ply",
              finish: item.finish || "Generic Laminate",
              hardware: item.hardware || "Nimmi",
            };
            return apiRequest("POST", `/api/quotations/${quotationId}/interior-items`, itemData);
          })
        );

      // Step 5: Create FC items
      const fcPromises = template.rooms
        .filter(r => r.tab === "FC" && r.fcLine)
        .filter(r => !existingRooms.has(r.label)) // Skip if room exists (append mode)
        .filter(r => {
          // Include standard rooms or selected optional rooms
          const isOptional = ["Foyer", "Utility", "Puja", "Study", "Balcony", "Other"].includes(r.key);
          return !isOptional || selectedOptionalRoomKeys.includes(r.key);
        })
        .map(room => {
          const fcData: any = {
            quotationId,
            roomType: room.label,
            description: "",
          };
          return apiRequest("POST", `/api/quotations/${quotationId}/false-ceiling-items`, fcData);
        });

      // Step 6: Create FC Others items
      const otherPromises: Promise<any>[] = [];
      
      if (template.fcOthers.includeWallPainting) {
        otherPromises.push(
          apiRequest("POST", `/api/quotations/${quotationId}/other-items`, {
            quotationId,
            itemType: "Paint",
            description: "Wall Painting – Package",
            valueType: "lumpsum",
            value: "0",
          })
        );
      }
      
      if (template.fcOthers.includeFCPainting) {
        otherPromises.push(
          apiRequest("POST", `/api/quotations/${quotationId}/other-items`, {
            quotationId,
            itemType: "Paint",
            description: "False Ceiling – Painting (Generic)",
            valueType: "lumpsum",
            value: "0",
          })
        );
      }
      
      if (template.fcOthers.includeLights) {
        otherPromises.push(
          apiRequest("POST", `/api/quotations/${quotationId}/other-items`, {
            quotationId,
            itemType: "Lights",
            description: "FC Lights",
            valueType: "count",
            value: "0",
          })
        );
      }
      
      if (template.fcOthers.includeFanHooks) {
        otherPromises.push(
          apiRequest("POST", `/api/quotations/${quotationId}/other-items`, {
            quotationId,
            itemType: "Fan Hook Rods",
            description: "Fan Hook Rods",
            valueType: "count",
            value: "0",
          })
        );
      }

      // Execute all requests
      await Promise.all([...interiorPromises, ...fcPromises, ...otherPromises]);
    },
    onSuccess: async () => {
      // Invalidate all quotation-related queries to ensure all pages refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/interior-items`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/other-items`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] }),
      ]);
      
      // Force refetch for all pages
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes(`/api/quotations/${quotationId}`);
        }
      });
      
      toast({
        title: "Template applied",
        description: `Template applied for ${category}.`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUseTemplate = () => {
    if (hasExistingItems) {
      setStep("mode-select");
    } else {
      applyTemplateMutation.mutate({ replaceExisting: false });
    }
  };

  const handleCustomizeFirst = () => {
    setStep("customize");
  };

  const handleApplyCustomized = () => {
    if (hasExistingItems) {
      setStep("mode-select");
    } else {
      applyTemplateMutation.mutate({ replaceExisting: false });
    }
  };

  const handleModeSelect = (selectedMode: "append" | "replace") => {
    setMode(selectedMode);
    if (selectedMode === "replace") {
      setShowConfirmReplace(true);
    } else {
      applyTemplateMutation.mutate({ replaceExisting: false });
    }
  };

  const handleConfirmReplace = () => {
    setShowConfirmReplace(false);
    applyTemplateMutation.mutate({ replaceExisting: true });
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  const handleClose = () => {
    // Reset all state when closing
    setStep("preview");
    setMode(null);
    setShowConfirmReplace(false);
    setOptionalRooms(optionalRooms.map(r => ({ ...r, checked: false })));
    onOpenChange(false);
  };

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep("preview");
      setMode(null);
      setShowConfirmReplace(false);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-template">
          <DialogHeader>
            <DialogTitle data-testid="text-template-title">
              {step === "preview" && `Apply Template for ${category}?`}
              {step === "customize" && "Customize Template"}
              {step === "mode-select" && "Apply Template Options"}
            </DialogTitle>
            <DialogDescription data-testid="text-template-description">
              {step === "preview" && "This will add rooms and items to your quotation."}
              {step === "customize" && "Select additional rooms to include."}
              {step === "mode-select" && "Choose how to apply the template to this quote."}
            </DialogDescription>
          </DialogHeader>

          {step === "preview" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Interiors Rooms:</h4>
                <div className="text-sm text-muted-foreground">
                  {rooms.interiors.join(", ")}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">False Ceiling Rooms:</h4>
                <div className="text-sm text-muted-foreground">
                  {rooms.fc.join(", ")}
                </div>
              </div>
            </div>
          )}

          {step === "customize" && (
            <ScrollArea className="h-[200px]">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select optional rooms to include in addition to standard rooms:
                </p>
                {optionalRooms.map((room) => (
                  <div key={room.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`room-${room.key}`}
                      checked={room.checked}
                      onCheckedChange={(checked) => {
                        setOptionalRooms(
                          optionalRooms.map(r =>
                            r.key === room.key ? { ...r, checked: !!checked } : r
                          )
                        );
                      }}
                      data-testid={`checkbox-room-${room.key.toLowerCase()}`}
                    />
                    <Label htmlFor={`room-${room.key}`} className="text-sm cursor-pointer">
                      {room.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {step === "mode-select" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This quote already has items. Choose how to apply the template:
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-auto flex-col items-start gap-1 py-3 px-4"
                  onClick={() => handleModeSelect("append")}
                  disabled={applyTemplateMutation.isPending}
                  data-testid="button-mode-append"
                >
                  <span className="font-medium">Append Only</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Add missing rooms/items; leave existing untouched
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-auto flex-col items-start gap-1 py-3 px-4"
                  onClick={() => handleModeSelect("replace")}
                  disabled={applyTemplateMutation.isPending}
                  data-testid="button-mode-replace"
                >
                  <span className="font-medium">Replace</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Clear current scope and apply fresh template
                  </span>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  data-testid="button-skip-template"
                >
                  Skip
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCustomizeFirst}
                  data-testid="button-customize-first"
                >
                  Customize First
                </Button>
                <Button
                  onClick={handleUseTemplate}
                  disabled={applyTemplateMutation.isPending}
                  data-testid="button-use-template"
                >
                  {applyTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Use Template
                </Button>
              </>
            )}

            {step === "customize" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep("preview")}
                  data-testid="button-back-preview"
                >
                  Back
                </Button>
                <Button
                  onClick={handleApplyCustomized}
                  disabled={applyTemplateMutation.isPending}
                  data-testid="button-apply-continue"
                >
                  {applyTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Apply & Continue
                </Button>
              </>
            )}

            {step === "mode-select" && (
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-mode"
              >
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmReplace} onOpenChange={setShowConfirmReplace}>
        <AlertDialogContent data-testid="dialog-confirm-replace">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Replace</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all current items in this quote and apply a fresh template. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-replace">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplace}
              disabled={applyTemplateMutation.isPending}
              data-testid="button-confirm-replace"
            >
              {applyTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
