'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { profileService } from '@/app/lib/services';

interface TrustFactor {
  label: string;
  completed: boolean;
}

interface TrustScoreCardProps {
  score?: number;
  loading?: boolean;
}

const defaultFactors: TrustFactor[] = [
  { label: 'Email verificado', completed: false },
  { label: '2FA ativado', completed: false },
  { label: 'Backup realizado', completed: false },
  { label: 'Foto de perfil', completed: false },
  { label: '@username definido', completed: false },
  { label: 'Conta +30 dias', completed: false },
  { label: '3+ transações', completed: false },
];

export function TrustScoreCard({ score: propScore, loading: propLoading }: TrustScoreCardProps) {
  const [score, setScore] = useState(propScore ?? 0);
  const [factors, setFactors] = useState<TrustFactor[]>(defaultFactors);
  const [loading, setLoading] = useState(propLoading ?? true);

  useEffect(() => {
    if (propScore !== undefined) {
      setScore(propScore);
      setLoading(false);
      return;
    }

    profileService
      .getTrustScore()
      .then((data) => {
        setScore(data?.score ?? 0);
        if (Array.isArray(data?.factors)) setFactors(data.factors);
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, [propScore]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="atlas-card">
      <div className="flex items-center gap-5">
        {/* Circular progress */}
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="6"
            />
            {!loading && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                transform="rotate(-90 48 48)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {loading ? (
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{
                  borderColor: 'var(--border-default)',
                  borderTopColor: 'var(--accent)',
                }}
              />
            ) : (
              <>
                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {score}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  /100
                </span>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Nível de confiança
          </h3>
          <div className="space-y-1.5">
            {factors.map((factor) => (
              <div key={factor.label} className="flex items-center gap-2">
                {factor.completed ? (
                  <Check size={14} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <X size={14} style={{ color: 'var(--text-muted)' }} />
                )}
                <span
                  className="text-xs"
                  style={{
                    color: factor.completed ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {factor.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
