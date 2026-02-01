import type { Metadata } from 'next';
import { generatePublicPageMetadata } from '../lib/metadata';
import { BreadcrumbSchema } from '../lib/structured-data';

export const metadata: Metadata = generatePublicPageMetadata('termos');

export default function TermosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Atlas', url: 'https://painel.atlasdao.info' },
          { name: 'Termos de Uso', url: 'https://painel.atlasdao.info/termos' },
        ]}
      />
      {children}
    </>
  );
}
