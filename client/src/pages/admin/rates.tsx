import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Plus, MoreVertical, Copy, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import type { RateRow, NewRateRow, Category, Unit } from "@shared/schema";
import { getRates, createRate, updateRate, toggleRateActive, deleteRate, isUnitLocked, getLockedUnit, type RatesFilters } from "@/api/adminRates";
import { queryClient } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce.ts";

const categories: Category[] = [
  "Kitchen",
  "Living",
  "Dining",
  "Master Bedroom",
  "Bedroom 2",
  "Bedroom 3",
  "Others",
  "FC",
];

const units: Unit[] = ["SFT", "COUNT", "LSUM"];

export default function AdminRatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [filters, setFilters] = useState<RatesFilters>({
    q: "",
    unit: "all",
    category: "all",
    active: "1",
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<RateRow | null>(null);
  const [newRate, setNewRate] = useState<Partial<NewRateRow>>({
    displayName: "",
    itemKey: "",
    unit: "SFT",
    category: "Kitchen",
    baseRateHandmade: 0,
    baseRateFactory: 0,
    notes: "",
    isActive: true,
  });

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

  const { data: rates = [], isLoading, refetch } = useQuery<RateRow[]>({
    queryKey: ["/api/admin/rates", filters],
    queryFn: () => {
      // Convert "all" to empty string for API
      const apiFilters = {
        ...filters,
        unit: filters.unit === "all" ? "" : filters.unit,
        category: filters.category === "all" ? "" : filters.category,
        active: filters.active === "all" ? "" : filters.active,
      };
      return getRates(apiFilters);
    },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      toast({
        title: "Success",
        description: "Rate created successfully",
      });
      setIsAddDialogOpen(false);
      resetNewRate();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create rate",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<RateRow, 'id' | 'createdAt' | 'updatedAt'>> }) =>
      updateRate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      toast({
        title: "Success",
        description: "Rate updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rate",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleRateActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      toast({
        title: "Success",
        description: "Rate status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      toast({
        title: "Success",
        description: "Rate deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rate",
        variant: "destructive",
      });
    },
  });

  const resetNewRate = () => {
    setNewRate({
      displayName: "",
      itemKey: "",
      unit: "SFT",
      category: "Kitchen",
      baseRateHandmade: 0,
      baseRateFactory: 0,
      notes: "",
      isActive: true,
    });
    setEditingRate(null);
  };

  const handleAdd = () => {
    resetNewRate();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (rate: RateRow) => {
    setNewRate({
      displayName: rate.displayName,
      itemKey: rate.itemKey,
      unit: rate.unit as Unit,
      category: rate.category as Category,
      baseRateHandmade: rate.baseRateHandmade,
      baseRateFactory: rate.baseRateFactory,
      notes: rate.notes || "",
      isActive: rate.isActive,
    });
    setEditingRate(rate);
    setIsAddDialogOpen(true);
  };

  const handleDuplicate = (rate: RateRow) => {
    setNewRate({
      displayName: `${rate.displayName} (Copy)`,
      itemKey: `${rate.itemKey}_copy`,
      unit: rate.unit as Unit,
      category: rate.category as Category,
      baseRateHandmade: rate.baseRateHandmade,
      baseRateFactory: rate.baseRateFactory,
      notes: rate.notes || "",
      isActive: true,
    });
    setEditingRate(null);
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (editingRate) {
      updateMutation.mutate({
        id: editingRate.id,
        data: newRate as Partial<Omit<RateRow, 'id' | 'createdAt' | 'updatedAt'>>,
      });
    } else {
      createMutation.mutate(newRate as NewRateRow);
    }
  };

  const handleInlineUpdate = (id: string, field: string, value: any) => {
    updateMutation.mutate({
      id,
      data: { [field]: value },
    });
  };

  // Debounced inline update for number inputs
  const DebouncedNumberInput = ({ rate, field }: { rate: RateRow; field: 'baseRateHandmade' | 'baseRateFactory' }) => {
    const [value, setValue] = useState(rate[field].toString());
    const debouncedValue = useDebounce(value, 500);

    useEffect(() => {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue !== rate[field]) {
        handleInlineUpdate(rate.id, field, numValue);
      }
    }, [debouncedValue]);

    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28"
        data-testid={`input-${field}-${rate.id}`}
      />
    );
  };

  const isFormValid = useMemo(() => {
    return (
      newRate.displayName &&
      newRate.itemKey &&
      newRate.unit &&
      newRate.category &&
      newRate.baseRateHandmade !== undefined &&
      newRate.baseRateFactory !== undefined
    );
  }, [newRate]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/quotes")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Admin - Rates</h1>
          </div>
          <Button onClick={handleAdd} data-testid="button-add-rate">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search by name or key..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                data-testid="input-search"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select
                value={filters.unit}
                onValueChange={(value) => setFilters({ ...filters, unit: value })}
              >
                <SelectTrigger data-testid="select-unit-filter">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={filters.active}
                onValueChange={(value) => setFilters({ ...filters, active: value })}
              >
                <SelectTrigger data-testid="select-active-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Handmade ₹</TableHead>
                <TableHead>Factory ₹</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No rates found
                  </TableCell>
                </TableRow>
              ) : (
                rates.map((rate) => (
                  <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                    <TableCell className="font-medium" data-testid={`text-display-name-${rate.id}`}>
                      {rate.displayName}
                    </TableCell>
                    <TableCell>
                      {isUnitLocked(rate.itemKey) ? (
                        <span className="text-sm text-muted-foreground" data-testid={`text-unit-${rate.id}`}>
                          {rate.unit} (locked)
                        </span>
                      ) : (
                        <Select
                          value={rate.unit}
                          onValueChange={(value) => handleInlineUpdate(rate.id, 'unit', value)}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-unit-${rate.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <DebouncedNumberInput rate={rate} field="baseRateHandmade" />
                    </TableCell>
                    <TableCell>
                      <DebouncedNumberInput rate={rate} field="baseRateFactory" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rate.category}
                        onValueChange={(value) => handleInlineUpdate(rate.id, 'category', value)}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-category-${rate.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rate.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: rate.id, isActive: checked })
                        }
                        data-testid={`switch-active-${rate.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${rate.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(rate)} data-testid={`action-edit-${rate.id}`}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(rate)} data-testid={`action-duplicate-${rate.id}`}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(rate.id)}
                            className="text-destructive"
                            data-testid={`action-delete-${rate.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AppFooter />

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-edit-rate">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add New Rate"}</DialogTitle>
            <DialogDescription>
              {editingRate ? "Update the rate details" : "Create a new rate item"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={newRate.displayName}
                onChange={(e) => setNewRate({ ...newRate, displayName: e.target.value })}
                placeholder="e.g., Base Unit"
                data-testid="input-display-name"
              />
            </div>

            <div>
              <Label htmlFor="itemKey">Item Key</Label>
              <Input
                id="itemKey"
                value={newRate.itemKey}
                onChange={(e) => setNewRate({ ...newRate, itemKey: e.target.value.toLowerCase() })}
                placeholder="e.g., base_unit"
                disabled={!!editingRate}
                data-testid="input-item-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={newRate.unit}
                  onValueChange={(value: Unit) => setNewRate({ ...newRate, unit: value })}
                  disabled={editingRate ? isUnitLocked(editingRate.itemKey) : false}
                >
                  <SelectTrigger id="unit" data-testid="select-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingRate && isUnitLocked(editingRate.itemKey) && (
                  <p className="text-xs text-muted-foreground mt-1">Unit is locked for this item</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newRate.category}
                  onValueChange={(value: Category) => setNewRate({ ...newRate, category: value })}
                >
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="handmade">Handmade Rate (₹)</Label>
                <Input
                  id="handmade"
                  type="number"
                  value={newRate.baseRateHandmade}
                  onChange={(e) => setNewRate({ ...newRate, baseRateHandmade: parseInt(e.target.value, 10) || 0 })}
                  data-testid="input-handmade-rate"
                />
              </div>

              <div>
                <Label htmlFor="factory">Factory Rate (₹)</Label>
                <Input
                  id="factory"
                  type="number"
                  value={newRate.baseRateFactory}
                  onChange={(e) => setNewRate({ ...newRate, baseRateFactory: parseInt(e.target.value, 10) || 0 })}
                  data-testid="input-factory-rate"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={newRate.notes || ""}
                onChange={(e) => setNewRate({ ...newRate, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetNewRate();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {editingRate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
