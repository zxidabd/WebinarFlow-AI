'use client';

import { getTemplate, extractTemplateDefaults } from './templates/registry';
import WebinarFlowBadge from './WebinarFlowBadge';
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
  const rawTemplate = content?.template;
  const templateId = typeof rawTemplate === 'string' && rawTemplate ? rawTemplate : 'modern-saas';
  const template = getTemplate(templateId) || getTemplate('modern-saas')!;
  const rawSections = content?.sections || content;
  const sections: Record<string, any> = (typeof rawSections === 'object' && rawSections !== null && !Array.isArray(rawSections))
    ? rawSections
    : {};

  const allDefaults = extractTemplateDefaults(template);

  const getMergedSectionData = (sectionId: string) => {
    const defaults = allDefaults[sectionId] || {};
    let rawUserOverrides = sections[sectionId];

    // Fallbacks across template aliases
    if (!rawUserOverrides) {
      if (sectionId === 'hero') rawUserOverrides = sections['hero_v2'];
      else if (sectionId === 'hero_v2') rawUserOverrides = sections['hero'];
      else if (sectionId === 'instructor') {
        const sp = sections['speakers']?.speakers?.[0] || sections['speakers_v2']?.speakers?.[0];
        if (sp) rawUserOverrides = { name: sp.name, title_role: sp.title, bio: sp.bio, avatar: sp.avatar };
      } else if (sectionId === 'outcomes') {
        const bens = sections['benefits']?.benefits;
        if (bens) rawUserOverrides = { outcomes: bens.map((b: any) => ({ text: `${b.title} — ${b.description}` })) };
      } else if (sectionId === 'curriculum') {
        const items = sections['agenda']?.items;
        if (items) rawUserOverrides = { modules: items.map((a: any) => ({ title: a.title, duration: a.time, description: a.description || '' })) };
      } else if (sectionId === 'schedule') {
        const items = sections['agenda']?.items;
        if (items) rawUserOverrides = { items };
      } else if (sectionId === 'case_study' || sectionId === 'case_studies') {
        rawUserOverrides = sections['case_study'] || sections['case_studies'];
      }
    }

    const userOverrides = (typeof rawUserOverrides === 'object' && rawUserOverrides !== null && !Array.isArray(rawUserOverrides))
      ? rawUserOverrides
      : {};
    const cleanedOverrides: Record<string, any> = {};
    for (const [k, v] of Object.entries(userOverrides)) {
      if (v !== undefined && v !== null && v !== '') {
        cleanedOverrides[k] = v;
      }
    }
    return { ...defaults, ...cleanedOverrides };
  };

  const sectionComponents: Record<string, React.FC<{ data: any }>> = {
    navbar: (p: { data: any }) => <NavbarSection {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />,
    hero: (p: { data: any }) => <HeroSection {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />,
    hero_v2: (p: { data: any }) => <HeroV2Section {...p} isPaid={isPaid} priceCents={priceCents} currency={currency} />,
    speakers: SpeakersSection,
    speakers_v2: SpeakersV2Section,
    stats: StatsSection,
    logos: LogosSection,
    benefits: BenefitsSection,
    agenda: AgendaSection,
    testimonials: TestimonialsSection,
    faq: FAQSection,
    countdown: CountdownSection,
    instructor: InstructorSection,
    outcomes: OutcomesSection,
    curriculum: CurriculumSection,
    certificate: CertificateSection,
    schedule: ScheduleSection,
    case_study: CaseStudySection,
    case_studies: CaseStudySection,
    contact: ContactSection,
    register: (p: { data: any }) => <RegisterSection {...p} webinarId={webinarId} onRegister={onRegister} isPaid={isPaid} priceCents={priceCents} currency={currency} paymentGateway={paymentGateway} />,
    sticky_register: (p: { data: any }) => <StickyRegisterSection {...p} webinarId={webinarId} onRegister={onRegister} isPaid={isPaid} priceCents={priceCents} currency={currency} paymentGateway={paymentGateway} />,
    footer: FooterSection,
  };

  const wrapperStyle = preview
    ? 'max-w-3xl mx-auto border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden scale-[0.85] origin-top'
    : '';

  return (
    <div className={wrapperStyle}>
      {template.sections.map((section) => {
        const Component = sectionComponents[section.id];
        if (!Component) return null;
        const data = getMergedSectionData(section.id);
        return <Component key={section.id} data={data} />;
      })}
      <WebinarFlowBadge />
    </div>
  );
}
