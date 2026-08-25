'use client';

import { getTemplate } from './templates/registry';
import {
  HeroSection, SpeakersSection, StatsSection, LogosSection,
  BenefitsSection, AgendaSection, TestimonialsSection, FAQSection,
  CountdownSection, RegisterSection, FooterSection,
  InstructorSection, OutcomesSection, CurriculumSection,
  CertificateSection, ScheduleSection, CaseStudySection, ContactSection,
  NavbarSection, HeroV2Section, SpeakersV2Section, StickyRegisterSection,
} from './sections';

interface LandingPageContent {
  template?: string;
  sections?: Record<string, any>;
}

interface Props {
  content: LandingPageContent;
  webinarId?: string;
  onRegister?: (email: string, name?: string) => Promise<any> | void;
  /** Render in "preview" mode (white background, slight scaling, border) */
  preview?: boolean;
  /** Pricing info from the webinar */
  isPaid?: boolean;
  priceCents?: number;
  currency?: string;
  paymentGateway?: string;
}

export default function LandingPageRenderer({ content, webinarId, onRegister, preview, isPaid, priceCents, currency, paymentGateway }: Props) {
  const templateId = typeof content?.template === 'string' ? content.template : null;
  const template = templateId ? getTemplate(templateId) : null;
  const sections = content?.sections || {};

  if (!template) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <p>No template selected. Choose a template in the editor.</p>
      </div>
    );
  }

  const sectionData: Record<string, { component: React.FC<{ data: any }>; data: any }> = {
    navbar: { component: (p: { data: any }) => <NavbarSection {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />, data: sections.navbar || {} },
    hero: { component: (p: { data: any }) => <HeroSection {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />, data: sections.hero || {} },
    hero_v2: { component: (p: { data: any }) => <HeroV2Section {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />, data: sections.hero_v2 || {} },
    speakers: { component: SpeakersSection, data: sections.speakers || {} },
    speakers_v2: { component: SpeakersV2Section, data: sections.speakers_v2 || {} },
    stats: { component: StatsSection, data: sections.stats || {} },
    logos: { component: LogosSection, data: sections.logos || {} },
    benefits: { component: BenefitsSection, data: sections.benefits || {} },
    agenda: { component: AgendaSection, data: sections.agenda || {} },
    testimonials: { component: TestimonialsSection, data: sections.testimonials || {} },
    faq: { component: FAQSection, data: sections.faq || {} },
    countdown: { component: CountdownSection, data: sections.countdown || {} },
    instructor: { component: InstructorSection, data: sections.instructor || {} },
    outcomes: { component: OutcomesSection, data: sections.outcomes || {} },
    curriculum: { component: CurriculumSection, data: sections.curriculum || {} },
    certificate: { component: CertificateSection, data: sections.certificate || {} },
    schedule: { component: ScheduleSection, data: sections.schedule || {} },
    case_studies: { component: CaseStudySection, data: sections.case_studies || {} },
    contact: { component: ContactSection, data: sections.contact || {} },
    register: { component: (p: { data: any }) => <RegisterSection {...p} webinarId={webinarId} onRegister={onRegister} isPaid={isPaid} priceCents={priceCents} currency={currency} paymentGateway={paymentGateway} />, data: sections.register || {} },
    sticky_register: { component: (p: { data: any }) => <StickyRegisterSection {...p} webinarId={webinarId} onRegister={onRegister} isPaid={isPaid} priceCents={priceCents} currency={currency} paymentGateway={paymentGateway} />, data: sections.sticky_register || {} },
    footer: { component: FooterSection, data: sections.footer || {} },
  };

  const wrapperStyle = preview
    ? 'max-w-3xl mx-auto border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden scale-[0.85] origin-top'
    : '';

  return (
    <div className={wrapperStyle}>
      {template.sections.map((section) => {
        const sd = sectionData[section.id];
        if (!sd) return null;
        const { component: Component, data } = sd;
        return <Component key={section.id} data={data} />;
      })}
    </div>
  );
}
