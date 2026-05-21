import { User, BarChart3, PlusCircle, Settings } from 'lucide-react';
import type { User as UserType } from '../types/expense';

interface HeaderProps {
  currentUser: UserType;
  onUserSwitch: (user: UserType) => void;
  activeTab: 'add' | 'list' | 'report' | 'settings';
  onTabChange: (tab: 'add' | 'list' | 'report' | 'settings') => void;
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
          {/* User switcher */}
          <div className="flex gap-1 bg-blue-800 rounded-full p-1">
            <button
              onClick={() => onUserSwitch('Ivan')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Ivan'
                  ? 'bg-white text-blue-800'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              {userName1}
            </button>
            <button
              onClick={() => onUserSwitch('Esposa')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                currentUser === 'Esposa'
                  ? 'bg-white text-blue-800'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              {userName2}
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1">
          {[
            { id: 'add', icon: <PlusCircle size={16} />, label: 'Registrar' },
            { id: 'list', icon: <User size={16} />, label: 'Gastos' },
            { id: 'report', icon: <BarChart3 size={16} />, label: 'Reporte' },
            { id: 'settings', icon: <Settings size={16} />, label: 'Config' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-800'
                  : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
