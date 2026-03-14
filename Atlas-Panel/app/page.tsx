'use client';

import Nav from './components/landing/Nav';
import Hero from './components/landing/Hero';
import Numbers from './components/landing/Numbers';
import HowItWorks from './components/landing/HowItWorks';
import Features from './components/landing/Features';
import Comparison from './components/landing/Comparison';
import Pricing from './components/landing/Pricing';
// import SocialProof from './components/landing/SocialProof'; // TODO: reativar quando tiver depoimentos reais
import FAQ from './components/landing/FAQ';
import FinalCTA from './components/landing/FinalCTA';
import Footer from './components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <Nav />
      <main>
        <Hero />
        <Numbers />
        <HowItWorks />
        <Features />
        <Comparison />
        <Pricing />
        {/* <SocialProof /> TODO: reativar quando tiver depoimentos reais */}
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
