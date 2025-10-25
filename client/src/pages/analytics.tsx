import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle,
  BarChart3,
  Package,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

const COLORS = ["#154734", "#C7A948", "#2D6A4F", "#74C69D", "#B7E4C7", "#95D5B2"];

interface DashboardOverviewResponse {
  overview: {
    totalQuotations: number;
    activeQuotations: number;
    acceptedQuotations: number;
    totalRevenue: number;
    conversionRate: number;
    avgQuoteValue: number;
  };
  statusDistribution: Record<string, number>;
  monthlyRevenue: Array<{ month: string; revenue: number; count: number }>;
}

interface QuotationAnalyticsResponse {
  valueByStatus: Record<string, { count: number; value: number }>;
  categoryAnalysis: Record<string, { count: number; totalValue: number; accepted: number }>;
  buildTypeAnalysis: Record<string, { count: number; totalValue: number }>;
  valueRanges: Record<string, number>;
}

interface FinancialAnalyticsResponse {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    projectExpenses: number;
    businessExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  monthlyFinancials: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  expenseByCategory: Record<string, number>;
}

interface MaterialAnalyticsResponse {
  topMaterials: Array<{ name: string; count: number }>;
  topFinishes: Array<{ name: string; count: number }>;
  topHardware: Array<{ name: string; count: number }>;
  roomAnalysis: Array<{ name: string; count: number }>;
  calcTypeDistribution: Record<string, number>;
  totalItems: number;
}

