import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Quotation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { QuotationHeader } from "@/components/quotation-header";

const projectInfoSchema = z.object({
  projectName: z.string().min(1, "Required"),
  projectType: z.string().min(1, "Required"),
  projectTypeOther: z.string().optional(),
  clientName: z.string().min(1, "Required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientPhone: z.string().min(1, "Required"),
  projectAddress: z.string().min(1, "Required"),
}).refine((data) => {
  if (data.projectType === "Other") {
    return data.projectTypeOther && data.projectTypeOther.trim().length > 0;
  }
  return true;
}, {
  message: "Required",
  path: ["projectTypeOther"],
});

type ProjectInfoForm = z.infer<typeof projectInfoSchema>;

export default function ProjectInfo() {
  const [match, params] = useRoute("/quotation/:id/info");
  const quotationId = params?.id;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: quotation, isLoading } = useQuery<Quotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId && isAuthenticated,
  });

  const form = useForm<ProjectInfoForm>({
    resolver: zodResolver(projectInfoSchema),
    mode: "onChange",
    defaultValues: {
      projectName: "",
      projectType: "",
      projectTypeOther: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      projectAddress: "",
    },
  });

  // Update form when quotation loads
  useEffect(() => {
    if (quotation) {
      const standardCategories = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Duplex", "Triplex", "Villa", "Commercial"];
      const projectType = quotation.projectType || "";
      const isStandardCategory = standardCategories.includes(projectType);
      
      form.reset({
        projectName: quotation.projectName,
        projectType: isStandardCategory ? projectType : (projectType ? "Other" : ""),
        projectTypeOther: isStandardCategory ? "" : projectType,
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail || "",
        clientPhone: quotation.clientPhone || "",
        projectAddress: quotation.projectAddress || "",
      });
    }
  }, [quotation, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectInfoForm) => {
      const finalProjectType = data.projectType === "Other" ? data.projectTypeOther : data.projectType;
      const { projectTypeOther, ...quotationData } = data;
      await apiRequest("PATCH", `/api/quotations/${quotationId}`, {
        ...quotationData,
        projectType: finalProjectType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Project information saved successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save project information",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectInfoForm) => {
    updateMutation.mutate(data);
  };

  const handleContinue = () => {
    form.handleSubmit((data) => {
      updateMutation.mutate(data, {
        onSuccess: () => {
          navigate(`/quotation/${quotationId}/scope`);
        },
      });
    })();
  };

  if (!match || authLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <QuotationHeader quotationId={quotationId!} currentStep="info" />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="space-y-2">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse"></div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <QuotationHeader quotationId={quotationId!} currentStep="info" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate("/quotes")} className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Project Information</CardTitle>
              <CardDescription>Enter the basic details for this quotation</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Modern Villa Interior" {...field} data-testid="input-project-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project-category">
                                <SelectValue placeholder="Select project category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1 BHK">1 BHK</SelectItem>
                              <SelectItem value="2 BHK">2 BHK</SelectItem>
                              <SelectItem value="3 BHK">3 BHK</SelectItem>
                              <SelectItem value="4 BHK">4 BHK</SelectItem>
                              <SelectItem value="Duplex">Duplex</SelectItem>
                              <SelectItem value="Triplex">Triplex</SelectItem>
                              <SelectItem value="Villa">Villa</SelectItem>
                              <SelectItem value="Commercial">Commercial</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("projectType") === "Other" && (
                      <FormField
                        control={form.control}
                        name="projectTypeOther"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specify Category *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter project category" {...field} data-testid="input-project-category-other" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} data-testid="input-client-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} data-testid="input-client-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" {...field} data-testid="input-client-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="projectAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Address *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="123 Main Street, City, State, ZIP" 
                            className="resize-none" 
                            rows={3}
                            {...field} 
                            data-testid="input-project-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      variant="outline" 
                      disabled={updateMutation.isPending}
                      data-testid="button-save"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleContinue}
                      disabled={updateMutation.isPending || !form.formState.isValid}
                      data-testid="button-continue"
                    >
                      Continue to Scope
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
