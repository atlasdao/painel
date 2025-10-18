import { Metadata } from 'next';
import { generatePaymentMetadata } from '@/app/lib/metadata';
import PaymentClient from './PaymentClient';

interface PageProps {
  params: { shortCode: string };
}

// Function to fetch payment data for metadata generation
async function getPaymentData(shortCode: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:19997/api/v1';
    const response = await fetch(`${apiUrl}/pay/${shortCode}`, {
      cache: 'no-store', // Don't cache payment data
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching payment data for metadata:', error);
    return null;
  }
}

// Generate dynamic metadata for payment links
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shortCode } = params;

  // Fetch payment data for metadata generation
  const paymentData = await getPaymentData(shortCode);

  if (!paymentData) {
    // Fallback metadata for invalid/expired payment links
    return {
      title: 'Link de Pagamento - Atlas Pay',
      description: 'Link de pagamento não encontrado ou expirado.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Generate dynamic metadata based on payment data
  return generatePaymentMetadata({
    description: paymentData.description,
    amount: paymentData.amount,
    isCustomAmount: paymentData.isCustomAmount,
    minAmount: paymentData.minAmount,
    maxAmount: paymentData.maxAmount,
    shortCode,
  });
}

export default async function PaymentPage({ params }: PageProps) {
  const { shortCode } = params;

  // Optionally fetch initial data for better performance
  const initialData = await getPaymentData(shortCode);

  return <PaymentClient shortCode={shortCode} initialData={initialData} />;
}