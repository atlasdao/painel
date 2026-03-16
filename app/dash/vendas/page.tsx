'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { profileService } from '@/app/lib/services';
import { toast, Toaster } from 'sonner';
import { TrendingUp } from 'lucide-react';
import VendasTabs from '@/app/components/vendas/VendasTabs';
import ActivityTab from '@/app/components/vendas/ActivityTab';
import TransactionBottomSheet from '@/app/components/vendas/TransactionBottomSheet';
import PaymentLinksManager from '@/app/components/PaymentLinksManager';
import QRCodeGenerator from '@/app/components/QRCodeGenerator';

type TabType = 'activity' | 'links' | 'qrcode';

function VendasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab state from URL
  const tabParam = searchParams.get('tab');
  const activeTab: TabType =
    tabParam === 'links' || tabParam === 'qrcode' ? tabParam : 'activity';

  // User state
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCommerce, setIsCommerce] = useState(false);

  // Transaction detail bottom sheet
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const initRef = useRef(false);
  const isUnmountedRef = useRef(false);

  // Load user profile to determine commerce status
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    isUnmountedRef.current = false;

    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isUnmountedRef.current) return;

        setUserProfile(profile);
        // Commerce access: user must have validated account
        const hasCommerce = profile.isAccountValidated === true;
        setIsCommerce(hasCommerce);

        // If personal user tried to access a commerce-only tab, reset to activity
        if (!hasCommerce && (tabParam === 'links' || tabParam === 'qrcode')) {
          router.replace('/dash/vendas');
        }
      } catch (error: any) {
        if (isUnmountedRef.current) return;
        console.error('Error loading profile:', error);

        if (error.response?.status === 401) {
          toast.error('Sessao expirada. Redirecionando para login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          toast.error('Erro ao carregar perfil.');
          setUserProfile({ isAccountValidated: false });
          setIsCommerce(false);
        }
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Handle tab change via URL
  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab === 'activity') {
        router.replace('/dash/vendas');
      } else {
        router.replace(`/dash/vendas?tab=${tab}`);
      }
    },
    [router]
  );

  // Handle transaction click from ActivityTab
  const handleTransactionClick = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setBottomSheetOpen(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setBottomSheetOpen(false);
    setSelectedTransaction(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] bg-[var(--bg-primary)] text-[var(--text-primary)] pb-12 -m-6">
        <div className="px-4 pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)]">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[var(--bg-primary)] text-[var(--text-primary)] pb-12 -m-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="px-4 pt-6 pb-4 animate-fade-in-down">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="p-3 bg-[var(--accent)] rounded-xl shadow-lg transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-1">
              Vendas
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
                Atualizado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs (commerce users only) */}
      <div className="px-4 mb-4">
        <VendasTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCommerce={isCommerce}
        />
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'activity' && (
          <div
            role="tabpanel"
            id="vendas-tabpanel-activity"
            aria-labelledby="vendas-tab-activity"
          >
            <ActivityTab
              isCommerce={isCommerce}
              onTransactionClick={handleTransactionClick}
            />
          </div>
        )}

        {activeTab === 'links' && isCommerce && (
          <div
            role="tabpanel"
            id="vendas-tabpanel-links"
            aria-labelledby="vendas-tab-links"
            className="atlas-card p-6 md:p-8"
          >
            <PaymentLinksManager
              defaultWallet={userProfile?.defaultWalletAddress}
            />
          </div>
        )}

        {activeTab === 'qrcode' && isCommerce && (
          <div
            role="tabpanel"
            id="vendas-tabpanel-qrcode"
            aria-labelledby="vendas-tab-qrcode"
            className="atlas-card p-6 md:p-8"
          >
            <QRCodeGenerator
              defaultWallet={userProfile?.defaultWalletAddress}
            />
          </div>
        )}
      </div>

      {/* Transaction detail bottom sheet */}
      <TransactionBottomSheet
        transaction={selectedTransaction}
        open={bottomSheetOpen}
        onClose={handleCloseBottomSheet}
      />
    </div>
  );
}

export default function VendasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-6rem)] bg-[var(--bg-primary)] text-[var(--text-primary)] pb-12 -m-6">
          <div className="px-4 pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
              <p className="text-[var(--text-muted)]">Carregando...</p>
            </div>
          </div>
        </div>
      }
    >
      <VendasContent />
    </Suspense>
  );
}
