'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Clock } from 'lucide-react';

export interface PeriodOption {
  id: string;
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

export interface PeriodFilterProps {
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  isLoading?: boolean;
  className?: string;
}

export default function PeriodFilter({
  selectedPeriod,
  onPeriodChange,
  isLoading = false,
  className = ''
}: PeriodFilterProps) {
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Generate period options dynamically
  const generatePeriodOptions = (): PeriodOption[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 7 days ago
    const days7Start = new Date(today);
    days7Start.setDate(days7Start.getDate() - 6); // Include today

    // 14 days ago
    const days14Start = new Date(today);
    days14Start.setDate(days14Start.getDate() - 13);

    // 30 days ago
    const days30Start = new Date(today);
    days30Start.setDate(days30Start.getDate() - 29);

    // Previous month (first to last day)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // End of today for all periods
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    return [
      {
        id: '7d',
        label: 'Últimos 7 dias',
        value: '7d',
        startDate: days7Start,
        endDate: endOfToday
      },
      {
        id: '14d',
        label: 'Últimos 14 dias',
        value: '14d',
        startDate: days14Start,
        endDate: endOfToday
      },
      {
        id: '30d',
        label: 'Últimos 30 dias',
        value: '30d',
        startDate: days30Start,
        endDate: endOfToday
      },
      {
        id: 'lastMonth',
        label: 'Mês passado',
        value: 'lastMonth',
        startDate: lastMonth,
        endDate: lastMonthEnd
      }
    ];
  };

  const [periodOptions] = useState<PeriodOption[]>(generatePeriodOptions());

  // Load saved period preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('commerce-period-preference');
      if (saved) {
        const savedPeriod = JSON.parse(saved);
        const matchingOption = periodOptions.find(option => option.id === savedPeriod.id);
        if (matchingOption) {
          onPeriodChange(matchingOption);
        }
      }
    } catch (error) {
      console.warn('Failed to load period preference:', error);
    }
  }, [periodOptions, onPeriodChange]);

  // Save period preference to localStorage
  const savePeriodPreference = (period: PeriodOption) => {
    try {
      localStorage.setItem('commerce-period-preference', JSON.stringify({
        id: period.id,
        label: period.label,
        value: period.value
      }));
    } catch (error) {
      console.warn('Failed to save period preference:', error);
    }
  };

  const handleQuickPeriodSelect = (period: PeriodOption) => {
    onPeriodChange(period);
    savePeriodPreference(period);
    setShowCustomDate(false);
  };

  const handleCustomDateSubmit = () => {
    if (!customStartDate || !customEndDate) return;

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    // Set end date to end of day for inclusive filtering
    endDate.setHours(23, 59, 59, 999);

    // Validate date range
    if (startDate > endDate) {
      alert('Data inicial deve ser anterior à data final');
      return;
    }

    // Check max 1 year range
    const maxDateRange = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxDateRange) {
      alert('Período máximo permitido é de 1 ano');
      return;
    }

    const customPeriod: PeriodOption = {
      id: 'custom',
      label: `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      value: 'custom',
      startDate,
      endDate
    };

    onPeriodChange(customPeriod);
    savePeriodPreference(customPeriod);
    setShowCustomDate(false);
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`period-filter-container ${className}`}>
      {/* Quick Period Shortcuts */}
      <div className="period-shortcuts mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Período</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleQuickPeriodSelect(option)}
              disabled={isLoading}
              className={`period-shortcut-btn touch-target ${
                selectedPeriod?.id === option.id ? 'active' : ''
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="custom-date-section">
        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          disabled={isLoading}
          className={`custom-date-toggle touch-target w-full ${
            selectedPeriod?.id === 'custom' ? 'active' : ''
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">
                {selectedPeriod?.id === 'custom' ? selectedPeriod.label : 'Período personalizado'}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showCustomDate ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {showCustomDate && (
          <div className="custom-date-inputs mt-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Data inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={formatDateForInput(new Date())}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Data final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={formatDateForInput(new Date())}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCustomDateSubmit}
                disabled={!customStartDate || !customEndDate || isLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
              >
                Aplicar
              </button>
              <button
                onClick={() => {
                  setShowCustomDate(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors touch-target"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Current Selection Info */}
      {selectedPeriod && (
        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {selectedPeriod.label}
              </p>
              <p className="text-xs text-gray-400">
                {selectedPeriod.startDate.toLocaleDateString('pt-BR')} - {selectedPeriod.endDate.toLocaleDateString('pt-BR')}
              </p>
            </div>
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500/20 border-t-purple-500"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}