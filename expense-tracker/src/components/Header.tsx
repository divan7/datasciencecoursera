import { List, BarChart3, PlusCircle, Settings, LayoutDashboard, ClipboardCheck, ChevronDown, Receipt } from 'lucide-react';
import type { SpacePlan } from '../types/space';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings' | 'fiscal' | 'admin';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  memberName: string;
  memberColor: string;
  spaceName: string;
  onAvatarTap: () => void;
  pendingFixed?: number;
  plan?: SpacePlan;
}

/** Isotipo SOIHogar: tres anillos entrelazados sobre fondo Ink */
function VinculoLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="white" fillOpacity="0.10" />
      {/* Anillo izquierdo — blanco/gris */}
      <circle cx="13" cy="20" r="8.5" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.2" />
      {/* Anillo central — terra #E8A97A */}
      <circle cx="23" cy="20" r="8.5" fill="none" stroke="#E8A97A" strokeWidth="2.2" />
      {/* Anillo superior — teal light #A8D5DC */}
      <circle cx="18" cy="12" r="8.5" fill="none" stroke="#A8D5DC" strokeWidth="2.2" />
    </svg>
  );
}

const BRAND_BG = '#1A2D33';  // Ink — color principal SOIHogar

export function Header({
  activeTab, onTabChange,
  memberName, memberColor, spaceName,
  onAvatarTap,
  pendingFixed = 0,
  plan,
}: HeaderProps) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'add',       icon: <PlusCircle size={14} />,      label: 'Registrar' },
    { id: 'list',      icon: <List size={14} />,            label: 'Movimientos' },
    { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
    { id: 'checklist', icon: <ClipboardCheck size={14} />,  label: 'Fijos', badge: pendingFixed },
    { id: 'report',    icon: <BarChart3 size={14} />,       label: 'Reporte' },
    { id: 'fiscal',    icon: <Receipt size={14} />,         label: 'Fiscal' },
    { id: 'settings',  icon: <Settings size={14} />,        label: 'Config' },
  ];

  const initials = memberName.slice(0, 2).toUpperCase();

  return (
    <header className="text-white shadow-lg" style={{ backgroundColor: BRAND_BG }}>
      <div className="max-w-2xl mx-auto px-4 py-3">

        {/* ── Top row: logo + member avatar ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <VinculoLogo />
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Orden Casa
              </h1>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold leading-none" style={{ color: '#A8D5DC' }}>
                  by SOIHogar
                </p>
                {plan === 'free' && (
                  <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded-full leading-none font-semibold">
                    Free
                  </span>
                )}
                {plan === 'premium' && (
                  <span className="text-xs bg-yellow-400/90 text-yellow-900 px-1.5 py-0.5 rounded-full leading-none font-bold">
                    ⭐ Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member avatar button */}
          <button
            onClick={onAvatarTap}
            className="flex items-center gap-2 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-white/15 active:scale-95 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-none text-white">{memberName}</p>
              <p className="text-xs leading-none mt-0.5 truncate max-w-[80px]" style={{ color: '#A8D5DC' }}>
                {spaceName}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
              style={{ backgroundColor: memberColor }}
            >
              {initials}
            </div>
            <ChevronDown size={14} style={{ color: '#A8D5DC' }} className="flex-shrink-0" />
          </button>
        </div>

        {/* ── Tab nav ── */}
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-white/10'
              }`}
              style={activeTab === tab.id ? { color: '#1A2D33' } : { color: '#A8D5DC' }}
            >
              {tab.icon}
              <span style={{ fontSize: '9px' }} className="font-semibold">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center px-1 font-bold leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

      </div>
    </header>
  );
}
