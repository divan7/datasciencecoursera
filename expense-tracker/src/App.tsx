import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { SpaceOnboarding } from './components/SpaceOnboarding';
import { UserSwitcher } from './components/UserSwitcher';
import { SpaceSettings } from './components/SpaceSettings';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { loadSettings, saveSettings, loadLegacySettings } from './utils/storage';
import { loadSpaces, saveSpaces, saveSession, loadSession, migrateFromLegacy } from './utils/spaceStorage';
import { checkAndFireNotifications } from './services/notificationService';
import type { Expense } from './types/expense';
import type { FixedExpenseTemplate } from './types/fixedExpense';
import type { AppSpace, SessionState } from './types/space';
import { MEMBER_COLORS } from './types/space';
import { format } from 'date-fns';
import './index.css';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings';
type InputMode = 'form' | 'text' | 'image';

export default function App() {
  // ── Space & session state ─────────────────────────────────────
  const [spaces, setSpaces] = useState<AppSpace[]>(() => {
    const existing = loadSpaces();
    if (existing.length > 0) return existing;
    // Attempt legacy migration on first launch
    const legacy = loadLegacySettings();
    const migrated = migrateFromLegacy(legacy);
    if (migrated) return [migrated];
    return [];
  });

  const [session, setSession] = useState<SessionState | null>(() => {
    const s = loadSession();
    return s;
  });

  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  // Derived: current space and member
  const currentSpace = useMemo(
    () => spaces.find((s) => s.id === session?.spaceId) ?? null,
    [spaces, session]
  );
  const currentMember = useMemo(
    () => currentSpace?.members.find((m) => m.id === session?.memberId) ?? null,
    [currentSpace, session]
  );

  // ── Settings (API key etc.) ───────────────────────────────────
  const spaceId = session?.spaceId ?? '';
  const [settings, setSettings] = useState(() =>
    spaceId ? loadSettings(spaceId) : { currency: 'MXN' }
  );

  useEffect(() => {
    if (spaceId) {
      setSettings(loadSettings(spaceId));
    }
  }, [spaceId]);

  // ── Tab / UI state ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [inputMode, setInputMode] = useState<InputMode>('form');
  const [prefillTemplate, setPrefillTemplate] = useState<FixedExpenseTemplate | null>(null);

  // ── Expense hooks ─────────────────────────────────────────────
  const { expenses, addExpense, deleteExpense } = useExpenses(spaceId);
  const {
    templates, checks,
    addTemplate, updateTemplate, deleteTemplate,
    ensureChecksForMonth,
    confirmCheck, skipCheck, resetCheck,
    tryAutoMatch,
    pendingCountCurrentMonth,
  } = useFixedExpenses(expenses, spaceId);

  // ── Notification check on mount and focus ────────────────────
  useEffect(() => {
    checkAndFireNotifications(templates);
    const onVisible = () => { if (!document.hidden) checkAndFireNotifications(templates); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [templates]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback((space: AppSpace, newSession: SessionState) => {
    setSpaces([space]);
    setSession(newSession);
  }, []);

  const handleUpdateSpaces = useCallback((updated: AppSpace[]) => {
    setSpaces(updated);
    saveSpaces(updated);
  }, []);

  const handleSwitchSpace = useCallback((newSpaceId: string, memberId: string) => {
    const newSession: SessionState = { spaceId: newSpaceId, memberId };
    setSession(newSession);
    saveSession(newSession);
  }, []);

  const handleMemberSwitch = useCallback((memberId: string) => {
    if (!session) return;
    const newSession: SessionState = { ...session, memberId };
    setSession(newSession);
    saveSession(newSession);
    setShowUserSwitcher(false);
  }, [session]);

  const handleSaveSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    if (spaceId) saveSettings(newSettings, spaceId);
  }, [spaceId]);

  const handleClearAll = useCallback(() => {
    localStorage.removeItem(`expense_tracker_data_${spaceId}`);
    window.location.reload();
  }, [spaceId]);

  const handleSaveExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const saved = addExpense(data);
      const month = data.date.slice(0, 7);
      tryAutoMatch(saved, month);
      setPrefillTemplate(null);
      setActiveTab('list');
    },
    [addExpense, tryAutoMatch]
  );

  const handleRegisterFromTemplate = useCallback((tpl: FixedExpenseTemplate) => {
    setPrefillTemplate(tpl);
    setInputMode('form');
    setActiveTab('add');
  }, []);

  // ── Pending fixed expenses for tray ───────────────────────────
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

  // ── Prefill from fixed template ───────────────────────────────
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

  const modeButtons: { id: InputMode; label: string; emoji: string }[] = [
    { id: 'form',  label: 'Formulario', emoji: '📋' },
    { id: 'text',  label: 'Texto',      emoji: '✍️' },
    { id: 'image', label: 'Foto',       emoji: '📷' },
  ];

  // ── Onboarding gate ───────────────────────────────────────────
  if (spaces.length === 0 || !session || !currentSpace || !currentMember) {
    return <SpaceOnboarding onComplete={handleOnboardingComplete} />;
  }

  // currentUser is stored as the member's name in paidBy field
  const currentUser = currentMember.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memberName={currentMember.name}
        memberColor={MEMBER_COLORS[currentMember.colorIndex] ?? '#3b82f6'}
        spaceName={currentSpace.name}
        onAvatarTap={() => setShowUserSwitcher(true)}
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
                  members={currentSpace.members}
                  fixedSuggestions={templates}
                  pendingIds={pendingIds} />
              )}
              {inputMode === 'text' && (
                <TextParser currentUser={currentUser} onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey} members={currentSpace.members} />
              )}
              {inputMode === 'image' && (
                <ImageCapture currentUser={currentUser} onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey} members={currentSpace.members} />
              )}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {activeTab === 'list' && (
          <ExpenseList expenses={expenses} onDelete={deleteExpense}
            members={currentSpace.members} />
        )}

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <Dashboard expenses={expenses}
            members={currentSpace.members} />
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
            members={currentSpace.members}
          />
        )}

        {/* ── Reporte ── */}
        {activeTab === 'report' && (
          <MonthlyReport expenses={expenses}
            members={currentSpace.members} />
        )}

        {/* ── Config ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <FixedExpenseManager
              templates={templates}
              onAdd={addTemplate}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
              members={currentSpace.members}
            />
            <div className="border-t border-gray-200 pt-5">
              <SpaceSettings
                spaces={spaces}
                session={session}
                onUpdateSpaces={handleUpdateSpaces}
                onSwitchSpace={handleSwitchSpace}
              />
            </div>
            <div className="border-t border-gray-200 pt-5">
              <SettingsPanel settings={settings} onSave={handleSaveSettings}
                expenseCount={expenses.length} onClearAll={handleClearAll} />
            </div>
          </div>
        )}
      </main>

      {/* ── User switcher modal ── */}
      {showUserSwitcher && (
        <UserSwitcher
          space={currentSpace}
          currentMemberId={session.memberId}
          onSwitch={handleMemberSwitch}
          onClose={() => setShowUserSwitcher(false)}
        />
      )}
    </div>
  );
}
