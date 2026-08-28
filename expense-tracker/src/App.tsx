import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { QuickForm } from './components/QuickForm';
import { TextParser } from './components/TextParser';
import { ImageCapture } from './components/ImageCapture';
import { VoiceRecorder } from './components/VoiceRecorder';
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
import { WelcomeChoice } from './components/WelcomeChoice';
import { JoinSpace } from './components/JoinSpace';
import { ChangePassword } from './components/ChangePassword';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
import { FiscalProfileSection } from './components/FiscalProfileSection';
import { FiscalSummary } from './components/FiscalSummary';
import { FixedExpenseBulkImport } from './components/FixedExpenseBulkImport';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { loadSettings, saveSettings, loadLegacySettings, saveExpenseToAnySpace } from './utils/storage';
import { loadSpaces, saveSpaces, saveSession, loadSession, migrateFromLegacy, syncSpaceToSupabase, getCacheOwner, setCacheOwner, clearLocalSpaceData, getSessionRepairHint, setSessionRepairHint, clearSessionRepairHint } from './utils/spaceStorage';
import { loadFiscalProfile } from './utils/fiscalStorage';
import { checkAndFireNotifications } from './services/notificationService';
import { isSupabaseConfigured } from './lib/supabase';
import { profilesDb, spacesDb, settingsDb, expensesDb } from './lib/db';
import type { Expense } from './types/expense';
import type { FixedExpenseTemplate } from './types/fixedExpense';
import type { ExpenseWithSpace } from './components/MultiExpenseReview';
import type { AppSpace, SessionState } from './types/space';
import { MEMBER_COLORS } from './types/space';
import type { FiscalProfile } from './types/fiscal';
import { format } from 'date-fns';
import './index.css';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings' | 'fiscal' | 'admin';
type InputMode = 'form' | 'text' | 'image' | 'audio';

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
  // Join-flow overlay — works for users who already have spaces
  const [showJoinFlow, setShowJoinFlow] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

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
  const [aiDefaultEnabled, setAiDefaultEnabled] = useState(true);

  useEffect(() => {
    if (spaceId) {
      setSettings(loadSettings(spaceId));
    }
  }, [spaceId]);

  // Load global AI default when user logs in
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    settingsDb.getAiDefaultEnabled().then(setAiDefaultEnabled).catch(() => {});
  }, [user?.id]);

  // isAdmin fallback: profile may be null if profiles table query fails,
  // so also check directly from the auth user metadata
  const effectiveIsAdmin = isAdmin || (profile?.isAdmin ?? false);

  // Effective AI access: profile override > app default
  const hasAiAccess = profile
    ? (profile.aiEnabled !== null ? profile.aiEnabled : aiDefaultEnabled)
    : aiDefaultEnabled;

  // Fetch shared API key from space_settings whenever the active space changes.
  // This ensures members who join a space automatically get the owner's key
  // without needing to configure anything themselves.
  useEffect(() => {
    if (!spaceId || !isSupabaseConfigured || !user) return;
    settingsDb.get(spaceId).then((remote) => {
      if (!remote?.anthropicApiKey) return;
      setSettings((prev) => {
        if (prev.anthropicApiKey === remote.anthropicApiKey) return prev;
        const merged = { ...prev, anthropicApiKey: remote.anthropicApiKey };
        saveSettings(merged, spaceId);
        return merged;
      });
    }).catch(() => {});
  }, [spaceId, user?.id]);

  // ── Fiscal profile (per auth user, falls back to 'local' for offline mode) ──
  const userId = user?.id ?? 'local';
  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile>(() => loadFiscalProfile(userId));
  useEffect(() => {
    setFiscalProfile(loadFiscalProfile(user?.id ?? 'local'));
  }, [user?.id]);

  // ── Tab / UI state ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [inputMode, setInputMode] = useState<InputMode>('form');
  const [voiceAutoStart, setVoiceAutoStart] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState<FixedExpenseTemplate | null>(null);
  const prefillTemplateRef = useRef<FixedExpenseTemplate | null>(null);
  prefillTemplateRef.current = prefillTemplate;
  const [suggestQueue, setSuggestQueue] = useState<{ expense: Expense; autoConfirm?: boolean }[]>([]);
  const [reminderTemplate, setReminderTemplate] = useState<FixedExpenseTemplate | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSaveToast = useCallback((msg: string) => {
    setSaveToast(msg);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setSaveToast(null), 3000);
  }, []);

  // ── Expense hooks ─────────────────────────────────────────────
  const { expenses, addExpense, updateExpense, deleteExpense, cloudSyncError, clearCloudSyncError, syncLoading, retrySync } = useExpenses(spaceId);
  const {
    templates, checks,
    addTemplate, updateTemplate, deleteTemplate,
    ensureChecksForMonth,
    confirmCheck, skipCheck, resetCheck,
    tryAutoMatch, addAndConfirmTemplate,
    pendingCountCurrentMonth,
    cloudSyncError: fixedSyncError,
  } = useFixedExpenses(expenses, spaceId);

  // ── Load spaces + settings from Supabase when user logs in ─────
  useEffect(() => {
    if (!user || !isSupabaseConfigured) { setSpacesLoaded(true); return; }

    // Isolation guard: if the local cache on this device belongs to a different
    // user (or someone who was never signed in), wipe it before we render so we
    // never leak another person's spaces/expenses into this session.
    const cachedUid = getCacheOwner();
    if (cachedUid !== user.id) {
      clearLocalSpaceData();
      clearSessionRepairHint();
      setSpaces([]);
      setSession(null);
    }

    // The cloud is the source of truth for an authenticated user. Fetch directly
    // (not loadSpacesFromSupabase, which falls back to stale local cache on empty).
    // recoverMySpaces runs unconditionally (cheap + idempotent): a single stale
    // linked space must never mask unlinked spaces the user actually owns.
    spacesDb.recoverMySpaces().catch(() => 0).then(() => spacesDb.listMySpaces()).then(async (remote) => {
      if (remote.length > 0) {
        setSpaces(remote);
        saveSpaces(remote);
        let activeSpaceId = spaceId;
        const savedSession = loadSession();
        const stillValid = savedSession && remote.some((s) => s.id === savedSession.spaceId);

        // Helper: find the member linked to the authenticated user in a space
        const myMemberIn = (space: AppSpace) =>
          space.members.find((m) => m.profileId === user.id) ?? space.members[0];

        if (!stillValid) {
          const firstSpace = remote[0];
          const myMember = myMemberIn(firstSpace);
          const newSession: SessionState = { spaceId: firstSpace.id, memberId: myMember.id };
          setSession(newSession);
          saveSession(newSession);
          setSessionRepairHint(newSession);
          activeSpaceId = firstSpace.id;
        } else {
          activeSpaceId = savedSession!.spaceId;
          // If the saved session points to a member that doesn't belong to this
          // user (e.g., session was reset after a member rename), correct it.
          const activeSpace = remote.find((s) => s.id === savedSession!.spaceId);
          const sessionMember = activeSpace?.members.find((m) => m.id === savedSession!.memberId);
          const myMember = activeSpace ? myMemberIn(activeSpace) : null;
          if (myMember && (!sessionMember || sessionMember.profileId !== user.id)) {
            const corrected = { ...savedSession!, memberId: myMember.id };
            setSession(corrected);
            saveSession(corrected);
            setSessionRepairHint(corrected);
          } else {
            setSessionRepairHint(savedSession!);
          }
        }
        // Load API key: owner's key lives in their profile; non-owners fall back
        // to the space-level key that the owner writes on each save.
        const remoteApiKey = await profilesDb.getApiKey().catch(() => null);
        const spaceApiKey  = remoteApiKey ?? await settingsDb.get(activeSpaceId).then((s) => s?.anthropicApiKey ?? null).catch(() => null);
        if (spaceApiKey) {
          const local = loadSettings(activeSpaceId);
          if (local.anthropicApiKey !== spaceApiKey) {
            const merged = { ...local, anthropicApiKey: spaceApiKey };
            saveSettings(merged, activeSpaceId);
            setSettings(merged);
          }
        }
      } else {
        // Cloud returned empty even after recoverMySpaces. Remaining repair:
        // claimMemberProfile — hint-based, covers non-owner memberships.
        const hint = getSessionRepairHint();
        try {
          if (hint) await spacesDb.claimMemberProfile(hint.spaceId, hint.memberId).catch(() => {});
          const retried = await spacesDb.listMySpaces();
          if (retried.length > 0) {
            setSpaces(retried);
            saveSpaces(retried);
            const stillValid = hint && retried.some((s) => s.id === hint.spaceId);
            const fallbackSpace = retried[0];
            const fallbackMember = fallbackSpace.members.find((m) => m.profileId === user.id) ?? fallbackSpace.members[0];
            const activeSession = stillValid ? hint! : { spaceId: fallbackSpace.id, memberId: fallbackMember.id };
            setSession(activeSession);
            saveSession(activeSession);
            setSessionRepairHint(activeSession);
            setCacheOwner(user.id);
            setSpacesLoaded(true);
            return;
          }
        } catch { /* recovery RPCs not deployed — fall through */ }
        // Repair didn't help. If this is the same user and they have local
        // data, preserve it and re-sync — don't wipe on transient cloud errors.
        if (cachedUid === user.id) {
          const local = loadSpaces();
          if (local.length > 0) {
            setSpaces(local);
            for (const s of local) {
              syncSpaceToSupabase(s, user.id).catch(console.error);
            }
          }
          // If no local data either, onboarding will show naturally
        } else {
          // Different user: cache was already cleared above; start clean
          clearLocalSpaceData();
          clearSessionRepairHint();
          setSpaces([]);
          setSession(null);
        }
      }
      setCacheOwner(user.id);
      setSpacesLoaded(true);
    }).catch(() => setSpacesLoaded(true));
  }, [user]);

  // ── Proactive profile_id repair ──────────────────────────────
  // Spaces created before the updateSpace-path fix have profile_id = NULL
  // in space_members, which breaks all RLS policies. Fix silently on login
  // and whenever the active space changes.
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !session || !spacesLoaded) return;
    spacesDb.claimMemberProfile(session.spaceId, session.memberId).catch(() => {
      // Non-fatal: the member may already have profile_id set (RPC is idempotent)
    });
  }, [user?.id, session?.spaceId, session?.memberId, spacesLoaded]);

  // ── Auto-switch when active space was deleted but others exist ──
  // Prevents the onboarding gate from showing when a user deletes the
  // currently-active space but still has other spaces available.
  useEffect(() => {
    if (!spacesLoaded || spaces.length === 0 || !session || currentSpace) return;
    const fallback = spaces[0];
    const fallbackMember = fallback.members[0];
    if (fallbackMember) {
      const newSess = { spaceId: fallback.id, memberId: fallbackMember.id };
      setSession(newSess);
      saveSession(newSess);
    }
  }, [spaces, session?.spaceId, currentSpace, spacesLoaded]);

  // ── Detect ?join=CODE invite URL parameter ───────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
      if (clean.length === 6) {
        setPendingJoinCode(clean);
        setShowJoinFlow(true);
        // Remove the param from the URL without triggering a reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // ── Notification check on mount and focus ────────────────────
  useEffect(() => {
    checkAndFireNotifications(templates);
    const onVisible = () => { if (!document.hidden) checkAndFireNotifications(templates); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [templates]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback((space: AppSpace, newSession: SessionState) => {
    // Append the new space rather than replacing — the user may have other
    // spaces that were loaded from cloud; wiping them here causes data loss.
    setSpaces((prev) => {
      const merged = prev.some((s) => s.id === space.id) ? prev : [...prev, space];
      saveSpaces(merged);
      return merged;
    });
    setSession(newSession);
    saveSession(newSession);
    // Set cache owner immediately so a sync failure doesn't cause data loss on
    // next login (null cachedUid would trigger clearLocalSpaceData).
    if (isSupabaseConfigured && user) {
      setCacheOwner(user.id);
      // Awaiting matters: if the space + owner membership don't reach Supabase,
      // every expense/fixed write will silently fail RLS and live only locally.
      syncSpaceToSupabase(space, user.id).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error al sincronizar el espacio con la nube:', msg);
        alert(`No se pudo guardar tu lista en la nube.\n\nDetalle: ${msg}\n\nVerifica tu conexión e intenta de nuevo.`);
      });
    }
  }, [user]);

  const handleUpdateSpaces = useCallback((updated: AppSpace[]) => {
    setSpaces((prev) => {
      if (isSupabaseConfigured) {
        const prevMap = new Map(prev.map((s) => [s.id, s]));
        updated.forEach((s) => {
          if (!prevMap.has(s.id) && user?.id) {
            // Brand-new space: use createSpace RPC so the owner member gets profile_id set,
            // which is required by the my_space_ids() RLS check on space_invites and other tables.
            syncSpaceToSupabase(s, user.id).catch(console.error);
          } else {
            // Compute members explicitly removed by the user (prev had them, new list doesn't).
            // Never delete by exclusion — that wipes members added externally via SQL/invite.
            const prevMembers = prevMap.get(s.id)?.members ?? [];
            const newIds = new Set(s.members.map((m) => m.id));
            const removedIds = prevMembers.filter((m) => !newIds.has(m.id)).map((m) => m.id);
            syncSpaceToSupabase(s, undefined, removedIds).catch(console.error);
          }
        });
      }
      return updated;
    });
    saveSpaces(updated);
  }, [user?.id]);

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
        await settingsDb.upsert(spaceId, newSettings).catch(console.error);
        // Admin: also write global key so all spaces inherit it
        if (isAdmin && newSettings.anthropicApiKey) {
          await settingsDb.setGlobalApiKey(newSettings.anthropicApiKey).catch(console.error);
        }
      }
    }
  }, [spaceId, isAdmin]);

  const handleClearAll = useCallback(async () => {
    localStorage.removeItem(`expense_tracker_data_${spaceId}`);
    if (isSupabaseConfigured && spaceId) {
      await expensesDb.deleteAllForSpace(spaceId).catch(console.error);
    }
    window.location.reload();
  }, [spaceId]);

  const handleSaveExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const saved = addExpense(data);
      const month = data.date.slice(0, 7);
      const matched = tryAutoMatch(saved, month);
      if (!matched && data.expenseType === 'fijo') {
        const fromPrefill = prefillTemplateRef.current;
        if (fromPrefill) {
          // User registered from an existing template. tryAutoMatch may have failed
          // because the check didn't exist yet for this month (checklist not visited).
          // Find its pending check and confirm it directly; never suggest creating
          // a duplicate template.
          const pendingCheck = checks.find(
            (c) => c.templateId === fromPrefill.id && c.month === month && c.status === 'pendiente'
          );
          if (pendingCheck) confirmCheck(pendingCheck.id, saved.id, saved.amount);
        } else {
          setSuggestQueue((q) => [...q, { expense: saved }]);
        }
      }
      setPrefillTemplate(null);
      setActiveTab('list');
      showSaveToast(data.transactionType === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado');
    },
    [addExpense, tryAutoMatch, showSaveToast, checks, confirmCheck]
  );

  const handleSaveExpenseMultiple = useCallback(
    (items: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const unmatchedFijos: { expense: Expense }[] = [];
      for (const data of items) {
        const saved = addExpense(data);
        const month = data.date.slice(0, 7);
        const matched = tryAutoMatch(saved, month);
        if (!matched && data.expenseType === 'fijo') unmatchedFijos.push({ expense: saved });
      }
      if (unmatchedFijos.length > 0) setSuggestQueue((q) => [...q, ...unmatchedFijos]);
      setPrefillTemplate(null);
      setActiveTab('list');
      const ingresoCount = items.filter((d) => d.transactionType === 'ingreso').length;
      const gastoCount = items.length - ingresoCount;
      const toastMsg =
        ingresoCount === items.length
          ? (items.length === 1 ? 'Ingreso guardado' : `${items.length} ingresos guardados`)
          : gastoCount === items.length
          ? (items.length === 1 ? 'Gasto guardado' : `${items.length} gastos guardados`)
          : `${items.length} registros guardados`;
      showSaveToast(toastMsg);
    },
    [addExpense, tryAutoMatch, showSaveToast]
  );

  const handleRegisterFromTemplate = useCallback((tpl: FixedExpenseTemplate) => {
    setPrefillTemplate(tpl);
    setInputMode('form');
    setActiveTab('add');
  }, []);

  const handleConfirmWithExpense = useCallback((checkId: string, data: Parameters<typeof addExpense>[0]) => {
    const saved = addExpense(data);
    confirmCheck(checkId, saved.id, saved.amount);
    showSaveToast('Gasto guardado');
  }, [addExpense, confirmCheck, showSaveToast]);

  const handleSignOut = useCallback(async () => {
    // Reset in-memory state only. We intentionally KEEP the local cache:
    // the login-time isolation guard (cachedUid !== user.id) wipes it if a
    // DIFFERENT user signs in, while the same user re-logging keeps an
    // instant local fallback even if the cloud fetch fails. Wiping here was
    // the root cause of "lost lists" when cloud recovery wasn't possible.
    setSpaces([]);
    setSession(null);
    setWelcomeMode('choosing');
    await signOut();
  }, [signOut]);

  const handleJoined = useCallback(async (spaceId: string, memberId: string) => {
    // 1. Guarantee profile_id is set in Supabase BEFORE querying spaces.
    //    claimMemberProfile is idempotent — safe to call even if already set.
    if (isSupabaseConfigured) {
      await spacesDb.claimMemberProfile(spaceId, memberId).catch(console.error);
    }

    // 2. Load spaces using listMySpaces() directly (avoids the stale-cache
    //    fallback in loadSpacesFromSupabase that hides the joined space).
    //    Retry once after 1 s if the joined space isn't yet visible in the result
    //    (rare but possible with transient Supabase propagation).
    let remote: AppSpace[] = [];
    if (isSupabaseConfigured) {
      remote = await spacesDb.listMySpaces().catch(() => [] as AppSpace[]);
      if (!remote.find((s) => s.id === spaceId)) {
        await new Promise((r) => setTimeout(r, 1000));
        remote = await spacesDb.listMySpaces().catch(() => [] as AppSpace[]);
      }
    }
    const updated = remote.length > 0 ? remote : loadSpaces();

    if (updated.length > 0) {
      setSpaces(updated);
      if (remote.length > 0) saveSpaces(remote);
      const newSession: SessionState = { spaceId, memberId };
      setSession(newSession);
      saveSession(newSession);
      if (user) setCacheOwner(user.id);
      const joined = updated.find((s) => s.id === spaceId);
      setJoinedSpaceName(joined?.name ?? '');
    }
    setWelcomeMode('joined');
  }, [user]);

  const handleSaveMultipleExpenses = useCallback((items: ExpenseWithSpace[]) => {
    const unmatchedFijos: { expense: Expense; autoConfirm: boolean }[] = [];
    items.forEach(({ expense, spaceId: targetSpaceId }) => {
      if (targetSpaceId === spaceId) {
        const saved = addExpense(expense);
        const month = expense.date.slice(0, 7);
        const matched = tryAutoMatch(saved, month);
        if (!matched && expense.expenseType === 'fijo') {
          // Photo/text expenses are already paid — auto-confirm the template check
          unmatchedFijos.push({ expense: saved, autoConfirm: true });
        }
      } else {
        saveExpenseToAnySpace(expense, targetSpaceId);
      }
    });
    if (unmatchedFijos.length > 0) setSuggestQueue((q) => [...q, ...unmatchedFijos]);
    setActiveTab('list');
    const ingresoCount = items.filter(({ expense }) => expense.transactionType === 'ingreso').length;
    const gastoCount = items.length - ingresoCount;
    const toastMsg =
      ingresoCount === items.length
        ? (items.length === 1 ? 'Ingreso guardado' : `${items.length} ingresos guardados`)
        : gastoCount === items.length
        ? (items.length === 1 ? 'Gasto guardado' : `${items.length} gastos guardados`)
        : `${items.length} registros guardados`;
    showSaveToast(toastMsg);
  }, [addExpense, tryAutoMatch, spaceId, showSaveToast]);

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
    { id: 'audio', label: 'Voz',        emoji: '🎙️' },
  ];

  // ── Auth gate (when Supabase is configured) ───────────────────
  if (isSupabaseConfigured) {
    if (authLoading || !spacesLoaded) {
      return (
        <div className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}>
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

  // ── Join flow — accessible to users with or without existing spaces ──
  // Triggered by: ?join=CODE URL param, "Unirme" button in SpacePicker,
  // or the welcome screen when user has no spaces yet.
  if (isSupabaseConfigured && (showJoinFlow || (spaces.length === 0 && welcomeMode === 'joining'))) {
    return (
      <JoinSpace
        profile={profile}
        initialCode={pendingJoinCode ?? undefined}
        onJoined={async (sid, mid) => {
          setShowJoinFlow(false);
          setPendingJoinCode(null);
          await handleJoined(sid, mid);
        }}
        onBack={() => {
          setShowJoinFlow(false);
          setPendingJoinCode(null);
          setWelcomeMode('choosing');
        }}
      />
    );
  }

  // ── Welcome gate (when Supabase is on and no spaces yet) ─────
  if (isSupabaseConfigured && spaces.length === 0) {
    if (welcomeMode === 'choosing') {
      return <WelcomeChoice onCreateOwn={() => setWelcomeMode('creating')} onJoin={() => setWelcomeMode('joining')} />;
    }
  }

  // ── Post-join screen: user joined a shared list, offer to also create their own ──
  if (isSupabaseConfigured && welcomeMode === 'joined') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
        style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}>
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
              style={{ backgroundColor: '#2C5F6E' }}>
              Ir a {joinedSpaceName} →
            </button>
            <button
              onClick={() => setWelcomeMode('creating')}
              className="w-full py-3 rounded-2xl text-sm font-bold border-2 text-gray-700 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ borderColor: '#2C5F6E' }}>
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
  // Show a spinner (not onboarding) while the auto-switch effect above runs:
  // the active space was deleted but other spaces exist — effect will redirect.
  if (spaces.length > 0 && session && !currentSpace) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1A2D33 0%, #2C5F6E 100%)' }}>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (spaces.length === 0 || !session || !currentSpace || !currentMember) {
    return <SpaceOnboarding onComplete={handleOnboardingComplete} isSupabaseMode={isSupabaseConfigured} />;
  }

  // currentUser is stored as the member's name in paidBy field
  const currentUser = currentMember.name;

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <PWAUpdateBanner />
      {(cloudSyncError || fixedSyncError) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-start gap-2 text-sm text-amber-800">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span className="flex-1">{cloudSyncError ?? fixedSyncError}</span>
          {cloudSyncError && (
            <button onClick={retrySync} className="shrink-0 font-bold text-amber-900 underline">Reintentar</button>
          )}
          <button onClick={clearCloudSyncError} className="shrink-0 font-medium underline ml-2">✕</button>
        </div>
      )}
      {syncLoading && expenses.length === 0 && !cloudSyncError && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center gap-2 text-sm text-sky-700">
          <svg className="animate-spin h-4 w-4 text-sky-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span>Cargando movimientos desde la nube…</span>
        </div>
      )}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          ✓ {saveToast}
        </div>
      )}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memberName={currentMember.name}
        memberColor={MEMBER_COLORS[currentMember.colorIndex] ?? '#3b82f6'}
        spaceName={currentSpace.name}
        onAvatarTap={() => setShowUserSwitcher(true)}
        pendingFixed={pendingCountCurrentMonth}
      />

      {/* ── Space picker ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <SpacePicker
          spaces={spaces}
          session={session}
          onSwitch={handleSwitchSpace}
          onUpdateSpaces={handleUpdateSpaces}
          onJoinSpace={isSupabaseConfigured ? () => setShowJoinFlow(true) : undefined}
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
                <button key={btn.id} onClick={() => { setInputMode(btn.id); setVoiceAutoStart(false); setPrefillTemplate(null); }}
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
                  onSaveMultiple={handleSaveExpenseMultiple}
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
                  fiscalProfile={fiscalProfile}
                  isOwner={currentMember?.role === 'propietario'}
                  isAdmin={effectiveIsAdmin}
                  hasAiAccess={hasAiAccess}
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
                  fiscalProfile={fiscalProfile}
                  isOwner={currentMember?.role === 'propietario'}
                  isAdmin={effectiveIsAdmin}
                  hasAiAccess={hasAiAccess}
                />
              )}
              {inputMode === 'audio' && (
                <VoiceRecorder
                  key={voiceAutoStart ? 'autostart' : 'manual'}
                  currentUser={currentUser}
                  currentSpaceId={spaceId}
                  spaces={spaces}
                  onSave={handleSaveExpense}
                  onSaveMultiple={handleSaveMultipleExpenses}
                  apiKey={settings.anthropicApiKey}
                  members={currentSpace.members}
                  fiscalProfile={fiscalProfile}
                  isOwner={currentMember?.role === 'propietario'}
                  isAdmin={effectiveIsAdmin}
                  hasAiAccess={hasAiAccess}
                  autoStart={voiceAutoStart}
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
          <ErrorBoundary fallback={
            <div className="text-center py-12 space-y-3">
              <p className="text-4xl">⚠️</p>
              <p className="font-semibold text-gray-700">Error al cargar los gastos fijos</p>
              <p className="text-xs text-gray-400">Intenta recargar la app. Si el problema persiste, revisa la consola del navegador.</p>
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold">
                Recargar
              </button>
            </div>
          }>
            <MonthlyChecklist
              templates={templates}
              checks={checks}
              expenses={expenses}
              onEnsureChecks={ensureChecksForMonth}
              onConfirm={confirmCheck}
              onConfirmWithExpense={handleConfirmWithExpense}
              onSkip={skipCheck}
              onReset={resetCheck}
              onRegisterNow={handleRegisterFromTemplate}
              members={currentSpace.members}
            />
          </ErrorBoundary>
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
              <FixedExpenseBulkImport
                members={currentSpace.members}
                apiKey={settings.anthropicApiKey}
                onImport={(tpls) => { tpls.forEach((t) => addTemplate(t)); }}
              />
            </div>
            <div className="border-t border-gray-200 pt-5">
              <SpaceSettings
                spaces={spaces}
                session={session}
                onUpdateSpaces={handleUpdateSpaces}
                onSwitchSpace={handleSwitchSpace}
              />
            </div>
            <div className="border-t border-gray-200 pt-5">
              <div className="mb-2 text-xs text-center rounded-lg py-1 font-bold" style={{ backgroundColor: effectiveIsAdmin ? '#d1fae5' : '#fee2e2', color: effectiveIsAdmin ? '#065f46' : '#991b1b' }}>
                v2026-06-13-A · isAdmin: {String(effectiveIsAdmin)} · profile: {profile ? 'cargado' : 'null'}
              </div>
              <SettingsPanel settings={settings} onSave={handleSaveSettings}
                expenseCount={expenses.length} onClearAll={handleClearAll}
                isSupabaseConnected={isSupabaseConfigured && !!profile}
                isOwner={currentMember?.role === 'propietario'}
                isAdmin={effectiveIsAdmin} />
            </div>
            <div className="border-t border-gray-200 pt-5">
              <FiscalProfileSection
                userId={userId}
                initialProfile={fiscalProfile}
                onSave={(p) => setFiscalProfile(p)}
              />
            </div>
            {isSupabaseConfigured && user && (
              <div className="border-t border-gray-200 pt-5">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Sesión: <strong>{user.email}</strong>
                    {profile && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 font-semibold capitalize">{profile.plan}</span>
                    )}
                  </p>
                  <ChangePassword onSetPassword={setPassword} />
                  <button
                    onClick={handleSignOut}
                    className="block text-sm text-red-500 font-semibold hover:text-red-700 transition-colors">
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Fiscal ── */}
        {activeTab === 'fiscal' && (
          <div className="space-y-6">
            <FiscalSummary
              expenses={expenses}
              profile={fiscalProfile}
              onUpdateExpense={(id, data) => updateExpense(id, data)}
            />
            <div className="border-t border-gray-200 pt-5">
              <FiscalProfileSection
                userId={userId}
                initialProfile={fiscalProfile}
                onSave={(p) => setFiscalProfile(p)}
              />
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

      {/* ── Calendar reminder after creating a fixed template ── */}
      {reminderTemplate && (
        <ReminderDialog
          template={reminderTemplate}
          onUpdate={updateTemplate}
          onClose={() => setReminderTemplate(null)}
        />
      )}

      {/* ── Suggest fixed template when fijo expense has no match ── */}
      {suggestQueue[0] && (
        <ErrorBoundary fallback={
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
              <p className="text-2xl">⚠️</p>
              <p className="font-semibold text-gray-800">Error al abrir el configurador</p>
              <button onClick={() => setSuggestQueue((q) => q.slice(1))}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold">
                Cerrar
              </button>
            </div>
          </div>
        }>
          <FixedTemplateFromExpenseModal
            key={suggestQueue[0].expense.id}
            expense={suggestQueue[0].expense}
            members={currentSpace.members}
            onSave={(tpl) => {
              const qItem = suggestQueue[0];
              const saved = qItem.autoConfirm
                ? addAndConfirmTemplate(tpl, qItem.expense)
                : addTemplate(tpl);
              setSuggestQueue((q) => q.slice(1));
              setReminderTemplate(saved);
            }}
            onClose={() => setSuggestQueue((q) => q.slice(1))}
          />
        </ErrorBoundary>
      )}
      {/* ── Floating mic FAB ── */}
      {!(activeTab === 'add' && inputMode === 'audio') && (
        <button
          onClick={() => {
            setActiveTab('add');
            setVoiceAutoStart(true);
            setInputMode('audio');
            // Reset autoStart flag after a tick so re-entering audio tab doesn't re-start
            setTimeout(() => setVoiceAutoStart(false), 500);
          }}
          className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 hover:scale-105"
          style={{ backgroundColor: '#1A2D33', border: '2px solid rgba(168,213,220,0.3)' }}
          aria-label="Registrar gasto por voz"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
    </ErrorBoundary>
  );
}
