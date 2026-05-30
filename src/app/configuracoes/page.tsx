export default function Configuracoes() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Preferências do painel</p>
      </div>
      <div className="max-w-lg bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
          <input defaultValue="Douglas Vasconcellos" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
          <input defaultValue="douglasvasconcellosatleta@gmail.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" readOnly />
        </div>
        <div className="pt-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Integrações</div>
          <div className="space-y-2">
            {[
              { nome: 'Supabase', status: 'Conectado', cor: 'text-green-600' },
              { nome: 'Vercel', status: 'Conectado', cor: 'text-green-600' },
              { nome: 'GitHub', status: 'Conectado', cor: 'text-green-600' },
            ].map(i => (
              <div key={i.nome} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">{i.nome}</span>
                <span className={`text-xs font-medium ${i.cor}`}>✅ {i.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
