import { supabase } from './supabase';
import type { Expense } from '../types/expense';
import type { FixedExpenseTemplate, MonthlyCheck } from '../types/fixedExpense';
import type { AppSpace, SpaceMember } from '../types/space';
import type { AppSettings } from '../utils/storage';
import { generateId } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  plan: 'free' | 'trial' | 'premium';
  planExpiresAt: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(r: any): Profile {
  return {
    id:            r.id,
    email:         r.email ?? '',
    displayName:   r.display_name ?? 'Usuario',
    plan:          r.plan ?? 'trial',
    planExpiresAt: r.plan_expires_at ?? null,
    isAdmin:       r.is_admin ?? false,
    createdAt:     r.created_at,
    lastSeenAt:    r.last_seen_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToExpense(r: any): Expense {
  return {
    id:                   r.id,
    date:                 r.date,
    transactionType:      r.transaction_type,
    amount:               Number(r.amount),
    currency:             r.currency ?? 'MXN',
    paidBy:               r.paid_by,
    concept:              r.concept,
    category:             r.category,
    subcategory:          r.subcategory ?? undefined,
    paymentMethod:        r.payment_method,
    cardLast4:            r.card_last4 ?? undefined,
    bank:                 r.bank ?? undefined,
    store:                r.store ?? undefined,
    location:             r.location ?? undefined,
    expenseType:          r.expense_type,
    frequency:            r.frequency ?? undefined,
    installments:         r.installments ?? undefined,
    currentInstallment:   r.current_installment ?? undefined,
    isReimbursable:       r.is_reimbursable ?? undefined,
    isTaxDeductible:      r.is_tax_deductible ?? undefined,
    invoiceRequested:     r.invoice_requested ?? undefined,
    sharedExpense:        r.shared_expense ?? undefined,
    notes:                r.notes ?? undefined,
    tags:                 r.tags ?? undefined,
    receiptImageBase64:   r.receipt_image_base64 ?? undefined,
    ticketId:             r.ticket_id ?? undefined,
    createdAt:            r.created_at,
    updatedAt:            r.updated_at,
  };
}

function expenseToRow(spaceId: string, e: Expense) {
  return {
    id: e.id, space_id: spaceId,
    date: e.date, transaction_type: e.transactionType,
    amount: e.amount, currency: e.currency,
    paid_by: e.paidBy, concept: e.concept, category: e.category,
    subcategory: e.subcategory ?? null,
    payment_method: e.paymentMethod,
    card_last4: e.cardLast4 ?? null, bank: e.bank ?? null,
    store: e.store ?? null, location: e.location ?? null,
    expense_type: e.expenseType, frequency: e.frequency ?? null,
    installments: e.installments ?? null,
    current_installment: e.currentInstallment ?? null,
    is_reimbursable: e.isReimbursable ?? null,
    is_tax_deductible: e.isTaxDeductible ?? null,
    invoice_requested: e.invoiceRequested ?? null,
    shared_expense: e.sharedExpense ?? null,
    notes: e.notes ?? null, tags: e.tags ?? null,
    receipt_image_base64: e.receiptImageBase64 ?? null,
    ticket_id: e.ticketId ?? null,
    created_at: e.createdAt, updated_at: e.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTemplate(r: any): FixedExpenseTemplate {
  return {
    id:                       r.id,
    concept:                  r.concept,
    expectedAmount:           Number(r.expected_amount),
    category:                 r.category,
    paidBy:                   r.paid_by,
    paymentMethod:            r.payment_method,
    frequency:                r.frequency,
    dayOfMonth:               r.day_of_month ?? undefined,
    dayOfWeek:                r.day_of_week ?? undefined,
    paymentMonth:             r.payment_month ?? undefined,
    reminderEnabled:          r.reminder_enabled ?? false,
    reminderDaysBefore:       r.reminder_days_before ?? 3,
    bank:                     r.bank ?? undefined,
    cardLast4:                r.card_last4 ?? undefined,
    active:                   r.active ?? true,
    notes:                    r.notes ?? undefined,
    createdAt:                r.created_at,
    // Credit card fields
    isCreditCard:             r.is_credit_card ?? undefined,
    cutDay:                   r.cut_day ?? undefined,
    paymentDueDaysAfterCut:   r.payment_due_days_after_cut ?? undefined,
    minimumPayment:           r.minimum_payment ? Number(r.minimum_payment) : undefined,
  };
}

function templateToRow(spaceId: string, t: FixedExpenseTemplate) {
  return {
    id: t.id, space_id: spaceId,
    concept: t.concept, expected_amount: t.expectedAmount,
    category: t.category, payment_method: t.paymentMethod,
    paid_by: t.paidBy, bank: t.bank ?? null, card_last4: t.cardLast4 ?? null,
    frequency: t.frequency, expense_type: 'fijo', active: t.active,
    day_of_month: t.dayOfMonth ?? null, day_of_week: t.dayOfWeek ?? null,
    payment_month: t.paymentMonth ?? null,
    reminder_enabled: t.reminderEnabled ?? false,
    reminder_days_before: t.reminderDaysBefore ?? 3,
    notes: t.notes ?? null, created_at: t.createdAt,
    // Credit card fields
    is_credit_card:             t.isCreditCard ?? null,
    cut_day:                    t.cutDay ?? null,
    payment_due_days_after_cut: t.paymentDueDaysAfterCut ?? null,
    minimum_payment:            t.minimumPayment ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCheck(r: any): MonthlyCheck {
  return {
    id:            r.id,
    month:         r.month,
    templateId:    r.template_id,
    status:        r.status,
    expenseId:     r.expense_id ?? undefined,
    actualAmount:  r.actual_amount ? Number(r.actual_amount) : undefined,
    confirmedAt:   r.confirmed_at ?? undefined,
    notes:         r.notes ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMember(r: any): SpaceMember {
  return {
    id:         r.id,
    name:       r.display_name,
    pin:        r.pin ?? '0000',
    role:       r.role,
    colorIndex: r.color_index ?? 0,
    createdAt:  r.created_at,
  };
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const profilesDb = {
  async getMe(): Promise<Profile | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles').select('*').single();
    if (error) return null;
    return rowToProfile(data);
  },

  async getApiKey(): Promise<string | null> {
    if (!supabase) return null;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const { data } = await supabase
      .from('profiles').select('anthropic_api_key').eq('id', uid).single();
    return data?.anthropic_api_key ?? null;
  },

  async setApiKey(key: string | null): Promise<void> {
    if (!supabase) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error('No hay sesión activa');
    const { error } = await supabase.from('profiles')
      .update({ anthropic_api_key: key ?? null })
      .eq('id', uid);
    if (error) throw new Error(error.message);
  },

  async updateLastSeen(): Promise<void> {
    if (!supabase) return;
    await supabase.from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
  },

  async updateMe(data: { displayName?: string; plan?: string }): Promise<void> {
    if (!supabase) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    await supabase.from('profiles').update({
      ...(data.displayName !== undefined && { display_name: data.displayName }),
      ...(data.plan !== undefined && { plan: data.plan }),
    }).eq('id', uid);
  },

  async listAll(): Promise<Profile[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map(rowToProfile);
  },
};

// ─── Spaces ───────────────────────────────────────────────────────────────────

export const spacesDb = {
  async listMySpaces(): Promise<AppSpace[]> {
    if (!supabase) return [];
    // Get all spaces I'm a member of, with all their members
    const { data: myMemberships } = await supabase
      .from('space_members').select('space_id').not('profile_id', 'is', null);
    if (!myMemberships?.length) return [];

    const ids = myMemberships.map((m: { space_id: string }) => m.space_id);
    const { data: spacesData } = await supabase
      .from('spaces').select('*').in('id', ids);
    const { data: membersData } = await supabase
      .from('space_members').select('*').in('space_id', ids);

    return (spacesData ?? []).map((s: { id: string; name: string; owner_id: string; max_members: number; plan: string; created_at: string }) => ({
      id:         s.id,
      name:       s.name,
      ownerId:    s.owner_id,
      maxMembers: s.max_members,
      plan:       (s.plan as AppSpace['plan']) ?? 'trial',
      createdAt:  s.created_at,
      members: (membersData ?? [])
        .filter((m: { space_id: string }) => m.space_id === s.id)
        .map(rowToMember),
    }));
  },

  async createSpace(space: AppSpace, ownerProfileId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('spaces').upsert({
      id: space.id, name: space.name, owner_id: space.ownerId,
      max_members: space.maxMembers, plan: space.plan ?? 'trial',
      created_at: space.createdAt,
    });
    for (const m of space.members) {
      await supabase.from('space_members').upsert({
        id: m.id, space_id: space.id,
        profile_id: m.id === space.ownerId ? ownerProfileId : null,
        display_name: m.name, pin: m.pin, role: m.role,
        color_index: m.colorIndex, created_at: m.createdAt,
      });
    }
  },

  async updateSpace(space: AppSpace): Promise<void> {
    if (!supabase) return;
    await supabase.from('spaces').update({
      name: space.name, owner_id: space.ownerId,
      max_members: space.maxMembers, plan: space.plan ?? 'trial',
    }).eq('id', space.id);
    // Upsert all members
    for (const m of space.members) {
      await supabase.from('space_members').upsert({
        id: m.id, space_id: space.id,
        display_name: m.name, pin: m.pin, role: m.role,
        color_index: m.colorIndex, created_at: m.createdAt,
      });
    }
    // Delete removed members
    const memberIds = space.members.map((m) => m.id);
    await supabase.from('space_members')
      .delete().eq('space_id', space.id).not('id', 'in', `(${memberIds.map((id) => `'${id}'`).join(',')})`);
  },

  async deleteSpace(spaceId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('spaces').delete().eq('id', spaceId);
  },

  async linkMemberToProfile(memberId: string, profileId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('space_members')
      .update({ profile_id: profileId }).eq('id', memberId);
  },
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesDb = {
  async list(spaceId: string): Promise<Expense[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('expenses').select('*')
      .eq('space_id', spaceId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToExpense);
  },

  async create(spaceId: string, expense: Expense): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').insert(expenseToRow(spaceId, expense));
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('expenses').delete().eq('id', id);
  },

  async bulkCreate(spaceId: string, expenses: Expense[]): Promise<void> {
    if (!supabase || !expenses.length) return;
    // Upsert so re-syncing local-only expenses tolerates partial prior inserts
    const { error } = await supabase.from('expenses')
      .upsert(expenses.map((e) => expenseToRow(spaceId, e)), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  },
};

// ─── Fixed Expense Templates ──────────────────────────────────────────────────

export const fixedDb = {
  async listTemplates(spaceId: string): Promise<FixedExpenseTemplate[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('fixed_expense_templates').select('*')
      .eq('space_id', spaceId).order('created_at', { ascending: false });
    return (data ?? []).map(rowToTemplate);
  },

  async createTemplate(spaceId: string, t: FixedExpenseTemplate): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('fixed_expense_templates').insert(templateToRow(spaceId, t));
    if (error) throw new Error(error.message);
  },

  async updateTemplate(t: FixedExpenseTemplate, spaceId: string): Promise<void> {
    if (!supabase) return;
    const { id, ...row } = templateToRow(spaceId, t);
    const { error } = await supabase.from('fixed_expense_templates').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteTemplate(id: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('fixed_expense_templates').delete().eq('id', id);
  },

  async listChecks(spaceId: string): Promise<MonthlyCheck[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('fixed_expense_checks').select('*').eq('space_id', spaceId);
    return (data ?? []).map(rowToCheck);
  },

  async upsertChecks(spaceId: string, checks: MonthlyCheck[]): Promise<void> {
    if (!supabase || !checks.length) return;
    await supabase.from('fixed_expense_checks').upsert(
      checks.map((c) => ({
        id: c.id, space_id: spaceId, template_id: c.templateId,
        month: c.month, status: c.status,
        expense_id: c.expenseId ?? null,
        actual_amount: c.actualAmount ?? null,
        confirmed_at: c.confirmedAt ?? null,
        notes: c.notes ?? null,
      })),
      { onConflict: 'template_id,month' }
    );
  },

  async updateCheck(check: MonthlyCheck, spaceId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('fixed_expense_checks').upsert({
      id: check.id, space_id: spaceId, template_id: check.templateId,
      month: check.month, status: check.status,
      expense_id: check.expenseId ?? null,
      actual_amount: check.actualAmount ?? null,
      confirmed_at: check.confirmedAt ?? null,
      notes: check.notes ?? null,
    }, { onConflict: 'template_id,month' });
  },
};

// ─── Space settings ───────────────────────────────────────────────────────────

export const settingsDb = {
  async get(spaceId: string): Promise<AppSettings | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from('space_settings').select('*').eq('space_id', spaceId).single();
    if (!data) return null;
    return { currency: data.currency ?? 'MXN', anthropicApiKey: data.anthropic_api_key ?? undefined };
  },

  async upsert(spaceId: string, settings: AppSettings): Promise<void> {
    if (!supabase) return;
    await supabase.from('space_settings').upsert({
      space_id: spaceId,
      currency: settings.currency,
      anthropic_api_key: settings.anthropicApiKey ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'space_id' });
  },
};

// ─── Invites ──────────────────────────────────────────────────────────────────

export interface SpaceInvite {
  id: string;
  code: string;
  spaceName: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  createdAt: string;
}

export const invitesDb = {
  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  async create(spaceId: string, spaceName: string, createdBy: string): Promise<string> {
    if (!supabase) throw new Error('Supabase no configurado');
    const code = this.generateCode();
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.from('space_invites').insert({
      id, space_id: spaceId, space_name: spaceName, code, created_by: createdBy,
    });
    if (error) throw error;
    return code;
  },

  async preview(code: string): Promise<{ spaceId: string; spaceName: string } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('preview_invite', { p_code: code.toUpperCase() });
    if (error || !data) return null;
    return data as { spaceId: string; spaceName: string };
  },

  async join(code: string, displayName: string, colorIndex: number): Promise<{ spaceId: string; memberId: string }> {
    if (!supabase) throw new Error('Supabase no configurado');
    const { data, error } = await supabase.rpc('join_space_with_code', {
      p_code: code.toUpperCase(),
      p_display_name: displayName,
      p_color_index: colorIndex,
    });
    if (error) throw new Error(error.message);
    return data as { spaceId: string; memberId: string };
  },

  async listForSpace(spaceId: string): Promise<SpaceInvite[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('space_invites').select('*')
      .eq('space_id', spaceId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    return (data ?? [])
      .filter((r: { use_count: number; max_uses: number }) => r.use_count < r.max_uses)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({
        id: r.id, code: r.code, spaceName: r.space_name,
        expiresAt: r.expires_at, maxUses: r.max_uses,
        useCount: r.use_count, createdAt: r.created_at,
      }));
  },

  async revoke(inviteId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('space_invites').delete().eq('id', inviteId);
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export { generateId };
