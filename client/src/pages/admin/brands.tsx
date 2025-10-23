import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreVertical, Trash2, ArrowLeft, Check } from "lucide-react";
import { useLocation } from "wouter";
import type { BrandRow, NewBrandRow, BrandType } from "@shared/schema";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import {
  getBrands,
  createBrand,
  updateBrand,
  setDefaultBrand,
  toggleBrandActive,
  deleteBrand,
  type BrandsFilters,
} from "@/api/adminBrands";
import { queryClient } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";

export default function AdminBrandsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<BrandType>("core");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBrand, setNewBrand] = useState<Partial<NewBrandRow>>({
    type: "core",
    name: "",
    adderPerSft: 0,
    warrantyMonths: 12,
    warrantySummary: "",
    isDefault: false,
    isActive: true,
  });

  const [editingValues, setEditingValues] = useState<
    Record<
      string,
      { name?: string; adderPerSft?: number; warrantyMonths?: number; warrantySummary?: string }
    >
  >({});

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

  // Sync new brand type with active tab
  useEffect(() => {
    setNewBrand((prev) => ({ ...prev, type: activeTab }));
  }, [activeTab]);

  const { data: allBrands = [], isLoading } = useQuery<BrandRow[]>({
    queryKey: ["/api/admin/brands"],
    queryFn: () => getBrands(),
    enabled: isAuthenticated,
  });

  // Filter brands by active tab and search query
  const filteredBrands = useMemo(() => {
    return allBrands
      .filter((brand) => brand.type === activeTab)
      .filter((brand) => {
        if (!searchQuery) return true;
        return brand.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [allBrands, activeTab, searchQuery]);

  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      toast({
        title: "Success",
        description: "Brand created successfully",
      });
      setIsAddDialogOpen(false);
      resetNewBrand();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brand",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<BrandRow, "id" | "type" | "createdAt" | "updatedAt">>;
    }) => updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      setEditingValues({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      toast({
        title: "Success",
        description: "Default brand updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default brand",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleBrandActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      toast({
        title: "Success",
        description: "Brand status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      toast({
        title: "Success",
        description: "Brand deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const resetNewBrand = () => {
    setNewBrand({
      type: activeTab,
      name: "",
      adderPerSft: 0,
      warrantyMonths: 12,
      warrantySummary: "",
      isDefault: false,
      isActive: true,
    });
  };

  const handleCreate = () => {
    if (!newBrand.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newBrand as NewBrandRow);
  };

  const handleInlineEdit = (
    brandId: string,
    field: "name" | "adderPerSft" | "warrantyMonths" | "warrantySummary",
    value: string | number,
  ) => {
    setEditingValues((prev) => ({
      ...prev,
      [brandId]: {
        ...prev[brandId],
        [field]: value,
      },
    }));
  };

  const debouncedEditingValues = useDebounce(editingValues, 500);

  useEffect(() => {
    Object.entries(debouncedEditingValues).forEach(([brandId, values]) => {
      if (Object.keys(values).length > 0) {
        updateMutation.mutate({ id: brandId, data: values });
      }
    });
  }, [debouncedEditingValues]);

  const getBrandValue = (
    brand: BrandRow,
    field: "name" | "adderPerSft" | "warrantyMonths" | "warrantySummary",
  ) => {
    const value = editingValues[brand.id]?.[field] ?? brand[field];
    // Handle nullable warranty fields
    if (field === "warrantyMonths" && value === null) return 12;
    if (field === "warrantySummary" && value === null) return "";
    return value;
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

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
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Brands & Add-ons
          </h1>
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 items-center flex-1">
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-brand">
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BrandType)}>
            <TabsList className="mb-6">
              <TabsTrigger value="core" data-testid="tab-core">
                Core
              </TabsTrigger>
              <TabsTrigger value="finish" data-testid="tab-finish">
                Finish
              </TabsTrigger>
              <TabsTrigger value="hardware" data-testid="tab-hardware">
                Hardware
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredBrands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {activeTab} brands found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[150px]">Adder (₹/sft)</TableHead>
                      <TableHead className="w-[120px]">Warranty (months)</TableHead>
                      <TableHead className="w-[100px]">Default</TableHead>
                      <TableHead className="w-[100px]">Active</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map((brand) => (
                      <TableRow key={brand.id} data-testid={`row-brand-${brand.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={getBrandValue(brand, "name") as string}
                              onChange={(e) => handleInlineEdit(brand.id, "name", e.target.value)}
                              className="max-w-md"
                              data-testid={`input-brand-name-${brand.id}`}
                            />
                            {brand.type === "finish" &&
                              brand.name.toLowerCase().includes("acrylic") && (
                                <Badge variant="secondary" className="whitespace-nowrap">
                                  +₹200/sft (special)
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={getBrandValue(brand, "adderPerSft") as number}
                            onChange={(e) =>
                              handleInlineEdit(
                                brand.id,
                                "adderPerSft",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="max-w-[120px]"
                            data-testid={`input-brand-adder-${brand.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="120"
                            value={getBrandValue(brand, "warrantyMonths") as number}
                            onChange={(e) =>
                              handleInlineEdit(
                                brand.id,
                                "warrantyMonths",
                                parseInt(e.target.value) || 12,
                              )
                            }
                            className="max-w-[100px]"
                            data-testid={`input-brand-warranty-${brand.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={brand.isDefault ? "default" : "outline"}
                            size="sm"
                            onClick={() => !brand.isDefault && setDefaultMutation.mutate(brand.id)}
                            disabled={brand.isDefault}
                            data-testid={`button-set-default-${brand.id}`}
                          >
                            {brand.isDefault && <Check className="h-4 w-4 mr-1" />}
                            {brand.isDefault ? "Default" : "Set Default"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={brand.isActive}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: brand.id, isActive: checked })
                            }
                            data-testid={`switch-active-${brand.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-actions-${brand.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate(brand.id)}
                                className="text-destructive"
                                disabled={brand.isDefault}
                                data-testid={`button-delete-${brand.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <AppFooter />

      {/* Add Brand Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-brand">
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>
              Create a new {activeTab} brand with custom pricing adder
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={newBrand.name}
                onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                placeholder="Enter brand name"
                data-testid="input-new-brand-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-adder">Adder Per SFT (₹)</Label>
              <Input
                id="brand-adder"
                type="number"
                min="0"
                value={newBrand.adderPerSft}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, adderPerSft: parseInt(e.target.value) || 0 })
                }
                data-testid="input-new-brand-adder"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-warranty">Warranty (months)</Label>
              <Input
                id="brand-warranty"
                type="number"
                min="0"
                max="120"
                value={newBrand.warrantyMonths}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, warrantyMonths: parseInt(e.target.value) || 12 })
                }
                data-testid="input-new-brand-warranty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-warranty-summary">Warranty Summary (optional)</Label>
              <Input
                id="brand-warranty-summary"
                value={newBrand.warrantySummary || ""}
                onChange={(e) => setNewBrand({ ...newBrand, warrantySummary: e.target.value })}
                placeholder="e.g., 24 months warranty against manufacturing defects"
                data-testid="input-new-brand-warranty-summary"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="brand-default"
                checked={newBrand.isDefault}
                onCheckedChange={(checked) => setNewBrand({ ...newBrand, isDefault: checked })}
                data-testid="switch-new-brand-default"
              />
              <Label htmlFor="brand-default">Set as default for {activeTab}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} data-testid="button-save">
              Create Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
