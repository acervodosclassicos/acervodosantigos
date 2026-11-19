import { Link } from 'react-router-dom';
import { AlertTriangle, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-zinc-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={40} className="text-orange-500" />
      </div>
      <h1 className="font-display font-bold text-4xl text-white mb-4">Página não encontrada</h1>
      <p className="text-zinc-400 max-w-md mx-auto mb-10 text-lg">
        A rota que você tentou acessar não existe ou a peça foi movida de lugar na nossa garagem.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          to="/" 
          className="flex items-center justify-center px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-sm transition-colors"
        >
          <Home size={18} className="mr-2" />
          Voltar para o Início
        </Link>
        <Link 
          to="/produtos" 
          className="flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-sm transition-colors"
        >
          <Search size={18} className="mr-2" />
          Explorar Catálogo
        </Link>
      </div>
    </div>
  );
}
