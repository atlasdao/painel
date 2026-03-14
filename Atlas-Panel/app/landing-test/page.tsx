'use client';

import Nav from './components/Nav';
import Hero from './components/Hero';
import Numbers from './components/Numbers';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
// import SocialProof from './components/SocialProof'; // TODO: reativar quando tiver depoimentos reais
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

export default function LandingTestPage() {
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
