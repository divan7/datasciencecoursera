import { List, BarChart3, PlusCircle, Settings, LayoutDashboard, ClipboardCheck, ChevronDown } from 'lucide-react';
import type { SpacePlan } from '../types/space';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings';

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

export function Header({ activeTab, onTabChange, memberName, memberColor, spaceName, onAvatarTap, pendingFixed = 0, plan }: HeaderProps) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'add',       icon: <PlusCircle size={14} />,      label: 'Registrar' },
    { id: 'list',      icon: <List size={14} />,            label: 'Gastos' },
    { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
    { id: 'checklist', icon: <ClipboardCheck size={14} />,  label: 'Fijos', badge: pendingFixed },
    { id: 'report',    icon: <BarChart3 size={14} />,       label: 'Reporte' },
    { id: 'settings',  icon: <Settings size={14} />,        label: 'Config' },
  ];

  const initials = memberName.slice(0, 2).toUpperCase();

  return (
    <header className="text-white shadow-lg" style={{ backgroundColor: '#0f766e' }}>
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="10" fill="white" fillOpacity="0.15"/>
              <path d="M18 5L4 16h4v13h8v-8h4v8h8V16h4L18 5z" fill="white"/>
            </svg>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight">Orden Casa</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-teal-200 text-xs font-medium leading-none">by SOIHogar</p>
                {plan === 'free' && (
                  <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded-full leading-none font-semibold">Free</span>
                )}
                {plan === 'premium' && (
                  <span className="text-xs bg-yellow-400/90 text-yellow-900 px-1.5 py-0.5 rounded-full leading-none font-bold">⭐ Premium</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onAvatarTap}
            className="flex items-center gap-2 bg-white/15 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-white/25 active:scale-95 transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-none text-white">{memberName}</p>
              <p className="text-xs text-teal-200 leading-none mt-0.5 truncate max-w-[80px]">{spaceName}</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: memberColor }}
            >
              {initials}
            </div>
            <ChevronDown size={14} className="text-teal-200 flex-shrink-0" />
          </button>
        </div>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white text-teal-800' : 'text-teal-100 hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span style={{ fontSize: '9px' }} className="font-medium">{tab.label}</span>
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
