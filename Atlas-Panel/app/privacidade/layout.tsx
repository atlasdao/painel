import type { Metadata } from 'next';
import { generatePublicPageMetadata } from '../lib/metadata';
import { BreadcrumbSchema } from '../lib/structured-data';

export const metadata: Metadata = generatePublicPageMetadata('privacidade');

export default function PrivacidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Atlas', url: 'https://painel.atlasdao.info' },
          { name: 'Politica de Privacidade', url: 'https://painel.atlasdao.info/privacidade' },
        ]}
      />
      {children}
    </>
  );
}
