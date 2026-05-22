import { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { QuickForm } from './components/QuickForm';
import { TextParser } from './components/TextParser';
import { ImageCapture } from './components/ImageCapture';
import { ExpenseList } from './components/ExpenseList';
import { MonthlyReport } from './components/MonthlyReport';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { MonthlyChecklist } from './components/MonthlyChecklist';
import { FixedExpenseManager } from './components/FixedExpenseManager';
import { PendingFixedTray } from './components/PendingFixedTray';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { loadSettings, saveSettings } from './utils/storage';
import type { User, Expense } from './types/expense';
import type { FixedExpenseTemplate } from './types/fixedExpense';
import { format } from 'date-fns';
import './index.css';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings';
type InputMode = 'form' | 'text' | 'image';

export default function App() {
  const [settings, setSettings]   = useState(loadSettings);
  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [inputMode, setInputMode] = useState<InputMode>('form');
  // When set, QuickForm opens pre-filled from a fixed expense template
  const [prefillTemplate, setPrefillTemplate] = useState<FixedExpenseTemplate | null>(null);

  const { expenses, addExpense, deleteExpense } = useExpenses();
  const {
    templates, checks,
    addTemplate, updateTemplate, deleteTemplate,
    ensureChecksForMonth,
    confirmCheck, skipCheck, resetCheck,
    tryAutoMatch,
    pendingCountCurrentMonth,
  } = useFixedExpenses(expenses);

  const currentUser = settings.currentUser;

  const handleUserSwitch = useCallback((user: User) => {
    const updated = { ...settings, currentUser: user };
    setSettings(updated);
    saveSettings(updated);
  }, [settings]);

  const handleSaveSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleClearAll = useCallback(() => {
    localStorage.removeItem('expense_tracker_data');
    window.location.reload();
  }, []);

  const handleSaveExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const saved = addExpense(data);
      // Try to auto-match with pending fixed expense checks
      const month = data.date.slice(0, 7);
      tryAutoMatch(saved, month);
      setPrefillTemplate(null);
      setActiveTab('list');
    },
    [addExpense, tryAutoMatch]
  );

  // Called from checklist when user taps "Registrar ahora" on a fixed item
  const handleRegisterFromTemplate = useCallback((tpl: FixedExpenseTemplate) => {
    setPrefillTemplate(tpl);
    setInputMode('form');
    setActiveTab('add');
  }, []);

  // Pending fixed expense templates for tray + autocomplete
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { pendingTemplates, pendingIds } = useMemo(() => {
    const pendingSet = new Set(
      checks
        .filter((c) => c.month === currentMonth && c.status === 'pendiente')
        .map((c) => c.templateId)
    );
    return {
      pendingTemplates: templates.filter((t) => t.active && pendingSet.has(t.id)),
      pendingIds: pendingSet,
    };
  }, [templates, checks, currentMonth]);

  const modeButtons: { id: InputMode; label: string; emoji: string }[] = [
    { id: 'form',  label: 'Formulario', emoji: '📋' },
    { id: 'text',  label: 'Texto',      emoji: '✍️' },
    { id: 'image', label: 'Foto',       emoji: '📷' },
  ];

  // Prefill derived from fixed template
  const templatePrefill = prefillTemplate
    ? ({
        concept:       prefillTemplate.concept,
        amount:        prefillTemplate.expectedAmount,
        category:      prefillTemplate.category,
        paidBy:        prefillTemplate.paidBy,
        paymentMethod: prefillTemplate.paymentMethod,
        bank:          prefillTemplate.bank,
        cardLast4:     prefillTemplate.cardLast4,
        expenseType:   'fijo' as const,
        frequency:     prefillTemplate.frequency,
        date:          format(new Date(), 'yyyy-MM-dd'),
        transactionType: 'gasto' as const,
      })
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        onUserSwitch={handleUserSwitch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName1={settings.userName1}
        userName2={settings.userName2}
        pendingFixed={pendingCountCurrentMonth}
      />

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
        {/* ── Registrar ── */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {prefillTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  📋 Registrando: <strong>{prefillTemplate.concept}</strong>
                </p>
                <button onClick={() => setPrefillTemplate(null)} className="text-xs text-blue-400 hover:text-blue-600">✕ Limpiar</button>
              </div>
            )}
              {pendingTemplates.length > 0 && (
              <PendingFixedTray
                templates={templates}
                checks={checks}
                onSelect={handleRegisterFromTemplate}
                onViewAll={() => setActiveTab('checklist')}
              />
            )}
            <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
              {modeButtons.map((btn) => (
                <button key={btn.id} onClick={() => { setInputMode(btn.id); setPrefillTemplate(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    inputMode === btn.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <span>{btn.emoji}</span>{btn.label}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              {inputMode === 'form' && (
                <QuickForm currentUser={currentUser} onSave={handleSaveExpense}
                  prefill={templatePrefill}
                  userName1={settings.userName1} userName2={settings.userName2}
                  fixedSuggestions={templates}
                  pendingIds={pendingIds} />
              )}
              {inputMode === 'text' && (
                <TextParser currentUser={currentUser} onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey} userName1={settings.userName1} userName2={settings.userName2} />
              )}
              {inputMode === 'image' && (
                <ImageCapture currentUser={currentUser} onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey} userName1={settings.userName1} userName2={settings.userName2} />
              )}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {activeTab === 'list' && (
          <ExpenseList expenses={expenses} onDelete={deleteExpense}
            userName1={settings.userName1} userName2={settings.userName2} />
        )}

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <Dashboard expenses={expenses}
            userName1={settings.userName1} userName2={settings.userName2} />
        )}

        {/* ── Checklist fijos ── */}
        {activeTab === 'checklist' && (
          <MonthlyChecklist
            templates={templates}
            checks={checks}
            expenses={expenses}
            onEnsureChecks={ensureChecksForMonth}
            onConfirm={confirmCheck}
            onSkip={skipCheck}
            onReset={resetCheck}
            onRegisterNow={handleRegisterFromTemplate}
            userName1={settings.userName1}
            userName2={settings.userName2}
          />
        )}

        {/* ── Reporte ── */}
        {activeTab === 'report' && (
          <MonthlyReport expenses={expenses}
            userName1={settings.userName1} userName2={settings.userName2} />
        )}

        {/* ── Config ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <FixedExpenseManager
              templates={templates}
              onAdd={addTemplate}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
              userName1={settings.userName1}
              userName2={settings.userName2}
            />
            <div className="border-t border-gray-200 pt-5">
              <SettingsPanel settings={settings} onSave={handleSaveSettings}
                expenseCount={expenses.length} onClearAll={handleClearAll} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
