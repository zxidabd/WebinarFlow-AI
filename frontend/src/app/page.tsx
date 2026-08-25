import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LogoCloud from '@/components/LogoCloud';
import Features from '@/components/Features';
import AgentWorkflow from '@/components/AgentWorkflow';
import DashboardPreview from '@/components/DashboardPreview';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      {/* Pure black ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-black" />
      {/* Subtle silver radial glow at top center */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[800px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(184,184,184,0.05),transparent_70%)]" />

      <Navbar />
      <main>
        <Hero />
        <LogoCloud />
        <Features />
        <AgentWorkflow />
        <DashboardPreview />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