export default function Analytics() {
  // P4-1: Dashboard Overview
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useQuery<DashboardOverviewResponse>({
    queryKey: ["/api/analytics/dashboard"],
  });

  // P4-2: Quotation Analytics
  const {
    data: quotationData,
    isLoading: quotationLoading,
    error: quotationError,
  } = useQuery<QuotationAnalyticsResponse>({
    queryKey: ["/api/analytics/quotations"],
  });

  // P4-3: Financial Reports
  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
  } = useQuery<FinancialAnalyticsResponse>({
    queryKey: ["/api/analytics/financials"],
  });

  // P4-4: Material Analytics
  const {
    data: materialData,
    isLoading: materialLoading,
    error: materialError,
  } = useQuery<MaterialAnalyticsResponse>({
    queryKey: ["/api/analytics/materials"],
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format month labels
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container-trecasa py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Business Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analytics and performance metrics
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quotations" data-testid="tab-quotations">
              Quotations
            </TabsTrigger>
            <TabsTrigger value="financial" data-testid="tab-financial">
              Financial
            </TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">
              Materials
            </TabsTrigger>
          </TabsList>

          {/* P4-1: Dashboard Overview */}
          <TabsContent value="overview" className="space-y-6">
            {dashboardLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3 w-40" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : dashboardError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load dashboard data. Please try again later.
                </AlertDescription>
              </Alert>
            ) : dashboardData ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card data-testid="card-total-revenue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardData.overview.totalRevenue)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From {dashboardData.overview.acceptedQuotations} accepted quotes
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-active-quotes">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Quotations</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.overview.activeQuotations}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Out of {dashboardData.overview.totalQuotations} total
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-conversion-rate">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.overview.conversionRate}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Quote acceptance rate</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-avg-quote-value">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardData.overview.avgQuoteValue)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Average per accepted quote
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                      <CardDescription>Last 6 months revenue performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dashboardData.monthlyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={formatMonth}
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            labelFormatter={formatMonth}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#154734"
                            strokeWidth={2}
                            dot={{ fill: "#154734" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status Distribution</CardTitle>
                      <CardDescription>Quotations by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(dashboardData.statusDistribution).map(
                              ([status, count]) => ({
                                name: status.charAt(0).toUpperCase() + status.slice(1),
                                value: count,
                              }),
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(dashboardData.statusDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No dashboard data available.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* P4-2: Quotation Analytics */}
          <TabsContent value="quotations" className="space-y-6">
            {quotationLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-56 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : quotationError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load quotation analytics. Please try again later.
                </AlertDescription>
              </Alert>
            ) : quotationData ? (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Value by Status</CardTitle>
                      <CardDescription>Total quotation value per status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={Object.entries(quotationData.valueByStatus).map(
                            ([status, data]: [string, any]) => ({
                              status: status.charAt(0).toUpperCase() + status.slice(1),
                              value: data.value,
                              count: data.count,
                            }),
                          )}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" style={{ fontSize: "12px" }} />
                          <YAxis
                            tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          <Bar dataKey="value" fill="#154734" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quote Value Ranges</CardTitle>
                      <CardDescription>Distribution of quotation values</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={Object.entries(quotationData.valueRanges).map(([range, count]) => ({
                            range,
                            count,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" style={{ fontSize: "12px" }} />
                          <YAxis style={{ fontSize: "12px" }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#C7A948" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Analysis</CardTitle>
                      <CardDescription>Performance by project type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(quotationData.categoryAnalysis).map(
                          ([category, data]: [string, any]) => (
                            <div key={category} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{category}</div>
                                <div className="text-sm text-muted-foreground">
                                  {data.count} quotes • {formatCurrency(data.totalValue)}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-primary">
                                {data.count > 0
                                  ? Math.round((data.accepted / data.count) * 100)
                                  : 0}
                                % accepted
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Build Type Analysis</CardTitle>
                      <CardDescription>Quotations by build type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={Object.entries(quotationData.buildTypeAnalysis).map(
                              ([type, data]: [string, any]) => ({
                                name: type.charAt(0).toUpperCase() + type.slice(1),
                                value: data.totalValue,
                              }),
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(quotationData.buildTypeAnalysis).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No quotation analytics available.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* P4-3: Financial Reports */}
          <TabsContent value="financial" className="space-y-6">
            {financialLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : financialError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load financial reports. Please try again later.
                </AlertDescription>
              </Alert>
            ) : financialData ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card data-testid="card-financial-revenue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(financialData.summary.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-total-expenses">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(financialData.summary.totalExpenses)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Project: {formatCurrency(financialData.summary.projectExpenses)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-net-profit">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${financialData.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(financialData.summary.netProfit)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-profit-margin">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${financialData.summary.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {financialData.summary.profitMargin}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly P&L</CardTitle>
                      <CardDescription>Revenue, Expenses & Profit trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={financialData.monthlyFinancials}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={formatMonth}
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            labelFormatter={formatMonth}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#154734"
                            strokeWidth={2}
                            name="Revenue"
                          />
                          <Line
                            type="monotone"
                            dataKey="expenses"
                            stroke="#C7A948"
                            strokeWidth={2}
                            name="Expenses"
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#2D6A4F"
                            strokeWidth={2}
                            name="Profit"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Breakdown</CardTitle>
                      <CardDescription>Business expenses by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(financialData.expenseByCategory).map(
                              ([category, amount]) => ({
                                name: category,
                                value: amount,
                              }),
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(financialData.expenseByCategory).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No financial data available.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* P4-4: Material Analytics */}
          <TabsContent value="materials" className="space-y-6">
            {materialLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3 w-40" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : materialError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load material analytics. Please try again later.
                </AlertDescription>
              </Alert>
            ) : materialData ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card data-testid="card-total-items">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Line Items</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{materialData.totalItems}</div>
                      <p className="text-xs text-muted-foreground mt-1">Across all quotations</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Material</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {materialData.topMaterials[0]?.name || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {materialData.topMaterials[0]?.count || 0} times
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Finish</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {materialData.topFinishes[0]?.name || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {materialData.topFinishes[0]?.count || 0} times
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Materials</CardTitle>
                      <CardDescription>Most used core materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={materialData.topMaterials.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" style={{ fontSize: "12px" }} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            style={{ fontSize: "11px" }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" fill="#154734" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Finishes</CardTitle>
                      <CardDescription>Most used finishes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={materialData.topFinishes.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" style={{ fontSize: "12px" }} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            style={{ fontSize: "11px" }}
                          />
                          <Tooltip />
                          <Bar dataKey="count" fill="#C7A948" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Room Analysis</CardTitle>
                      <CardDescription>Items by room type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={materialData.roomAnalysis.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" style={{ fontSize: "12px" }} />
                          <YAxis style={{ fontSize: "12px" }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#2D6A4F" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Calculation Type Distribution</CardTitle>
                      <CardDescription>SQFT vs COUNT vs LSUM</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(materialData.calcTypeDistribution).map(
                              ([type, count]) => ({
                                name: type,
                                value: count,
                              }),
                            )}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(materialData.calcTypeDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No material analytics available.</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}
