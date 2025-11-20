'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, Loader, CheckCircle, Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import BrandButton from '@/components/ui/BrandButton';
import { api } from '@/app/lib/api';
import { profileService } from '@/app/lib/services';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'PIX' | 'DEPIX_LIQUID' | 'DEPIX_LIGHTNING' | 'BTC_ONCHAIN' | 'BTC_LIGHTNING' | 'BTC_LIQUID' | 'USDT_ERC20' | 'USDT_POLYGON' | 'XMR';

interface DonationData {
  amount: number;
  paymentMethod: PaymentMethod;
  message?: string;
  transactionId?: string;
  donorName?: string;
}

interface DonationResponse {
  success: boolean;
  data: {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    pixQrCode?: string;
    status: 'PENDING' | 'CONFIRMED';
    createdAt: string;
  };
  message: string;
}

// Simple text symbols - V9.0
const PixIcon = () => (
  <span className="text-lg font-bold">P</span>
);

const DepixIcon = () => (
  <span className="text-lg font-bold">D</span>
);

const BitcoinIcon = () => (
  <span className="text-lg font-bold">₿</span>
);

const UsdtIcon = () => (
  <span className="text-lg font-bold">$</span>
);

const MoneroIcon = () => (
  <span className="text-lg font-bold">M</span>
);

const PAYMENT_GROUPS = [
  {
    id: 'pix',
    name: 'PIX',
    description: 'Pagamento instantâneo brasileiro',
    icon: PixIcon,
    color: 'from-green-500 to-emerald-500',
    methods: [
      { id: 'PIX' as PaymentMethod, name: 'PIX', instantConfirm: true }
    ]
  },
  {
    id: 'depix',
    name: 'Depix',
    description: 'Stablecoin do real',
    icon: DepixIcon,
    color: 'from-blue-500 to-cyan-500',
    methods: [
      { id: 'DEPIX_LIQUID' as PaymentMethod, name: 'Liquid Network', instantConfirm: false },
      { id: 'DEPIX_LIGHTNING' as PaymentMethod, name: 'Lightning Network', instantConfirm: false }
    ]
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    description: 'Colateral supremo',
    icon: BitcoinIcon,
    color: 'from-orange-500 to-yellow-500',
    methods: [
      { id: 'BTC_ONCHAIN' as PaymentMethod, name: 'On-chain', instantConfirm: false },
      { id: 'BTC_LIGHTNING' as PaymentMethod, name: 'Lightning Network', instantConfirm: false },
      { id: 'BTC_LIQUID' as PaymentMethod, name: 'Liquid Network', instantConfirm: false }
    ]
  },
  {
    id: 'usdt',
    name: 'USDT',
    description: 'Tether em diferentes redes',
    icon: UsdtIcon,
    color: 'from-purple-600 to-indigo-500',
    methods: [
      { id: 'USDT_ERC20' as PaymentMethod, name: 'ERC-20', instantConfirm: false },
      { id: 'USDT_POLYGON' as PaymentMethod, name: 'Polygon', instantConfirm: false }
    ]
  },
  {
    id: 'monero',
    name: 'Monero',
    description: 'Moeda privada e descentralizada',
    icon: MoneroIcon,
    color: 'from-orange-600 to-red-500',
    methods: [
      { id: 'XMR' as PaymentMethod, name: 'Monero', instantConfirm: false }
    ]
  }
];

// Wallet addresses for blockchain transfers (PIX uses QR codes, not wallet addresses)
const WALLET_ADDRESSES = {
  // PIX doesn't need wallet address - uses DEPIX QR codes
  PIX: null,
  DEPIX_LIQUID: 'lq1qq0rj007seud543j6kzk7m8tfq4g2tk8mnuc0hlcperkv5c30gspstcud650mqt3x7gva2qea3gszk2fmlue3y3qs6kul52qnr',
  DEPIX_LIGHTNING: 'atlasdao@joltz.app',
  BTC_ONCHAIN: 'bc1q9nf4hpnwjl8fy2460h84vwr50wswmdjunumhvn',
  BTC_LIGHTNING: 'AtlasDAO@coinos.io',
  BTC_LIQUID: 'lq1qqf8r6wkf79radjyv8gdepsswz3fr4n890awknxkjn2gfr62tvww6u5fxudl2g022ww8puvzalsplqrsud3566ys0luftxua5r',
  USDT_ERC20: '0x4711cca8bc0d17b0184dDF5928f5b929F9B2e63D',
  USDT_POLYGON: '0xbebc3fabfc17de89d6b80d6beb136002be17d310',
  XMR: '857nbuTDLTUiDDFpQ2Fz6xEez482zBG4rSF2pLJy9a9aRuVeVzmxZ1YJtdxkD4mBeuewrwfyCia5f5h9ARuMetwrBcNVohP'
};

