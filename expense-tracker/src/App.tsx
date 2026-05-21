import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { QuickForm } from './components/QuickForm';
import { TextParser } from './components/TextParser';
import { ImageCapture } from './components/ImageCapture';
import { ExpenseList } from './components/ExpenseList';
import { MonthlyReport } from './components/MonthlyReport';
import { SettingsPanel } from './components/SettingsPanel';
import { useExpenses } from './hooks/useExpenses';
import { loadSettings, saveSettings } from './utils/storage';
import type { User, Expense } from './types/expense';
import './index.css';

type Tab = 'add' | 'list' | 'report' | 'settings';
type InputMode = 'form' | 'text' | 'image';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [inputMode, setInputMode] = useState<InputMode>('form');
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const currentUser = settings.currentUser;

  const handleUserSwitch = useCallback((user: User) => {
    const updated = { ...settings, currentUser: user };
    setSettings(updated);
    saveSettings(updated);
  }, [settings]);

  const handleSaveSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleClearAll = useCallback(() => {
    localStorage.removeItem('expense_tracker_data');
    window.location.reload();
  }, []);

  const handleSaveExpense = useCallback(
    (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      addExpense(data);
      setActiveTab('list');
    },
    [addExpense]
  );

  const modeButtons: { id: InputMode; label: string; emoji: string }[] = [
    { id: 'form', label: 'Formulario', emoji: '📋' },
    { id: 'text', label: 'Texto libre', emoji: '✍️' },
    { id: 'image', label: 'Foto ticket', emoji: '📷' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        onUserSwitch={handleUserSwitch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName1={settings.userName1}
        userName2={settings.userName2}
      />

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
        {activeTab === 'add' && (
          <div className="space-y-4">
            {/* Input mode selector */}
            <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
              {modeButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setInputMode(btn.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    inputMode === btn.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{btn.emoji}</span>
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Input panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              {inputMode === 'form' && (
                <QuickForm
                  currentUser={currentUser}
                  onSave={handleSaveExpense}
                  userName1={settings.userName1}
                  userName2={settings.userName2}
                />
              )}
              {inputMode === 'text' && (
                <TextParser
                  currentUser={currentUser}
                  onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey}
                  userName1={settings.userName1}
                  userName2={settings.userName2}
                />
              )}
              {inputMode === 'image' && (
                <ImageCapture
                  currentUser={currentUser}
                  onSave={handleSaveExpense}
                  apiKey={settings.anthropicApiKey}
                  userName1={settings.userName1}
                  userName2={settings.userName2}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <ExpenseList
            expenses={expenses}
            onDelete={deleteExpense}
            userName1={settings.userName1}
            userName2={settings.userName2}
          />
        )}

        {activeTab === 'report' && (
          <MonthlyReport
            expenses={expenses}
            userName1={settings.userName1}
            userName2={settings.userName2}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onSave={handleSaveSettings}
            expenseCount={expenses.length}
            onClearAll={handleClearAll}
          />
        )}
      </main>
    </div>
  );
}
