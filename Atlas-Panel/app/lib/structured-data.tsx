// Componentes de dados estruturados JSON-LD para SEO
// Schema.org structured data para melhorar indexacao

export function OrganizationSchema() {
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Atlas',
    alternateName: 'Atlas DAO',
    url: 'https://painel.atlasdao.info',
    logo: 'https://painel.atlasdao.info/atlas-logo.jpg',
    description: 'Plataforma de pagamentos PIX para comerciantes brasileiros. Receba pagamentos instantaneos com taxa fixa de R$ 0,99.',
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: 'https://t.me/atlasDAO_support',
      availableLanguage: ['Portuguese', 'English'],
    },
    sameAs: [
      'https://github.com/atlasdao',
      'https://t.me/atlasDAO_support',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
    />
  );
}

export function WebSiteSchema() {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Atlas Painel',
    alternateName: 'Atlas - Gateway de Pagamentos PIX',
    url: 'https://painel.atlasdao.info',
    description: 'Painel de controle Atlas para gestao de transacoes PIX, pagamentos digitais e soberania financeira.',
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: 'Atlas DAO',
      url: 'https://painel.atlasdao.info',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://painel.atlasdao.info/devs?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
    />
  );
}

export function SoftwareApplicationSchema() {
  const softwareData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Atlas Painel',
    operatingSystem: 'Web',
    applicationCategory: 'FinanceApplication',
    description: 'Plataforma de pagamentos PIX com links de pagamento, QR Codes e API para desenvolvedores.',
    offers: {
      '@type': 'Offer',
      price: '0.99',
      priceCurrency: 'BRL',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '0.99',
        priceCurrency: 'BRL',
        unitText: 'por transacao',
      },
    },
    featureList: [
      'Links de pagamento PIX',
      'QR Codes instantaneos',
      'API REST para desenvolvedores',
      'Webhooks em tempo real',
      'Painel de controle completo',
      'Taxa fixa por transacao',
    ],
    screenshot: 'https://painel.atlasdao.info/atlas-logo.jpg',
    author: {
      '@type': 'Organization',
      name: 'Atlas DAO',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareData) }}
    />
  );
}

export function FAQSchema() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'O que e o Atlas?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Atlas e uma plataforma de pagamentos PIX para comerciantes brasileiros. Permite criar links de pagamento, gerar QR Codes e receber pagamentos instantaneos com taxa fixa de R$ 0,99 por transacao.',
        },
      },
      {
        '@type': 'Question',
        name: 'Qual e a taxa cobrada pelo Atlas?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'O Atlas cobra uma taxa fixa de R$ 0,99 por transacao completada. Nao ha mensalidade, taxa de adesao ou custos ocultos.',
        },
      },
      {
        '@type': 'Question',
        name: 'Como funciona o pagamento via PIX?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Voce cria um link de pagamento ou QR Code PIX, compartilha com seu cliente, e quando ele paga, o valor liquido (menos a taxa de R$ 0,99) e creditado instantaneamente na sua conta PIX cadastrada.',
        },
      },
      {
        '@type': 'Question',
        name: 'O Atlas tem API para desenvolvedores?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sim, o Atlas oferece uma API REST completa para desenvolvedores. Voce pode criar links de pagamento, gerar QR Codes PIX, configurar webhooks e muito mais programaticamente.',
        },
      },
      {
        '@type': 'Question',
        name: 'O Atlas e seguro?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sim, o Atlas utiliza criptografia SSL/TLS, armazenamento seguro de senhas com hash, autenticacao de dois fatores (2FA) e monitoramento continuo de seguranca.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
    />
  );
}

// Componente combinado para a pagina inicial
export function HomePageStructuredData() {
  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />
      <SoftwareApplicationSchema />
      <FAQSchema />
    </>
  );
}
