'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/app/lib/auth';
import { userService, profileService } from '@/app/lib/services';
import api, { API_URL } from '@/app/lib/api';
import AvatarUploader from '@/app/components/AvatarUploader';
import Modal2FA from '@/app/components/Modal2FA';
import { User, Users, Lock, Shield, Save, Loader, Eye, EyeOff, AlertTriangle, TrendingUp, Calendar, Link, Clock, Key, Send, CheckCircle, XCircle, AlertCircle, QrCode, Wallet, Bell, Code, Copy, Webhook } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { triggerConfetti } from '@/app/lib/confetti';
import { LiquidWalletValidator } from '@/app/lib/validators/wallet';
import { validatePixKey, formatPixKey, detectPixKeyType, getPixKeyTypeLabel } from '@/app/lib/validators/pix';
import UserLimitsDisplay from '@/app/components/UserLimitsDisplay';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import dynamic from 'next/dynamic';

export default function SettingsPage() {

  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'wallet' | 'notifications' | 'api'>('profile');
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Tab scroll indicators
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Profile State
  const [profile, setProfile] = useState({
    email: '',
    username: '',
    role: '',
    createdAt: '',
    profilePicture: '',
    defaultWalletAddress: '',
    defaultWalletType: '',
    pixKey: '',
    twoFactorEnabled: false,
    isAccountValidated: false,
    commerceMode: false,
    commerceModeActivatedAt: null,
  });

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 2FA State
  const [twoFASetup, setTwoFASetup] = useState<{
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
  }>({});
  const [twoFAToken, setTwoFAToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  // Wallet State
  const [walletForm, setWalletForm] = useState({
    address: '',
    type: 'LIQUID' as 'LIQUID',
    pixKey: '',
  });
  const [walletError, setWalletError] = useState<string | null>(null);
  const [pixKeyError, setPixKeyError] = useState<string | null>(null);

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    transactionAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
    notifyApprovedSales: true,
    notifyReviewSales: true,
  });

  // API Key Request State
  const [apiKeyRequests, setApiKeyRequests] = useState<any[]>([]);
  const [apiKeyForm, setApiKeyForm] = useState({
    usageReason: '',
    serviceUrl: '',
    estimatedVolume: '',
    usageType: 'SINGLE_CPF' as 'SINGLE_CPF' | 'MULTIPLE_CPF',
    contactInfo: '',
  });
  const [loadingApiKey, setLoadingApiKey] = useState(false);

  // Set active tab from URL
  useEffect(() => {
    if (tabFromUrl && ['profile', 'security', 'wallet', 'notifications', 'api'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    const init = async () => {
      setIsPageLoading(true);
      await loadUserProfile();
      await loadApiKeyRequests();
      setIsPageLoading(false);
    };
    init();
  }, []);

  // Scroll detection for tab navigation gradients
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      // Show left gradient if scrolled right
      setShowLeftGradient(scrollLeft > 10);
      // Show right gradient if there's more content to the right
      setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
    };

    // Initial check
    checkScroll();

    // Add scroll listener
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // Optional: Initial hint animation - scroll a bit to show it's scrollable
    const hintTimeout = setTimeout(() => {
      if (container.scrollWidth > container.clientWidth) {
        container.scrollTo({ left: 30, behavior: 'smooth' });
        setTimeout(() => {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        }, 600);
      }
    }, 300);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(hintTimeout);
    };
  }, [isPageLoading]); // Re-run when page loading completes

  const loadApiKeyRequests = async () => {
    try {
      const response = await api.get('/api-key-requests/my-requests');
      setApiKeyRequests(response.data);
    } catch (error) {
      console.error('Error loading API key requests:', error);
    }
  };

  const handleApiKeyRequest = async () => {
    if (!apiKeyForm.usageReason || !apiKeyForm.serviceUrl || !apiKeyForm.estimatedVolume || !apiKeyForm.contactInfo) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoadingApiKey(true);
    try {
      await api.post('/api-key-requests', apiKeyForm);
      toast.success('✅ Solicitação de API Key enviada com sucesso!', {
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      triggerConfetti.success();

      // Reset form and reload requests
      setApiKeyForm({
        usageReason: '',
        serviceUrl: '',
        estimatedVolume: '',
        usageType: 'SINGLE_CPF',
        contactInfo: '',
      });
      await loadApiKeyRequests();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao solicitar API Key';
      toast.error(errorMessage, {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setLoadingApiKey(false);
    }
  };

  const copyApiKey = (apiKey: string | null | undefined) => {
    if (!apiKey) {
      toast.error('API Key não disponível para cópia', {
        style: { background: '#ef4444', color: '#fff' },
        duration: 2000,
      });
      return;
    }

    navigator.clipboard.writeText(apiKey);
    toast.success('✓ API Key copiada!', {
      style: { background: '#10b981', color: '#fff' },
      duration: 2000,
    });
  };

  const toggleApiKeyVisibility = (apiKeyId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [apiKeyId]: !prev[apiKeyId]
    }));
  };

  const formatApiKey = (apiKey: string | null | undefined, isVisible: boolean) => {
    if (!apiKey) {
      return 'API Key não disponível';
    }

    if (isVisible) {
      return apiKey;
    }
    // Show first 8 and last 4 characters, censor the middle
    if (apiKey.length <= 12) {
      return '•'.repeat(apiKey.length);
    }
    return `${apiKey.substring(0, 8)}${'•'.repeat(Math.max(8, apiKey.length - 12))}${apiKey.substring(apiKey.length - 4)}`;
  };

  const loadUserProfile = async () => {
    try {
      // Try to load fresh profile data from API
      const response = await api.get('/auth/profile');
      const user = response.data;


      if (user) {
        setProfile({
          email: user.email || '',
          username: user.username || '',
          role: user.role || 'user',
          createdAt: user.createdAt || '',
          profilePicture: user.profilePicture || '',
          defaultWalletAddress: user.defaultWalletAddress || '',
          defaultWalletType: user.defaultWalletType || 'LIQUID',
          pixKey: user.pixKey || '',
          twoFactorEnabled: user.twoFactorEnabled || false,
          isAccountValidated: user.isAccountValidated || false,
          commerceMode: user.commerceMode || false,
          commerceModeActivatedAt: user.commerceModeActivatedAt || null,
        });

        // Set wallet form with current values
        setWalletForm({
          address: user.defaultWalletAddress || '',
          type: user.defaultWalletType || 'LIQUID',
          pixKey: user.pixKey || '',
        });

        // Set notification settings from user profile
        setNotifications(prev => ({
          ...prev,
          notifyApprovedSales: user.notifyApprovedSales ?? true,
          notifyReviewSales: user.notifyReviewSales ?? true,
        }));
      }
    } catch (error) {
      console.error('[LOAD] Error loading profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await profileService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('✅ Senha alterada com sucesso!', {
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      triggerConfetti.success();
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      // Handle specific error messages from backend
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao alterar senha';

      // Translate common error messages to Portuguese
      if (errorMessage.includes('Validation failed')) {
        toast.error('❌ Senha atual incorreta. Verifique e tente novamente.', {
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      } else if (errorMessage.includes('incorrect') || errorMessage.includes('wrong') || errorMessage.includes('incorreta')) {
        toast.error('❌ Senha atual incorreta', {
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      } else if (errorMessage.includes('weak') || errorMessage.includes('fraca')) {
        toast.error('⚠️ Senha muito fraca. Use pelo menos 8 caracteres com números e letras', {
          style: {
            background: '#f59e0b',
            color: '#fff',
          },
        });
      } else {
        toast.error(`❌ ${errorMessage}`, {
          style: {
            background: '#ef4444',
            color: '#fff',
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const response = await profileService.setup2FA();
      setTwoFASetup(response);
      toast.success('QR Code gerado! Escaneie com seu app autenticador');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao configurar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFAToken.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await profileService.verify2FA(twoFAToken);

      if (response.backupCodes) {
        setTwoFASetup({ ...twoFASetup, backupCodes: response.backupCodes });
        setShowBackupCodes(true);
      }

      setProfile({ ...profile, twoFactorEnabled: true });
      toast.success('🛡️ 2FA ativado com sucesso!', {
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      triggerConfetti.success();
      setTwoFAToken('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (code: string) => {
    await profileService.disable2FA(code);
    setProfile({ ...profile, twoFactorEnabled: false });
    setTwoFASetup({});
    setShow2FAModal(false);
    toast.success('🔓 2FA desativado com sucesso', {
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
  };

  const handleWalletUpdate = async (): Promise<boolean> => {
    let hasErrors = false;

    // Validate Liquid address if provided
    if (walletForm.address) {
      const validation = LiquidWalletValidator.validate(walletForm.address);
      if (!validation.valid) {
        toast.error(validation.error || 'Endereço Liquid inválido');
        setWalletError(validation.error || 'Endereço inválido');
        hasErrors = true;
      } else {
        setWalletError(null);
      }
    }

    // Validate PIX key if provided
    if (walletForm.pixKey) {
      const pixValidation = validatePixKey(walletForm.pixKey);
      if (!pixValidation.isValid) {
        toast.error(pixValidation.error || 'Chave PIX inválida');
        setPixKeyError(pixValidation.error || 'Chave PIX inválida');
        hasErrors = true;
      } else {
        setPixKeyError(null);
      }
    }

    if (hasErrors) {
      return false;
    }

    if (!walletForm.address && !walletForm.pixKey) {
      toast.error('Configure pelo menos uma forma de recebimento');
      return false;
    }

    setLoading(true);
    try {
      await profileService.updateDefaultWallet({
        address: walletForm.address,
        type: walletForm.type,
        pixKey: walletForm.pixKey,
      } as any);

      setProfile({
        ...profile,
        defaultWalletAddress: walletForm.address,
        defaultWalletType: walletForm.type,
        pixKey: walletForm.pixKey,
      });

      setWalletError(null);
      setPixKeyError(null);
      // Success is handled in the button onClick
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar carteira');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (newAvatar: string) => {

    // Update local state immediately since the upload was successful
    setProfile(prev => {
      const newProfile = { ...prev, profilePicture: newAvatar };
      return newProfile;
    });

    // Show success feedback
    toast.success('📸 Foto de perfil atualizada com sucesso!', {
      style: {
        background: '#8b5cf6',
        color: '#fff',
      },
    });
    triggerConfetti.basic();

  };


  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'wallet', label: 'Carteira', icon: Wallet },
    { id: 'api', label: 'API', icon: Code },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];


  // Add an early return for page loading state
  if (isPageLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-slide-up">Configurações</h1>

        {/* Tab Navigation */}
        <div className="mb-8 animate-bounce-in relative" style={{ animationDelay: '100ms' }}>
          <div className="relative bg-gray-800/50 rounded-xl backdrop-blur-xl p-1">
            {/* Left Gradient Indicator */}
            {showLeftGradient && (
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-800 via-gray-800/80 to-transparent pointer-events-none z-10 rounded-l-xl md:hidden flex items-center pl-2">
                <div className="w-1.5 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full animate-pulse" />
              </div>
            )}

            {/* Right Gradient Indicator */}
            {showRightGradient && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-800 via-gray-800/80 to-transparent pointer-events-none z-10 rounded-r-xl md:hidden flex items-center justify-end pr-2">
                <div className="w-1.5 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full animate-pulse" />
              </div>
            )}

            <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-max md:min-w-0 md:grid md:grid-cols-5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-3 rounded-lg transition-all duration-300 font-medium group whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:scale-105'
                      }`}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform flex-shrink-0 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="text-sm sm:text-base">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <User className="text-purple-400" size={24} />
                  Informações do Perfil
                </h2>

                {/* Avatar Upload */}
                <div className="mb-8">
                  <AvatarUploader
                    currentAvatar={profile.profilePicture}
                    username={profile.username}
                    onAvatarUpdate={handleAvatarUpdate}
                  />
                </div>

                {/* Profile Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-bounce-in" style={{ animationDelay: '300ms' }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nome de Usuário
                    </label>
                    <input
                      type="text"
                      value={profile.username}
                      disabled
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white disabled:opacity-50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white disabled:opacity-50 transition-all"
                    />
                  </div>


                </div>

                {/* API Key Quick Access */}
                {apiKeyRequests.some(r => r.status === 'APPROVED') && (
                  <div className="mt-8 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-green-400" />
                        <div>
                          <h4 className="text-sm font-medium text-white">API Key Ativa</h4>
                          <p className="text-xs text-gray-400">Você possui acesso à nossa API</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('api')}
                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors text-sm font-medium"
                      >
                        Ver API Key
                      </button>
                    </div>
                  </div>
                )}

                {/* User Limits Section */}
                <div className="mt-8">
                  <ErrorBoundary componentName="UserLimitsDisplay">
                    <UserLimitsDisplay />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* Change Password Section */}
              <div className="animate-slide-up">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                  <Lock className="text-purple-400" size={20} />
                  Alterar Senha
                </h3>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Senha Atual"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Nova Senha"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <input
                    type="password"
                    placeholder="Confirmar Nova Senha"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />

                  <button
                    onClick={handlePasswordChange}
                    disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Alterar Senha'}
                  </button>
                </div>
              </div>

              {/* 2FA Section */}
              <div className="border-t border-gray-700 pt-8">
                <h3 className="text-xl font-semibold text-white mb-4">Autenticação de Dois Fatores (2FA)</h3>

                {profile.twoFactorEnabled ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="text-green-400 font-medium">2FA Ativado</p>
                          <p className="text-sm text-gray-400">Sua conta está protegida com autenticação de dois fatores</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShow2FAModal(true)}
                      disabled={loading}
                      className="group relative px-6 py-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 text-red-400 rounded-lg hover:from-red-600/30 hover:to-orange-600/30 transition-all duration-300 disabled:opacity-50 border border-red-500/20 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10 transform hover:scale-105 active:scale-95"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Desativar 2FA
                      </span>
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!twoFASetup.qrCode ? (
                      <div>
                        <p className="text-gray-400 mb-4">
                          Adicione uma camada extra de segurança à sua conta com autenticação de dois fatores.
                        </p>
                        <button
                          onClick={handleSetup2FA}
                          disabled={loading}
                          className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 transform hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/25"
                        >
                          <span className="flex items-center gap-2">
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : (
                              <>
                                <Shield className="w-5 h-5" />
                                Configurar 2FA
                              </>
                            )}
                          </span>
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-gray-900/50 via-purple-900/10 to-blue-900/10 rounded-xl p-6 border border-purple-500/20">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* QR Code Section */}
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-3 text-center">
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full mb-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-purple-400">Passo 1</span>
                              </div>
                              <p className="text-sm text-gray-300 font-medium">Escaneie com seu app</p>
                            </div>
                            {twoFASetup.qrCode && (
                              <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                                <div className="relative bg-black rounded-lg p-1">
                                  <Image
                                    src={twoFASetup.qrCode}
                                    alt="2FA QR Code"
                                    width={180}
                                    height={180}
                                    className="rounded"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Manual Entry Key */}
                            {twoFASetup.secret && (
                              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-blue-400" />
                                    <p className="text-xs font-medium text-blue-400">Chave Manual</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(twoFASetup.secret || '');
                                      toast.success('✓ Copiado!', {
                                        style: { background: '#10b981', color: '#fff' },
                                        duration: 2000,
                                      });
                                    }}
                                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                    title="Copiar"
                                  >
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                                <code className="block text-xs text-gray-300 font-mono break-all">
                                  {twoFASetup.secret}
                                </code>
                              </div>
                            )}
                          </div>

                          {/* Verification Section */}
                          <div className="flex flex-col justify-center">
                            <div className="space-y-4">
                              <div className="text-center mb-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full mb-3">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium text-blue-400">Passo 2</span>
                                </div>
                                <p className="text-sm text-gray-300 font-medium">Digite o código de 6 dígitos</p>
                              </div>

                              <div className="flex justify-center gap-2">
                                {[...Array(6)].map((_, i) => (
                                  <input
                                    key={i}
                                    type="text"
                                    data-index={i}
                                    value={twoFAToken[i] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '');
                                      if (value.length <= 1) {
                                        const newToken = twoFAToken.split('');
                                        newToken[i] = value;
                                        setTwoFAToken(newToken.join(''));
                                        if (value && i < 5) {
                                          const nextInput = e.target.nextElementSibling as HTMLInputElement;
                                          nextInput?.focus();
                                        }
                                      }
                                    }}
                                    onPaste={(e) => {
                                      e.preventDefault();
                                      const pastedData = e.clipboardData.getData('text');
                                      const digits = pastedData.replace(/\D/g, '').slice(0, 6);

                                      if (digits.length > 0) {
                                        // Distribute digits across all inputs starting from current position
                                        const newToken = twoFAToken.split('');
                                        for (let j = 0; j < digits.length && (i + j) < 6; j++) {
                                          newToken[i + j] = digits[j];
                                        }
                                        setTwoFAToken(newToken.join(''));

                                        // Focus the input after the last filled digit
                                        const nextIndex = Math.min(i + digits.length - 1, 5);
                                        setTimeout(() => {
                                          const inputs = document.querySelectorAll('[data-index]');
                                          const targetInput = inputs[nextIndex] as HTMLInputElement;
                                          targetInput?.focus();
                                          targetInput?.select();
                                        }, 0);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Backspace' && !twoFAToken[i] && i > 0) {
                                        const prevInput = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                                        prevInput?.focus();
                                      }
                                    }}
                                    maxLength={1}
                                    className="w-12 h-12 text-center text-xl font-bold bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  />
                                ))}
                              </div>

                              <button
                                onClick={handleVerify2FA}
                                disabled={loading || twoFAToken.length !== 6}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95"
                              >
                                {loading ? (
                                  <Loader className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                  <span className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Verificar e Ativar 2FA
                                  </span>
                                )}
                              </button>

                              <p className="text-xs text-center text-gray-500">
                                Use Google Authenticator, Authy ou similar
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Backup Codes */}
                        {showBackupCodes && twoFASetup.backupCodes && (
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <h4 className="text-yellow-400 font-medium mb-3">Códigos de Backup</h4>
                            <p className="text-sm text-gray-400 mb-3">
                              Guarde estes códigos em um lugar seguro. Cada código pode ser usado apenas uma vez.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {twoFASetup.backupCodes.map((code, index) => (
                                <code key={index} className="px-3 py-2 bg-gray-700/50 rounded text-white font-mono">
                                  {code}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Wallet className="text-purple-400" size={24} />
                Configurações de Recebimento
              </h2>

              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg mb-6">
                <p className="text-blue-400">
                  Configure suas formas de recebimento para pagamentos e saques.
                </p>
              </div>

              {/* Warning about Payment Links */}
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-yellow-400 font-semibold mb-2">Importante sobre Links de Pagamento</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Alterar a carteira aqui <strong className="text-white">não afeta links de pagamento já criados</strong>.
                      Cada link mantém a carteira configurada no momento da sua criação ou última edição.
                      Para atualizar a carteira de um link existente, edite o link diretamente na seção "Links de Pagamento".
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Settings Display */}
              <div className="grid gap-4 mb-6">
                {profile.defaultWalletAddress && (
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Carteira Liquid Atual
                    </p>
                    <p className="text-white font-mono text-sm break-all">{profile.defaultWalletAddress}</p>
                  </div>
                )}

                {profile.pixKey && (
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Chave PIX Atual
                    </p>
                    <p className="text-white font-mono text-sm break-all">
                      {formatPixKey(profile.pixKey)}
                    </p>
                    {detectPixKeyType(profile.pixKey) && (
                      <p className="text-xs text-purple-400 mt-2">
                        Tipo: {getPixKeyTypeLabel(detectPixKeyType(profile.pixKey)!)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tipo de Carteira
                  </label>
                  <select
                    value={walletForm.type}
                    onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="LIQUID">Liquid Network</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Endereço da Carteira
                  </label>
                  <div className="relative">
                    <input
                      id="wallet-input"
                      type="text"
                      value={walletForm.address}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWalletForm({ ...walletForm, address: value });

                        // Clear error when user starts typing
                        if (walletError) {
                          setWalletError(null);
                        }

                        // Optional: Real-time validation for better UX (debounced)
                        if (value && value.length > 10) {
                          const validation = LiquidWalletValidator.validate(value);
                          if (!validation.valid) {
                            setWalletError(validation.error!);
                          } else {
                            setWalletError(null);
                          }
                        }
                      }}
                      placeholder={
                        walletForm.type === 'LIQUID'
                          ? 'Ex: VJL... ou ex1...'
                          : false
                          ? 'Ex: lightning:...'
                          : 'Ex: bc1...'
                      }
                      className={`
                        w-full px-4 py-3 pr-10 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 font-mono
                        focus:outline-none transition-all
                        ${walletError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-600 focus:border-blue-500'
                        }
                      `}
                    />

                    {/* Validation indicator */}
                    {walletForm.address && (
                      <div className="absolute right-3 top-3.5">
                        {walletError ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {walletError && (
                    <p className="text-sm text-red-400 mt-1">
                      {walletError}
                    </p>
                  )}

                  {/* Success message with address type */}
                  {!walletError && walletForm.address && walletForm.address.length > 10 && (
                    <p className="text-sm text-green-400 mt-1">
                      ✓ Endereço {LiquidWalletValidator.getAddressType(walletForm.address)} válido
                    </p>
                  )}
                </div>

                {/* PIX Key Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Chave PIX para Saques
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={walletForm.pixKey}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWalletForm({ ...walletForm, pixKey: value });

                        // Clear error when user starts typing
                        if (pixKeyError) {
                          setPixKeyError(null);
                        }

                        // Real-time validation
                        if (value && value.length > 3) {
                          const validation = validatePixKey(value);
                          if (!validation.isValid) {
                            setPixKeyError(validation.error!);
                          } else {
                            setPixKeyError(null);
                          }
                        }
                      }}
                      placeholder="CPF, Email, Telefone ou Chave Aleatória"
                      className={`
                        w-full px-4 py-3 pr-10 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400
                        focus:outline-none transition-all
                        ${pixKeyError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-600 focus:border-blue-500'
                        }
                      `}
                    />

                    {/* Validation indicator */}
                    {walletForm.pixKey && (
                      <div className="absolute right-3 top-3.5">
                        {pixKeyError ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {pixKeyError && (
                    <p className="text-sm text-red-400 mt-1">
                      {pixKeyError}
                    </p>
                  )}

                  {/* Success message with key type */}
                  {!pixKeyError && walletForm.pixKey && detectPixKeyType(walletForm.pixKey) && (
                    <p className="text-sm text-green-400 mt-1">
                      ✓ {getPixKeyTypeLabel(detectPixKeyType(walletForm.pixKey)!)} válido
                    </p>
                  )}

                  {/* PIX Key format examples */}
                  <div className="mt-2 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Formatos aceitos:</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• CPF: 123.456.789-00</li>
                      <li>• Email: exemplo@email.com</li>
                      <li>• Telefone: (11) 98765-4321</li>
                      <li>• Chave Aleatória: 123abcd0-e45d-67e8-f9g1-hi2j3k4lm56n</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const success = await handleWalletUpdate();
                    if (success && (walletForm.address || walletForm.pixKey) && !loading) {
                      triggerConfetti.success();
                      toast.success('💰 Configurações de pagamento atualizadas!', {
                        style: {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                        },
                        duration: 4000,
                        icon: '🎉',
                      });
                    }
                  }}
                  disabled={loading || (!walletForm.address && !walletForm.pixKey)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" />
                      Salvar Configurações
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Code className="text-purple-400" size={24} />
                API & Integração
              </h2>

              {/* Current API Keys Section - Always visible at top */}
              <div className="p-6 bg-gradient-to-br from-green-900/20 via-blue-900/10 to-purple-900/10 rounded-xl border border-green-500/20 mb-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Key className="text-green-400" size={20} />
                  Suas API Keys
                </h3>

                {apiKeyRequests.filter(r => r.status === 'APPROVED').length > 0 ? (
                  <div className="space-y-4">
                    {apiKeyRequests.filter(r => r.status === 'APPROVED').map((request) => (
                      <div key={request.id} className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-medium">API Key Ativa</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            Criada em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {request.generatedApiKey ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">Sua API Key:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleApiKeyVisibility(request.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                                  title={showApiKeys[request.id] ? "Ocultar API Key" : "Mostrar API Key"}
                                >
                                  {showApiKeys[request.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  {showApiKeys[request.id] ? "Ocultar" : "Mostrar"}
                                </button>
                                <button
                                  onClick={() => copyApiKey(request.generatedApiKey)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors text-sm font-medium"
                                  title="Copiar API Key"
                                >
                                  <Copy className="w-4 h-4" />
                                  Copiar
                                </button>
                              </div>
                            </div>

                            <div className="relative">
                              <code className="block text-sm text-white font-mono break-all bg-gray-800 border border-gray-600 p-3 rounded">
                                {formatApiKey(request.generatedApiKey, showApiKeys[request.id] || false)}
                              </code>
                            </div>
                          </>
                        ) : (
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-yellow-400 text-sm">
                              API Key ainda não foi gerada. Entre em contato com o suporte.
                            </p>
                          </div>
                        )}

                        {request.apiKeyExpiresAt && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expira em: {new Date(request.apiKeyExpiresAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}

                        <div className="mt-3 text-xs text-gray-400">
                          <p><span className="text-gray-300">Uso:</span> {request.usageReason}</p>
                          <p><span className="text-gray-300">Serviço:</span> {request.serviceUrl}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">Nenhuma API Key Ativa</h4>
                    <p className="text-gray-400 mb-4">
                      Você ainda não possui uma API Key aprovada. Solicite uma abaixo para começar a integrar.
                    </p>
                    {!apiKeyRequests.some(r => r.status === 'PENDING') && (
                      <button
                        onClick={() => {
                          // Scroll to request form
                          const formElement = document.querySelector('[data-api-request-form]');
                          formElement?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
                      >
                        Solicitar API Key
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg mb-6">
                <p className="text-purple-400">
                  Integre nossos serviços de pagamento PIX em sua aplicação usando nossa API REST.
                </p>
              </div>

              {/* API Documentation - Only show for approved API keys */}
              {apiKeyRequests.some(r => r.status === 'APPROVED') && (
                <div className="mb-8 p-6 bg-gradient-to-br from-gray-900/50 via-blue-900/10 to-purple-900/10 rounded-xl border border-blue-500/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Code className="text-blue-400" size={20} />
                    Documentação da API
                  </h3>

                  <div className="space-y-6">
                    {/* Base URL */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Base URL</h4>
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <code className="text-sm text-blue-400 font-mono">
                          {API_URL}
                        </code>
                      </div>
                    </div>

                    {/* Authentication */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Autenticação</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Todas as requisições devem incluir sua API Key no header:
                      </p>
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <code className="text-sm text-green-400 font-mono">
                          X-API-Key: sua-api-key-aqui
                        </code>
                      </div>
                    </div>

                    {/* Endpoints */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Endpoints Disponíveis</h4>
                      <div className="space-y-4">

                        {/* Create PIX Transaction */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/pix/create</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Criar uma transação PIX</p>

                          <details className="mt-2">
                            <summary className="text-sm text-purple-400 cursor-pointer hover:text-purple-300">
                              Ver exemplo de requisição
                            </summary>
                            <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
{`{
  "amount": 100.50,
  "description": "Pagamento de teste",
  "depixAddress": "your_wallet_address", // Opcional - omitir para criar sem QR
  "taxNumber": "12345678900", // Obrigatório para valores >= R$ 3000
  "merchantOrderId": "ORDER-123", // Opcional

  // NOVO: Configuração de webhook (opcional)
  "webhook": {
    "url": "https://meusite.com/webhook",
    "events": [
      "transaction.created",  // Quando PIX é gerado
      "transaction.paid",      // Quando pagamento é confirmado
      "transaction.failed",    // Quando pagamento falha
      "transaction.expired"    // Quando PIX expira
    ],
    "secret": "minha-chave-min-16-chars", // Min 16 chars
    "headers": {
      "X-Custom-Header": "valor" // Headers customizados
    }
  }
}`}
                              </pre>
                              <p className="text-xs text-gray-400 mt-2">
                                ℹ️ taxNumber é opcional para valores abaixo de R$ 3.000
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                ✅ Sem limites de tier para External API
                              </p>
                            </div>
                          </details>
                        </div>

                        {/* Check Transaction Status */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/pix/status/:id</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Verificar status de uma transação</p>

                          <details className="mt-2">
                            <summary className="text-sm text-purple-400 cursor-pointer hover:text-purple-300">
                              Ver exemplo de resposta
                            </summary>
                            <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "amount": 100.50,
  "description": "Pagamento de teste",
  "merchantOrderId": "ORDER-123",
  "qrCode": "00020126580014br.gov.bcb.pix...",
  "qrCodeImage": "data:image/png;base64,...",
  "createdAt": "2025-01-15T12:00:00Z",
  "expiresAt": "2025-01-15T12:30:00Z",
  "webhook": {
    "id": "webhook-uuid",
    "url": "https://meusite.com/webhook",
    "events": ["transaction.created", "transaction.paid"],
    "secretHint": "minh"
  }
}`}
                              </pre>
                              <p className="text-xs text-gray-400 mt-2">
                                ✅ QR Code gerado automaticamente na criação
                              </p>
                            </div>
                          </details>
                        </div>

                        {/* List Transactions */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/pix/transactions</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Listar transações com filtros</p>

                          <details className="mt-2">
                            <summary className="text-sm text-purple-400 cursor-pointer hover:text-purple-300">
                              Ver parâmetros disponíveis
                            </summary>
                            <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
{`Query Parameters:
- status: PENDING | COMPLETED | FAILED | EXPIRED | CANCELLED
- type: DEPOSIT | WITHDRAW | TRANSFER
- startDate: ISO 8601 date
- endDate: ISO 8601 date
- merchantOrderId: string
- page: number (default: 1)
- limit: number (default: 20, max: 100)`}
                              </pre>
                            </div>
                          </details>
                        </div>

                        {/* Create Payment Link */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/payment-links</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Criar um link de pagamento</p>

                          <details className="mt-2">
                            <summary className="text-sm text-purple-400 cursor-pointer hover:text-purple-300">
                              Ver exemplo de requisição - Valor Fixo
                            </summary>
                            <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
{`// Link de pagamento com valor fixo
{
  "title": "Produto Digital",
  "description": "Curso online",
  "amount": 199.90,
  "isCustomAmount": false,
  "walletAddress": "your_wallet_address_here",
  "expiresAt": "2024-12-31T23:59:59Z", // Opcional

  // Webhooks para Payment Links (em breve)
  // Use endpoint /api/v1/payment-links/:id/webhooks após criar o link
}`}
                              </pre>
                            </div>
                          </details>

                          <details className="mt-2">
                            <summary className="text-sm text-purple-400 cursor-pointer hover:text-purple-300">
                              Ver exemplo de requisição - Valor Livre (Range)
                            </summary>
                            <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
{`// Link de pagamento com valor livre (cliente escolhe)
{
  "title": "Doação Flexível",
  "description": "Contribua com o valor que desejar",
  "isCustomAmount": true,
  "minAmount": 10.00,    // Valor mínimo permitido
  "maxAmount": 500.00,   // Valor máximo permitido (opcional)
  "walletAddress": "your_wallet_address_here",
  "maxUses": 1000,       // Opcional
  "expiresAt": "2024-12-31T23:59:59Z", // Opcional

  // Webhooks para Payment Links (em breve)
  // Use endpoint /api/v1/payment-links/:id/webhooks após criar o link
}`}
                              </pre>
                            </div>
                          </details>
                        </div>

                        {/* Get Payment Link */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/payment-links/:id</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Obter detalhes de um link de pagamento</p>
                        </div>

                        {/* List Payment Links */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/payment-links</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Listar seus links de pagamento</p>
                        </div>

                        {/* Cancel PIX Transaction */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">DELETE</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/pix/cancel/:id</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Cancelar transação PIX pendente</p>
                        </div>

                        {/* API Usage Stats */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/stats/usage</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Estatísticas de uso da API</p>
                        </div>

                        {/* User Profile */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/profile</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Obter informações do perfil do usuário</p>
                        </div>

                        {/* Health Check */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/external/health</code>
                          </div>
                          <p className="text-sm text-gray-400">Health check da API (sem autenticação)</p>
                        </div>

                      </div>
                    </div>

                    {/* Webhook Management Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Webhook className="w-4 h-4" />
                        Gerenciamento de Webhooks
                      </h4>
                      <div className="space-y-3">

                        {/* Create Webhook */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks</code>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">Criar webhook para payment link</p>
                          <div className="p-3 bg-black/50 rounded border border-gray-700 text-xs font-mono text-gray-300">
                            <div className="text-green-400">// Body da requisição</div>
                            <div>{"{"}</div>
                            <div className="ml-2">"url": "https://meusite.com/webhook",</div>
                            <div className="ml-2">"events": ["payment.created", "payment.completed"],</div>
                            <div className="ml-2">"secret": "minha-chave-secreta"</div>
                            <div>{"}"}</div>
                          </div>
                        </div>

                        {/* List Webhooks */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks</code>
                          </div>
                          <p className="text-sm text-gray-400">Listar webhooks de um payment link</p>
                        </div>

                        {/* Update Webhook */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">PATCH</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks/:webhookId</code>
                          </div>
                          <p className="text-sm text-gray-400">Atualizar webhook existente</p>
                        </div>

                        {/* Delete Webhook */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">DELETE</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks/:webhookId</code>
                          </div>
                          <p className="text-sm text-gray-400">Deletar webhook</p>
                        </div>

                        {/* Test Webhook */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded">POST</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks/:webhookId/test</code>
                          </div>
                          <p className="text-sm text-gray-400">Testar webhook com dados de exemplo</p>
                        </div>

                        {/* Validate Webhook URL */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded">POST</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks/validate-url</code>
                          </div>
                          <p className="text-sm text-gray-400">Validar se URL do webhook está acessível</p>
                        </div>

                        {/* Get Available Events */}
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">GET</span>
                            <code className="text-sm text-white font-mono">/api/v1/payment-links/:id/webhooks/events</code>
                          </div>
                          <p className="text-sm text-gray-400">Listar eventos disponíveis para webhooks</p>
                        </div>

                      </div>
                    </div>

                    {/* Webhook Events Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Eventos Disponíveis
                      </h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Configure seu webhook para receber notificações dos seguintes eventos:
                      </p>
                      <div className="space-y-3">

                        {/* Payment Created */}
                        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm text-green-400 font-mono">payment.created</code>
                          </div>
                          <p className="text-xs text-gray-400">Disparado quando um novo pagamento é criado no sistema</p>
                        </div>

                        {/* Payment Completed */}
                        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm text-green-400 font-mono">payment.completed</code>
                          </div>
                          <p className="text-xs text-gray-400">Disparado quando um pagamento é confirmado e processado com sucesso</p>
                        </div>

                        {/* Payment Failed */}
                        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm text-red-400 font-mono">payment.failed</code>
                          </div>
                          <p className="text-xs text-gray-400">Disparado quando um pagamento falha ou é rejeitado</p>
                        </div>

                        {/* Payment Expired */}
                        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm text-yellow-400 font-mono">payment.expired</code>
                          </div>
                          <p className="text-xs text-gray-400">Disparado quando um pagamento expira sem ser processado</p>
                        </div>

                        {/* Payment Refunded */}
                        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm text-purple-400 font-mono">payment.refunded</code>
                          </div>
                          <p className="text-xs text-gray-400">Disparado quando um pagamento é estornado ou reembolsado</p>
                        </div>

                      </div>

                      {/* Example Events Array */}
                      <div className="mt-4 p-3 bg-black/50 rounded border border-gray-700">
                        <div className="text-xs font-mono text-gray-300">
                          <div className="text-green-400">// Exemplo: Array de eventos no webhook</div>
                          <div className="mt-1">"events": [</div>
                          <div className="ml-4">"payment.created",</div>
                          <div className="ml-4">"payment.completed",</div>
                          <div className="ml-4">"payment.failed"</div>
                          <div>]</div>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Security Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Segurança dos Webhooks
                      </h4>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-gray-400 mb-3">
                          Todos os webhooks incluem assinatura HMAC-SHA256 no header <code className="text-blue-400">X-Atlas-Signature</code>:
                        </p>
                        <div className="p-3 bg-black/50 rounded border border-gray-700 text-xs font-mono text-gray-300">
                          <div className="text-green-400">// Verificar assinatura do webhook</div>
                          <div>const crypto = require('crypto');</div>
                          <div className="mt-1">const hmac = crypto.createHmac('sha256', webhookSecret);</div>
                          <div>hmac.update(JSON.stringify(payload));</div>
                          <div>const expectedSignature = 'sha256=' + hmac.digest('hex');</div>
                          <div className="mt-1">const isValid = signature === expectedSignature;</div>
                        </div>
                      </div>
                    </div>

                    {/* Response Status Codes */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Códigos de Status HTTP</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <code className="text-sm text-green-400 font-mono">200 OK</code>
                          <span className="text-sm text-gray-400">Requisição bem-sucedida</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <code className="text-sm text-blue-400 font-mono">201 Created</code>
                          <span className="text-sm text-gray-400">Recurso criado</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <code className="text-sm text-yellow-400 font-mono">400 Bad Request</code>
                          <span className="text-sm text-gray-400">Dados inválidos</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <code className="text-sm text-red-400 font-mono">401 Unauthorized</code>
                          <span className="text-sm text-gray-400">API Key inválida</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                          <code className="text-sm text-red-400 font-mono">429 Too Many Requests</code>
                          <span className="text-sm text-gray-400">Limite de requisições excedido</span>
                        </div>
                      </div>
                    </div>

                    {/* Rate Limits */}
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Limites de Taxa
                      </h4>
                      <p className="text-sm text-gray-400">
                        A API possui limite de 100 requisições por minuto por API Key. Headers de resposta incluem:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-400">
                        <li>• <code className="text-xs text-purple-400">X-RateLimit-Limit</code>: Limite total</li>
                        <li>• <code className="text-xs text-purple-400">X-RateLimit-Remaining</code>: Requisições restantes</li>
                        <li>• <code className="text-xs text-purple-400">X-RateLimit-Reset</code>: Tempo de reset (Unix timestamp)</li>
                      </ul>
                    </div>

                    {/* Example cURL */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Exemplo com cURL</h4>
                      <div className="p-3 bg-black/50 rounded-lg border border-gray-700 relative">
                        <button
                          onClick={() => {
                            const approvedKey = apiKeyRequests.find(r => r.status === 'APPROVED');
                            const curlCommand = `curl -X POST ${API_URL}/external/pix/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${approvedKey?.generatedApiKey || 'sua-api-key'}" \\
  -d '{
    "amount": 100.50,
    "description": "Teste de pagamento",
    "depixAddress": "your_wallet_address",
    "taxNumber": "12345678900",
    "merchantOrderId": "ORDER-123",
    "webhook": {
      "url": "https://seu-site.com/webhook",
      "events": ["transaction.created", "transaction.paid"],
      "secret": "sua-chave-secreta-min-16-chars"
    }
  }'`;
                            navigator.clipboard.writeText(curlCommand);
                            toast.success('✓ Comando copiado!', {
                              style: { background: '#10b981', color: '#fff' },
                              duration: 2000,
                            });
                          }}
                          className="absolute top-2 right-2 p-1.5 hover:bg-gray-700 rounded transition-colors"
                          title="Copiar comando"
                        >
                          <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                        </button>
                        <pre className="text-xs text-gray-300 overflow-x-auto pr-8">
{`curl -X POST ${API_URL}/external/pix/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeyRequests.find(r => r.status === 'APPROVED')?.generatedApiKey || 'sua-api-key'}" \\
  -d '{
    "amount": 100.50,
    "description": "Teste de pagamento",
    "depixAddress": "your_wallet_address",  # Opcional - omitir para criar sem QR
    "taxNumber": "12345678900",              # Obrigatório apenas para valores >= R$ 3000
    "merchantOrderId": "ORDER-123",
    "webhook": {
      "url": "https://seu-site.com/webhook",
      "events": ["transaction.created", "transaction.paid"],
      "secret": "sua-chave-secreta-min-16-chars",
      "headers": {
        "X-Custom-Header": "valor-customizado"
      }
    }
  }'

# NOVO: Webhook configurável por transação!
# depixAddress é opcional - sem ele, cria transação sem QR code
# webhook é opcional mas permite notificações em tempo real`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Request History - Show pending/rejected requests */}
              {apiKeyRequests.some(r => r.status === 'PENDING' || r.status === 'REJECTED') && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-white">Histórico de Solicitações</h3>
                  {apiKeyRequests.filter(r => r.status !== 'APPROVED').map((request) => (
                    <div key={request.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              request.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                              request.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {request.status === 'PENDING' ? 'Pendente' :
                               request.status === 'REJECTED' ? 'Rejeitada' :
                               request.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-sm text-gray-300">
                            <span className="text-gray-400">Motivo:</span> {request.usageReason}
                          </p>
                          <p className="text-sm text-gray-300">
                            <span className="text-gray-400">URL do Serviço:</span> {request.serviceUrl}
                          </p>

                          {request.status === 'REJECTED' && request.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-sm text-red-400">
                                <span className="font-medium">Motivo da Rejeição:</span> {request.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Request Form - Only show if no pending or approved requests */}
              {!apiKeyRequests.some(r => r.status === 'PENDING' || r.status === 'APPROVED') && (
                <div className="space-y-4" data-api-request-form>
                  <h3 className="text-lg font-semibold text-white">Nova Solicitação</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Motivo do Uso *
                    </label>
                    <textarea
                      value={apiKeyForm.usageReason}
                      onChange={(e) => setApiKeyForm({ ...apiKeyForm, usageReason: e.target.value })}
                      placeholder="Descreva como você pretende usar a API..."
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {apiKeyForm.usageReason.length}/500 caracteres
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      URL do Serviço *
                    </label>
                    <input
                      type="url"
                      value={apiKeyForm.serviceUrl}
                      onChange={(e) => setApiKeyForm({ ...apiKeyForm, serviceUrl: e.target.value })}
                      placeholder="https://exemplo.com.br"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Volume Estimado *
                      </label>
                      <input
                        type="text"
                        value={apiKeyForm.estimatedVolume}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, estimatedVolume: e.target.value })}
                        placeholder="Ex: 100-500 transações/mês"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo de Uso *
                      </label>
                      <select
                        value={apiKeyForm.usageType}
                        onChange={(e) => {
                          const newUsageType = e.target.value as any;
                          setApiKeyForm({ ...apiKeyForm, usageType: newUsageType });
                        }}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-all"
                      >
                        <option value="SINGLE_CPF">CPF Único</option>
                        <option value="MULTIPLE_CPF">Múltiplos CPFs</option>
                      </select>
                      {apiKeyForm.usageType === 'MULTIPLE_CPF' && !profile.commerceMode && (
                        <p className="text-xs text-red-400 mt-1">
                          ❌ É necessário ter o Modo Comércio ativado para solicitar API key para múltiplos CPF/CNPJ.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Contato (Telegram ou SimpleX) *
                    </label>
                    <input
                      type="text"
                      value={apiKeyForm.contactInfo}
                      onChange={(e) => setApiKeyForm({ ...apiKeyForm, contactInfo: e.target.value })}
                      placeholder="Ex: @seuusuario ou endereço SimpleX"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Informe seu usuário do Telegram ou endereço SimpleX para contato
                    </p>
                  </div>

                  <button
                    onClick={handleApiKeyRequest}
                    disabled={
                      loadingApiKey ||
                      !apiKeyForm.usageReason ||
                      !apiKeyForm.serviceUrl ||
                      !apiKeyForm.estimatedVolume ||
                      !apiKeyForm.contactInfo ||
                      (apiKeyForm.usageType === 'MULTIPLE_CPF' && !profile.commerceMode)
                    }
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                  >
                    {loadingApiKey ? (
                      <Loader className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="w-5 h-5" />
                        Solicitar API Key
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Info about existing request */}
              {apiKeyRequests.some(r => r.status === 'PENDING') && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Você já possui uma solicitação pendente. Aguarde a análise do administrador.
                  </p>
                </div>
              )}

              {apiKeyRequests.some(r => r.status === 'APPROVED') && !apiKeyRequests.some(r => r.status === 'PENDING') && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Você já possui uma API Key ativa. Entre em contato com o suporte se precisar de alterações.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Preferências de Notificação</h2>

              {/* Sales Notifications - Connected to API */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-green-400">💰</span> Notificações de Vendas
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer hover:bg-gray-700/30 p-3 rounded-lg transition-colors">
                    <div>
                      <span className="text-white font-medium">Compras Aprovadas</span>
                      <p className="text-sm text-gray-400 mt-1">Receba um email quando uma venda for aprovada</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.notifyApprovedSales}
                      onChange={async (e) => {
                        const newValue = e.target.checked;
                        setNotifications({ ...notifications, notifyApprovedSales: newValue });
                        try {
                          await api.patch('/auth/notification-settings', { notifyApprovedSales: newValue });
                          toast.success(newValue ? 'Notificações de vendas aprovadas ativadas!' : 'Notificações de vendas aprovadas desativadas');
                        } catch (error) {
                          console.error('Error updating notification settings:', error);
                          toast.error('Erro ao salvar preferência');
                          setNotifications({ ...notifications, notifyApprovedSales: !newValue });
                        }
                      }}
                      className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer hover:bg-gray-700/30 p-3 rounded-lg transition-colors">
                    <div>
                      <span className="text-white font-medium">Compras em Revisão</span>
                      <p className="text-sm text-gray-400 mt-1">Receba um email quando uma transação entrar em revisão</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.notifyReviewSales}
                      onChange={async (e) => {
                        const newValue = e.target.checked;
                        setNotifications({ ...notifications, notifyReviewSales: newValue });
                        try {
                          await api.patch('/auth/notification-settings', { notifyReviewSales: newValue });
                          toast.success(newValue ? 'Notificações de revisão ativadas!' : 'Notificações de revisão desativadas');
                        } catch (error) {
                          console.error('Error updating notification settings:', error);
                          toast.error('Erro ao salvar preferência');
                          setNotifications({ ...notifications, notifyReviewSales: !newValue });
                        }
                      }}
                      className="w-5 h-5 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
                    />
                  </label>
                </div>
              </div>

              {/* Other Notifications - Future implementation */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-blue-400">🔔</span> Outras Notificações
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors">
                    <span className="text-white">Emails de Marketing</span>
                    <input
                      type="checkbox"
                      checked={notifications.marketingEmails}
                      onChange={(e) => setNotifications({ ...notifications, marketingEmails: e.target.checked })}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-3">Estas preferências serão implementadas em breve.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Disable Modal */}
      <Modal2FA
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onConfirm={handleDisable2FA}
      />
    </div>
  );
}