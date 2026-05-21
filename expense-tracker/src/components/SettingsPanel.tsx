import { useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import type { AppSettings } from '../utils/storage';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  expenseCount: number;
  onClearAll: () => void;
}

export function SettingsPanel({ settings, onSave, expenseCount, onClearAll }: SettingsPanelProps) {
  const [form, setForm] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
      {/* User names */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-3">👥 Nombres de usuarios</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario 1</label>
            <input
              type="text"
              value={form.userName1}
              onChange={(e) => set('userName1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ivan"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario 2</label>
            <input
              type="text"
              value={form.userName2}
              onChange={(e) => set('userName2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Esposa"
            />
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-1">🤖 API Key de Anthropic</h3>
        <p className="text-xs text-gray-400 mb-3">
          Necesaria para el análisis de texto con IA y lectura de tickets. Obtén tu clave en{' '}
          <span className="text-blue-500">console.anthropic.com</span>
        </p>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.anthropicApiKey ?? ''}
            onChange={(e) => set('anthropicApiKey', e.target.value)}
            placeholder="sk-ant-api..."
            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
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
          <p className="text-xs text-green-600 mt-1">✅ API Key configurada</p>
        )}
        {!form.anthropicApiKey && (
          <p className="text-xs text-orange-500 mt-1">
            ⚠️ Sin API Key — el formulario manual funcionará, pero no la IA
          </p>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
          saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        <Save size={18} />
        {saved ? '✅ ¡Guardado!' : 'Guardar ajustes'}
      </button>

      {/* Stats */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-center">
        {expenseCount} gastos almacenados localmente en este dispositivo
      </div>

      {/* Danger zone */}
      <div className="border border-red-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-red-600 mb-2">⚠️ Zona de peligro</h3>
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
          {confirmClear ? '⚠️ Confirmar: Borrar todo' : 'Borrar todos los gastos'}
        </button>
      </div>
    </div>
  );
}
