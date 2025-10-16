export function AppHeader() {
  return (
    <header className="w-full" style={{ backgroundColor: '#154734' }}>
      <div className="container mx-auto px-4 py-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
              TRECASA DESIGN STUDIO
            </h1>
            <span 
              className="inline-block w-2 h-2 rounded-full translate-y-[-0.5em]"
              style={{ backgroundColor: '#C62828' }}
              aria-label="dot"
            />
          </div>
          <p 
            className="text-sm md:text-base font-light tracking-wider"
            style={{ color: '#D1B77C' }}
          >
            Luxury Interiors | Architecture | Build
          </p>
        </div>
      </div>
      <div 
        className="w-full h-[2px]"
        style={{ backgroundColor: '#D1B77C' }}
      />
    </header>
  );
}
