import { useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import type { FixedExpenseTemplate, MonthlyCheck } from '../types/fixedExpense';

interface Props {
  templates: FixedExpenseTemplate[];
  checks: MonthlyCheck[];
  onSelect: (template: FixedExpenseTemplate) => void;
  onViewAll: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion:'🛒',transporte:'🚗',hogar:'🏠',salud:'💊',educacion:'📚',
  entretenimiento:'🎬',ropa:'👗',servicios:'💡',seguros:'🛡️',suscripciones:'📱',
  viajes:'✈️',restaurantes:'🍽️',mascotas:'🐾',belleza:'💅',inversiones:'📈',
  deudas:'💳',otro:'📦',
};

export function PendingFixedTray({ templates, checks, onSelect, onViewAll }: Props) {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const pending = useMemo(() => {
    const pendingIds = new Set(
      checks
        .filter((c) => c.month === currentMonth && c.status === 'pendiente')
        .map((c) => c.templateId)
    );
    return templates.filter((t) => t.active && pendingIds.has(t.id));
  }, [templates, checks, currentMonth]);

  if (pending.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📋</span>
          <p className="text-xs font-bold text-amber-800">
            Fijos pendientes este mes
          </p>
          <span className="bg-amber-200 text-amber-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {pending.length}
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-xs text-amber-600 font-medium hover:text-amber-800 transition-colors"
        >
          Ver todos <ChevronRight size={12} />
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 px-3 scrollbar-hide">
        {pending.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl)}
            className="flex-shrink-0 bg-white border border-amber-200 rounded-xl p-2.5 text-left hover:border-teal-500 hover:shadow-sm active:scale-95 transition-all min-w-[120px] max-w-[140px]"
          >
            <div className="text-xl mb-1">{CATEGORY_ICONS[tpl.category] ?? '📦'}</div>
            <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
              {tpl.concept}
            </p>
            <p className="text-sm font-bold text-teal-800">
              ${tpl.expectedAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            </p>
            {tpl.dayOfMonth && (
              <p className="text-xs text-amber-600 mt-0.5">día {tpl.dayOfMonth}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
