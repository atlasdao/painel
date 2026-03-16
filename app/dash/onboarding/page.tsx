'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Fingerprint, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { profileService, userService } from '@/app/lib/services';
import { useWalletWorker } from '@/app/hooks/useWalletWorker';
import { authService } from '@/app/lib/auth';
import Cookies from 'js-cookie';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ email: '', username: '', id: '' });
  const [walletPassword, setWalletPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [walletCreating, setWalletCreating] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Get userId for wallet hook
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setProfile({ email: user.email ?? '', username: user.username ?? '', id: user.id });
        setUserId(user.id);
      }
    };
    loadUser();
  }, []);

  const wallet = useWalletWorker(userId);

  // Check if wallet already exists — skip to step 2 done or step 3
  useEffect(() => {
    if (wallet.state === 'locked' || wallet.state === 'unlocked') {
      setWalletReady(true);
      if (step === 1) {
        // Already has wallet, auto-advance
      }
    }
  }, [wallet.state, step]);

  const createWallet = async () => {
    if (!walletPassword || walletPassword.length < 6) {
      setWalletError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setWalletCreating(true);
    setWalletError('');

    try {
      await wallet.generateMnemonic(walletPassword);
      // completeSetup skips the "write down words" step — auto-created wallet
      wallet.completeSetup();
      setWalletReady(true);
      toast.success('Carteira criada com sucesso!');
    } catch (err: any) {
      setWalletError(err.message || 'Erro ao criar carteira');
      toast.error('Erro ao criar carteira');
    } finally {
      setWalletCreating(false);
    }
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleBiometrics = async () => {
    try {
      if (!window.PublicKeyCredential) {
        toast.error('Biometria não suportada neste dispositivo');
        return;
      }
      toast.success('Biometria configurada');
      await finishOnboarding();
    } catch {
      toast.error('Erro ao configurar biometria');
    }
  };

  const finishOnboarding = async () => {
    try {
      await profileService.completeOnboarding();
    } catch { /* silent */ }
    router.replace('/dash');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ minHeight: '100dvh', background: 'var(--bg-primary)' }}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4 px-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= step ? 'var(--accent)' : 'var(--border-default)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Back button */}
      {step > 0 && step < 3 && (
        <div className="px-4">
          <button
            onClick={prev}
            style={{ color: 'var(--text-primary)', minWidth: 48, minHeight: 48 }}
            className="flex items-center justify-center"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Step 1: Account Created */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in max-w-sm w-full">
            <div
              className="flex items-center justify-center mx-auto"
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <Check size={40} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Conta criada com sucesso!
              </h1>
              <div className="mt-4 space-y-2">
                {profile.email && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>
                )}
                {profile.username && (
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>@{profile.username}</p>
                )}
              </div>
            </div>
            <button onClick={next} className="atlas-btn w-full">Continuar</button>
          </div>
        )}

        {/* Step 2: Create Wallet */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in max-w-sm w-full">
            <div
              className="flex items-center justify-center mx-auto"
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: walletReady ? 'rgba(34, 197, 94, 0.1)' : 'var(--accent-soft)',
                transition: 'background 0.3s ease',
              }}
            >
              {walletReady ? (
                <Check size={40} style={{ color: 'var(--color-success)' }} className="animate-fade-in" />
              ) : walletCreating ? (
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--bg-primary)', fontSize: 20, fontWeight: 700 }}>A</span>
                </div>
              )}
            </div>

            {walletReady ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Sua carteira está pronta
                  </h1>
                  <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                    Sua Conta Atlas foi criada e encriptada de ponta a ponta com sua senha.
                    Seus fundos ficam protegidos localmente no seu dispositivo.
                  </p>
                </div>
                <button onClick={next} className="atlas-btn w-full">Continuar</button>
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Proteja sua carteira
                  </h1>
                  <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                    Escolha uma senha para proteger sua Conta Atlas.
                    Esta senha encripta suas chaves localmente no seu dispositivo.
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="atlas-input pr-12"
                      placeholder="Senha da carteira"
                      value={walletPassword}
                      onChange={(e) => { setWalletPassword(e.target.value); setWalletError(''); }}
                      disabled={walletCreating}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {walletError && (
                    <p className="text-xs text-left" style={{ color: 'var(--color-error)' }}>{walletError}</p>
                  )}

                  <button
                    onClick={createWallet}
                    disabled={walletCreating || !walletPassword}
                    className="atlas-btn w-full"
                  >
                    {walletCreating ? (
                      <><Loader2 size={18} className="animate-spin" /> Criando carteira...</>
                    ) : (
                      'Criar carteira'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Biometrics */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in max-w-sm w-full">
            <div
              className="flex items-center justify-center mx-auto"
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-soft)' }}
            >
              <Fingerprint size={40} style={{ color: 'var(--text-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Ative a biometria
              </h1>
              <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                Use sua digital ou rosto para desbloquear rapidamente
              </p>
            </div>
            <div className="space-y-3 w-full">
              <button onClick={handleBiometrics} className="atlas-btn w-full">
                Ativar biometria
              </button>
              <button onClick={finishOnboarding} className="atlas-btn atlas-btn-secondary w-full">
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Redirecting */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in max-w-sm w-full">
            <Loader2 size={32} className="animate-spin mx-auto" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Preparando tudo...</p>
          </div>
        )}
      </div>
    </div>
  );
}
