import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Calendar, Building2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const expenseCategories = [
  "Rent",
  "Salaries",
  "Utilities",
  "Office Supplies",
  "Marketing",
  "Insurance",
  "Maintenance",
  "Subscriptions",
  "Professional Fees",
  "Transportation",
  "Miscellaneous",
];

const paymentModes = ["Cash", "UPI", "Cheque", "Bank Transfer", "Other"];

const expenseFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(500),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  vendorName: z.string().optional(),
  paymentMode: z.enum(["Cash", "UPI", "Cheque", "Bank Transfer", "Other"]).optional(),
  paymentDate: z.string().optional(),
  receiptNumber: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface BusinessExpense {
  id: string;
  category: string;
  description: string;
  amount: string;
  vendorName?: string;
  paymentMode?: string;
  paymentDate?: string;
  receiptNumber?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  notes?: string;
  createdAt: string;
}

interface ExpenseStats {
  totalExpenses: number;
  byCategory: Record<string, number>;
  monthlyTotals: { month: string; total: number }[];
  count: number;
}

export default function BusinessExpenses() {
  const { toast } = useToast();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BusinessExpense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: expenses = [], isLoading } = useQuery<BusinessExpense[]>({
    queryKey: ['/api/business-expenses'],
  });

  const { data: stats } = useQuery<ExpenseStats>({
    queryKey: ['/api/business-expenses/stats'],
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      vendorName: "",
      paymentMode: undefined,
      paymentDate: "",
      receiptNumber: "",
      isRecurring: false,
      recurringFrequency: undefined,
      notes: "",
    },
  });

  const isRecurring = form.watch("isRecurring");

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      return apiRequest("POST", "/api/business-expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses/stats'] });
      toast({ title: "Business expense added successfully" });
      setShowExpenseDialog(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add expense", variant: "destructive" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues & { id: string }) => {
      const { id, ...body } = data;
      return apiRequest("PATCH", `/api/business-expenses/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses/stats'] });
      toast({ title: "Expense updated successfully" });
      setShowExpenseDialog(false);
      setEditingExpense(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update expense", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return apiRequest("DELETE", `/api/business-expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business-expenses/stats'] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  const handleAddExpense = () => {
    setEditingExpense(null);
    form.reset({
      category: "",
      description: "",
      amount: "",
      vendorName: "",
      paymentMode: undefined,
      paymentDate: "",
      receiptNumber: "",
      isRecurring: false,
      recurringFrequency: undefined,
      notes: "",
    });
    setShowExpenseDialog(true);
  };

  const handleEditExpense = (expense: BusinessExpense) => {
    setEditingExpense(expense);
    form.reset({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendorName: expense.vendorName || "",
      paymentMode: (expense.paymentMode as any) || undefined,
      paymentDate: expense.paymentDate ? format(new Date(expense.paymentDate), 'yyyy-MM-dd') : "",
      receiptNumber: expense.receiptNumber || "",
      isRecurring: expense.isRecurring || false,
      recurringFrequency: (expense.recurringFrequency as any) || undefined,
      notes: expense.notes || "",
    });
    setShowExpenseDialog(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const onSubmit = (data: ExpenseFormValues) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ ...data, id: editingExpense.id });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const filteredExpenses = selectedCategory === "all" 
    ? expenses 
    : expenses.filter(exp => exp.category === selectedCategory);

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);

  if (isLoading) {
    return (
      <div className="container-trecasa py-6 lg:py-8">
        <div className="text-center py-12">Loading business expenses...</div>
      </div>
    );
  }

  return (
    <div className="container-trecasa py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Business Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Track monthly overhead and operational costs</p>
        </div>
        <Button onClick={handleAddExpense} data-testid="button-add-business-expense">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">
              ₹{stats?.totalExpenses.toLocaleString('en-IN') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.count || 0} expenses recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && Object.keys(stats.byCategory).length > 0
                ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][0]
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats && Object.keys(stats.byCategory).length > 0
                ? `₹${Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][1].toLocaleString('en-IN')}`
                : 'No expenses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats?.monthlyTotals[stats.monthlyTotals.length - 1]?.total.toLocaleString('en-IN') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter by category:</span>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer hover-elevate"
            onClick={() => setSelectedCategory("all")}
            data-testid="filter-all"
          >
            All
          </Badge>
          {expenseCategories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedCategory(cat)}
              data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground" data-testid="text-no-expenses">
              No expenses recorded yet. Click "Add Expense" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-start justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`expense-${expense.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" data-testid={`badge-category-${expense.id}`}>
                        {expense.category}
                      </Badge>
                      {expense.isRecurring && (
                        <Badge variant="secondary" data-testid={`badge-recurring-${expense.id}`}>
                          {expense.recurringFrequency}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold" data-testid={`text-description-${expense.id}`}>
                      {expense.description}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {expense.vendorName && (
                        <span data-testid={`text-vendor-${expense.id}`}>
                          Vendor: {expense.vendorName}
                        </span>
                      )}
                      {expense.paymentMode && (
                        <span data-testid={`text-payment-mode-${expense.id}`}>
                          {expense.paymentMode}
                        </span>
                      )}
                      {expense.paymentDate && (
                        <span data-testid={`text-payment-date-${expense.id}`}>
                          {format(new Date(expense.paymentDate), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                    {expense.notes && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`text-notes-${expense.id}`}>
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold" data-testid={`text-amount-${expense.id}`}>
                        ₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditExpense(expense)}
                        data-testid={`button-edit-${expense.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteExpense(expense.id)}
                        data-testid={`button-delete-${expense.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0.00"
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Brief description of the expense"
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Vendor/supplier name"
                          data-testid="input-vendor"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-mode">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-payment-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt/Invoice Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Receipt or invoice number"
                          data-testid="input-receipt-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-recurring"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          This is a recurring expense
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark if this expense occurs regularly
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <FormField
                    control={form.control}
                    name="recurringFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes"
                        rows={3}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExpenseDialog(false);
                    setEditingExpense(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                  data-testid="button-submit-expense"
                >
                  {editingExpense ? "Update" : "Add"} Expense
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
