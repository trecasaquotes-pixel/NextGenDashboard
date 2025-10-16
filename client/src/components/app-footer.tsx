export function AppFooter() {
  return (
    <footer className="w-full mt-auto">
      <div 
        className="w-full h-[1px]"
        style={{ backgroundColor: '#C7A948' }}
      />
      <div className="container mx-auto px-4 py-6">
        <div className="text-center space-y-1" style={{ color: '#999999', fontSize: '12px', lineHeight: '1.2' }}>
          <p>
            © 2025 TRECASA DESIGN STUDIO | All Rights Reserved
          </p>
          <p>Luxury Interiors | Architecture | Build</p>
          <p>
            <a 
              href="https://www.trecasadesignstudio.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              style={{ color: '#999999' }}
            >
              www.trecasadesignstudio.com
            </a>
            {' | '}
            <a 
              href="https://instagram.com/trecasa.designstudio" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              style={{ color: '#999999' }}
            >
              @trecasa.designstudio
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
