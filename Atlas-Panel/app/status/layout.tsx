import type { Metadata } from 'next';
import { generatePublicPageMetadata } from '../lib/metadata';
import { BreadcrumbSchema } from '../lib/structured-data';

export const metadata: Metadata = generatePublicPageMetadata('status');

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Atlas', url: 'https://painel.atlasdao.info' },
          { name: 'Status do Sistema', url: 'https://painel.atlasdao.info/status' },
        ]}
      />
      {children}
    </>
  );
}
