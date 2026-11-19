import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, MessageSquare } from 'lucide-react';
import { Feedback } from '../../types';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<Partial<Feedback>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const { data, error } = await supabase.from('feedbacks').select('*').order('sort_order', { ascending: true });
      if (error && error.code !== '42P01') throw error; // ignore table not found
      setFeedbacks(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (fb: Feedback) => {
    setCurrent(fb);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrent({ is_active: true, sort_order: feedbacks.length, rating: 5 });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este feedback?')) return;
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
      setFeedbacks(feedbacks.filter(b => b.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        name: current.name,
        text: current.text,
        rating: current.rating || 5,
        vehicle: current.vehicle,
        photo_url: current.photo_url,
        is_active: current.is_active,
        sort_order: current.sort_order,
      };

      if (current.id) {
        const { error } = await supabase.from('feedbacks').update(data).eq('id', current.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('feedbacks').insert([data]);
        if (error) throw error;
      }
      
      setIsEditing(false);
      loadFeedbacks();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Feedbacks de Clientes</h2>
          <p className="text-zinc-400">Gerencie os depoimentos exibidos na página inicial.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-sm transition-colors"
          >
            <Plus size={18} className="mr-2" /> Novo Feedback
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <h3 className="text-lg font-semibold text-white">{current.id ? 'Editar Feedback' : 'Novo Feedback'}</h3>
            <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Cliente *</label>
                <input 
                  value={current.name || ''} 
                  onChange={(e) => setCurrent({...current, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Veículo (Opcional, ex: Opala 74)</label>
                <input 
                  value={current.vehicle || ''} 
                  onChange={(e) => setCurrent({...current, vehicle: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Depoimento *</label>
              <textarea 
                value={current.text || ''} 
                onChange={(e) => setCurrent({...current, text: e.target.value})}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nota (1 a 5)</label>
                <input 
                  type="number" min="1" max="5"
                  value={current.rating || 5} 
                  onChange={(e) => setCurrent({...current, rating: Number(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Foto do Cliente (URL Opcional)</label>
                <input 
                  value={current.photo_url || ''} 
                  onChange={(e) => setCurrent({...current, photo_url: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="is_active" 
                checked={current.is_active}
                onChange={(e) => setCurrent({...current, is_active: e.target.checked})}
                className="w-4 h-4 rounded-sm border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="is_active" className="text-sm text-zinc-300">Exibir na Home</label>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-sm transition-colors disabled:opacity-50"
              >
                <Save size={18} className="mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Feedback'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400">Carregando...</div>
          ) : feedbacks.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">Nenhum feedback cadastrado</h3>
              <p className="text-zinc-500">Adicione os primeiros depoimentos de clientes.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Nome</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Veículo</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Status</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 md:px-6 md:py-4 text-white font-medium">{fb.name}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-zinc-400">{fb.vehicle || '-'}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium ${fb.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
                        {fb.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => handleEdit(fb)} className="text-zinc-400 hover:text-white transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(fb.id)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
