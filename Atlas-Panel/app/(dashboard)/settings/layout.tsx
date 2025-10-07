import ErrorBoundary from '@/app/components/ErrorBoundary';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary componentName="Settings Page">
      {children}
    </ErrorBoundary>
  );
}