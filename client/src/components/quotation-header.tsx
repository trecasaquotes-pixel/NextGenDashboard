import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Quotation } from "@shared/schema";
import { ChevronRight } from "lucide-react";

interface QuotationHeaderProps {
  quotationId: string;
  currentStep: "info" | "scope" | "estimate" | "print";
}

export function QuotationHeader({ quotationId, currentStep }: QuotationHeaderProps) {
  const { data: quotation } = useQuery<Quotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId,
  });

  const steps = [
    { key: "info", label: "Project Info", href: `/quotation/${quotationId}/info` },
    { key: "scope", label: "Scope", href: `/quotation/${quotationId}/scope` },
    { key: "estimate", label: "Estimate", href: `/quotation/${quotationId}/estimate` },
    { key: "print", label: "Print", href: `/quotation/${quotationId}/print` },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">TRECASA</h1>
            {quotation && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{quotation.projectName}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-sm font-mono text-muted-foreground">{quotation.quoteId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 flex-wrap">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {index <= currentStepIndex ? (
                <Link href={step.href}>
                  <span 
                    className={`text-sm ${
                      step.key === currentStep 
                        ? "font-semibold text-primary" 
                        : "text-foreground hover-elevate px-2 py-1 rounded-md transition-colors"
                    }`}
                    data-testid={`nav-${step.key}`}
                  >
                    {step.label}
                  </span>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground" data-testid={`nav-${step.key}`}>
                  {step.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
