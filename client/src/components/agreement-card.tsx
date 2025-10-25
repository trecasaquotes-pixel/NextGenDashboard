import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSignature, CheckCircle2 } from "lucide-react";
import { formatINR } from "@shared/formatters";
import type { Agreement } from "@shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";


interface AgreementCardProps {
  quotationId: string;
  approvedAt?: number;
  approvedBy?: string;
}

export function AgreementCard({ quotationId, approvedAt, approvedBy }: AgreementCardProps) {
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [clientName, setClientName] = useState("");
  const { toast } = useToast();

  const { data: agreement } = useQuery<Agreement | null>({
    queryKey: ["/api/quotations", { id: quotationId }, "agreement"],
    enabled: Boolean(quotationId && approvedAt),
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!agreement) throw new Error("No agreement found");
      const response = await apiRequest("POST", `/api/agreements/${agreement.id}/sign`, {
        signedByClient: clientName,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Agreement Signed",
        description: "Client signature has been recorded",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/quotations", { id: quotationId }, "agreement"],
      });
      setShowSignDialog(false);
      setClientName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign agreement",
        variant: "destructive",
      });
    },
  });

  if (!approvedAt) return null;

  const approvalDate = new Date(approvedAt).toLocaleDateString();
  const grandTotal = agreement ? agreement.grandTotal / 100 : 0;
  const gstAmount = agreement ? agreement.gstAmount / 100 : 0;
  const signedDate = agreement?.signedAt
    ? new Date(agreement.signedAt).toLocaleDateString()
    : null;

  return (
    <>
      <Card data-testid="card-agreement">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Agreement Generated
            </CardTitle>
            <Badge variant="secondary" data-testid="badge-approved">
              Approved
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Approved By</p>
              <p className="font-medium" data-testid="text-approved-by">
                {approvedBy || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved On</p>
              <p className="font-medium" data-testid="text-approved-date">
                {approvalDate}
              </p>
            </div>
            {agreement && (
              <>
                <div>
                  <p className="text-muted-foreground">GST Amount</p>
                  <p className="font-medium" data-testid="text-gst-amount">
                    {formatINR(gstAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grand Total</p>
                  <p className="font-semibold text-lg" data-testid="text-grand-total">
                    {formatINR(grandTotal)}
                  </p>
                </div>
              </>
            )}
          </div>

          {agreement?.signedByClient && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
              <p className="text-sm text-green-800 dark:text-green-200">
                <FileSignature className="inline h-4 w-4 mr-1" />
                Signed by <span className="font-medium">{agreement.signedByClient}</span> on{" "}
                {signedDate}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(`/api/quotations/${quotationId}/agreement/download`, "_blank")
              }
              data-testid="button-download-agreement"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Agreement PDF
            </Button>
            {!agreement?.signedByClient && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSignDialog(true)}
                data-testid="button-mark-signed"
              >
                <FileSignature className="mr-2 h-4 w-4" />
                Mark as Signed
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent data-testid="dialog-sign-agreement">
          <DialogHeader>
            <DialogTitle>Mark Agreement as Signed</DialogTitle>
            <DialogDescription>Record the client's signature on this agreement</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Enter client's full name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              data-testid="input-client-signature-name"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignDialog(false)}
              disabled={signMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending || !clientName.trim()}
              data-testid="button-confirm-sign"
            >
              {signMutation.isPending ? "Recording..." : "Record Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
