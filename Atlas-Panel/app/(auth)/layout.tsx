import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/atlas-logo.jpg"
            alt="Atlas Logo"
            width={120}
            height={120}
            className="mx-auto rounded-lg shadow-xl border-2 border-gray-700"
            priority
          />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Atlas Panel
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Sistema de Pagamentos PIX/DePix
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}