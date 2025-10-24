import { RedDot } from "@/components/ui/red-dot";

interface AnnexureTitleProps {
  letter: "A" | "B";
  title: string;
  quoteId?: string;
  clientName?: string;
}

export function AnnexureTitle({ letter, title, quoteId, clientName }: AnnexureTitleProps) {
  return (
    <div className="bg-white text-black p-8 min-h-[1120px] flex flex-col items-center justify-center">
      {/* Branded Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-[#0E2F1B] text-center flex items-center justify-center mb-3">
          TRECASA DESIGN STUDIO
          <RedDot size="lg" className="translate-y-[-0.3em]" />
        </h1>
        <p className="text-[#C7A948] text-lg text-center">
          Luxury Interiors | Architecture | Build
        </p>
      </div>

      {/* Annexure Title */}
      <div className="border-4 border-[#C7A948] p-12 rounded-lg max-w-2xl w-full text-center">
        <div className="space-y-6">
          <div>
            <p className="text-6xl font-bold text-[#0E2F1B] mb-2">ANNEXURE {letter}</p>
            <div className="h-1 bg-[#C7A948] w-32 mx-auto"></div>
          </div>

          <h2 className="text-3xl font-semibold text-[#0E2F1B] mt-8">{title}</h2>

          {(quoteId || clientName) && (
            <div className="mt-8 pt-8 border-t-2 border-gray-300 text-sm space-y-2">
              {quoteId && (
                <p>
                  <strong>Quote ID:</strong> {quoteId}
                </p>
              )}
              {clientName && (
                <p>
                  <strong>Client:</strong> {clientName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>© 2025 TRECASA DESIGN STUDIO | www.trecasadesignstudio.com | @trecasa.designstudio</p>
      </div>
    </div>
  );
}
