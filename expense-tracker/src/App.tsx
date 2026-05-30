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
import { FixedTemplateFromExpenseModal } from './components/FixedTemplateFromExpenseModal';
import { ReminderDialog } from './components/ReminderDialog';
import { PendingFixedTray } from './components/PendingFixedTray';
import { SpaceOnboarding } from './components/SpaceOnboarding';
import { UserSwitcher } from './components/UserSwitcher';
import { SpaceSettings } from './components/SpaceSettings';
import { SpacePicker } from './components/SpacePicker';
import { AuthGate } from './components/AuthGate';
import { AdminPanel } from './components/AdminPanel';
import { WelcomeChoice } from './components/WelcomeChoice';
import { JoinSpace } from './components/JoinSpace';
import { ChangePassword } from './components/ChangePassword';
import { useAuth } from './hooks/useAuth';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { loadSettings, saveSettings, loadLegacySettings, saveExpenseToAnySpace } from './utils/storage';
import { loadSpaces, saveSpaces, saveSession, loadSession, migrateFromLegacy, loadSpacesFromSupabase, syncSpaceToSupabase } from './utils/spaceStorage';
import { checkAndFireNotifications } from './services/notificationService';
import { isSupabaseConfigured } from './lib/supabase';
import { profilesDb } from './lib/db';
import type { Expense } from './types/expense';
import type { FixedExpenseTemplate } from './types/fixedExpense';
import type { ExpenseWithSpace } from './components/MultiExpenseReview';
import type { AppSpace, SessionState } from './types/space';
import { MEMBER_COLORS } from './types/space';
import { format } from 'date-fns';
import './index.css';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings' | 'admin';
type InputMode = 'form' | 'text' | 'image';

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const { user, profile, loading: authLoading, isAdmin, signInWithMagicLink, signInWithPassword, signUpWithPassword, setPassword, signOut } = useAuth();

  // ── Space & session state ─────────────────────────────────────
  const [spaces, setSpaces] = useState<AppSpace[]>(() => {
    const existing = loadSpaces();
    if (existing.length > 0) return existing;
    const legacy = loadLegacySettings();
    const migrated = migrateFromLegacy(legacy);
    if (migrated) return [migrated];
    return [];
  });

  const [session, setSession] = useState<SessionState | null>(() => loadSession());
  const [spacesLoaded, setSpacesLoaded] = useState(false);

  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  // 'choosing' | 'joining' | 'creating' | 'joined' (post-join confirmation)
  const [welcomeMode, setWelcomeMode] = useState<'choosing' | 'joining' | 'creating' | 'joined'>('choosing');
  const [joinedSpaceName, setJoinedSpaceName] = useState('');

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
  const [suggestFixedTemplate, setSuggestFixedTemplate] = useState<Expense | null>(null);
  const [reminderTemplate, setReminderTemplate] = useState<FixedExpenseTemplate | null>(null);

  // ── Expense hooks ─────────────────────────────────────────────
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(spaceId);
  const {
    templates, checks,
    addTemplate, updateTemplate, deleteTemplate,
    ensureChecksForMonth,
    confirmCheck, skipCheck, resetCheck,
    tryAutoMatch,
    pendingCountCurrentMonth,
  } = useFixedExpenses(expenses, spaceId);

  // ── Load spaces + settings from Supabase when user logs in ─────
  useEffect(() => {
    if (!user || !isSupabaseConfigured) { setSpacesLoaded(true); return; }
    loadSpacesFromSupabase().then(async (remote) => {
      let activeSpaceId = spaceId;
      if (remote.length > 0) {
        setSpaces(remote);
        const savedSession = loadSession();
        const stillValid = savedSession && remote.some((s) => s.id === savedSession.spaceId);
        if (!stillValid) {
          const firstSpace = remote[0];
          const firstMember = firstSpace.members[0];
          const newSession: SessionState = { spaceId: firstSpace.id, memberId: firstMember.id };
          setSession(newSession);
          saveSession(newSession);
          activeSpaceId = firstSpace.id;
        } else {
          activeSpaceId = savedSession!.spaceId;
        }
        // Load API key from user profile (stored per-user, not per-space)
        const remoteApiKey = await profilesDb.getApiKey().catch(() => null);
        if (remoteApiKey) {
          const local = loadSettings(activeSpaceId);
          if (local.anthropicApiKey !== remoteApiKey) {
            const merged = { ...local, anthropicApiKey: remoteApiKey };
            saveSettings(merged, activeSpaceId);
            setSettings(merged);
          }
        }
      }
      setSpacesLoaded(true);
    }).catch(() => setSpacesLoaded(true));
  }, [user]);

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
    saveSpaces([space]);
    if (isSupabaseConfigured && user) {
      // Awaiting matters: if the space + owner membership don't reach Supabase,
      // every expense/fixed write will silently fail RLS and live only locally.
      syncSpaceToSupabase(space, user.id).catch((err) => {
        console.error('Error al sincronizar el espacio con la nube:', err);
        alert(
          'No se pudo guardar tu lista en la nube. Tus datos podrían no conservarse al cerrar sesión. ' +
          'Verifica tu conexión y vuelve a intentarlo, o contacta soporte si persiste.'
        );
      });
    }
  }, [user]);

  const handleUpdateSpaces = useCallback((updated: AppSpace[]) => {
    setSpaces(updated);
    saveSpaces(updated);
    if (isSupabaseConfigured) {
      updated.forEach((s) => syncSpaceToSupabase(s).catch(console.error));
    }
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

  const handleSaveSettings = useCallback(async (newSettings: typeof settings) => {
    setSettings(newSettings);
    if (spaceId) {
      saveSettings(newSettings, spaceId);
      if (isSupabaseConfigured) {
        await profilesDb.setApiKey(newSettings.anthropicApiKey ?? null);
      }
    }
  }, [spaceId]);

  const handleClearAll = useCallback(() => {
    localStorage.removeItem(`expense_tracker_data_${spaceId}`);
    window.location.reload();
  }, [spaceId]);

  const handleSaveExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const saved = addExpense(data);
      const month = data.date.slice(0, 7);
      const matched = tryAutoMatch(saved, month);
      // Offer to create a fixed template when a fijo expense has no matching template
      if (!matched && data.expenseType === 'fijo') {
        setSuggestFixedTemplate(saved);
      }
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

  const handleJoined = useCallback(async (spaceId: string, memberId: string) => {
    const updated = await loadSpacesFromSupabase();
    if (updated.length > 0) {
      setSpaces(updated);
      const newSession: SessionState = { spaceId, memberId };
      setSession(newSession);
      saveSession(newSession);
      const joined = updated.find((s) => s.id === spaceId);
      setJoinedSpaceName(joined?.name ?? '');
    }
    setWelcomeMode('joined');
  }, []);

  const handleSaveMultipleExpenses = useCallback((items: ExpenseWithSpace[]) => {
    let firstUnmatchedFijo: Expense | null = null;
    items.forEach(({ expense, spaceId: targetSpaceId }) => {
      if (targetSpaceId === spaceId) {
        const saved = addExpense(expense);
        const month = expense.date.slice(0, 7);
        const matched = tryAutoMatch(saved, month);
        if (!matched && expense.expenseType === 'fijo' && !firstUnmatchedFijo) {
          firstUnmatchedFijo = saved;
        }
      } else {
        saveExpenseToAnySpace(expense, targetSpaceId);
      }
    });
    if (firstUnmatchedFijo) setSuggestFixedTemplate(firstUnmatchedFijo);
    setActiveTab('list');
  }, [addExpense, tryAutoMatch, spaceId]);

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

  // ── Auth gate (when Supabase is configured) ───────────────────
  if (isSupabaseConfigured) {
    if (authLoading || !spacesLoaded) {
      return (
        <div className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0c6878 0%, #2b8fa0 100%)' }}>
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"/>
        </div>
      );
    }
    if (!user) {
      return (
        <AuthGate
          onSignIn={signInWithMagicLink}
          onSignInPassword={signInWithPassword}
          onSignUp={signUpWithPassword}
        />
      );
    }
  }

  // ── Welcome gate (when Supabase is on and no spaces yet) ─────
  if (isSupabaseConfigured && spaces.length === 0) {
    if (welcomeMode === 'joining') {
      return <JoinSpace profile={profile} onJoined={handleJoined} onBack={() => setWelcomeMode('choosing')} />;
    }
    if (welcomeMode === 'choosing') {
      return <WelcomeChoice onCreateOwn={() => setWelcomeMode('creating')} onJoin={() => setWelcomeMode('joining')} />;
    }
  }

  // ── Post-join screen: user joined a shared list, offer to also create their own ──
  if (isSupabaseConfigured && welcomeMode === 'joined') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
        style={{ background: 'linear-gradient(135deg, #0c6878 0%, #2b8fa0 100%)' }}>
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: '#e6f7f9' }}>
              <span className="text-3xl">🏠</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-800">¡Ya estás dentro!</h2>
            <p className="text-sm text-gray-500">
              Te uniste a <strong className="text-gray-800">{joinedSpaceName}</strong>.
              En esta lista verás los gastos de todos los miembros del hogar.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setWelcomeMode('choosing')}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: '#0c6878' }}>
              Ir a {joinedSpaceName} →
            </button>
            <button
              onClick={() => setWelcomeMode('creating')}
              className="w-full py-3 rounded-2xl text-sm font-bold border-2 text-gray-700 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ borderColor: '#0c6878' }}>
              También crear mi propia lista
            </button>
          </div>

          <p className="text-xs text-center text-gray-400">
            Puedes tener varias listas a la vez. Cámbiate entre ellas desde el menú superior.
          </p>
        </div>
      </div>
    );
  }

  // ── Onboarding gate ───────────────────────────────────────────
  if (spaces.length === 0 || !session || !currentSpace || !currentMember) {
    return <SpaceOnboarding onComplete={handleOnboardingComplete} isSupabaseMode={isSupabaseConfigured} />;
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
        isAdmin={isAdmin}
      />

      {/* ── Space picker ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <SpacePicker
          spaces={spaces}
          session={session}
          onSwitch={handleSwitchSpace}
          onUpdateSpaces={handleUpdateSpaces}
        />
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
        {/* ── Registrar ── */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {prefillTemplate && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm text-teal-700 font-medium">
                  📋 Registrando: <strong>{prefillTemplate.concept}</strong>
                </p>
                <button onClick={() => setPrefillTemplate(null)} className="text-xs text-teal-400 hover:text-teal-600">✕ Limpiar</button>
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
                    inputMode === btn.id ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={inputMode === btn.id ? { backgroundColor: 'var(--soi-teal)' } : {}}>
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
                <TextParser
                  currentUser={currentUser}
                  currentSpaceId={spaceId}
                  spaces={spaces}
                  onSave={handleSaveExpense}
                  onSaveMultiple={handleSaveMultipleExpenses}
                  apiKey={settings.anthropicApiKey}
                  members={currentSpace.members}
                />
              )}
              {inputMode === 'image' && (
                <ImageCapture
                  currentUser={currentUser}
                  currentSpaceId={spaceId}
                  spaces={spaces}
                  onSave={handleSaveExpense}
                  onSaveMultiple={handleSaveMultipleExpenses}
                  apiKey={settings.anthropicApiKey}
                  members={currentSpace.members}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Lista ── */}
        {activeTab === 'list' && (
          <ExpenseList expenses={expenses} onDelete={deleteExpense} onEdit={updateExpense}
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
            members={currentSpace.members}
            spaces={spaces}
            currentSpaceId={spaceId} />
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
                expenseCount={expenses.length} onClearAll={handleClearAll}
                isSupabaseConnected={isSupabaseConfigured && !!profile} />
            </div>
            {isSupabaseConfigured && profile && (
              <div className="border-t border-gray-200 pt-5">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Sesión: <strong>{profile.email}</strong>
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 font-semibold capitalize">{profile.plan}</span>
                  </p>
                  <ChangePassword onSetPassword={setPassword} />
                  <button
                    onClick={signOut}
                    className="block text-sm text-red-500 font-semibold hover:text-red-700 transition-colors">
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Admin ── */}
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel />
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

      {/* ── Calendar reminder after creating a fixed template ── */}
      {reminderTemplate && (
        <ReminderDialog
          template={reminderTemplate}
          onUpdate={updateTemplate}
          onClose={() => setReminderTemplate(null)}
        />
      )}

      {/* ── Suggest fixed template when fijo expense has no match ── */}
      {suggestFixedTemplate && (
        <FixedTemplateFromExpenseModal
          expense={suggestFixedTemplate}
          members={currentSpace.members}
          onSave={(tpl) => {
            const saved = addTemplate(tpl);
            setSuggestFixedTemplate(null);
            setReminderTemplate(saved);
          }}
          onClose={() => setSuggestFixedTemplate(null)}
        />
      )}
    </div>
  );
}
