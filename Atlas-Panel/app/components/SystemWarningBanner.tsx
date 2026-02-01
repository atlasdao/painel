'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '@/app/lib/api';
import Link from 'next/link';

interface SystemWarning {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  isDismissible: boolean;
  link?: string;
  linkText?: string;
}

export default function SystemWarningBanner() {
  const [warnings, setWarnings] = useState<SystemWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarnings();
  }, []);

  const loadWarnings = async () => {
    try {
      const response = await api.get('/auth/warnings');
      if (response.data?.warnings) {
        setWarnings(response.data.warnings);
      }
    } catch (error) {
      console.error('Error loading warnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (warningId: string) => {
    try {
      await api.post(`/auth/warnings/${warningId}/dismiss`);
      setWarnings(warnings.filter(w => w.id !== warningId));
    } catch (error) {
      console.error('Error dismissing warning:', error);
    }
  };

  const getWarningStyles = (type: string) => {
    switch (type) {
      case 'INFO':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          icon: <Info className="w-5 h-5 text-blue-400" />,
          title: 'text-blue-400',
          text: 'text-blue-300',
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
          title: 'text-yellow-400',
          text: 'text-yellow-300',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
          title: 'text-red-400',
          text: 'text-red-300',
        };
      case 'SUCCESS':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          title: 'text-green-400',
          text: 'text-green-300',
        };
      default:
        return {
          bg: 'bg-gray-500/10 border-gray-500/30',
          icon: <Info className="w-5 h-5 text-gray-400" />,
          title: 'text-gray-400',
          text: 'text-gray-300',
        };
    }
  };

  if (loading || warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {warnings.map((warning) => {
        const styles = getWarningStyles(warning.type);

        return (
          <div
            key={warning.id}
            className={`px-4 py-3 rounded-lg border ${styles.bg} animate-fade-in`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {styles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${styles.title}`}>
                  {warning.title}
                </h4>
                <p className={`text-sm mt-0.5 ${styles.text}`}>
                  {warning.message}
                </p>
                {warning.link && (
                  <Link
                    href={warning.link}
                    target={warning.link.startsWith('http') ? '_blank' : undefined}
                    className={`inline-flex items-center gap-1 text-sm mt-2 ${styles.title} hover:underline`}
                  >
                    {warning.linkText || 'Saiba mais'}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {warning.isDismissible && (
                <button
                  onClick={() => handleDismiss(warning.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                  title="Dispensar"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
