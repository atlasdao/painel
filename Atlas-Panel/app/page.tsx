'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/app/lib/auth';
import { Menu, X } from 'lucide-react';
import Hero from '@/app/components/landing/Hero';

// Lazy load componentes abaixo da dobra para melhorar LCP
const Features = lazy(() => import('@/app/components/landing/Features'));
const HowItWorks = lazy(() => import('@/app/components/landing/HowItWorks'));
const Pricing = lazy(() => import('@/app/components/landing/Pricing'));
const WhyAtlas = lazy(() => import('@/app/components/landing/WhyAtlas'));
const Testimonials = lazy(() => import('@/app/components/landing/Testimonials'));
const FinalCTA = lazy(() => import('@/app/components/landing/FinalCTA'));
const Footer = lazy(() => import('@/app/components/landing/Footer'));

// Componente de loading simples
const SectionLoader = () => (
  <div className="w-full py-20 flex justify-center">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Home() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    // Redirect to dashboard if user is already logged in
    if (authService.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    // DISABLED: Service worker was causing aggressive caching issues
    // Unregister any existing service workers
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
          console.log('Service Worker unregistered');
        });
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/atlas-logo.jpg"
                alt="Atlas"
                width={40}
                height={40}
                className="rounded-lg"
                priority
                fetchPriority="high"
              />
              <span className="text-xl font-bold text-white">
                Atlas
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white font-medium transition-colors">
                Recursos
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white font-medium transition-colors">
                Preços
              </button>
              <Link href="/devs" className="text-gray-300 hover:text-white font-medium transition-colors">
                Desenvolvedores
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-block text-gray-300 hover:text-white font-medium transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Começar Agora
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
            <div className="px-4 py-6 space-y-4">
              <button
                onClick={() => scrollToSection('features')}
                className="block text-gray-300 hover:text-white font-medium transition-colors py-2 text-left w-full"
              >
                Recursos
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block text-gray-300 hover:text-white font-medium transition-colors py-2 text-left w-full"
              >
                Preços
              </button>
              <Link
                href="/devs"
                className="block text-gray-300 hover:text-white font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Desenvolvedores
              </Link>
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <Link
                  href="/login"
                  className="block text-center bg-gray-800 text-gray-300 px-5 py-3 rounded-lg font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="block text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-lg font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Começar Agora
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        <Hero />
        <Suspense fallback={<SectionLoader />}>
          <Features />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <Pricing />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <WhyAtlas />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <Testimonials />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FinalCTA />
        </Suspense>
      </main>

      <Suspense fallback={<SectionLoader />}>
        <Footer />
      </Suspense>
    </div>
  );
}