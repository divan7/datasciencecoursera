import { useMemo } from 'react';
import { ArrowRight, Scale } from 'lucide-react';
import type { Expense } from '../types/expense';
import type { SpaceMember } from '../types/space';
import { MEMBER_COLORS } from '../types/space';

interface Props {
  expenses: Expense[];
  members: SpaceMember[];
}

interface MemberBalance {
  name: string;
  colorIndex: number;
  totalPaid: number;
  totalOwed: number;
  net: number; // positive = creditor (le deben), negative = debtor (debe)
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

// Greedy minimum-transfer settlement
function computeSettlement(balances: MemberBalance[]): Transfer[] {
  const transfers: Transfer[] = [];
  const creds = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ name: b.name, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);
  const debs = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ name: b.name, amount: b.net }))
    .sort((a, b) => a.amount - b.amount);

  let ci = 0;
  let di = 0;
  while (ci < creds.length && di < debs.length) {
    const amount = Math.min(creds[ci].amount, Math.abs(debs[di].amount));
    if (amount > 0.005) {
      transfers.push({ from: debs[di].name, to: creds[ci].name, amount: parseFloat(amount.toFixed(2)) });
    }
    creds[ci].amount -= amount;
    debs[di].amount += amount;
    if (creds[ci].amount < 0.005) ci++;
    if (Math.abs(debs[di].amount) < 0.005) di++;
  }
  return transfers;
}

export function BalanceAnalysis({ expenses, members }: Props) {
  const { balances, transfers, sharedCount } = useMemo(() => {
    // Only expenses where someone other than paidBy has an explicit obligation
    const shared = expenses.filter(
      (e) => e.obligations && e.obligations.length > 0 && e.obligations.some((o) => o.name !== e.paidBy && o.amount > 0.005)
    );

    const paid: Record<string, number> = {};
    const owed: Record<string, number> = {};
    members.forEach((m) => { paid[m.name] = 0; owed[m.name] = 0; });

    for (const expense of shared) {
      // paidBy covered the full bill — use sum(obligations) as authoritative total
      const fullBill = expense.obligations!.reduce((s, o) => s + o.amount, 0);
      paid[expense.paidBy] = (paid[expense.paidBy] ?? 0) + fullBill;
      for (const ob of expense.obligations!) {
        owed[ob.name] = (owed[ob.name] ?? 0) + ob.amount;
      }
    }

    const balances: MemberBalance[] = members.map((m) => ({
      name: m.name,
      colorIndex: m.colorIndex,
      totalPaid: paid[m.name] ?? 0,
      totalOwed: owed[m.name] ?? 0,
      net: (paid[m.name] ?? 0) - (owed[m.name] ?? 0),
    }));

    return { balances, transfers: computeSettlement(balances), sharedCount: shared.length };
  }, [expenses, members]);

  if (members.length < 2) return null;

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={16} className="text-teal-700" />
        <h3 className="text-sm font-bold text-gray-700">Análisis de saldos</h3>
      </div>

      {sharedCount === 0 ? (
        <div className="bg-gray-50 rounded-2xl px-4 py-5 text-center space-y-1">
          <p className="text-sm text-gray-500">Sin gastos divididos en este período.</p>
          <p className="text-xs text-gray-400">
            Usa "Dividir gasto" al registrar para ver reembolsos pendientes.
          </p>
        </div>
      ) : (
        <>
          {/* Per-member balance cards */}
          <div className="space-y-2">
            {balances.map((b) => {
              const isCreditor = b.net > 0.005;
              const isDebtor = b.net < -0.005;
              return (
                <div key={b.name} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: MEMBER_COLORS[b.colorIndex] }}
                      >
                        {b.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800">{b.name}</span>
                    </div>
                    <span className={`text-base font-extrabold ${isCreditor ? 'text-green-600' : isDebtor ? 'text-red-500' : 'text-gray-400'}`}>
                      {isCreditor ? '+' : ''}{fmt(b.net)}
                    </span>
                  </div>

                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>
                      💳 Pagó{' '}
                      <span className="font-semibold text-gray-700">${fmt(b.totalPaid)}</span>
                    </span>
                    <span>
                      📋 Corresponde{' '}
                      <span className="font-semibold text-gray-700">${fmt(b.totalOwed)}</span>
                    </span>
                  </div>

                  {(isCreditor || isDebtor) && (
                    <p className={`text-xs mt-1.5 font-semibold ${isCreditor ? 'text-green-600' : 'text-red-500'}`}>
                      {isCreditor
                        ? `Le deben $${fmt(b.net)}`
                        : `Debe $${fmt(Math.abs(b.net))}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Settlement */}
          {transfers.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-amber-800 mb-1">Para quedar a mano:</p>
              {transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[members.find((m) => m.name === t.from)?.colorIndex ?? 0] }}
                  >
                    {t.from.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-700">{t.from}</span>
                  <ArrowRight size={14} className="text-amber-500 flex-shrink-0" />
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[members.find((m) => m.name === t.to)?.colorIndex ?? 1] }}
                  >
                    {t.to.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-700">{t.to}</span>
                  <span className="ml-auto font-extrabold text-amber-900 text-base">${fmt(t.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-green-700">✓ ¡Todos están a mano!</p>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Basado en {sharedCount} gasto{sharedCount !== 1 ? 's' : ''} con división asignada
          </p>
        </>
      )}
    </div>
  );
}
