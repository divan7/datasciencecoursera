import { List, BarChart3, PlusCircle, Settings, LayoutDashboard, ClipboardCheck } from 'lucide-react';
import type { User as UserType } from '../types/expense';

type Tab = 'add' | 'list' | 'dashboard' | 'checklist' | 'report' | 'settings';

interface HeaderProps {
  currentUser: UserType;
  onUserSwitch: (user: UserType) => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userName1: string;
  userName2: string;
  pendingFixed?: number;
}

export function Header({ currentUser, onUserSwitch, activeTab, onTabChange, userName1, userName2, pendingFixed = 0 }: HeaderProps) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'add',       icon: <PlusCircle size={14} />,      label: 'Registrar' },
    { id: 'list',      icon: <List size={14} />,            label: 'Gastos' },
    { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
    { id: 'checklist', icon: <ClipboardCheck size={14} />,  label: 'Fijos', badge: pendingFixed },
    { id: 'report',    icon: <BarChart3 size={14} />,       label: 'Reporte' },
    { id: 'settings',  icon: <Settings size={14} />,        label: 'Config' },
  ];

  return (
    <header style={{ backgroundColor: '#1e40af' }} className="text-white shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">GastosMes</h1>
              <p className="text-blue-200 text-xs">Control de gastos familiar</p>
            </div>
          </div>
          <div className="flex gap-1 bg-blue-800 rounded-full p-1">
            <button onClick={() => onUserSwitch('Ivan')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Ivan' ? 'bg-white text-blue-800' : 'text-blue-200 hover:text-white'
              }`}>
              {userName1}
            </button>
            <button onClick={() => onUserSwitch('Esposa')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Esposa' ? 'bg-white text-blue-800' : 'text-blue-200 hover:text-white'
              }`}>
              {userName2}
            </button>
          </div>
        </div>

        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-800' : 'text-blue-200 hover:bg-blue-700'
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
