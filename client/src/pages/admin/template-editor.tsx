import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import type { TemplateCategory, TemplateRoomRow, TemplateItemRow } from "@shared/schema";
import {
  getTemplate,
  updateTemplate,
  createTemplateRoom,
  updateTemplateRoom,
  deleteTemplateRoom,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  type TemplateWithRooms,
} from "@/api/adminTemplates";
import { queryClient } from "@/lib/queryClient";

const categories: TemplateCategory[] = [
  "Residential 1BHK",
  "Residential 2BHK",
  "Residential 3BHK",
  "Villa",
  "Commercial"
];

const units = ["LSUM", "SQFT", "RSUM", "COUNT"];

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ roomName: "", sortOrder: 0 });
  const [newItem, setNewItem] = useState({ itemKey: "", displayName: "", unit: "LSUM", sortOrder: 0, isWallHighlightOrPanel: false });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  const { data: template, isLoading } = useQuery<TemplateWithRooms>({
    queryKey: ["/api/admin/templates", id],
    queryFn: () => getTemplate(id!),
    enabled: isAuthenticated && !!id,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: Partial<TemplateWithRooms>) => updateTemplate(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      toast({ title: "Template updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: { roomName: string; sortOrder: number }) =>
      createTemplateRoom(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      setIsAddRoomDialogOpen(false);
      setNewRoom({ roomName: "", sortOrder: 0 });
      toast({ title: "Room added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: Partial<TemplateRoomRow> }) =>
      updateTemplateRoom(id!, roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      toast({ title: "Room updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => deleteTemplateRoom(id!, roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      toast({ title: "Room deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete room",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: any }) =>
      createTemplateItem(id!, roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      setIsAddItemDialogOpen(false);
      setSelectedRoomId(null);
      setNewItem({ itemKey: "", displayName: "", unit: "LSUM", sortOrder: 0, isWallHighlightOrPanel: false });
      toast({ title: "Item added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ roomId, itemId, data }: { roomId: string; itemId: string; data: Partial<TemplateItemRow> }) =>
      updateTemplateItem(id!, roomId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      toast({ title: "Item updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ roomId, itemId }: { roomId: string; itemId: string }) =>
      deleteTemplateItem(id!, roomId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/templates", id] });
      toast({ title: "Item deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddRoom = () => {
    const sortOrder = template?.rooms?.length || 0;
    createRoomMutation.mutate({ ...newRoom, sortOrder });
  };

  const handleAddItem = () => {
    if (!selectedRoomId) return;
    createItemMutation.mutate({ roomId: selectedRoomId, data: newItem });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Template not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-trecasa py-6 lg:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/templates")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-template-name">
                {template.name}
              </h1>
              <p className="text-muted-foreground">Edit template structure</p>
            </div>
          </div>
        </div>

        {/* Template Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  value={template.name}
                  onChange={(e) => updateTemplateMutation.mutate({ name: e.target.value })}
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select
                  value={template.category}
                  onValueChange={(value) => updateTemplateMutation.mutate({ category: value as TemplateCategory })}
                >
                  <SelectTrigger id="template-category" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="template-active"
                  checked={template.isActive}
                  onCheckedChange={(checked) => updateTemplateMutation.mutate({ isActive: checked })}
                  data-testid="switch-template-active"
                />
                <Label htmlFor="template-active">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rooms and Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rooms & Items</CardTitle>
            <Button
              onClick={() => setIsAddRoomDialogOpen(true)}
              data-testid="button-add-room"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </CardHeader>
          <CardContent>
            {template.rooms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No rooms added yet. Click "Add Room" to get started.
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {template.rooms
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((room) => (
                    <AccordionItem key={room.id} value={room.id}>
                      <AccordionTrigger data-testid={`accordion-room-${room.id}`}>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span>{room.roomName}</span>
                          <Badge variant="outline">{room.items.length} items</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2 flex-1">
                              <Input
                                value={room.roomName}
                                onChange={(e) => updateRoomMutation.mutate({ roomId: room.id, data: { roomName: e.target.value } })}
                                placeholder="Room name"
                                data-testid={`input-room-name-${room.id}`}
                              />
                              <Input
                                type="number"
                                value={room.sortOrder}
                                onChange={(e) => updateRoomMutation.mutate({ roomId: room.id, data: { sortOrder: parseInt(e.target.value) } })}
                                placeholder="Sort order"
                                className="w-24"
                                data-testid={`input-room-sort-${room.id}`}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRoomId(room.id);
                                  setIsAddItemDialogOpen(true);
                                }}
                                data-testid={`button-add-item-${room.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteRoomMutation.mutate(room.id)}
                                data-testid={`button-delete-room-${room.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Items */}
                          {room.items.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              No items in this room
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {room.items.map((item) => (
                                <div key={item.id} className="flex gap-2 items-center p-2 border rounded-md">
                                  <Input
                                    value={item.itemKey}
                                    onChange={(e) => updateItemMutation.mutate({ roomId: room.id, itemId: item.id, data: { itemKey: e.target.value } })}
                                    placeholder="Item key"
                                    data-testid={`input-item-key-${item.id}`}
                                  />
                                  <Input
                                    value={item.displayName}
                                    onChange={(e) => updateItemMutation.mutate({ roomId: room.id, itemId: item.id, data: { displayName: e.target.value } })}
                                    placeholder="Display name"
                                    data-testid={`input-item-displayname-${item.id}`}
                                  />
                                  <Select
                                    value={item.unit}
                                    onValueChange={(value) => updateItemMutation.mutate({ roomId: room.id, itemId: item.id, data: { unit: value } })}
                                  >
                                    <SelectTrigger className="w-32" data-testid={`select-item-unit-${item.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {units.map((unit) => (
                                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteItemMutation.mutate({ roomId: room.id, itemId: item.id })}
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Room Dialog */}
      <Dialog open={isAddRoomDialogOpen} onOpenChange={setIsAddRoomDialogOpen}>
        <DialogContent data-testid="dialog-add-room">
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>
              Add a new room to this template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                value={newRoom.roomName}
                onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                placeholder="e.g., Living Room"
                data-testid="input-new-room-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddRoomDialogOpen(false)}
              data-testid="button-cancel-room"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRoom}
              disabled={!newRoom.roomName || createRoomMutation.isPending}
              data-testid="button-save-room"
            >
              Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent data-testid="dialog-add-item">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to this room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-key">Item Key</Label>
              <Input
                id="item-key"
                value={newItem.itemKey}
                onChange={(e) => setNewItem({ ...newItem, itemKey: e.target.value })}
                placeholder="e.g., KITCHEN_MODULAR"
                data-testid="input-new-item-key"
              />
            </div>
            <div>
              <Label htmlFor="item-display-name">Display Name</Label>
              <Input
                id="item-display-name"
                value={newItem.displayName}
                onChange={(e) => setNewItem({ ...newItem, displayName: e.target.value })}
                placeholder="e.g., Modular Kitchen"
                data-testid="input-new-item-displayname"
              />
            </div>
            <div>
              <Label htmlFor="item-unit">Unit</Label>
              <Select
                value={newItem.unit}
                onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
              >
                <SelectTrigger id="item-unit" data-testid="select-new-item-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddItemDialogOpen(false);
                setSelectedRoomId(null);
              }}
              data-testid="button-cancel-item"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItem.itemKey || !newItem.displayName || createItemMutation.isPending}
              data-testid="button-save-item"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
