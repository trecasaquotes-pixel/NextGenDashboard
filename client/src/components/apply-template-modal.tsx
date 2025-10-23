import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TemplateSummary, ApplyTemplateResponse } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  onSuccess?: () => void;
  defaultMode?: "merge" | "reset";
}

export function ApplyTemplateModal({
  open,
  onOpenChange,
  quotationId,
  onSuccess,
  defaultMode = "merge",
}: ApplyTemplateModalProps) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string>("");
  const [mode, setMode] = useState<"merge" | "reset">(defaultMode);
  const [applyFcDefaults, setApplyFcDefaults] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch active templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<TemplateSummary[]>({
    queryKey: ["/api/admin/templates?active=1"],
    enabled: open,
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quotations/${quotationId}/apply-template`, {
        templateId,
        mode,
      });
      const data: ApplyTemplateResponse = await response.json();

      // If FC defaults checkbox is checked, also apply FC defaults
      if (applyFcDefaults) {
        await apiRequest("POST", `/api/quotations/${quotationId}/apply-fc-defaults`, {});
      }

      return data;
    },
    onSuccess: async (data) => {
      // Invalidate all quotation-related queries to ensure all pages refresh
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [`/api/quotations/${quotationId}/interior-items`],
        }),
        queryClient.invalidateQueries({
          queryKey: [`/api/quotations/${quotationId}/false-ceiling-items`],
        }),
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}/other-items`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] }),
      ]);

      // Force refetch for all pages by invalidating with refetch
      await queryClient.refetchQueries({
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || "";
          return key.includes(`/api/quotations/${quotationId}`);
        },
      });

      const itemsText = data.applied.itemsAdded === 1 ? "item" : "items";
      let message = `Template applied — ${data.applied.itemsAdded} ${itemsText} added`;

      if (data.skipped && data.skipped.length > 0) {
        message += `. ${data.skipped.length} items skipped (inactive rates)`;
      }

      toast({
        title: "Success",
        description: message,
      });

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateId("");
    setMode(defaultMode);
    setApplyFcDefaults(true);
  };

  const handleApply = () => {
    if (mode === "reset") {
      setShowResetConfirm(true);
    } else {
      applyTemplateMutation.mutate();
    }
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    applyTemplateMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-apply-template">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>Auto-populate rooms and items from a template</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template" data-testid="select-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTemplates ? (
                    <SelectItem value="loading" disabled>
                      Loading templates...
                    </SelectItem>
                  ) : templates.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No templates available
                    </SelectItem>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={(value: "merge" | "reset") => setMode(value)}>
                <SelectTrigger id="mode" data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge (Add only missing items)</SelectItem>
                  <SelectItem value="reset">Reset (Clear all and re-add)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mode === "merge"
                  ? "Adds template items without removing existing ones"
                  : "Removes all existing items and adds template items"}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="fc-defaults"
                checked={applyFcDefaults}
                onCheckedChange={(checked) => setApplyFcDefaults(checked === true)}
                data-testid="checkbox-fc-defaults"
              />
              <Label htmlFor="fc-defaults" className="text-sm font-normal cursor-pointer">
                Also add False Ceiling defaults
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!templateId || applyTemplateMutation.isPending}
              data-testid="button-apply"
            >
              {applyTemplateMutation.isPending ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent data-testid="dialog-reset-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all existing interior items and replace them with the template items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              data-testid="button-confirm-reset"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset & Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
