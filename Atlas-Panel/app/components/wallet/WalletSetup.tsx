'use client';

import { useState, useCallback } from 'react';
import { Shield, Eye, EyeOff, ArrowRight, ArrowLeft, AlertTriangle, Download, Upload, WifiOff, BookOpen } from 'lucide-react';
import Bip39Input from './Bip39Input';

interface WalletSetupProps {
  onCreateWallet: (password: string) => Promise<string[]>;
  onImportWallet: (words: string[], password: string) => Promise<void>;
  onSetupComplete: () => void;
  restoredWords?: string[];
}

type Step = 'welcome' | 'password' | 'create-words' | 'verify-words' | 'import';

export default function WalletSetup({ onCreateWallet, onImportWallet, onSetupComplete, restoredWords }: WalletSetupProps) {
  // If we have restored words (from sessionStorage after tab switch), go straight to words screen
  const [step, setStep] = useState<Step>(restoredWords && restoredWords.length === 12 ? 'create-words' : 'welcome');
  const [mode, setMode] = useState<'create' | 'import'>('create');
  const [words, setWords] = useState<string[]>(restoredWords && restoredWords.length === 12 ? restoredWords : []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importWords, setImportWords] = useState<string[]>(Array(12).fill(''));
  const [verifySlots, setVerifySlots] = useState<(string | null)[]>([]);
  const [verifyTargets, setVerifyTargets] = useState<number[]>([]);
  const [verifyPool, setVerifyPool] = useState<string[]>([]);

  const passwordStrength = useCallback((pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }, []);

  const strength = passwordStrength(password);
  const strengthLabels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

  const handleStartCreate = () => {
    setMode('create');
    setStep('password');
  };

  const handleStartImport = () => {
    setMode('import');
    setStep('import');
  };

  const handlePasswordSubmit = async () => {
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (mode === 'create') {
        const generatedWords = await onCreateWallet(password);
        setWords(generatedWords);
        setStep('create-words');
      } else {
        const cleanWords = importWords.map(w => w.trim().toLowerCase()).filter(Boolean);
        if (cleanWords.length !== 12) {
          setError('Insira todas as 12 palavras');
          setLoading(false);
          return;
        }
        await onImportWallet(cleanWords, password);
        onSetupComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar carteira');
    } finally {
      setLoading(false);
    }
  };

  const setupVerification = () => {
    // Fisher-Yates shuffle
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Pick 4 random indices (order is random — NOT sorted)
    const allIndices = Array.from({ length: 12 }, (_, i) => i);
    const shuffled = shuffle(allIndices);
    const indices = shuffled.slice(0, 4);

    setVerifyTargets(indices);
    setVerifySlots(indices.map(() => null));

    // Pool: the 4 correct words + 4 random distractors, all shuffled
    const correctWords = indices.map(i => words[i]);
    const otherWords = words.filter((_, i) => !indices.includes(i));
    const distractors = shuffle(otherWords).slice(0, 4);
    setVerifyPool(shuffle([...correctWords, ...distractors]));
    setStep('verify-words');
  };

  const handleVerifySelect = (word: string, slotIndex: number) => {
    const newSlots = [...verifySlots];
    newSlots[slotIndex] = word;
    setVerifySlots(newSlots);
  };

  const handleVerifySubmit = () => {
    const allCorrect = verifyTargets.every((targetIdx, i) => verifySlots[i] === words[targetIdx]);
    if (!allCorrect) {
      setError('Verificação falhou. Verifique as palavras e tente novamente.');
      return;
    }
    setError('');
    onSetupComplete();
  };

  const handleImportWordChange = (index: number, value: string) => {
    const newWords = [...importWords];
    if (value.includes(' ') && index === 0) {
      const pasted = value.trim().split(/\s+/);
      if (pasted.length === 12) {
        setImportWords(pasted);
        return;
      }
    }
    newWords[index] = value.toLowerCase().trim();
    setImportWords(newWords);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* ===== WELCOME ===== */}
      {step === 'welcome' && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Carteira Liquid</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Carteira non-custodial na Liquid Network. Suas chaves, seus fundos.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleStartCreate}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-semibold">Criar Nova Carteira</div>
                  <div className="text-xs opacity-80">Gerar frase de recuperação</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleStartImport}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-default)]"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-semibold">Importar Carteira</div>
                  <div className="text-xs text-[var(--text-muted)]">Usar frase existente</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] px-4">
            Suas chaves são armazenadas apenas no seu navegador, encriptadas com AES-256-GCM.
          </p>
        </div>
      )}

      {/* ===== PASSWORD ===== */}
      {step === 'password' && (
        <div className="space-y-5">
          <button onClick={() => setStep(mode === 'create' ? 'welcome' : 'import')} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Definir Senha</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Esta senha protege sua carteira. Será necessária para acessar e enviar transações.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] pr-10"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : 'bg-[var(--bg-tertiary)]'}`} />
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Força: {strengthLabels[strength]}</p>
              </div>
            )}

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <button
            onClick={handlePasswordSubmit}
            disabled={loading || !password || !confirmPassword || password.length < 8}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'create' ? 'Gerando carteira...' : 'Importando...'}
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      )}

      {/* ===== SHOW WORDS + WARNING (combined) ===== */}
      {step === 'create-words' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Frase de Recuperação</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Anote estas 12 palavras em papel ou local offline.
            </p>
          </div>

          {/* Warning compacto */}
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                <strong>Anote somente offline.</strong> Nunca salve em fotos, e-mails ou nuvem.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                <strong>A Atlas não tem acesso aos seus fundos</strong> e não pode recuperá-los. Esta frase é o único meio de restaurar sua carteira.
              </p>
            </div>
          </div>

          {/* Words grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]">
                <span className="text-xs text-[var(--text-muted)] w-5 text-right">{i + 1}.</span>
                <span className="text-sm font-mono text-[var(--text-primary)]">{word}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={setupVerification}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Verificar backup
          </button>

          <button
            onClick={onSetupComplete}
            className="w-full py-2 text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)] transition-colors"
          >
            Pular verificação por agora (não recomendado)
          </button>
        </div>
      )}

      {/* ===== VERIFY WORDS ===== */}
      {step === 'verify-words' && (
        <div className="space-y-5">
          <button onClick={() => setStep('create-words')} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-4 h-4" /> Ver palavras novamente
          </button>

          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Verificar Backup</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Selecione a palavra correta para cada posição.
            </p>
          </div>

          <div className="space-y-4">
            {verifyTargets.map((targetIdx, slotIdx) => (
              <div key={targetIdx} className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Qual é a palavra <span className="text-[var(--accent)] font-bold">#{targetIdx + 1}</span>?
                </label>
                <div className="flex flex-wrap gap-2">
                  {verifyPool.map(word => (
                    <button
                      key={`${targetIdx}-${word}`}
                      onClick={() => handleVerifySelect(word, slotIdx)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        verifySlots[slotIdx] === word
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--accent)]'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <button
            onClick={handleVerifySubmit}
            disabled={verifySlots.some(s => s === null)}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      )}

      {/* ===== IMPORT ===== */}
      {step === 'import' && (
        <div className="space-y-5">
          <button onClick={() => setStep('welcome')} className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Importar Carteira</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Insira as 12 palavras da sua frase de recuperação.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {importWords.map((word, i) => (
              <Bip39Input
                key={i}
                index={i}
                value={word}
                onChange={handleImportWordChange}
                onTab={(idx) => {
                  const nextInput = document.querySelector(`[data-word-index="${idx + 1}"]`) as HTMLInputElement;
                  nextInput?.focus();
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setStep('password')}
            disabled={importWords.filter(w => w.trim()).length !== 12}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
