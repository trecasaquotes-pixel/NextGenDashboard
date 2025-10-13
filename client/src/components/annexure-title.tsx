interface AnnexureTitleProps {
  letter: 'A' | 'B';
  title: string;
  quoteId?: string;
  clientName?: string;
}

export function AnnexureTitle({ letter, title, quoteId, clientName }: AnnexureTitleProps) {
  return (
    <div className="bg-white text-black p-8 min-h-[1120px] flex flex-col items-center justify-center">
      {/* Branded Header */}
      <div className="mb-12">
        <div className="flex items-center justify-center gap-3 mb-3">
          <h1 className="text-5xl font-bold text-[#013220] text-center">
            TRECASA DESIGN STUDIO
          </h1>
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
        </div>
        <p className="text-[#C9A74E] text-lg text-center">Luxury Interiors | Architecture | Build</p>
      </div>

      {/* Annexure Title */}
      <div className="border-4 border-[#C9A74E] p-12 rounded-lg max-w-2xl w-full text-center">
        <div className="space-y-6">
          <div>
            <p className="text-6xl font-bold text-[#013220] mb-2">ANNEXURE {letter}</p>
            <div className="h-1 bg-[#C9A74E] w-32 mx-auto"></div>
          </div>
          
          <h2 className="text-3xl font-semibold text-[#013220] mt-8">
            {title}
          </h2>
          
          {(quoteId || clientName) && (
            <div className="mt-8 pt-8 border-t-2 border-gray-300 text-sm space-y-2">
              {quoteId && <p><strong>Quote ID:</strong> {quoteId}</p>}
              {clientName && <p><strong>Client:</strong> {clientName}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>© 2025 TRECASA DESIGN STUDIO 🔴 | www.trecasadesignstudio.com | @trecasa.designstudio</p>
      </div>
    </div>
  );
}
