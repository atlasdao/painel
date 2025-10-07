import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 relative overflow-hidden">
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 opacity-90" />

      {/* Subtle mesh gradient for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/5 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/5 rounded-full filter blur-3xl" />

      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-6">
          <Image
            src="/atlas-logo.jpg"
            alt="Atlas Logo"
            width={80}
            height={80}
            className="mx-auto rounded-lg shadow-xl border-2 border-gray-700"
            priority
          />
          <h2 className="mt-4 text-2xl font-bold text-white">
            Atlas Panel
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Sistema de Pagamentos PIX/DePix
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}