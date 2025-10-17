import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, FileText, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QuotationVersion {
  id: string;
  quotationId: string;
  userId: string;
  versionNumber: number;
  changeType: string;
  changeSummary: string;
  snapshot: any;
  createdAt: string;
}

interface VersionHistoryDialogProps {
  quotationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const changeTypeColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update_info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  update_items: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  update_pricing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  status_change: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const changeTypeLabels: Record<string, string> = {
  create: "Created",
  update_info: "Info Updated",
  update_items: "Items Modified",
  update_pricing: "Pricing Updated",
  status_change: "Status Changed",
};

export function VersionHistoryDialog({ 
  quotationId, 
  open, 
  onOpenChange 
}: VersionHistoryDialogProps) {
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  
  const { data: versions, isLoading } = useQuery<QuotationVersion[]>({
    queryKey: ['/api/quotations', quotationId, 'versions'],
    enabled: open && !!quotationId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-version-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            Track all changes made to this quotation over time
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const isOpen = openVersionId === version.id;
                const snapshot = version.snapshot;
                
                return (
                  <Collapsible
                    key={version.id}
                    open={isOpen}
                    onOpenChange={(open) => setOpenVersionId(open ? version.id : null)}
                  >
                    <div
                      className="border rounded-lg p-4 hover-elevate transition-all"
                      data-testid={`version-item-${version.versionNumber}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={changeTypeColors[version.changeType] || ""}
                              data-testid={`badge-change-type-${version.versionNumber}`}
                            >
                              {changeTypeLabels[version.changeType] || version.changeType}
                            </Badge>
                            <span className="text-sm font-medium" data-testid={`text-version-${version.versionNumber}`}>
                              Version {version.versionNumber}
                            </span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2" data-testid={`text-summary-${version.versionNumber}`}>
                            {version.changeSummary}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-timestamp-${version.versionNumber}`}>
                            {format(new Date(version.createdAt), "PPp")}
                          </p>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-toggle-details-${version.versionNumber}`}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="ml-1 text-xs">Details</span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="mt-4 pt-4 border-t" data-testid={`details-${version.versionNumber}`}>
                        <div className="space-y-3 text-sm">
                          {/* Quotation Info */}
                          <div className="bg-muted/50 rounded p-3">
                            <h4 className="font-semibold mb-2">Project Info</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Client:</span> {snapshot?.quotation?.clientName}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Project:</span> {snapshot?.quotation?.projectName}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Build Type:</span> {snapshot?.quotation?.buildType}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Status:</span> {snapshot?.quotation?.status}
                              </div>
                            </div>
                          </div>

                          {/* Interior Items */}
                          {snapshot?.interiorItems && snapshot.interiorItems.length > 0 && (
                            <div className="bg-muted/50 rounded p-3">
                              <h4 className="font-semibold mb-2">Interior Items ({snapshot.interiorItems.length})</h4>
                              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                                {snapshot.interiorItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                                    <span className="flex-1">{item.description || 'Unnamed item'}</span>
                                    <span className="text-muted-foreground ml-2">{item.sqft || item.quantity || '—'} {item.calc}</span>
                                    <span className="font-mono ml-2">{formatINR(item.totalPrice || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* False Ceiling Items */}
                          {snapshot?.falseCeilingItems && snapshot.falseCeilingItems.length > 0 && (
                            <div className="bg-muted/50 rounded p-3">
                              <h4 className="font-semibold mb-2">False Ceiling Items ({snapshot.falseCeilingItems.length})</h4>
                              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                                {snapshot.falseCeilingItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                                    <span className="flex-1">{item.description || 'Unnamed item'}</span>
                                    <span className="text-muted-foreground ml-2">{item.area} sqft</span>
                                    <span className="font-mono ml-2">{formatINR(item.totalPrice || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Other Items */}
                          {snapshot?.otherItems && snapshot.otherItems.length > 0 && (
                            <div className="bg-muted/50 rounded p-3">
                              <h4 className="font-semibold mb-2">Other Items ({snapshot.otherItems.length})</h4>
                              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                                {snapshot.otherItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                                    <span className="flex-1">{item.description || 'Unnamed item'}</span>
                                    <span className="font-mono ml-2">{formatINR(item.totalPrice || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Totals */}
                          {snapshot?.totals && (
                            <div className="bg-muted/50 rounded p-3">
                              <h4 className="font-semibold mb-2">Financial Summary</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-muted-foreground">Subtotal:</span> {formatINR(snapshot.totals.beforeDiscountTotal || 0)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Final Total:</span> {formatINR(snapshot.totals.grandTotal || 0)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-close-history"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
