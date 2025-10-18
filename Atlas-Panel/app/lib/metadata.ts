import { Metadata } from 'next';

// Base configuration for all Atlas Painel pages
const baseMetadata = {
  title: "Atlas Painel - Gestão Financeira Digital",
  description: "Painel de controle Atlas DAO para gestão de transações PIX, pagamentos digitais e soberania financeira. Interface completa para usuários e comerciantes.",
  siteName: "Atlas Painel",
  url: "https://painel.atlasdao.info",
  image: "/atlas-logo.jpg",
  ogImage: "/atlas-logo.jpg", // Will use the existing logo, ideally should be 1200x630
  locale: "pt_BR",
  keywords: "Atlas Painel, Atlas DAO, PIX, Pagamentos Digitais, Gestão Financeira, Painel de Controle, Transações"
};

// Default metadata for painel.atlasdao.info
export const generateDefaultMetadata = (): Metadata => ({
  metadataBase: new URL(baseMetadata.url),
  title: baseMetadata.title,
  description: baseMetadata.description,
  keywords: baseMetadata.keywords,
  authors: [{ name: "Atlas DAO" }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icon-192.png' },
      { url: '/icon-512.png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Atlas'
  },
  openGraph: {
    title: baseMetadata.title,
    description: baseMetadata.description,
    url: baseMetadata.url,
    siteName: baseMetadata.siteName,
    images: [
      {
        url: baseMetadata.ogImage,
        width: 460, // Using actual dimensions of atlas-logo.jpg
        height: 460,
        alt: "Atlas DAO - Soberania Financeira",
      },
    ],
    locale: baseMetadata.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: baseMetadata.title,
    description: baseMetadata.description,
    images: [baseMetadata.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
});

// Dynamic metadata for payment links
export const generatePaymentMetadata = (paymentData: {
  description?: string;
  amount?: number;
  isCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
  shortCode: string;
}): Metadata => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Generate title based on payment type
  let title = "Pagamento via PIX - Atlas Pay";
  let description = "Pagamento seguro e instantâneo via PIX com Atlas Pay. ";

  if (paymentData.description) {
    title = `${paymentData.description} - Atlas Pay`;
    description = `${paymentData.description} - `;
  }

  if (paymentData.isCustomAmount) {
    if (paymentData.minAmount && paymentData.maxAmount) {
      description += `Valor entre ${formatCurrency(paymentData.minAmount)} e ${formatCurrency(paymentData.maxAmount)}. `;
    } else if (paymentData.minAmount) {
      description += `Valor a partir de ${formatCurrency(paymentData.minAmount)}. `;
    } else if (paymentData.maxAmount) {
      description += `Valor até ${formatCurrency(paymentData.maxAmount)}. `;
    } else {
      description += "Digite o valor desejado. ";
    }
  } else if (paymentData.amount) {
    description += `Valor: ${formatCurrency(paymentData.amount)}. `;
  }

  description += "Pague com PIX de forma rápida e segura.";

  const paymentUrl = `${baseMetadata.url}/pay/${paymentData.shortCode}`;

  return {
    metadataBase: new URL(baseMetadata.url),
    title,
    description,
    keywords: baseMetadata.keywords + ", PIX, Pagamento, QR Code",
    authors: [{ name: "Atlas DAO" }],
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title,
      description,
      url: paymentUrl,
      siteName: baseMetadata.siteName,
      images: [
        {
          url: baseMetadata.ogImage,
          width: 460,
          height: 460,
          alt: title,
        },
      ],
      locale: baseMetadata.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [baseMetadata.ogImage],
    },
    robots: {
      index: false, // Payment links should not be indexed
      follow: false,
    },
    viewport: "width=device-width, initial-scale=1",
  };
};

// Metadata for specific dashboard pages
export const generatePageMetadata = (
  pageTitle: string,
  pageDescription?: string,
  pagePath?: string
): Metadata => {
  const title = `${pageTitle} - Atlas Painel`;
  const description = pageDescription || `${pageTitle} no Atlas Painel. ${baseMetadata.description}`;
  const url = pagePath ? `${baseMetadata.url}${pagePath}` : baseMetadata.url;

  return {
    metadataBase: new URL(baseMetadata.url),
    title,
    description,
    keywords: baseMetadata.keywords,
    authors: [{ name: "Atlas DAO" }],
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title,
      description,
      url,
      siteName: baseMetadata.siteName,
      images: [
        {
          url: baseMetadata.ogImage,
          width: 460,
          height: 460,
          alt: title,
        },
      ],
      locale: baseMetadata.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [baseMetadata.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    viewport: "width=device-width, initial-scale=1",
  };
};