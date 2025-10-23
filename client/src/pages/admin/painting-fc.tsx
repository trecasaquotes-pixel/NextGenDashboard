import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Plus, ArrowLeft, Trash2, Copy } from "lucide-react";
import { useLocation } from "wouter";
import type {
  PaintingPackRow,
  NewPaintingPackRow,
  FCCatalogRow,
  NewFCCatalogRow,
} from "@shared/schema";
import {
  getPaintingPacks,
  createPaintingPack,
  updatePaintingPack,
  togglePaintingPackActive,
  deletePaintingPack,
  getFCCatalog,
  createFCCatalogItem,
  updateFCCatalogItem,
  toggleFCCatalogItemActive,
  deleteFCCatalogItem,
} from "@/api/adminPaintingFc";
import { queryClient } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";

export default function AdminPaintingFcPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"painting" | "fc">("painting");
  const [searchQuery, setSearchQuery] = useState("");

  // Painting Pack Dialog State
  const [isPaintingDialogOpen, setIsPaintingDialogOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [newPack, setNewPack] = useState<any>({
    name: "",
    basePriceLsum: 35000,
    bulletsJson: [],
    bhkFactorBase: 3,
    perBedroomDelta: 0.1,
    showInQuote: true,
    isActive: true,
  });

  // FC Catalog Dialog State
  const [isFCDialogOpen, setIsFCDialogOpen] = useState(false);
  const [editingFCId, setEditingFCId] = useState<string | null>(null);
  const [newFCItem, setNewFCItem] = useState<Partial<NewFCCatalogRow>>({
    key: "",
    displayName: "",
    unit: "COUNT",
    defaultValue: 0,
    ratePerUnit: 0,
    isActive: true,
  });

  // Inline editing states
  const [editingPaintingValues, setEditingPaintingValues] = useState<Record<string, any>>({});
  const [editingFCValues, setEditingFCValues] = useState<Record<string, any>>({});

  // Debounced inline edits
  const debouncedPaintingValues = useDebounce(editingPaintingValues, 500);
  const debouncedFCValues = useDebounce(editingFCValues, 500);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access admin features",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  // Fetch painting packs
  const { data: paintingPacks = [], isLoading: loadingPacks } = useQuery<PaintingPackRow[]>({
    queryKey: ["/api/admin/painting-packs"],
    queryFn: () => getPaintingPacks(),
    enabled: isAuthenticated,
  });

  // Fetch FC catalog
  const { data: fcCatalog = [], isLoading: loadingFC } = useQuery<FCCatalogRow[]>({
    queryKey: ["/api/admin/fc-catalog"],
    queryFn: () => getFCCatalog(),
    enabled: isAuthenticated,
  });

  // Filter painting packs
  const filteredPacks = useMemo(() => {
    return paintingPacks.filter((pack) => {
      if (!searchQuery) return true;
      return pack.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [paintingPacks, searchQuery]);

  // Filter FC catalog
  const filteredFCCatalog = useMemo(() => {
    return fcCatalog.filter((item) => {
      if (!searchQuery) return true;
      return (
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [fcCatalog, searchQuery]);

  // Mutations for painting packs
  const createPackMutation = useMutation({
    mutationFn: createPaintingPack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/painting-packs"] });
      toast({ title: "Success", description: "Painting pack created successfully" });
      setIsPaintingDialogOpen(false);
      resetPaintingDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create painting pack",
        variant: "destructive",
      });
    },
  });

  const updatePackMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePaintingPack(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/painting-packs"] });
      setEditingPaintingValues({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update painting pack",
        variant: "destructive",
      });
    },
  });

  const togglePackActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePaintingPackActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/painting-packs"] });
      toast({ title: "Success", description: "Painting pack status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deletePackMutation = useMutation({
    mutationFn: deletePaintingPack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/painting-packs"] });
      toast({ title: "Success", description: "Painting pack deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  // Mutations for FC catalog
  const createFCMutation = useMutation({
    mutationFn: createFCCatalogItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fc-catalog"] });
      toast({ title: "Success", description: "FC catalog item created successfully" });
      setIsFCDialogOpen(false);
      resetFCDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create FC item",
        variant: "destructive",
      });
    },
  });

  const updateFCMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFCCatalogItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fc-catalog"] });
      setEditingFCValues({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update FC item",
        variant: "destructive",
      });
    },
  });

  const toggleFCActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleFCCatalogItemActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fc-catalog"] });
      toast({ title: "Success", description: "FC item status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteFCMutation = useMutation({
    mutationFn: deleteFCCatalogItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fc-catalog"] });
      toast({ title: "Success", description: "FC item deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  // Handle debounced inline updates for painting packs
  useEffect(() => {
    Object.entries(debouncedPaintingValues).forEach(([id, data]) => {
      if (Object.keys(data).length > 0) {
        updatePackMutation.mutate({ id, data });
      }
    });
  }, [debouncedPaintingValues]);

  // Handle debounced inline updates for FC catalog
  useEffect(() => {
    Object.entries(debouncedFCValues).forEach(([id, data]) => {
      if (Object.keys(data).length > 0) {
        updateFCMutation.mutate({ id, data });
      }
    });
  }, [debouncedFCValues]);

  // Helper functions
  const resetPaintingDialog = () => {
    setNewPack({
      name: "",
      basePriceLsum: 35000,
      bulletsJson: [],
      bhkFactorBase: 3,
      perBedroomDelta: 0.1,
      showInQuote: true,
      isActive: true,
    });
    setEditingPackId(null);
  };

  const resetFCDialog = () => {
    setNewFCItem({
      key: "",
      displayName: "",
      unit: "COUNT",
      defaultValue: 0,
      ratePerUnit: 0,
      isActive: true,
    });
    setEditingFCId(null);
  };

  const handleEditPack = (pack: PaintingPackRow) => {
    const bullets = JSON.parse(pack.bulletsJson);
    setNewPack({
      name: pack.name,
      basePriceLsum: pack.basePriceLsum,
      bulletsJson: bullets,
      bhkFactorBase: pack.bhkFactorBase,
      perBedroomDelta: Number(pack.perBedroomDelta),
      showInQuote: pack.showInQuote,
      isActive: pack.isActive,
    });
    setEditingPackId(pack.id);
    setIsPaintingDialogOpen(true);
  };

  const handleDuplicatePack = (pack: PaintingPackRow) => {
    const bullets = JSON.parse(pack.bulletsJson);
    setNewPack({
      name: `${pack.name} (Copy)`,
      basePriceLsum: pack.basePriceLsum,
      bulletsJson: bullets,
      bhkFactorBase: pack.bhkFactorBase,
      perBedroomDelta: Number(pack.perBedroomDelta),
      showInQuote: pack.showInQuote,
      isActive: true,
    });
    setEditingPackId(null);
    setIsPaintingDialogOpen(true);
  };

  const handlePaintingDialogSubmit = () => {
    if (editingPackId) {
      updatePackMutation.mutate({
        id: editingPackId,
        data: newPack,
      });
      setIsPaintingDialogOpen(false);
      resetPaintingDialog();
    } else {
      createPackMutation.mutate(newPack as any);
    }
  };

  const handleFCDialogSubmit = () => {
    if (editingFCId) {
      updateFCMutation.mutate({
        id: editingFCId,
        data: newFCItem,
      });
      setIsFCDialogOpen(false);
      resetFCDialog();
    } else {
      createFCMutation.mutate(newFCItem as NewFCCatalogRow);
    }
  };

  // Calculate BHK price preview
  const calculateBHKPrice = (
    basePrice: number,
    bhkFactorBase: number,
    perBedroomDelta: number,
    targetBHK: number,
  ) => {
    const delta = targetBHK - bhkFactorBase;
    return basePrice * (1 + delta * perBedroomDelta);
  };

  const handleInlinePaintingEdit = (id: string, field: string, value: any) => {
    setEditingPaintingValues((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const handleInlineFCEdit = (id: string, field: string, value: any) => {
    setEditingFCValues((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1 container-trecasa py-6 lg:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/quotes")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-semibold">Admin → Painting & FC</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="painting" data-testid="tab-painting">
              Painting Packs
            </TabsTrigger>
            <TabsTrigger value="fc" data-testid="tab-fc">
              FC Catalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="painting" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Input
                placeholder="Search painting packs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-painting"
              />
              <Button
                onClick={() => {
                  resetPaintingDialog();
                  setIsPaintingDialogOpen(true);
                }}
                data-testid="button-add-pack"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Pack
              </Button>
            </div>

            <div className="grid gap-4">
              {loadingPacks ? (
                <Card className="p-6 text-center text-muted-foreground">Loading...</Card>
              ) : filteredPacks.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No painting packs found
                </Card>
              ) : (
                filteredPacks.map((pack) => {
                  const bullets = JSON.parse(pack.bulletsJson);
                  const currentValues = editingPaintingValues[pack.id] || {};

                  return (
                    <Card
                      key={pack.id}
                      className="p-6 space-y-4"
                      data-testid={`card-pack-${pack.id}`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={currentValues.name ?? pack.name}
                              onChange={(e) =>
                                handleInlinePaintingEdit(pack.id, "name", e.target.value)
                              }
                              data-testid={`input-pack-name-${pack.id}`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label>Base Price (₹)</Label>
                              <Input
                                type="number"
                                value={currentValues.basePriceLsum ?? pack.basePriceLsum}
                                onChange={(e) =>
                                  handleInlinePaintingEdit(
                                    pack.id,
                                    "basePriceLsum",
                                    parseInt(e.target.value),
                                  )
                                }
                                data-testid={`input-pack-price-${pack.id}`}
                              />
                            </div>
                            <div>
                              <Label>BHK Baseline</Label>
                              <Input
                                type="number"
                                value={currentValues.bhkFactorBase ?? pack.bhkFactorBase}
                                onChange={(e) =>
                                  handleInlinePaintingEdit(
                                    pack.id,
                                    "bhkFactorBase",
                                    parseInt(e.target.value),
                                  )
                                }
                                data-testid={`input-pack-bhk-base-${pack.id}`}
                              />
                            </div>
                            <div>
                              <Label>Per Bedroom Delta</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="0.25"
                                value={currentValues.perBedroomDelta ?? pack.perBedroomDelta}
                                onChange={(e) =>
                                  handleInlinePaintingEdit(
                                    pack.id,
                                    "perBedroomDelta",
                                    parseFloat(e.target.value),
                                  )
                                }
                                data-testid={`input-pack-delta-${pack.id}`}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Bullet Points</Label>
                            <div className="space-y-1 mt-2">
                              {bullets.map((bullet: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <span className="text-sm text-muted-foreground mt-1">•</span>
                                  <span className="text-sm flex-1">{bullet}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <Label className="text-xs text-muted-foreground">
                              Price Preview by BHK:
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                              {[1, 2, 3, 4].map((bhk) => (
                                <Badge key={bhk} variant="outline">
                                  {bhk} BHK: ₹
                                  {Math.round(
                                    calculateBHKPrice(
                                      currentValues.basePriceLsum ?? pack.basePriceLsum,
                                      currentValues.bhkFactorBase ?? pack.bhkFactorBase,
                                      currentValues.perBedroomDelta ?? Number(pack.perBedroomDelta),
                                      bhk,
                                    ),
                                  ).toLocaleString("en-IN")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Show in Quote</Label>
                            <Switch
                              checked={currentValues.showInQuote ?? pack.showInQuote}
                              onCheckedChange={(checked) =>
                                handleInlinePaintingEdit(pack.id, "showInQuote", checked)
                              }
                              data-testid={`switch-pack-show-${pack.id}`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Active</Label>
                            <Switch
                              checked={pack.isActive}
                              onCheckedChange={(checked) =>
                                togglePackActiveMutation.mutate({ id: pack.id, isActive: checked })
                              }
                              data-testid={`switch-pack-active-${pack.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPack(pack)}
                              data-testid={`button-edit-pack-${pack.id}`}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicatePack(pack)}
                              data-testid={`button-duplicate-pack-${pack.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deletePackMutation.mutate(pack.id)}
                              data-testid={`button-delete-pack-${pack.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="fc" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Input
                placeholder="Search FC catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-fc"
              />
              <Button
                onClick={() => {
                  resetFCDialog();
                  setIsFCDialogOpen(true);
                }}
                data-testid="button-add-fc"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Default Value</TableHead>
                    <TableHead>Rate per Unit</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFC ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredFCCatalog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No FC catalog items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFCCatalog.map((item) => {
                      const currentValues = editingFCValues[item.id] || {};
                      const isReservedKey = [
                        "fc_paint",
                        "fc_lights",
                        "fc_fan_hook",
                        "fc_cove_led",
                      ].includes(item.key);
                      const unitLocked =
                        item.key === "fc_paint"
                          ? "LSUM"
                          : isReservedKey
                            ? "COUNT"
                            : (currentValues.unit ?? item.unit);

                      return (
                        <TableRow key={item.id} data-testid={`row-fc-${item.id}`}>
                          <TableCell className="font-mono text-sm">{item.key}</TableCell>
                          <TableCell>
                            <Input
                              value={currentValues.displayName ?? item.displayName}
                              onChange={(e) =>
                                handleInlineFCEdit(item.id, "displayName", e.target.value)
                              }
                              data-testid={`input-fc-name-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            {isReservedKey ? (
                              <Badge variant="outline">{unitLocked}</Badge>
                            ) : (
                              <Select
                                value={unitLocked}
                                onValueChange={(value) =>
                                  handleInlineFCEdit(item.id, "unit", value)
                                }
                              >
                                <SelectTrigger data-testid={`select-fc-unit-${item.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LSUM">LSUM</SelectItem>
                                  <SelectItem value="COUNT">COUNT</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={currentValues.defaultValue ?? item.defaultValue}
                              onChange={(e) =>
                                handleInlineFCEdit(
                                  item.id,
                                  "defaultValue",
                                  parseInt(e.target.value),
                                )
                              }
                              data-testid={`input-fc-default-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={currentValues.ratePerUnit ?? item.ratePerUnit}
                              onChange={(e) =>
                                handleInlineFCEdit(item.id, "ratePerUnit", parseInt(e.target.value))
                              }
                              disabled={item.unit === "LSUM"}
                              data-testid={`input-fc-rate-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={item.isActive}
                              onCheckedChange={(checked) =>
                                toggleFCActiveMutation.mutate({ id: item.id, isActive: checked })
                              }
                              data-testid={`switch-fc-active-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteFCMutation.mutate(item.id)}
                              data-testid={`button-delete-fc-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />

      {/* Painting Pack Dialog */}
      <Dialog open={isPaintingDialogOpen} onOpenChange={setIsPaintingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackId ? "Edit" : "Add"} Painting Pack</DialogTitle>
            <DialogDescription>Configure painting package details and pricing</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newPack.name}
                onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                placeholder="e.g., Royal Luxury Emulsion"
                data-testid="dialog-input-pack-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Base Price (₹)</Label>
                <Input
                  type="number"
                  value={newPack.basePriceLsum}
                  onChange={(e) =>
                    setNewPack({ ...newPack, basePriceLsum: parseInt(e.target.value) })
                  }
                  data-testid="dialog-input-pack-price"
                />
              </div>
              <div>
                <Label>BHK Baseline</Label>
                <Input
                  type="number"
                  value={newPack.bhkFactorBase}
                  onChange={(e) =>
                    setNewPack({ ...newPack, bhkFactorBase: parseInt(e.target.value) })
                  }
                  data-testid="dialog-input-pack-bhk-base"
                />
              </div>
              <div>
                <Label>Per Bedroom Delta (0-0.25)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.25"
                  value={newPack.perBedroomDelta}
                  onChange={(e) =>
                    setNewPack({ ...newPack, perBedroomDelta: parseFloat(e.target.value) })
                  }
                  data-testid="dialog-input-pack-delta"
                />
              </div>
            </div>

            <div>
              <Label>Bullet Points (one per line)</Label>
              <Textarea
                value={newPack.bulletsJson?.join("\n") || ""}
                onChange={(e) =>
                  setNewPack({
                    ...newPack,
                    bulletsJson: e.target.value.split("\n").filter((l) => l.trim()),
                  })
                }
                rows={6}
                placeholder="Enter each bullet point on a new line..."
                data-testid="dialog-textarea-bullets"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPack.showInQuote}
                  onCheckedChange={(checked) => setNewPack({ ...newPack, showInQuote: checked })}
                  data-testid="dialog-switch-show-in-quote"
                />
                <Label>Show in Quote</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPack.isActive}
                  onCheckedChange={(checked) => setNewPack({ ...newPack, isActive: checked })}
                  data-testid="dialog-switch-active"
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaintingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaintingDialogSubmit} data-testid="dialog-button-save-pack">
              {editingPackId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FC Catalog Dialog */}
      <Dialog open={isFCDialogOpen} onOpenChange={setIsFCDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFCId ? "Edit" : "Add"} FC Catalog Item</DialogTitle>
            <DialogDescription>Configure FC catalog item details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Key</Label>
              <Input
                value={newFCItem.key}
                onChange={(e) => setNewFCItem({ ...newFCItem, key: e.target.value })}
                placeholder="e.g., fc_custom_item"
                disabled={!!editingFCId}
                data-testid="dialog-input-fc-key"
              />
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                value={newFCItem.displayName}
                onChange={(e) => setNewFCItem({ ...newFCItem, displayName: e.target.value })}
                placeholder="e.g., Custom FC Item"
                data-testid="dialog-input-fc-name"
              />
            </div>

            <div>
              <Label>Unit</Label>
              <Select
                value={newFCItem.unit}
                onValueChange={(value: any) => setNewFCItem({ ...newFCItem, unit: value })}
              >
                <SelectTrigger data-testid="dialog-select-fc-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LSUM">LSUM</SelectItem>
                  <SelectItem value="COUNT">COUNT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Value</Label>
                <Input
                  type="number"
                  value={newFCItem.defaultValue}
                  onChange={(e) =>
                    setNewFCItem({ ...newFCItem, defaultValue: parseInt(e.target.value) })
                  }
                  data-testid="dialog-input-fc-default"
                />
              </div>
              <div>
                <Label>Rate per Unit</Label>
                <Input
                  type="number"
                  value={newFCItem.ratePerUnit}
                  onChange={(e) =>
                    setNewFCItem({ ...newFCItem, ratePerUnit: parseInt(e.target.value) })
                  }
                  disabled={newFCItem.unit === "LSUM"}
                  data-testid="dialog-input-fc-rate"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newFCItem.isActive}
                onCheckedChange={(checked) => setNewFCItem({ ...newFCItem, isActive: checked })}
                data-testid="dialog-switch-fc-active"
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFCDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFCDialogSubmit} data-testid="dialog-button-save-fc">
              {editingFCId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
