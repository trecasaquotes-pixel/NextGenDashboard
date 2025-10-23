import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dateFormat } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SignoffEditorProps {
  quotationId: string;
  quotation: any;
}

export function SignoffEditor({ quotationId, quotation }: SignoffEditorProps) {
  const { toast } = useToast();

  // Local state for editing
  const [clientName, setClientName] = useState(
    quotation.signoff?.client?.name || quotation.clientName || "",
  );
  const [clientSignature, setClientSignature] = useState(
    quotation.signoff?.client?.signature || "",
  );
  const [trecasaName, setTrecasaName] = useState(
    quotation.signoff?.trecasa?.name || "Authorized Signatory",
  );
  const [trecasaTitle, setTrecasaTitle] = useState(
    quotation.signoff?.trecasa?.title || "For TRECASA DESIGN STUDIO",
  );
  const [trecasaSignature, setTrecasaSignature] = useState(
    quotation.signoff?.trecasa?.signature || "",
  );

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PATCH", `/api/quotations/${quotationId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update signature information",
        variant: "destructive",
      });
    },
  });

  const handleUpdateSignoff = (field: string, value: any) => {
    const currentSignoff = quotation.signoff || {
      client: { name: "", signature: "", signedAt: undefined },
      trecasa: {
        name: "Authorized Signatory",
        title: "For TRECASA DESIGN STUDIO",
        signature: "",
        signedAt: undefined,
      },
      accepted: false,
      acceptedAt: undefined,
    };

    const updates: any = { signoff: { ...currentSignoff } };

    if (field.startsWith("client.")) {
      const subfield = field.split(".")[1];
      updates.signoff.client = { ...currentSignoff.client, [subfield]: value };
    } else if (field.startsWith("trecasa.")) {
      const subfield = field.split(".")[1];
      updates.signoff.trecasa = { ...currentSignoff.trecasa, [subfield]: value };
    } else {
      updates.signoff[field] = value;
    }

    updateMutation.mutate(updates);
  };

  const handleMarkClientAccepted = () => {
    const now = Date.now();
    const currentSignoff = quotation.signoff || {
      client: { name: "", signature: "", signedAt: undefined },
      trecasa: {
        name: "Authorized Signatory",
        title: "For TRECASA DESIGN STUDIO",
        signature: "",
        signedAt: undefined,
      },
      accepted: false,
      acceptedAt: undefined,
    };

    updateMutation.mutate({
      signoff: {
        ...currentSignoff,
        accepted: true,
        acceptedAt: now,
      },
    });
  };

  const handleMarkTrecasaSigned = () => {
    const now = Date.now();
    handleUpdateSignoff("trecasa.signedAt", now);
  };

  const isClientAccepted = quotation.signoff?.accepted;
  const isTrecasaSigned = quotation.signoff?.trecasa?.signedAt;

  return (
    <Card data-testid="card-signoff-editor">
      <CardHeader>
        <CardTitle>Sign & Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Column */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Client</h3>

            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                data-testid="input-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onBlur={() => handleUpdateSignoff("client.name", clientName)}
                placeholder="Client name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-signature">Client Signature (typed)</Label>
              <Input
                id="client-signature"
                data-testid="input-client-signature"
                value={clientSignature}
                onChange={(e) => setClientSignature(e.target.value)}
                onBlur={() => handleUpdateSignoff("client.signature", clientSignature)}
                placeholder="Type signature"
                className="font-serif italic"
              />
            </div>

            <div className="pt-2">
              {isClientAccepted ? (
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="badge-client-accepted"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Accepted on {dateFormat(quotation.signoff.acceptedAt)}
                </Badge>
              ) : (
                <Button
                  onClick={handleMarkClientAccepted}
                  variant="default"
                  data-testid="button-mark-client-accepted"
                  disabled={updateMutation.isPending}
                >
                  Mark Client Accepted
                </Button>
              )}
            </div>
          </div>

          {/* Trecasa Column */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">TRECASA</h3>

            <div className="space-y-2">
              <Label htmlFor="trecasa-name">Signatory Name</Label>
              <Input
                id="trecasa-name"
                data-testid="input-trecasa-name"
                value={trecasaName}
                onChange={(e) => setTrecasaName(e.target.value)}
                onBlur={() => handleUpdateSignoff("trecasa.name", trecasaName)}
                placeholder="Authorized Signatory"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trecasa-title">Title</Label>
              <Input
                id="trecasa-title"
                data-testid="input-trecasa-title"
                value={trecasaTitle}
                onChange={(e) => setTrecasaTitle(e.target.value)}
                onBlur={() => handleUpdateSignoff("trecasa.title", trecasaTitle)}
                placeholder="For TRECASA DESIGN STUDIO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trecasa-signature">Trecasa Signature (typed)</Label>
              <Input
                id="trecasa-signature"
                data-testid="input-trecasa-signature"
                value={trecasaSignature}
                onChange={(e) => setTrecasaSignature(e.target.value)}
                onBlur={() => handleUpdateSignoff("trecasa.signature", trecasaSignature)}
                placeholder="Type signature"
                className="font-serif italic"
              />
            </div>

            <div className="pt-2">
              {isTrecasaSigned ? (
                <Badge variant="secondary" data-testid="badge-trecasa-signed">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Signed on {dateFormat(quotation.signoff.trecasa.signedAt)}
                </Badge>
              ) : (
                <Button
                  onClick={handleMarkTrecasaSigned}
                  variant="default"
                  data-testid="button-mark-trecasa-signed"
                  disabled={updateMutation.isPending}
                >
                  Mark Trecasa Signed
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
