import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileText, Calculator, Download } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Professional Interior Design Quotations
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create detailed, professional quotations for your interior design projects with room-based line items, material tracking, and instant PDF exports.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="text-lg px-8"
            data-testid="button-get-started"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-foreground">
            Everything You Need
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-card-foreground">Detailed Line Items</h4>
              <p className="text-muted-foreground">
                Track every detail with room-specific line items, dimensions, materials, and finishes for both interiors and false ceilings.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-card-foreground">Smart Calculations</h4>
              <p className="text-muted-foreground">
                Automatic SQFT and area calculations based on dimensions. Set default materials like BWP Ply, Laminate, and hardware.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2 text-card-foreground">PDF Export</h4>
              <p className="text-muted-foreground">
                Generate separate professional PDFs for interior work and false ceiling estimates with your branding.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
