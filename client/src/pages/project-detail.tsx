import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


const expenseCategories = [
  "Materials",
  "Labor",
  "Transport",
  "Equipment",
  "Tools",
  "Permits",
  "Utilities",
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
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ProjectExpense {
  id: string;
  category: string;
  description: string;
  amount: string;
  vendorName?: string;
  paymentMode?: string;
  paymentDate?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

interface Project {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  projectAddress?: string;
  contractAmount: string;
  totalExpenses: string;
  profitLoss: string;
  status: string;
  startDate?: string;
  notes?: string;
  quotation?: {
    id: string;
    quoteId: string;
  };
  expenses: ProjectExpense[];
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ProjectExpense | null>(null);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
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
      notes: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      return apiRequest("POST", `/api/projects/${projectId}/expenses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({ title: "Expense added successfully" });
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
      return apiRequest("PATCH", `/api/project-expenses/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
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
      return apiRequest("DELETE", `/api/project-expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
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
      notes: "",
    });
    setShowExpenseDialog(true);
  };

  const handleEditExpense = (expense: ProjectExpense) => {
    setEditingExpense(expense);
    form.reset({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendorName: expense.vendorName || "",
      paymentMode: (expense.paymentMode as any) || undefined,
      paymentDate: expense.paymentDate ? format(new Date(expense.paymentDate), "yyyy-MM-dd") : "",
      receiptNumber: expense.receiptNumber || "",
      notes: expense.notes || "",
    });
    setShowExpenseDialog(true);
  };

  const onSubmit = (data: ExpenseFormValues) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ ...data, id: editingExpense.id });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "on-hold":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container-trecasa py-6 lg:py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
            <Link href="/projects">
              <Button>Back to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profitLoss = parseFloat(project.profitLoss || "0");
  const isProfitable = profitLoss >= 0;

  return (
    <div className="container-trecasa py-6 lg:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.projectName}</h1>
          <p className="text-muted-foreground mt-1">{project.clientName}</p>
        </div>
        <Badge className={getStatusColor(project.status)} data-testid="badge-project-status">
          {project.status}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contract Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-contract-amount">
              {formatCurrency(project.contractAmount)}
            </div>
            {project.quotation && (
              <Link href={`/estimate/${project.quotation.quoteId}`}>
                <p className="text-xs text-primary hover:underline mt-1 cursor-pointer">
                  Quote: {project.quotation.quoteId}
                </p>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
              {formatCurrency(project.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{project.expenses.length} items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"}`}
              data-testid="text-profit-loss"
            >
              {isProfitable ? "+" : ""}
              {formatCurrency(profitLoss)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{isProfitable ? "Profit" : "Loss"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project ID:</span>
              <p className="font-mono mt-1">{project.projectId}</p>
            </div>
            {project.projectAddress && (
              <div>
                <span className="text-muted-foreground">Address:</span>
                <p className="mt-1">{project.projectAddress}</p>
              </div>
            )}
            {project.startDate && (
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(project.startDate), "MMM dd, yyyy")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expenses</CardTitle>
            <Button onClick={handleAddExpense} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {project.expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded yet. Add your first expense to start tracking.
            </div>
          ) : (
            <div className="space-y-3">
              {project.expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4 hover-elevate">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">{expense.category}</Badge>
                        <span className="font-semibold">{expense.description}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        {expense.vendorName && <div>Vendor: {expense.vendorName}</div>}
                        {expense.paymentMode && <div>Payment: {expense.paymentMode}</div>}
                        {expense.paymentDate && (
                          <div>Date: {format(new Date(expense.paymentDate), "MMM dd, yyyy")}</div>
                        )}
                        {expense.receiptNumber && <div>Receipt: {expense.receiptNumber}</div>}
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <div
                          className="text-lg font-semibold text-red-600"
                          data-testid={`text-expense-amount-${expense.id}`}
                        >
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditExpense(expense)}
                          data-testid={`button-edit-expense-${expense.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this expense?")) {
                              deleteExpenseMutation.mutate(expense.id);
                            }
                          }}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
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
                        <Input {...field} placeholder="0.00" data-testid="input-amount" />
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
                        <Input {...field} type="date" data-testid="input-payment-date" />
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
                          data-testid="input-receipt"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <Button type="button" variant="outline" onClick={() => setShowExpenseDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-expense">
                  {editingExpense ? "Update Expense" : "Add Expense"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
