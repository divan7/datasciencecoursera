import { List, BarChart3, PlusCircle, Settings, LayoutDashboard, ClipboardCheck } from 'lucide-react';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  pendingFixed?: number;
  memberName: string;
  memberColor: string;
  spaceName: string;
  onAvatarTap: () => void;
}

export function Header({ activeTab, onTabChange, pendingFixed = 0, memberName, memberColor, spaceName, onAvatarTap }: HeaderProps) {
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
          {/* Logo + title */}
          <div className="flex items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15"/>
              <path d="M16 6L4 16h4v10h8v-7h4v7h8V16h4L16 6z" fill="white"/>
              <text x="16" y="28" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif" opacity="0.8">SOI</text>
            </svg>
            <div>
              <h1 className="text-lg font-bold leading-tight">Orden Casa</h1>
              <p className="text-teal-200 text-xs leading-tight truncate max-w-[140px]">{spaceName}</p>
            </div>
          </div>

          {/* Member avatar button */}
          <button
            onClick={onAvatarTap}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/30 hover:ring-white/60 active:scale-95 transition-all flex-shrink-0"
            style={{ backgroundColor: memberColor }}
            title={memberName}
          >
            {initials}
          </button>
        </div>

        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white text-teal-800' : 'text-teal-100 hover:bg-teal-700/50'
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
