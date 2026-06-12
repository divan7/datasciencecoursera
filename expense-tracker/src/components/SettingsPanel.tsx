import { useState } from 'react';
import { Eye, EyeOff, Save, Cloud, CloudOff, Loader } from 'lucide-react';
import type { AppSettings } from '../utils/storage';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
  expenseCount: number;
  onClearAll: () => void;
  isSupabaseConnected?: boolean;
  isOwner?: boolean;
}

export function SettingsPanel({ settings, onSave, expenseCount, onClearAll, isSupabaseConnected, isOwner }: SettingsPanelProps) {
  const [form, setForm] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSyncStatus('saving');
    setSyncError('');
    try {
      await onSave(form);
      setSyncStatus('ok');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Error al guardar en la nube');
      setTimeout(() => setSyncStatus('idle'), 6000);
    }
  };

  const handleClear = () => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* API Key — visible only to the space owner */}
      {isOwner ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-1">🤖 API Key de Anthropic</h3>
          <p className="text-xs text-gray-400 mb-3">
            Necesaria para el análisis de texto con IA y lectura de tickets. Obtén tu clave en{' '}
            <span className="text-teal-600">console.anthropic.com</span>
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.anthropicApiKey ?? ''}
              onChange={(e) => set('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-api..."
              className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.anthropicApiKey && (
            <p className="text-xs text-green-600 mt-1">API Key configurada — compartida con todos los miembros</p>
          )}
          {!form.anthropicApiKey && (
            <p className="text-xs text-orange-500 mt-1">
              Sin API Key — el formulario manual funcionará, pero no la IA
            </p>
          )}
          {isSupabaseConnected && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Cloud size={12} /> Se sincroniza con la lista y todos sus miembros la usarán
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <div>
              <p className="text-sm font-bold text-gray-700">Análisis con IA</p>
              {settings.anthropicApiKey
                ? <p className="text-xs text-green-600 mt-0.5">Activo — configurado por el administrador</p>
                : <p className="text-xs text-gray-400 mt-0.5">No configurado aún</p>
              }
            </div>
          </div>
        </div>
      )}

      {/* Currency */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-3">💱 Moneda</h3>
        <select
          value={form.currency}
          onChange={(e) => set('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          {['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={syncStatus === 'saving'}
        className={`w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${
          syncStatus === 'ok' ? 'bg-green-500' :
          syncStatus === 'error' ? 'bg-red-500' :
          'bg-teal-600 hover:bg-teal-700 active:scale-95'
        }`}
      >
        {syncStatus === 'saving' ? <Loader size={18} className="animate-spin" /> :
         syncStatus === 'ok' ? <Cloud size={18} /> :
         syncStatus === 'error' ? <CloudOff size={18} /> :
         <Save size={18} />}
        {syncStatus === 'saving' ? 'Guardando...' :
         syncStatus === 'ok' ? 'Guardado y sincronizado' :
         syncStatus === 'error' ? 'Error al sincronizar' :
         'Guardar ajustes'}
      </button>
      {syncStatus === 'error' && syncError && (
        <p className="text-xs text-red-500 text-center -mt-2">{syncError}</p>
      )}
      {syncStatus === 'error' && (
        <p className="text-xs text-orange-500 text-center -mt-1">
          Verifica que ejecutaste la migración SQL en Supabase (supabase/add_api_key_to_profile.sql)
        </p>
      )}

      {/* Stats */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-center">
        {expenseCount} gastos almacenados localmente en este dispositivo
      </div>

      {/* Danger zone */}
      <div className="border border-red-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-red-600 mb-2">Zona de peligro</h3>
        <p className="text-xs text-gray-500 mb-3">
          Eliminar todos los gastos es irreversible.
        </p>
        <button
          onClick={handleClear}
          disabled={expenseCount === 0}
          className={`w-full py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40 ${
            confirmClear
              ? 'bg-red-500 text-white border-red-500'
              : 'border-red-200 text-red-500 hover:bg-red-50'
          }`}
        >
          {confirmClear ? 'Confirmar: Borrar todo' : 'Borrar todos los gastos'}
        </button>
      </div>
    </div>
  );
}
