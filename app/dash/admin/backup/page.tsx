'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/app/lib/services';
import {
  HardDrive,
  Database,
  Code,
  Settings,
  Package,
  Lock,
  Unlock,
  Download,
  Trash2,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
  Play,
  Pause,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  ChevronLeft,
  Copy,
  FileKey,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface BackupSummary {
  lastBackup: {
    id: string;
    type: string;
    date: string;
    size: number;
  } | null;
  totalBackups: number;
  nextScheduled: {
    scheduleName: string;
    nextRun: string;
  } | null;
  diskUsage: {
    used: number;
    available: number;
    backupDirSize: number;
  };
}

interface BackupHistoryItem {
  id: string;
  backupType: string;
  status: string;
  filePath: string | null;
  fileSize: number | null;
  checksum: string | null;
  isEncrypted: boolean;
  downloadCount: number;
  maxDownloads: number;
  emailSent: boolean;
  errorMessage: string | null;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  schedule?: { name: string } | null;
}

interface BackupSchedule {
  id: string;
  name: string;
  backupType: string;
  cronExpression: string;
  emailTargets: string[];
  retentionDays: number;
  isActive: boolean;
  encryptBackups: boolean;
  lastRun: { status: string; completedAt: string } | null;
  nextRun: string | null;
  totalRuns: number;
}

interface DbTable {
  name: string;
  rowCount: number;
}

// ==================== HELPERS ====================

function formatSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function getStatusBadge(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendente' },
    RUNNING: { color: 'bg-blue-500/20 text-blue-400', label: 'Executando' },
    COMPLETED: { color: 'bg-green-500/20 text-green-400', label: 'Concluido' },
    FAILED: { color: 'bg-red-500/20 text-red-400', label: 'Falhou' },
    EXPIRED: { color: 'bg-gray-500/20 text-gray-400', label: 'Expirado' },
  };
  const badge = map[status] || { color: 'bg-gray-500/20 text-gray-400', label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
      {badge.label}
    </span>
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'DATABASE': return <Database className="w-4 h-4" />;
    case 'CODE': return <Code className="w-4 h-4" />;
    case 'CONFIGS': return <Settings className="w-4 h-4" />;
    case 'TOTAL': return <Package className="w-4 h-4" />;
    default: return <HardDrive className="w-4 h-4" />;
  }
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DATABASE: 'Banco de Dados',
    CODE: 'Codigo-fonte',
    CONFIGS: 'Configuracoes',
    TOTAL: 'Backup Total',
  };
  return map[type] || type;
}

// Password strength meter
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Razoavel', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Boa', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Forte', color: 'bg-green-500' };
  return { score, label: 'Excelente', color: 'bg-emerald-500' };
}

// ==================== MAIN COMPONENT ====================

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'schedules' | 'decrypt'>('new');
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      const data = await adminService.getBackupSummary();
      setSummary(data);
    } catch {
      toast.error('Erro ao carregar resumo');
    }
  }, []);

  useEffect(() => {
    loadSummary().finally(() => setLoading(false));
  }, [loadSummary]);

  const tabs = [
    { id: 'new' as const, label: 'Novo Backup', icon: Plus },
    { id: 'history' as const, label: 'Historico', icon: Clock },
    { id: 'schedules' as const, label: 'Agendamentos', icon: Calendar },
    { id: 'decrypt' as const, label: 'Descriptografar', icon: FileKey },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Backups</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Gerenciamento de backups com criptografia AES-256-GCM
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadSummary().finally(() => setLoading(false)); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                <Clock className="w-3.5 h-3.5" />
                Ultimo Backup
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {summary.lastBackup ? formatDate(summary.lastBackup.date) : 'Nenhum'}
              </p>
              {summary.lastBackup && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {getTypeLabel(summary.lastBackup.type)} - {formatSize(summary.lastBackup.size)}
                </p>
              )}
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                <HardDrive className="w-3.5 h-3.5" />
                Total de Backups
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {summary.totalBackups}
              </p>
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Proximo Agendado
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {summary.nextScheduled ? formatDate(summary.nextScheduled.nextRun) : 'Nenhum'}
              </p>
              {summary.nextScheduled && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {summary.nextScheduled.scheduleName}
                </p>
              )}
            </div>

            <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-2">
                <Server className="w-3.5 h-3.5" />
                Uso de Disco
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formatSize(summary.diskUsage.backupDirSize)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {formatSize(summary.diskUsage.available)} disponivel
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'new' && <NewBackupTab onComplete={loadSummary} />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'decrypt' && <DecryptTab />}
      </div>
    </>
  );
}

