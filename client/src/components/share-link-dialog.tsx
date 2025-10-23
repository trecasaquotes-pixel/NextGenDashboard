import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  clientToken?: string | null;
  clientTokenExpiresAt?: number | null;
}

export function ShareLinkDialog({
  open,
  onOpenChange,
  quoteId,
  clientToken,
  clientTokenExpiresAt,
}: ShareLinkDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setExpiry, setSetExpiry] = useState(false);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/client-quote/${quoteId}/request-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setExpiry }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate link");
      return await response.json();
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quoteId}`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/quotations"] }),
      ]);
      toast({
        title: "Share link generated",
        description: "Client share link has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    },
  });

  const shareUrl = clientToken
    ? `${window.location.origin}/client/${quoteId}?token=${clientToken}`
    : null;

  const isExpired = clientTokenExpiresAt && clientTokenExpiresAt < Date.now();
  const expiryDate = clientTokenExpiresAt
    ? new Date(clientTokenExpiresAt).toLocaleString()
    : "Never";

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    }
  };

  const handleOpenLink = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-share-link">
        <DialogHeader>
          <DialogTitle>Client Share Link</DialogTitle>
          <DialogDescription>
            Generate a secure link to share this quotation with your client. They can review and
            accept the quote without logging in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {shareUrl ? (
            <>
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-share-url"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleOpenLink}
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="text-sm text-muted-foreground">
                  {isExpired ? (
                    <span className="text-destructive font-medium">Expired on {expiryDate}</span>
                  ) : (
                    <span>
                      {clientTokenExpiresAt ? `Expires on ${expiryDate}` : "Never expires"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Set 14-day expiry</Label>
                  <div className="text-sm text-muted-foreground">
                    New link will expire in 14 days
                  </div>
                </div>
                <Switch
                  checked={setExpiry}
                  onCheckedChange={setSetExpiry}
                  data-testid="switch-expiry"
                />
              </div>

              <Button
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-regenerate"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {generateLinkMutation.isPending ? "Regenerating..." : "Regenerate Link"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Set 14-day expiry</Label>
                  <div className="text-sm text-muted-foreground">Link will expire in 14 days</div>
                </div>
                <Switch
                  checked={setExpiry}
                  onCheckedChange={setSetExpiry}
                  data-testid="switch-expiry"
                />
              </div>

              <Button
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                className="w-full"
                data-testid="button-generate"
              >
                {generateLinkMutation.isPending ? "Generating..." : "Generate Share Link"}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
