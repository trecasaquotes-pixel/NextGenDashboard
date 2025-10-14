import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2 } from "lucide-react";

interface ApproveQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  onSuccess?: () => void;
}

export function ApproveQuoteDialog({
  open,
  onOpenChange,
  quotationId,
  onSuccess,
}: ApproveQuoteDialogProps) {
  const [approvedBy, setApprovedBy] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quotations/${quotationId}/approve`, {
        approvedBy,
        siteAddress,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Quote Approved",
        description: "Agreement has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      onOpenChange(false);
      setApprovedBy("");
      setSiteAddress("");
      setConfirmed(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve quote",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you want to lock this quote",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-approve-quote">
        <DialogHeader>
          <DialogTitle>Approve Quote</DialogTitle>
          <DialogDescription>
            Approve this quote and generate an agreement. This will lock the quote and prevent further edits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="approvedBy">Approved By</Label>
            <Input
              id="approvedBy"
              placeholder="Your name"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              data-testid="input-approved-by"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteAddress">Site Address</Label>
            <Textarea
              id="siteAddress"
              placeholder="Enter the complete site address"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              rows={3}
              data-testid="textarea-site-address"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              data-testid="checkbox-confirm-approve"
            />
            <Label
              htmlFor="confirm"
              className="text-sm font-normal cursor-pointer"
            >
              Lock this quote and generate Agreement
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={approveMutation.isPending}
            data-testid="button-cancel-approve"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={approveMutation.isPending || !confirmed}
            data-testid="button-confirm-approve"
          >
            {approveMutation.isPending ? (
              "Approving..."
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve & Generate Agreement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