// Currency-specific amount suggestions as requested
const AMOUNT_SUGGESTIONS = {
  PIX: [30, 100, 300],
  DEPIX_LIQUID: [30, 100, 300],
  DEPIX_LIGHTNING: [30, 100, 300],
  BTC_ONCHAIN: [5000, 15000, 50000], // sats
  BTC_LIGHTNING: [5000, 15000, 50000], // sats
  BTC_LIQUID: [5000, 15000, 50000], // sats
  USDT_ERC20: [10, 50, 100],
  USDT_POLYGON: [10, 50, 100],
  XMR: [0.02, 0.05, 0.15]
};

const getCurrencySymbol = (method: PaymentMethod) => {
  if (method.startsWith('BTC_')) return ' sats';
  if (method.startsWith('DEPIX_') || method === 'PIX') return '';
  if (method === 'USDT_ERC20' || method === 'USDT_POLYGON') return ' USDT';
  if (method === 'XMR') return ' XMR';
  return '';
};

const getCurrencyPrefix = (method: PaymentMethod) => {
  if (method.startsWith('DEPIX_') || method === 'PIX') return 'R$ ';
  return '';
};

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [step, setStep] = useState<'method' | 'amount' | 'payment' | 'confirmation' | 'success'>('method');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showMethodDropdown, setShowMethodDropdown] = useState<string | null>(null);
  const [donationData, setDonationData] = useState<DonationData>({
    amount: 0,
    paymentMethod: 'PIX' as PaymentMethod
  });
  const [loading, setLoading] = useState(false);
  const [donationResponse, setDonationResponse] = useState<DonationResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [modalRenderKey, setModalRenderKey] = useState(`modal-${Date.now()}`);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPaymentGroup = PAYMENT_GROUPS.find(g => g.id === selectedGroup);
  const selectedPaymentMethodDetails = selectedPaymentGroup?.methods.find(m => m.id === selectedMethod);

  useEffect(() => {
    if (isOpen) {
      // Fetch user data when modal opens to populate donorName
      const fetchUserData = async () => {
        try {
          const user = await profileService.getProfile();
          setCurrentUser(user);
          setDonationData(prev => ({
            ...prev,
            donorName: user?.username || ''
          }));
        } catch (error) {
          // User not logged in or error fetching profile - continue without username
          console.log('User not logged in or error fetching profile');
        }
      };
      fetchUserData();
    } else {
      setTimeout(() => {
        setStep('method');
        setSelectedGroup(null);
        setSelectedMethod(null);
        setShowMethodDropdown(null);
        setDonationData({ amount: 0, paymentMethod: 'PIX' });
        setDonationResponse(null);
        setCurrentUser(null);
        setModalRenderKey(`modal-${Date.now()}`); // Force complete re-render
      }, 300);
    }
  }, [isOpen]);

  // Click outside detection for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the dropdown and not on the trigger button
      const target = event.target as Element;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if the click is not on any button that could trigger the dropdown
        const isDropdownTrigger = target.closest('[data-dropdown-trigger]');
        if (!isDropdownTrigger) {
          setShowMethodDropdown(null);
        }
      }
    };

    if (showMethodDropdown) {
      // Use a slight delay to prevent immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMethodDropdown]);

  // Auto-poll PIX payment status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (step === 'confirmation' && selectedMethod === 'PIX' && donationResponse?.data.id) {
      // Poll every 5 seconds for PIX payment confirmation
      pollInterval = setInterval(async () => {
        try {
          const response = await api.get(`/donations/${donationResponse.data.id}`);
          if (response.data.success && response.data.data.status === 'CONFIRMED') {
            setStep('success');
            toast.success('Pagamento PIX confirmado automaticamente!');
          }
        } catch (error) {
          console.error('Erro ao verificar status do pagamento:', error);
          // Continue polling on error
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [step, selectedMethod, donationResponse]);

  const handleGroupSelect = (groupId: string) => {
    const group = PAYMENT_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    setSelectedGroup(groupId);

    if (group.methods.length === 1) {
      // Single method group - directly select it
      const method = group.methods[0];
      setSelectedMethod(method.id);
      setDonationData(prev => ({ ...prev, paymentMethod: method.id }));
      setShowMethodDropdown(null); // Close any open dropdown
      setStep('amount');
    } else {
      // Multiple methods - toggle dropdown
      setShowMethodDropdown(showMethodDropdown === groupId ? null : groupId);
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setDonationData(prev => ({ ...prev, paymentMethod: method }));
    setShowMethodDropdown(null);
    setStep('amount');
  };

  const handleAmountSubmit = () => {
    if (donationData.amount <= 0) {
      toast.error('Valor deve ser maior que 0');
      return;
    }
    setStep('payment');
    processDonation();
  };

  const processDonation = async () => {
    setLoading(true);
    try {
      const response = await api.post<DonationResponse>('/donations', donationData);
      setDonationResponse(response.data);

      if (selectedPaymentMethodDetails?.instantConfirm && selectedMethod === 'PIX') {
        setStep('confirmation');
        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        setStep('confirmation');
      }
    } catch (error: any) {
      console.error('Erro ao processar doação:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar doação. Tente novamente.');
      setStep('amount'); // Go back to amount step on error
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!donationData.transactionId || !donationResponse) {
      toast.error('ID da transação é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/donations/${donationResponse.data.id}/confirm`, {
        transactionId: donationData.transactionId
      });
      setStep('success');
      toast.success('Doação confirmada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao confirmar doação:', error);
      toast.error(error.response?.data?.message || 'Erro ao confirmar doação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  if (!isOpen) return null;

  return (
    <div key={modalRenderKey} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fazer Doação</h2>
              <p className="text-sm text-gray-400">Apoie nosso projeto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Payment Method Selection */}
          {step === 'method' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Ajude a manter a Atlas</h3>
                <p className="text-gray-400 text-sm">Selecione como você gostaria de fazer sua doação</p>
              </div>

              <div className="space-y-3">
                {PAYMENT_GROUPS.map((group) => {
                  const IconComponent = group.icon;
                  const isExpanded = showMethodDropdown === group.id;

                  return (
                    <div key={group.id} className="space-y-2">
                      <button
                        onClick={() => handleGroupSelect(group.id)}
                        className="flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-gray-600 transition-all group w-full"
                        data-dropdown-trigger
                      >
                        <div className={`w-12 h-12 bg-gradient-to-r ${group.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                          <IconComponent />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-white">{group.name}</h4>
                          <p className="text-sm text-gray-400">{group.description}</p>
                        </div>
                        {group.methods.length > 1 && (
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {/* Network Selection Dropdown */}
                      {isExpanded && group.methods.length > 1 && (
                        <div ref={dropdownRef} className="ml-4 space-y-2 border-l-2 border-gray-700 pl-4">
                          {group.methods.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => handleMethodSelect(method.id)}
                              className="flex items-center gap-3 p-3 bg-gray-750 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-all w-full text-left"
                            >
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <div>
                                <h5 className="font-medium text-white text-sm">{method.name}</h5>
                                {method.instantConfirm && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                    Confirmação automática
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Amount and Message Input (Combined) */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${selectedPaymentGroup?.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4`}>
                  {selectedPaymentGroup?.icon && <selectedPaymentGroup.icon />}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Valor da Doação</h3>
                <p className="text-gray-400 text-sm">
                  {selectedPaymentGroup?.name} - {selectedPaymentMethodDetails?.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor {getCurrencyPrefix(selectedMethod!)} {getCurrencySymbol(selectedMethod!)}
                  </label>
                  <input
                    type="number"
                    step={selectedMethod === 'XMR' ? '0.001' : selectedMethod?.startsWith('BTC_') ? '1' : '0.01'}
                    min={selectedMethod?.startsWith('BTC_') ? '1' : '0.01'}
                    value={donationData.amount || ''}
                    onChange={(e) => setDonationData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-lg text-center focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="0"
                    autoFocus
                  />
                </div>

                {/* Currency-specific amount suggestions */}
                <div className="grid grid-cols-3 gap-2">
                  {AMOUNT_SUGGESTIONS[selectedMethod!]?.map((value) => (
                    <button
                      key={value}
                      onClick={() => setDonationData(prev => ({ ...prev, amount: value }))}
                      className="py-2 px-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors border border-gray-600 hover:border-gray-500"
                    >
                      {getCurrencyPrefix(selectedMethod!)}{value}{getCurrencySymbol(selectedMethod!)}
                    </button>
                  ))}
                </div>

                {/* Message input on same screen */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mensagem (opcional)
                  </label>
                  <textarea
                    value={donationData.message || ''}
                    onChange={(e) => setDonationData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Deixe uma mensagem de apoio..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <BrandButton
                  variant="secondary"
                  onClick={() => setStep('method')}
                  className="flex-1"
                >
                  Voltar
                </BrandButton>
                <BrandButton
                  variant="primary"
                  onClick={handleAmountSubmit}
                  className="flex-1"
                  disabled={donationData.amount <= 0}
                >
                  Processar Doação
                </BrandButton>
              </div>
            </div>
          )}

          {/* Step 3: Payment Processing */}
          {step === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Processando Doação</h3>
                <p className="text-gray-400 text-sm">Aguarde enquanto processamos sua doação...</p>
              </div>
            </div>
          )}

          {/* Step 4: Payment Confirmation */}
          {step === 'confirmation' && donationResponse && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${selectedPaymentGroup?.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4`}>
                  {selectedPaymentGroup?.icon && <selectedPaymentGroup.icon />}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {selectedMethod === 'PIX' ? 'Pagamento PIX' : 'Realizar Pagamento'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {selectedMethod === 'PIX'
                    ? 'Escaneie o QR Code ou copie a chave PIX'
                    : 'Envie o pagamento para o endereço abaixo'
                  }
                </p>
              </div>

              {/* PIX QR Code Display */}
              {selectedMethod === 'PIX' && donationResponse.data.pixQrCode && (
                <div className="bg-white rounded-xl p-4 text-center">
                  <img
                    src={donationResponse.data.pixQrCode}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}

              {/* Payment Details */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h4 className="text-white font-semibold mb-3">Detalhes do Pagamento</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor:</span>
                    <span className="text-white">
                      {getCurrencyPrefix(selectedMethod!)}{donationResponse.data.amount}{getCurrencySymbol(selectedMethod!)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Método:</span>
                    <span className="text-white">{selectedPaymentGroup?.name} - {selectedPaymentMethodDetails?.name}</span>
                  </div>

                  {/* Wallet Address - Only show for non-PIX payments */}
                  {selectedMethod !== 'PIX' && WALLET_ADDRESSES[selectedMethod!] && (
                    <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 font-medium">
                          Endereço da Carteira:
                        </span>
                        <button
                          onClick={() => copyToClipboard(WALLET_ADDRESSES[selectedMethod!], 'Endereço')}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="text-white text-xs font-mono break-all bg-gray-800 p-2 rounded border">
                        {WALLET_ADDRESSES[selectedMethod!]}
                      </div>
                    </div>
                  )}

                  {/* PIX Instructions */}
                  {selectedMethod === 'PIX' && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-xs">
                        💡 Escaneie o QR Code com seu app bancário ou copie o código PIX para finalizar o pagamento.
                      </p>
                    </div>
                  )}

                  {/* Transaction ID input for non-PIX payments */}
                  {selectedMethod !== 'PIX' && (
                    <>
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-xs">
                          ⚠️ Após realizar o pagamento, digite o ID/Hash da transação abaixo para confirmar sua doação.
                        </p>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          ID da Transação *
                        </label>
                        <input
                          type="text"
                          value={donationData.transactionId || ''}
                          onChange={(e) => setDonationData(prev => ({ ...prev, transactionId: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="Cole aqui o ID/Hash da transação"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Digite o hash da transação fornecido pela sua carteira após realizar o pagamento
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {selectedMethod === 'PIX' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Aguardando confirmação automática do pagamento...</span>
                    </div>
                  </div>
                ) : (
                  <BrandButton
                    variant="primary"
                    onClick={handleConfirmPayment}
                    loading={loading}
                    disabled={!donationData.transactionId || loading}
                    className="w-full"
                  >
                    Marcar como Pago
                  </BrandButton>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Obrigado pela sua doação!</h3>
                <p className="text-gray-400">
                  Só assim a Atlas consegue manter o desenvolvimento código aberto, custear a estrutura e oferecer a melhor competitividade.
                </p>
              </div>

              {donationResponse && (
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <h4 className="text-white font-semibold mb-3">Resumo da Doação</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valor:</span>
                      <span className="text-white">
                        {getCurrencyPrefix(selectedMethod!)}{donationResponse.data.amount}{getCurrencySymbol(selectedMethod!)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Método:</span>
                      <span className="text-white">{selectedPaymentGroup?.name} - {selectedPaymentMethodDetails?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400">
                        {donationResponse.data.status === 'CONFIRMED' ? 'Confirmado' : 'Processando'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data:</span>
                      <span className="text-white">
                        {new Date(donationResponse.data.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <BrandButton
                  variant="primary"
                  onClick={onClose}
                  className="w-full"
                  icon={<Heart className="w-4 h-4" />}
                >
                  Fechar
                </BrandButton>

                <button
                  onClick={() => {
                    window.open('https://twitter.com/intent/tweet?text=Acabei%20de%20fazer%20uma%20doação%20para%20o%20projeto%20Atlas%20que%20promove%20a%20soberania%20e%20liberdade%20financeira%20dos%20comerciantes%20brasileiros!', '_blank');
                  }}
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Compartilhar nas redes sociais
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}