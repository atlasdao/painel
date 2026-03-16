import { Metadata } from 'next';
import PaymentConfirmationClient from './PaymentConfirmationClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Comprovante de Pagamento - Atlas Pay',
  description: 'Seu pagamento foi confirmado com sucesso.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PaymentConfirmationPage({ params }: PageProps) {
  const { id } = await params;

  return <PaymentConfirmationClient paymentId={id} />;
}
