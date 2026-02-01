import { Metadata } from 'next';

// Base configuration for all Atlas Painel pages
const baseMetadata = {
  title: "Atlas - Gateway de Pagamentos PIX para Comerciantes",
  description: "Receba pagamentos PIX instantaneos com taxa fixa de R$ 0,99. Crie links de pagamento, QR Codes e integre via API. Plataforma completa para comerciantes brasileiros.",
  siteName: "Atlas",
  url: "https://painel.atlasdao.info",
  image: "/atlas-logo.jpg",
  ogImage: "/atlas-logo.jpg",
  locale: "pt_BR",
  keywords: "pagamentos pix, gateway pix, link de pagamento, qr code pix, receber pix, pagamento online brasil, taxa fixa pix, api pagamentos, comerciantes pix, maquininha pix"
};

// Default metadata for painel.atlasdao.info
export const generateDefaultMetadata = (): Metadata => ({
  metadataBase: new URL(baseMetadata.url),
  title: {
    default: baseMetadata.title,
    template: '%s | Atlas',
  },
  description: baseMetadata.description,
  keywords: baseMetadata.keywords,
  authors: [{ name: "Atlas" }],
  creator: 'Atlas',
  publisher: 'Atlas',
  manifest: '/manifest.json',
  alternates: {
    canonical: baseMetadata.url,
    languages: {
      'pt-BR': baseMetadata.url,
    },
  },
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
        width: 460,
        height: 460,
        alt: "Atlas - Gateway de Pagamentos PIX",
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
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Adicionar codigos de verificacao quando disponiveis
    // google: 'codigo-google-search-console',
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

// Metadata especifica para paginas publicas
export const publicPagesMetadata = {
  termos: {
    title: 'Termos de Uso',
    description: 'Termos de uso e condicoes da plataforma Atlas. Leia sobre taxas, responsabilidades, uso permitido e politicas de pagamento PIX.',
    keywords: 'termos de uso atlas, condicoes de uso, politica pagamentos pix, taxas atlas, regulamento gateway pix',
    path: '/termos',
  },
  privacidade: {
    title: 'Politica de Privacidade',
    description: 'Politica de privacidade e protecao de dados da Atlas. Saiba como coletamos, usamos e protegemos suas informacoes conforme a LGPD.',
    keywords: 'politica privacidade atlas, lgpd, protecao dados, privacidade pagamentos, seguranca dados pix',
    path: '/privacidade',
  },
  devs: {
    title: 'API para Desenvolvedores',
    description: 'Documentacao da API REST Atlas para desenvolvedores. Integre pagamentos PIX, crie links de pagamento e configure webhooks em sua aplicacao.',
    keywords: 'api pix, documentacao api pagamentos, integrar pix, webhook pagamento, sdk pix brasil, api rest pagamentos',
    path: '/devs',
  },
  status: {
    title: 'Status do Sistema',
    description: 'Verifique o status em tempo real dos servicos Atlas. Monitoramento de API, processamento PIX e disponibilidade da plataforma.',
    keywords: 'status atlas, disponibilidade sistema, monitoramento api, status pix, uptime gateway',
    path: '/status',
  },
};

// Gerar metadata para paginas publicas com SEO otimizado
export const generatePublicPageMetadata = (page: keyof typeof publicPagesMetadata): Metadata => {
  const pageData = publicPagesMetadata[page];
  const url = `${baseMetadata.url}${pageData.path}`;

  return {
    metadataBase: new URL(baseMetadata.url),
    title: pageData.title,
    description: pageData.description,
    keywords: pageData.keywords,
    authors: [{ name: "Atlas" }],
    alternates: {
      canonical: url,
    },
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: `${pageData.title} | Atlas`,
      description: pageData.description,
      url,
      siteName: baseMetadata.siteName,
      images: [
        {
          url: baseMetadata.ogImage,
          width: 460,
          height: 460,
          alt: pageData.title,
        },
      ],
      locale: baseMetadata.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${pageData.title} | Atlas`,
      description: pageData.description,
      images: [baseMetadata.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
};