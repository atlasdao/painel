import type { Metadata } from 'next';
import { generatePublicPageMetadata } from '../lib/metadata';
import { BreadcrumbSchema } from '../lib/structured-data';

export const metadata: Metadata = generatePublicPageMetadata('devs');

export default function DevsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Atlas', url: 'https://painel.atlasdao.info' },
          { name: 'API para Desenvolvedores', url: 'https://painel.atlasdao.info/devs' },
        ]}
      />
      {children}
    </>
  );
}