// ==================== NEW BACKUP TAB ====================

function NewBackupTab({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [backupType, setBackupType] = useState('DATABASE');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [allTables, setAllTables] = useState<DbTable[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailTargets, setEmailTargets] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (backupType === 'DATABASE') {
      adminService.getDatabaseTables().then(setAllTables).catch(() => {});
    }
  }, [backupType]);

  useEffect(() => {
    if (selectAll) {
      setSelectedTables(allTables.map((t) => t.name));
    } else {
      setSelectedTables([]);
    }
  }, [selectAll, allTables]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return backupType !== '';
      case 2:
        if (encrypt) {
          if (passphrase.length < 12) return false;
          if (passphrase !== passphraseConfirm) return false;
          if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(passphrase)) return false;
        }
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data: any = {
        backupType,
        encrypt,
        keepOnServer: true,
      };

      if (backupType === 'DATABASE' && selectedTables.length > 0 && selectedTables.length < allTables.length) {
        data.tables = selectedTables;
      }

      if (encrypt && passphrase) {
        data.passphrase = passphrase;
      }

      if (sendEmail && emailTargets.length > 0) {
        data.emailTargets = emailTargets;
      }

      const res = await adminService.createBackup(data);
      setResult(res);
      toast.success('Backup iniciado com sucesso!');
      onComplete();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao criar backup';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  if (result) {
    return (
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Backup Iniciado
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          O backup esta sendo executado em segundo plano. Acompanhe o progresso na aba Historico.
        </p>
        <p className="text-xs text-[var(--text-muted)] font-mono mb-6">
          ID: {result.id}
        </p>
        <button
          onClick={() => { setResult(null); setStep(1); setPassphrase(''); setPassphraseConfirm(''); }}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm"
        >
          Criar Outro Backup
        </button>
      </div>
    );
  }

  const strength = getPasswordStrength(passphrase);

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]">
      {/* Step indicators */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
        {['Escopo', 'Criptografia', 'Revisar'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1
                ? 'bg-green-500 text-white'
                : step === i + 1
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}>
              {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
              {label}
            </span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-[var(--text-muted)] mx-2" />}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Step 1: Scope */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Tipo de Backup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'TOTAL', icon: Package, label: 'Backup Total', desc: 'Banco + Codigo + Configs' },
                { type: 'DATABASE', icon: Database, label: 'Banco de Dados', desc: 'PostgreSQL dump completo' },
                { type: 'CODE', icon: Code, label: 'Codigo-fonte', desc: 'Repositorios Atlas-API e Atlas-Panel' },
                { type: 'CONFIGS', icon: Settings, label: 'Configuracoes', desc: '.env, Nginx, Postfix, etc' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setBackupType(opt.type)}
                  className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                    backupType === opt.type
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 mt-0.5 ${backupType === opt.type ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                  <div>
                    <p className={`text-sm font-medium ${backupType === opt.type ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Table selection for DATABASE type */}
            {backupType === 'DATABASE' && allTables.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">
                    Tabelas ({selectedTables.length}/{allTables.length})
                  </h4>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                      className="rounded border-[var(--border-default)]"
                    />
                    Selecionar Todas
                  </label>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-default)]">
                  {allTables.map((table) => (
                    <label key={table.name} className="flex items-center justify-between py-1.5 px-2 hover:bg-[var(--bg-hover)] rounded cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTables([...selectedTables, table.name]);
                            } else {
                              setSelectedTables(selectedTables.filter((t) => t !== table.name));
                              setSelectAll(false);
                            }
                          }}
                          className="rounded border-[var(--border-default)]"
                        />
                        <span className="text-sm text-[var(--text-primary)] font-mono">{table.name}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {table.rowCount.toLocaleString()} registros
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Encryption & Delivery */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Criptografia e Entrega
            </h3>

            {/* Encryption toggle */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[var(--accent)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Criptografia AES-256-GCM</p>
                  <p className="text-xs text-[var(--text-muted)]">Argon2id para derivacao de chave</p>
                </div>
              </div>
              <button
                onClick={() => setEncrypt(!encrypt)}
                className={`relative w-11 h-6 rounded-full transition-colors ${encrypt ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${encrypt ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {encrypt && (
              <div className="space-y-4">
                {/* Passphrase */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Passphrase
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Minimo 12 caracteres"
                      autoComplete="new-password"
                      data-lpignore="true"
                      className="w-full px-3 py-2 pr-10 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passphrase.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-[var(--bg-hover)]'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${strength.score >= 4 ? 'text-green-400' : strength.score >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm passphrase */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Confirmar Passphrase
                  </label>
                  <input
                    type="password"
                    value={passphraseConfirm}
                    onChange={(e) => setPassphraseConfirm(e.target.value)}
                    placeholder="Repita a passphrase"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] text-sm"
                  />
                  {passphraseConfirm.length > 0 && passphrase !== passphraseConfirm && (
                    <p className="text-xs text-red-400 mt-1">Passphrases nao conferem</p>
                  )}
                </div>

                {/* Warning */}
                <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Aviso Importante</p>
                    <p className="text-xs text-amber-400/80 mt-1">
                      Esta senha NÃO é armazenada no servidor. Se você perder a passphrase,
                      o backup sera IRRECUPERAVEL. Guarde em local seguro.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email delivery */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-[var(--border-default)]"
                />
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-primary)]">Enviar notificacao por email</span>
              </label>
              {sendEmail && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && emailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
                          e.preventDefault();
                          if (!emailTargets.includes(emailInput.trim())) {
                            setEmailTargets([...emailTargets, emailInput.trim()]);
                          }
                          setEmailInput('');
                        }
                      }}
                      placeholder="email@exemplo.com (Enter para adicionar)"
                      className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (emailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
                          if (!emailTargets.includes(emailInput.trim())) {
                            setEmailTargets([...emailTargets, emailInput.trim()]);
                          }
                          setEmailInput('');
                        }
                      }}
                      className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-30"
                      disabled={!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())}
                    >
                      +
                    </button>
                  </div>
                  {emailTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {emailTargets.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full text-xs text-[var(--text-secondary)]"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => setEmailTargets(emailTargets.filter((e) => e !== email))}
                            className="text-[var(--text-muted)] hover:text-red-400"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Revisar e Confirmar
            </h3>

            <div className="space-y-3 bg-[var(--bg-elevated)] rounded-lg p-4 border border-[var(--border-default)]">
              <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)]">Tipo</span>
                <span className="text-sm text-[var(--text-primary)] font-medium flex items-center gap-2">
                  {getTypeIcon(backupType)}
                  {getTypeLabel(backupType)}
                </span>
              </div>

              {backupType === 'DATABASE' && (
                <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                  <span className="text-sm text-[var(--text-muted)]">Tabelas</span>
                  <span className="text-sm text-[var(--text-primary)]">
                    {selectedTables.length === allTables.length ? 'Todas' : `${selectedTables.length} selecionadas`}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)]">Criptografia</span>
                <span className="text-sm text-[var(--text-primary)] flex items-center gap-1">
                  {encrypt ? (
                    <><Lock className="w-3.5 h-3.5 text-green-400" /> AES-256-GCM</>
                  ) : (
                    <><Unlock className="w-3.5 h-3.5 text-yellow-400" /> Sem criptografia</>
                  )}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-[var(--text-muted)]">Email</span>
                <span className="text-sm text-[var(--text-primary)]">
                  {sendEmail && emailTargets.length > 0 ? emailTargets.join(', ') : 'Nao'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Proximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
              ) : (
                <><Play className="w-4 h-4" /> Iniciar Backup</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== HISTORY TAB ====================

function HistoryTab() {
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ status: '', backupType: '' });
  const pageSize = 15;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { skip: page * pageSize, take: pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.backupType) params.backupType = filters.backupType;

      const data = await adminService.getBackupHistory(params);
      setHistory(data.items);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar historico');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleDownload = async (id: string) => {
    try {
      const data = await adminService.getBackupDownloadUrl(id);
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este backup?')) return;
    try {
      await adminService.deleteBackup(id);
      toast.success('Backup excluido');
      loadHistory();
    } catch {
      toast.error('Erro ao excluir backup');
    }
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]">
      {/* Filters */}
      <div className="p-4 border-b border-[var(--border-default)] flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(0); }}
          className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
        >
          <option value="">Todos os Status</option>
          <option value="COMPLETED">Concluido</option>
          <option value="RUNNING">Executando</option>
          <option value="FAILED">Falhou</option>
          <option value="PENDING">Pendente</option>
          <option value="EXPIRED">Expirado</option>
        </select>

        <select
          value={filters.backupType}
          onChange={(e) => { setFilters({ ...filters, backupType: e.target.value }); setPage(0); }}
          className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
        >
          <option value="">Todos os Tipos</option>
          <option value="DATABASE">Banco de Dados</option>
          <option value="CODE">Codigo-fonte</option>
          <option value="CONFIGS">Configuracoes</option>
          <option value="TOTAL">Backup Total</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <HardDrive className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum backup encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Data</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Tamanho</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Cripto</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="py-3 px-4">
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(item.startedAt)}</p>
                    {item.schedule && (
                      <p className="text-xs text-[var(--text-muted)]">{item.schedule.name}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                      {getTypeIcon(item.backupType)}
                      {getTypeLabel(item.backupType)}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                    {formatSize(item.fileSize)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.isEncrypted ? (
                      <Lock className="w-4 h-4 text-green-400 mx-auto" />
                    ) : (
                      <Unlock className="w-4 h-4 text-[var(--text-muted)] mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {item.status === 'COMPLETED' && item.filePath && (
                        <button
                          onClick={() => handleDownload(item.id)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-muted)]">
            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} de {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded disabled:opacity-30"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SCHEDULES TAB ====================

function SchedulesTab() {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [backupType, setBackupType] = useState('DATABASE');
  const [cronPreset, setCronPreset] = useState('daily');
  const [customCron, setCustomCron] = useState('');
  const [schedEmailInput, setSchedEmailInput] = useState('');
  const [schedEmailTargets, setSchedEmailTargets] = useState<string[]>([]);
  const [retentionDays, setRetentionDays] = useState(14);
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [serverPassphrase, setServerPassphrase] = useState('');
  const [serverPassphraseConfirm, setServerPassphraseConfirm] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getBackupSchedules();
      setSchedules(data);
    } catch {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const passphraseValid = !encryptEnabled || (
    serverPassphrase.length >= 12 &&
    serverPassphrase === serverPassphraseConfirm &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(serverPassphrase)
  );

  const handleCreate = async () => {
    if (!name.trim() || !passphraseValid) return;
    setCreating(true);
    try {
      await adminService.createBackupSchedule({
        name,
        backupType,
        cronExpression: cronPreset === 'custom' ? customCron : cronPreset,
        emailTargets: schedEmailTargets.length > 0 ? schedEmailTargets : undefined,
        retentionDays,
        encryptServerSide: encryptEnabled || undefined,
        serverPassphrase: encryptEnabled ? serverPassphrase : undefined,
      });
      toast.success('Agendamento criado');
      setShowCreate(false);
      setName('');
      setEncryptEnabled(false);
      setServerPassphrase('');
      setServerPassphraseConfirm('');
      loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar agendamento');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await adminService.toggleBackupSchedule(id);
      loadSchedules();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      await adminService.deleteBackupSchedule(id);
      toast.success('Agendamento excluido');
      loadSchedules();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const presets = [
    { value: 'daily', label: 'Diario (02:00)' },
    { value: 'weekly', label: 'Semanal (Dom 02:00)' },
    { value: 'monthly', label: 'Mensal (Dia 1, 02:00)' },
    { value: 'every-3h', label: 'A cada 3 horas' },
    { value: 'every-6h', label: 'A cada 6 horas' },
    { value: 'every-12h', label: 'A cada 12 horas' },
    { value: 'custom', label: 'Personalizado (cron)' },
  ];

  return (
    <div className="space-y-4">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] p-6 space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Novo Agendamento</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Backup diario DB"
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Tipo</label>
              <select
                value={backupType}
                onChange={(e) => setBackupType(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
              >
                <option value="DATABASE">Banco de Dados</option>
                <option value="CODE">Codigo-fonte</option>
                <option value="CONFIGS">Configuracoes</option>
                <option value="TOTAL">Backup Total</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Frequencia</label>
              <select
                value={cronPreset}
                onChange={(e) => setCronPreset(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
              >
                {presets.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {cronPreset === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Expressao Cron
                </label>
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 */6 * * *"
                  className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Retencao (dias)
              </label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                min={1}
                max={365}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Emails (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={schedEmailInput}
                  onChange={(e) => setSchedEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && schedEmailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schedEmailInput.trim())) {
                      e.preventDefault();
                      if (!schedEmailTargets.includes(schedEmailInput.trim())) {
                        setSchedEmailTargets([...schedEmailTargets, schedEmailInput.trim()]);
                      }
                      setSchedEmailInput('');
                    }
                  }}
                  placeholder="email@exemplo.com (Enter para adicionar)"
                  className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (schedEmailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schedEmailInput.trim())) {
                      if (!schedEmailTargets.includes(schedEmailInput.trim())) {
                        setSchedEmailTargets([...schedEmailTargets, schedEmailInput.trim()]);
                      }
                      setSchedEmailInput('');
                    }
                  }}
                  className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-30"
                  disabled={!schedEmailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schedEmailInput.trim())}
                >
                  +
                </button>
              </div>
              {schedEmailTargets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {schedEmailTargets.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full text-xs text-[var(--text-secondary)]"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => setSchedEmailTargets(schedEmailTargets.filter((e) => e !== email))}
                        className="text-[var(--text-muted)] hover:text-red-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Encryption section */}
          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setEncryptEnabled(!encryptEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  encryptEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-hover)]'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  encryptEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Criptografar backups
                </span>
                <span className="text-xs text-[var(--text-muted)]">AES-256-GCM + Argon2id</span>
              </div>
            </div>

            {encryptEnabled && (
              <div className="space-y-3 ml-12">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    A passphrase sera armazenada criptografada no servidor com ENCRYPTION_SECRET.
                    Se o servidor for comprometido, a passphrase pode ser exposta.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Passphrase</label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={serverPassphrase}
                        onChange={(e) => setServerPassphrase(e.target.value)}
                        placeholder="Min 12 chars, A-z, 0-9, !@#"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-9 bg-[var(--bg-elevated)] border border-[var(--border-hover)] text-[var(--text-primary)] rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Confirmar</label>
                    <input
                      type="password"
                      value={serverPassphraseConfirm}
                      onChange={(e) => setServerPassphraseConfirm(e.target.value)}
                      placeholder="Repita a passphrase"
                      autoComplete="new-password"
                      className={`w-full px-3 py-2 bg-[var(--bg-elevated)] border rounded-lg text-sm ${
                        serverPassphraseConfirm && serverPassphrase !== serverPassphraseConfirm
                          ? 'border-red-500 text-red-500'
                          : 'border-[var(--border-hover)] text-[var(--text-primary)]'
                      }`}
                    />
                  </div>
                </div>

                {serverPassphrase.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={serverPassphrase.length >= 12 ? 'text-green-500' : 'text-red-400'}>
                      {serverPassphrase.length >= 12 ? '✓' : '✗'} 12+ chars
                    </span>
                    <span className={/[A-Z]/.test(serverPassphrase) ? 'text-green-500' : 'text-red-400'}>
                      {/[A-Z]/.test(serverPassphrase) ? '✓' : '✗'} Maiuscula
                    </span>
                    <span className={/[a-z]/.test(serverPassphrase) ? 'text-green-500' : 'text-red-400'}>
                      {/[a-z]/.test(serverPassphrase) ? '✓' : '✗'} Minuscula
                    </span>
                    <span className={/\d/.test(serverPassphrase) ? 'text-green-500' : 'text-red-400'}>
                      {/\d/.test(serverPassphrase) ? '✓' : '✗'} Numero
                    </span>
                    <span className={/[^a-zA-Z\d]/.test(serverPassphrase) ? 'text-green-500' : 'text-red-400'}>
                      {/[^a-zA-Z\d]/.test(serverPassphrase) ? '✓' : '✗'} Especial
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !passphraseValid}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-30 transition-colors text-sm font-medium"
            >
              {creating ? 'Criando...' : 'Criar Agendamento'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] p-12 text-center">
          <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum agendamento criado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`bg-[var(--bg-card)] rounded-lg border p-4 ${
                schedule.isActive ? 'border-[var(--border-default)]' : 'border-[var(--border-default)] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{schedule.name}</h4>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                    {getTypeIcon(schedule.backupType)}
                    {getTypeLabel(schedule.backupType)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  schedule.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {schedule.isActive ? 'Ativo' : 'Pausado'}
                </span>
              </div>

              <div className="space-y-1.5 mb-3 text-xs text-[var(--text-muted)]">
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Cron: <code className="text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1 rounded">{schedule.cronExpression}</code>
                  {schedule.encryptBackups && (
                    <span className="inline-flex items-center gap-0.5 text-amber-500" title="Criptografado (server-side)">
                      <Lock className="w-3 h-3" /> AES-256
                    </span>
                  )}
                </p>
                {schedule.nextRun && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Proximo: {formatDate(schedule.nextRun)}
                  </p>
                )}
                {schedule.lastRun && (
                  <p className="flex items-center gap-1.5">
                    {schedule.lastRun.status === 'COMPLETED' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    Ultimo: {formatDate(schedule.lastRun.completedAt)}
                  </p>
                )}
                <p>Retencao: {schedule.retentionDays} dias | Execucoes: {schedule.totalRuns}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
                <button
                  onClick={() => handleToggle(schedule.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
                >
                  {schedule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {schedule.isActive ? 'Pausar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== DECRYPT TAB ====================

function DecryptTab() {
  const [expanded, setExpanded] = useState<string | null>('cli');

  const sections = [
    {
      id: 'cli',
      title: 'Metodo 1: Ferramenta CLI (Recomendado)',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Use o script <code className="text-[var(--accent)] bg-[var(--bg-elevated)] px-1 rounded">atlas-decrypt.js</code> na
            sua maquina local para descriptografar backups com seguranca total.
          </p>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'https://api.atlasdao.info/api/v1'}/admin/backup/decrypt-tool`}
            download="atlas-decrypt.js"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Baixar atlas-decrypt.js
          </a>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">1. Instale a dependencia</p>
              <CodeBlock text="npm install argon2" />
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">2. Descriptografe o backup</p>
              <CodeBlock text="node atlas-decrypt.js backup-2026-03-15.atlas-backup" />
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">3. Restaure (banco de dados)</p>
              <CodeBlock text={`gunzip database.sql.gz\npsql -h localhost -p 5433 -U atlas -d fi_atlas_db < database.sql`} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'format',
      title: 'Formato do Arquivo .atlas-backup',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            O formato inclui um header com todos os parametros necessarios para descriptografia,
            seguido dos dados criptografados e um tag de autenticacao GCM.
          </p>
          <div className="bg-[var(--bg-elevated)] rounded-lg p-4 font-mono text-xs text-[var(--text-secondary)] space-y-1">
            <p>[ATLAS_BKP_V1]{'     '}16 bytes - Magic header</p>
            <p>[version]{'          '}1 byte{'  '}- Versao do formato</p>
            <p>[argon2_memory]{'    '}4 bytes - Memory cost</p>
            <p>[argon2_time]{'      '}4 bytes - Time cost</p>
            <p>[argon2_parallel]{'  '}4 bytes - Parallelism</p>
            <p>[salt]{'             '}32 bytes - Salt do Argon2id</p>
            <p>[iv]{'               '}12 bytes - IV do AES-256-GCM</p>
            <p>[backup_type]{'      '}1 byte{'  '}- Tipo do backup</p>
            <p>[filename_len]{'     '}2 bytes - Tamanho do nome</p>
            <p>[filename]{'         '}var{'     '}- Nome original (UTF-8)</p>
            <p>[original_size]{'    '}8 bytes - Tamanho original</p>
            <p>[plaintext_sha256]{''}32 bytes - Hash do plaintext</p>
            <p>[encrypted_data]{'   '}var{'     '}- Dados criptografados</p>
            <p>[gcm_auth_tag]{'     '}16 bytes - Tag de autenticacao</p>
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      title: 'Sobre a Seguranca',
      content: (
        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)]">AES-256-GCM</strong>: Padrao NIST para criptografia autenticada.
            Garante confidencialidade e integridade em uma unica operacao.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Argon2id</strong>: Vencedor do Password Hashing Competition.
            Usa 64MB de memoria por tentativa, tornando ataques de brute-force por GPU/ASIC economicamente inviaveis.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Passphrase</strong>: Nunca armazenada no servidor.
            A derivacao da chave e feita na hora e a memoria e zerada imediatamente apos uso.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">SHA-256</strong>: O hash do arquivo original e armazenado
            no header. Apos descriptografia, o hash e verificado para garantir integridade total.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.id} className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]">
          <button
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</span>
            <ChevronRight
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                expanded === section.id ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expanded === section.id && (
            <div className="px-4 pb-4 border-t border-[var(--border-default)] pt-4">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== CODE BLOCK COMPONENT ====================

function CodeBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[var(--bg-elevated)] rounded-lg p-3 text-xs text-[var(--text-secondary)] font-mono overflow-x-auto border border-[var(--border-default)]">
        {text}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-[var(--bg-card)] rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
