import Image from 'next/image';
import CommunityFooter from '@/components/CommunityFooter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-90"
        style={{ background: 'linear-gradient(to bottom right, var(--bg-primary), var(--bg-secondary))' }}
      />

      {/* Subtle mesh gradient for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full filter blur-3xl" style={{ background: 'var(--accent-soft)' }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-50" style={{ background: 'var(--accent-soft)' }} />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="relative z-10 max-w-md w-full">
          <div className="text-center mb-6">
            <Image
              src="/atlas-logo.jpg"
              alt="Atlas Logo"
              width={80}
              height={80}
              className="mx-auto rounded-lg shadow-xl border-2 border-[var(--border-default)]"
              priority
            />
            <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
              Conta Atlas
            </h2>
          </div>
          {children}
        </div>
      </div>

      {/* Community Footer */}
      <div className="relative z-10">
        <CommunityFooter />
      </div>
    </div>
  );
}
