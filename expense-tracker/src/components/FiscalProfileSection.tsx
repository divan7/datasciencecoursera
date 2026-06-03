import { useState } from 'react';
import { Save, Receipt } from 'lucide-react';
import type { FiscalProfile, RegimenFiscal, CfdiUse } from '../types/fiscal';
import { REGIMENES_FISCALES, CFDI_USES, DEDUCTION_RULES_BY_REGIME, getActiveRegimenes } from '../types/fiscal';
import { saveFiscalProfile } from '../utils/fiscalStorage';

interface Props {
  userId: string;
  initialProfile: FiscalProfile;
  onSave?: (profile: FiscalProfile) => void;
}

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

export function FiscalProfileSection({ userId, initialProfile, onSave }: Props) {
  const [form, setForm] = useState<FiscalProfile>(initialProfile);
  const [saved, setSaved] = useState(false);
  const [rfcError, setRfcError] = useState('');

  const set = <K extends keyof FiscalProfile>(key: K, value: FiscalProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (form.rfc && !RFC_RE.test(form.rfc.trim().toUpperCase())) {
      setRfcError('RFC inválido — debe tener 12 o 13 caracteres con el formato correcto');
      return;
    }
    setRfcError('');
    // Keep regimenFiscal in sync with regimenes[0] for backward compat
    const regimenes = form.regimenes ?? (form.regimenFiscal ? [form.regimenFiscal] : []);
    const saved = {
      ...form,
      rfc: form.rfc?.trim().toUpperCase(),
      regimenes,
      regimenFiscal: regimenes[0],
    };
    saveFiscalProfile(saved, userId);
    onSave?.(saved);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleRegime = (code: RegimenFiscal) => {
    const current = getActiveRegimenes(form);
    const next = current.includes(code) ? current.filter((r) => r !== code) : [...current, code];
    setForm((f) => ({ ...f, regimenes: next, regimenFiscal: next[0] }));
  };

  const activeRegimenes = getActiveRegimenes(form);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt size={17} className="text-teal-600" />
        <h3 className="text-sm font-bold text-gray-800">Perfil fiscal (SAT)</h3>
        <span className="text-xs text-gray-400">· opcional</span>
      </div>
      <p className="text-xs text-gray-500">
        Con estos datos el app puede determinar qué gastos son deducibles según tu régimen y cómo solicitar la factura correspondiente.
      </p>

      {/* RFC */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">RFC</label>
        <input
          type="text"
          value={form.rfc ?? ''}
          onChange={(e) => { set('rfc', e.target.value); setRfcError(''); }}
          placeholder="XAXX010101000"
          maxLength={13}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 uppercase"
        />
        {rfcError && <p className="text-xs text-red-500 mt-1">{rfcError}</p>}
      </div>

      {/* Razón social */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre / Razón social (como en RFC)</label>
        <input
          type="text"
          value={form.razonSocial ?? ''}
          onChange={(e) => set('razonSocial', e.target.value)}
          placeholder="Nombre completo o razón social"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      {/* CURP */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">CURP <span className="font-normal text-gray-400">(opcional)</span></label>
        <input
          type="text"
          value={form.curp ?? ''}
          onChange={(e) => set('curp', e.target.value.toUpperCase())}
          placeholder="XEXX010101HNEXXXA4"
          maxLength={18}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 uppercase"
        />
      </div>

      {/* Régimen(es) fiscal(es) */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Régimen(es) fiscal(es) SAT
          <span className="font-normal text-gray-400 ml-1">(puedes seleccionar más de uno)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(REGIMENES_FISCALES) as [RegimenFiscal, string][]).map(([code, name]) => {
            const active = activeRegimenes.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleRegime(code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all text-left ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'border-gray-200 text-gray-500 bg-white hover:border-teal-300'
                }`}
              >
                <span className="font-bold">{code}</span> · {name}
              </button>
            );
          })}
        </div>
        {activeRegimenes.length > 0 && (
          <p className="text-xs text-teal-600 mt-1.5 font-medium">
            ✓ {activeRegimenes.length} régimen{activeRegimenes.length > 1 ? 'es' : ''} activo{activeRegimenes.length > 1 ? 's' : ''}: {activeRegimenes.join(', ')}
          </p>
        )}
      </div>

      {/* Actividad económica */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Actividad económica principal <span className="font-normal text-gray-400">(opcional)</span></label>
        <input
          type="text"
          value={form.actividadEconomica ?? ''}
          onChange={(e) => set('actividadEconomica', e.target.value)}
          placeholder="Ej. Desarrollo de software, Arrendamiento de inmuebles..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      {/* CFDI use default */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Uso CFDI preferido <span className="font-normal text-gray-400">(opcional)</span></label>
        <select
          value={form.cfdiUseDefault ?? ''}
          onChange={(e) => set('cfdiUseDefault', (e.target.value || undefined) as CfdiUse | undefined)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
        >
          <option value="">— Sin preferencia —</option>
          {(Object.entries(CFDI_USES) as [CfdiUse, string][]).map(([code, name]) => (
            <option key={code} value={code}>{code} · {name}</option>
          ))}
        </select>
      </div>

      {/* Deductible categories preview */}
      {activeRegimenes.length > 0 && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-teal-800">Gastos potencialmente deducibles en tu{activeRegimenes.length > 1 ? 's' : ''} régimen{activeRegimenes.length > 1 ? 'es' : ''}:</p>
          {activeRegimenes.map((regime) => {
            const regimeRules = DEDUCTION_RULES_BY_REGIME[regime] ?? [];
            if (regimeRules.length === 0) return null;
            return (
              <div key={regime}>
                {activeRegimenes.length > 1 && (
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mb-1">{regime} — {REGIMENES_FISCALES[regime]}</p>
                )}
                {regimeRules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1">
                    <span className="text-teal-500 text-xs mt-0.5 flex-shrink-0">✓</span>
                    <div>
                      <span className="text-xs text-teal-800 font-medium">{r.cfdiUse}</span>
                      <span className="text-xs text-teal-700"> — {r.description}</span>
                      {r.limit && <p className="text-[10px] text-teal-500 mt-0.5">{r.limit}</p>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 ${
          saved ? 'bg-green-500' : 'bg-teal-700 hover:bg-teal-800'
        }`}
      >
        <Save size={15} />
        {saved ? '✅ Perfil guardado' : 'Guardar perfil fiscal'}
      </button>
    </div>
  );
}
