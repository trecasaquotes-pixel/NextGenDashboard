import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  listAuditLogs,
  getAuditLog,
  type AuditLogFilters,
  type AuditLogEntry,
} from "@/api/adminAudit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Search, FileText, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [section, setSection] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Diff modal state
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Build filters for API
  const filters: AuditLogFilters = {
    page,
    pageSize,
    ...(searchQuery && { q: searchQuery }),
    ...(section !== "all" && { section: section as any }),
    ...(action !== "all" && { action: action as any }),
  };

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/audit", filters],
    queryFn: () => listAuditLogs(filters),
  });

  // Fetch selected entry for diff modal
  const { data: selectedEntry, isLoading: isLoadingEntry } = useQuery({
    queryKey: ["/api/admin/audit", selectedEntryId],
    queryFn: () => (selectedEntryId ? getAuditLog(selectedEntryId) : null),
    enabled: !!selectedEntryId,
  });

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: `${field} JSON copied successfully`,
    });
  };

  const renderDiffModal = () => {
    if (!selectedEntry) return null;

    const beforeJson = selectedEntry.beforeJson ? JSON.parse(selectedEntry.beforeJson) : null;
    const afterJson = selectedEntry.afterJson ? JSON.parse(selectedEntry.afterJson) : null;

    return (
      <Dialog open={!!selectedEntryId} onOpenChange={(open) => !open && setSelectedEntryId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">User:</span> {selectedEntry.userEmail}
              </p>
              <p>
                <span className="font-medium">Section:</span> {selectedEntry.section}
              </p>
              <p>
                <span className="font-medium">Action:</span> {selectedEntry.action}
              </p>
              <p>
                <span className="font-medium">Summary:</span> {selectedEntry.summary}
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {format(new Date(selectedEntry.createdAt), "PPpp")}
              </p>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Before JSON */}
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Before</h3>
                {beforeJson && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopyToClipboard(JSON.stringify(beforeJson, null, 2), "Before")
                    }
                    data-testid="button-copy-before"
                  >
                    {copiedField === "Before" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-auto bg-muted rounded-md p-3">
                {beforeJson ? (
                  <pre className="text-xs font-mono" data-testid="text-before-json">
                    {JSON.stringify(beforeJson, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No before state</p>
                )}
              </div>
            </div>

            {/* After JSON */}
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">After</h3>
                {afterJson && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopyToClipboard(JSON.stringify(afterJson, null, 2), "After")
                    }
                    data-testid="button-copy-after"
                  >
                    {copiedField === "After" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-auto bg-muted rounded-md p-3">
                {afterJson ? (
                  <pre className="text-xs font-mono" data-testid="text-after-json">
                    {JSON.stringify(afterJson, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No after state</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case "CREATE":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="container-trecasa py-6 lg:py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/quotes")}
          className="mb-4"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
          <p className="text-muted-foreground">
            Complete history of all changes made in admin sections
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search summary or user..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            {/* Section filter */}
            <Select
              value={section}
              onValueChange={(value) => {
                setSection(value);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-section">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Rates">Rates</SelectItem>
                <SelectItem value="Templates">Templates</SelectItem>
                <SelectItem value="Brands">Brands</SelectItem>
                <SelectItem value="Painting&FC">Painting & FC</SelectItem>
                <SelectItem value="GlobalRules">Global Rules</SelectItem>
              </SelectContent>
            </Select>

            {/* Action filter */}
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-action">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>

            {/* Page size */}
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-page-size">
                <SelectValue placeholder="Page Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="200">200 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Entries</CardTitle>
            {data && (
              <p className="text-sm text-muted-foreground" data-testid="text-total-count">
                Total: {data.total} entries
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.rows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-audit-${entry.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(entry.createdAt), "PPp")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.userEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.section}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(entry.action)}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate" title={entry.summary}>
                          {entry.summary}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntryId(entry.id)}
                            data-testid={`button-view-${entry.id}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(data.total / pageSize)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(data.total / pageSize)}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Modal */}
      {renderDiffModal()}
    </div>
  );
}
