import { List, BarChart3, PlusCircle, Settings, LayoutDashboard } from 'lucide-react';
import type { User as UserType } from '../types/expense';

type Tab = 'add' | 'list' | 'dashboard' | 'report' | 'settings';

interface HeaderProps {
  currentUser: UserType;
  onUserSwitch: (user: UserType) => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userName1: string;
  userName2: string;
}

export function Header({ currentUser, onUserSwitch, activeTab, onTabChange, userName1, userName2 }: HeaderProps) {
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
            <button
              onClick={() => onUserSwitch('Ivan')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Ivan' ? 'bg-white text-blue-800' : 'text-blue-200 hover:text-white'
              }`}
            >
              {userName1}
            </button>
            <button
              onClick={() => onUserSwitch('Esposa')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Esposa' ? 'bg-white text-blue-800' : 'text-blue-200 hover:text-white'
              }`}
            >
              {userName2}
            </button>
          </div>
        </div>

        <nav className="flex gap-1">
          {([
            { id: 'add',       icon: <PlusCircle size={14} />,      label: 'Registrar' },
            { id: 'list',      icon: <List size={14} />,            label: 'Gastos' },
            { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Dashboard' },
            { id: 'report',    icon: <BarChart3 size={14} />,       label: 'Reporte' },
            { id: 'settings',  icon: <Settings size={14} />,        label: 'Config' },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-800' : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              {tab.icon}
              <span style={{ fontSize: '9px' }}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
