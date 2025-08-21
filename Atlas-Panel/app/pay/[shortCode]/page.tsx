'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Loader, AlertCircle, CheckCircle, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export default function PaymentPage() {
  const params = useParams();
  const shortCode = params.shortCode as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(28 * 60); // 28 minutes in seconds

  useEffect(() => {
    if (shortCode) {
      fetchPaymentData();
    }
  }, [shortCode]);

  useEffect(() => {
    if (qrCode && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Regenerate QR code when timer expires
            generateNewQRCode();
            return 28 * 60;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [qrCode, timeLeft]);

  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Link de pagamento não encontrado');
        } else if (response.status === 410) {
          setError('Este link de pagamento expirou');
        } else {
          setError('Erro ao carregar dados do pagamento');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPaymentData(data);
      
      // Generate QR code
      await generateNewQRCode();
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  const generateNewQRCode = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pay/${shortCode}/generate-qr`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      
      // Generate QR code image from the PIX code
      if (data.qrCode) {
        try {
          // Generate QR code as data URL
          const dataUrl = await QRCode.toDataURL(data.qrCode, {
            type: 'image/png',
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            width: 300,
          });
          
          setQrCodeDataUrl(dataUrl);
        } catch (qrError) {
          console.error('Error generating QR code image:', qrError);
        }
      }
      
      setTimeLeft(28 * 60); // Reset timer
      setLoading(false);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Erro ao gerar QR Code PIX');
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Carregando QR Code PIX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Erro</h1>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas Logo"
              width={60}
              height={60}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Pagamento PIX</h1>
          {paymentData?.description && (
            <p className="text-gray-400">{paymentData.description}</p>
          )}
        </div>

        {/* Amount */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-gray-400 mb-1">Valor a pagar</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(paymentData?.amount || 0)}
          </p>
        </div>

        {/* QR Code */}
        {qrCodeDataUrl ? (
          <div className="bg-white rounded-lg p-4 mb-6">
            <div className="aspect-square relative">
              <Image
                src={qrCodeDataUrl}
                alt="QR Code PIX"
                fill
                className="object-contain"
              />
            </div>
          </div>
        ) : qrCode ? (
          <div className="bg-gray-700 rounded-lg p-8 mb-6 text-center">
            <QrCode className="w-16 h-16 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Gerando imagem do QR Code...</p>
          </div>
        ) : (
          <div className="bg-gray-700 rounded-lg p-8 mb-6 text-center">
            <QrCode className="w-16 h-16 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">QR Code não disponível</p>
          </div>
        )}

        {/* PIX Code */}
        {qrCode && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Código PIX (copia e cola)</p>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-white font-mono break-all">{qrCode}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(qrCode);
                alert('Código PIX copiado!');
              }}
              className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Copiar código PIX
            </button>
          </div>
        )}

        {/* Timer */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 text-sm">QR Code expira em:</p>
            <p className="text-yellow-400 font-mono font-bold">{formatTime(timeLeft)}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            O QR Code será renovado automaticamente quando expirar
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-sm">
          <h3 className="font-semibold text-white">Como pagar:</h3>
          <ol className="space-y-2 text-gray-300">
            <li>1. Abra o app do seu banco</li>
            <li>2. Escolha pagar com PIX</li>
            <li>3. Escaneie o QR Code ou copie o código</li>
            <li>4. Confirme o pagamento</li>
          </ol>
        </div>

        {/* Success Message (shown after payment) */}
        {false && ( // This would be triggered by payment webhook
          <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <div>
                <p className="text-green-400 font-medium">Pagamento recebido!</p>
                <p className="text-gray-300 text-sm mt-1">
                  Obrigado pelo seu pagamento.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}