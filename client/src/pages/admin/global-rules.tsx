import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { ArrowLeft, Plus, Trash2, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { getGlobalRules, saveGlobalRules, parseGlobalRulesForForm, type PaymentScheduleItem, type CityFactorItem, type GlobalRulesFormData } from "@/api/adminGlobalRules";
import { queryClient } from "@/lib/queryClient";

export default function AdminGlobalRulesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Form state
  const [buildTypeDefault, setBuildTypeDefault] = useState<"handmade" | "factory">("handmade");
  const [gstPercent, setGstPercent] = useState(18);
  const [validityDays, setValidityDays] = useState(15);
  const [bedroomFactorBase, setBedroomFactorBase] = useState(3);
  const [perBedroomDelta, setPerBedroomDelta] = useState(0.10);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [cityFactors, setCityFactors] = useState<CityFactorItem[]>([]);
  const [footerLine1, setFooterLine1] = useState("");
  const [footerLine2, setFooterLine2] = useState("");

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

  // Fetch global rules
  const { data: globalRulesData, isLoading } = useQuery({
    queryKey: ["/api/admin/global-rules"],
    queryFn: getGlobalRules,
    enabled: isAuthenticated,
  });

  // Load data into form when fetched
  useEffect(() => {
    if (globalRulesData) {
      const formData = parseGlobalRulesForForm(globalRulesData);
      setBuildTypeDefault(formData.buildTypeDefault as "handmade" | "factory");
      setGstPercent(formData.gstPercent);
      setValidityDays(formData.validityDays);
      setBedroomFactorBase(formData.bedroomFactorBase);
      setPerBedroomDelta(formData.perBedroomDelta);
      setPaymentSchedule(formData.paymentSchedule);
      setCityFactors(formData.cityFactors);
      setFooterLine1(formData.footerLine1);
      setFooterLine2(formData.footerLine2);
    }
  }, [globalRulesData]);

  // Calculate payment schedule total
  const paymentTotal = useMemo(() => {
    return paymentSchedule.reduce((sum, item) => sum + (item.percent || 0), 0);
  }, [paymentSchedule]);

  // Validation
  const isValid = useMemo(() => {
    return Math.abs(paymentTotal - 100) < 0.01 && 
           gstPercent >= 0 && gstPercent <= 28 &&
           validityDays >= 1 && validityDays <= 90 &&
           bedroomFactorBase >= 1 && bedroomFactorBase <= 5 &&
           perBedroomDelta >= 0 && perBedroomDelta <= 0.25;
  }, [paymentTotal, gstPercent, validityDays, bedroomFactorBase, perBedroomDelta]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: GlobalRulesFormData) => saveGlobalRules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-rules"] });
      toast({
        title: "Success",
        description: "Global rules updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update global rules",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: paymentTotal !== 100 
          ? `Payment schedule must sum to 100% (currently ${paymentTotal}%)`
          : "Please check all fields are within valid ranges",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      buildTypeDefault,
      gstPercent,
      validityDays,
      bedroomFactorBase,
      perBedroomDelta,
      paymentSchedule,
      cityFactors,
      footerLine1,
      footerLine2,
    });
  };

  // Payment schedule handlers
  const addPaymentItem = () => {
    setPaymentSchedule([...paymentSchedule, { label: "", percent: 0 }]);
  };

  const updatePaymentItem = (index: number, field: "label" | "percent", value: string | number) => {
    const updated = [...paymentSchedule];
    if (field === "label") {
      updated[index].label = value as string;
    } else {
      updated[index].percent = typeof value === 'string' ? parseFloat(value) || 0 : value;
    }
    setPaymentSchedule(updated);
  };

  const deletePaymentItem = (index: number) => {
    setPaymentSchedule(paymentSchedule.filter((_, i) => i !== index));
  };

  const resetPaymentSchedule = () => {
    setPaymentSchedule([
      { label: "Booking", percent: 10 },
      { label: "Site Measurement", percent: 50 },
      { label: "On Delivery", percent: 35 },
      { label: "After Installation", percent: 5 }
    ]);
  };

  // City factors handlers
  const addCityFactor = () => {
    setCityFactors([...cityFactors, { city: "", factor: 1.00 }]);
  };

  const updateCityFactor = (index: number, field: "city" | "factor", value: string | number) => {
    const updated = [...cityFactors];
    if (field === "city") {
      updated[index].city = value as string;
    } else {
      updated[index].factor = typeof value === 'string' ? parseFloat(value) || 1.00 : value;
    }
    setCityFactors(updated);
  };

  const deleteCityFactor = (index: number) => {
    setCityFactors(cityFactors.filter((_, i) => i !== index));
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-1 p-6">
          <div className="text-center">Loading global rules...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Global Rules</h1>
              <p className="text-sm text-muted-foreground">
                Configure application-wide settings for pricing, scaling, and display
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={!isValid || saveMutation.isPending}
            data-testid="button-save-rules"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Pricing Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Defaults</CardTitle>
              <CardDescription>Default settings for new quotations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buildType">Build Type Default</Label>
                  <Select
                    value={buildTypeDefault}
                    onValueChange={(value) => setBuildTypeDefault(value as "handmade" | "factory")}
                  >
                    <SelectTrigger id="buildType" data-testid="select-build-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="handmade">Handmade</SelectItem>
                      <SelectItem value="factory">Factory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst">GST %</Label>
                  <Input
                    id="gst"
                    type="number"
                    min="0"
                    max="28"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(parseInt(e.target.value) || 0)}
                    data-testid="input-gst-percent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validity">Quote Validity (days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    min="1"
                    max="90"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value) || 1)}
                    data-testid="input-validity-days"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bedroom Scaling */}
          <Card>
            <CardHeader>
              <CardTitle>Bedroom Scaling</CardTitle>
              <CardDescription>BHK-based pricing calculation factors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseBHK">Base BHK (Baseline)</Label>
                  <Select
                    value={String(bedroomFactorBase)}
                    onValueChange={(value) => setBedroomFactorBase(parseInt(value))}
                  >
                    <SelectTrigger id="baseBHK" data-testid="select-bedroom-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 BHK</SelectItem>
                      <SelectItem value="2">2 BHK</SelectItem>
                      <SelectItem value="3">3 BHK</SelectItem>
                      <SelectItem value="4">4 BHK</SelectItem>
                      <SelectItem value="5">5 BHK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delta">Per-Bedroom Delta (0.00-0.25)</Label>
                  <Input
                    id="delta"
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.25"
                    value={perBedroomDelta}
                    onChange={(e) => setPerBedroomDelta(parseFloat(e.target.value) || 0)}
                    data-testid="input-per-bedroom-delta"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md text-sm">
                <div className="font-medium mb-1">Preview:</div>
                <div className="text-muted-foreground">
                  At 2 BHK: price = base × (1 {bedroomFactorBase > 2 ? '+' : '−'} {Math.abs(2 - bedroomFactorBase)} × {perBedroomDelta}) = base × {(1 + (2 - bedroomFactorBase) * perBedroomDelta).toFixed(2)}
                </div>
                <div className="text-muted-foreground">
                  At 4 BHK: price = base × (1 {bedroomFactorBase < 4 ? '+' : '−'} {Math.abs(4 - bedroomFactorBase)} × {perBedroomDelta}) = base × {(1 + (4 - bedroomFactorBase) * perBedroomDelta).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>
                Define payment milestones (must sum to 100%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total: {paymentTotal.toFixed(1)}%</span>
                    {Math.abs(paymentTotal - 100) > 0.01 && (
                      <span className="text-sm text-destructive">
                        (must be 100%)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPaymentSchedule}
                    data-testid="button-reset-payment-schedule"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to Default
                  </Button>
                </div>
                <Progress 
                  value={Math.min(paymentTotal, 100)} 
                  className={Math.abs(paymentTotal - 100) > 0.01 ? "bg-destructive/20" : ""}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-32">Percent %</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSchedule.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={item.label}
                          onChange={(e) => updatePaymentItem(idx, "label", e.target.value)}
                          placeholder="Payment label"
                          data-testid={`input-payment-label-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.percent}
                          onChange={(e) => updatePaymentItem(idx, "percent", e.target.value)}
                          data-testid={`input-payment-percent-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePaymentItem(idx)}
                          data-testid={`button-delete-payment-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                variant="outline"
                onClick={addPaymentItem}
                className="w-full"
                data-testid="button-add-payment-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Item
              </Button>
            </CardContent>
          </Card>

          {/* City Factors */}
          <Card>
            <CardHeader>
              <CardTitle>City Factors</CardTitle>
              <CardDescription>
                Location-based price multipliers (0.8 - 1.3)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="w-32">Factor</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityFactors.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={item.city}
                          onChange={(e) => updateCityFactor(idx, "city", e.target.value)}
                          placeholder="City name"
                          data-testid={`input-city-name-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.8"
                          max="1.3"
                          step="0.05"
                          value={item.factor}
                          onChange={(e) => updateCityFactor(idx, "factor", e.target.value)}
                          data-testid={`input-city-factor-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCityFactor(idx)}
                          data-testid={`button-delete-city-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                variant="outline"
                onClick={addCityFactor}
                className="w-full"
                data-testid="button-add-city-factor"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add City
              </Button>
            </CardContent>
          </Card>

          {/* Footer Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Footer Branding (PDF)</CardTitle>
              <CardDescription>
                Footer text displayed on printed quotations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer1">Footer Line 1</Label>
                <Input
                  id="footer1"
                  value={footerLine1}
                  onChange={(e) => setFooterLine1(e.target.value)}
                  placeholder="TRECASA Design Studio | Luxury Interiors | Architecture | Build"
                  data-testid="input-footer-line-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer2">Footer Line 2</Label>
                <Input
                  id="footer2"
                  value={footerLine2}
                  onChange={(e) => setFooterLine2(e.target.value)}
                  placeholder="www.trecasadesignstudio.com | +91-XXXXXXXXXX"
                  data-testid="input-footer-line-2"
                />
              </div>

              <div className="p-4 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Preview:</div>
                <div className="text-center space-y-1">
                  <div className="text-sm flex items-center justify-center gap-2">
                    <span>{footerLine1.split('|')[0]?.trim() || 'TRECASA Design Studio'}</span>
                    <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                    <span>{footerLine1.split('|').slice(1).join('|').trim() || 'Luxury Interiors | Architecture | Build'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{footerLine2 || 'www.trecasadesignstudio.com | +91-XXXXXXXXXX'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!isValid || saveMutation.isPending}
            size="lg"
            data-testid="button-save-rules-bottom"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
