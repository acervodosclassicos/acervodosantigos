import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, AlertTriangle, XCircle, Activity, Server, Database, Shield, Image as ImageIcon } from 'lucide-react';

export default function AdminDiagnostics() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const newResults: any = {
      connection: { status: 'loading', message: '' },
      tables: { status: 'loading', message: '', details: [] },
      storage: { status: 'loading', message: '', details: [] },
      schema: { status: 'loading', message: '', details: [] }
    };
    
    setResults({ ...newResults });

    // 1. Check Connection
    try {
      const { data, error } = await supabase.from('site_settings').select('id').limit(1);
      if (error && error.code !== '42P01') throw error;
      newResults.connection = { status: 'success', message: 'Conectado ao Supabase com sucesso.' };
    } catch (e: any) {
      newResults.connection = { status: 'error', message: `Falha na conexão: ${e.message}` };
    }
    setResults({ ...newResults });

    // 2. Check Tables
    const requiredTables = ['site_settings', 'categories', 'products', 'product_images', 'banners', 'profiles', 'orders', 'order_items'];
    const tableChecks = [];
    let tablesOk = true;

    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
          tableChecks.push({ table, status: 'error', message: 'Tabela não existe' });
          tablesOk = false;
        } else if (error && error.code === '42501') {
           tableChecks.push({ table, status: 'warning', message: 'Tabela existe, mas RLS bloqueia acesso anônimo (esperado)' });
        } else {
          tableChecks.push({ table, status: 'success', message: 'Tabela acessível' });
        }
      } catch (e) {
        tableChecks.push({ table, status: 'error', message: 'Erro ao consultar tabela' });
        tablesOk = false;
      }
    }
    
    // Check feedbacks separately since it's new
    try {
        const { error } = await supabase.from('feedbacks').select('id').limit(1);
        if (error && error.code === '42P01') {
            tableChecks.push({ table: 'feedbacks', status: 'error', message: 'Tabela feedbacks não existe (Nova)' });
            tablesOk = false;
        } else {
            tableChecks.push({ table: 'feedbacks', status: 'success', message: 'Tabela acessível' });
        }
    } catch(e) {}

    newResults.tables = { 
      status: tablesOk ? 'success' : 'error', 
      message: tablesOk ? 'Todas as tabelas base existem.' : 'Faltam tabelas estruturais.',
      details: tableChecks
    };
    setResults({ ...newResults });

    // 3. Check Storage
    try {
      const { data: buckets, error: storageErr } = await supabase.storage.listBuckets();
      if (storageErr) {
        newResults.storage = {
          status: 'warning',
          message: 'Não foi possível listar os buckets de storage diretamente via API pública.',
        };
      } else {
        const hasBucket = buckets?.some((b: any) => b.name === 'product-images');
        if (hasBucket) {
          newResults.storage = {
            status: 'success',
            message: 'Bucket de imagens "product-images" verificado com sucesso.',
          };
        } else {
          newResults.storage = {
            status: 'warning',
            message: 'O bucket "product-images" não foi encontrado. Para enviar fotos direto do computador, crie um bucket público chamado "product-images" no menu Storage do Supabase.',
          };
        }
      }
    } catch (e: any) {
      newResults.storage = {
        status: 'warning',
        message: 'Storage não verificado.',
      };
    }
    setResults({ ...newResults });

    // 3. Check specific schema columns (payment_methods)
    try {
      const { data, error } = await supabase.from('products').select('payment_methods').limit(1);
      if (error) {
        newResults.schema = { 
          status: 'error', 
          message: 'Faltam colunas na tabela products (ex: payment_methods)',
          sql: `ALTER TABLE products ADD COLUMN payment_methods JSONB;\nCREATE TABLE IF NOT EXISTS feedbacks (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  name TEXT NOT NULL,\n  text TEXT NOT NULL,\n  rating INTEGER DEFAULT 5,\n  vehicle TEXT,\n  photo_url TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  sort_order INTEGER DEFAULT 0,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\nALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Public can read active feedbacks" ON feedbacks FOR SELECT USING (is_active = true);\nCREATE POLICY "Admins can do everything on feedbacks" ON feedbacks USING (public.is_admin());`
        };
      } else {
        newResults.schema = { status: 'success', message: 'Schema atualizado.' };
      }
    } catch (e: any) {
        newResults.schema = { status: 'error', message: 'Não foi possível verificar as colunas.' };
    }
    setResults({ ...newResults });

    setIsChecking(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle2 className="text-emerald-500" size={20} />;
    if (status === 'warning') return <AlertTriangle className="text-yellow-500" size={20} />;
    if (status === 'error') return <XCircle className="text-red-500" size={20} />;
    return <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Diagnóstico e Debug</h2>
        <p className="text-zinc-400">Verifique a saúde do sistema e do banco de dados.</p>
      </div>

      <div className="mb-8">
        <button 
          onClick={runDiagnostics}
          disabled={isChecking}
          className="bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 px-6 rounded-sm transition-colors flex items-center"
        >
          {isChecking ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div> Verificando...</>
          ) : (
            <><Activity className="mr-2" size={20} /> Executar Diagnóstico Completo</>
          )}
        </button>
      </div>

      {results && (
        <div className="space-y-6">
          {/* Connection */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
            <div className="flex items-start">
              <div className="mt-1 mr-4"><StatusIcon status={results.connection.status} /></div>
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Server size={18} className="mr-2 text-zinc-400" /> Conexão Supabase
                </h3>
                <p className="text-zinc-400 text-sm mt-1">{results.connection.message}</p>
              </div>
            </div>
          </div>

          {/* Schema (SQL Required) */}
          {results.schema.status === 'error' && (
            <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-sm">
              <div className="flex items-start">
                <div className="mt-1 mr-4"><StatusIcon status="error" /></div>
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-red-400 flex items-center">
                    <Database size={18} className="mr-2" /> Atualização de Banco Necessária
                  </h3>
                  <p className="text-zinc-300 text-sm mt-2 mb-4">
                    O sistema identificou que faltam tabelas ou colunas novas (ex: feedbacks, payment_methods). 
                    <strong className="block mt-2 text-orange-400">Esta correção precisa ser executada manualmente no painel do Supabase (SQL Editor).</strong>
                  </p>
                  
                  <div className="bg-black/50 p-4 rounded-sm border border-zinc-800 relative overflow-x-auto">
                    <pre className="text-xs text-zinc-300 font-mono">
                      {results.schema.sql}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tables */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
            <div className="flex items-start">
              <div className="mt-1 mr-4"><StatusIcon status={results.tables.status} /></div>
              <div className="w-full">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Database size={18} className="mr-2 text-zinc-400" /> Tabelas e Permissões
                </h3>
                <p className="text-zinc-400 text-sm mt-1 mb-4">{results.tables.message}</p>
                
                {results.tables.details.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {results.tables.details.map((detail: any, i: number) => (
                      <div key={i} className="flex items-center p-3 bg-zinc-950 rounded-sm border border-zinc-800">
                        <div className="mr-3"><StatusIcon status={detail.status} /></div>
                        <div>
                          <p className="text-white text-sm font-medium">{detail.table}</p>
                          <p className="text-zinc-500 text-xs">{detail.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
