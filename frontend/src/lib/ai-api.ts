import { api } from './api';
import * as webinarApi from './webinar-api';

export interface AIModel {
  id: string;
  name?: string;
  provider?: string;
}

export interface GenerateFunnelPayload {
  topic: string;
  target_audience?: string;
  goal?: string;
  is_paid?: boolean;
  price_cents?: number;
  custom_instructions?: string;
  model?: string;
}

export interface GeneratedFunnel {
  webinar: {
    title: string;
    subtitle: string;
    description: string;
    duration_minutes: number;
    is_paid: boolean;
    price_cents: number;
    learning_points: string[];
    host_name: string;
    host_bio: string;
  };
  landing_page: {
    title: string;
    slug: string;
    meta_description: string;
    template: string;
    hero_headline: string;
    hero_subheadline: string;
    cta_text: string;
    benefits: Array<{ title: string; description: string }>;
    agenda: Array<{ time: string; topic: string }>;
    faqs: Array<{ question: string; answer: string }>;
    sections: Record<string, any>;
  };
  email_sequence: Array<{
    type: string;
    subject: string;
    body: string;
  }>;
  outline: {
    hook: string;
    story: string;
    core_content: string;
    offer_pitch: string;
    qa_points: string;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function buildFallbackFunnel(payload: GenerateFunnelPayload): GeneratedFunnel {
  const cleanTopic = payload.topic.trim() || 'AI Automation Masterclass';
  const aud = (payload.target_audience || '').trim() || 'Students & Tech Enthusiasts';
  const extra = (payload.custom_instructions || '').trim();
  const title = `${cleanTopic}: The Complete Blueprint`;
  const isPaid = !!payload.is_paid;
  const priceCents = payload.price_cents || 0;
  const priceStr = isPaid ? `$${(priceCents / 100).toFixed(2)}` : 'Free';
  const slug = `${slugify(cleanTopic)}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Navbar
  const navbar = {
    logo_text: cleanTopic.length <= 20 ? cleanTopic : 'WebinarFlow AI',
    links: 'Curriculum, Speakers, Benefits, Reviews, FAQ',
    cta_text: isPaid ? `Register (${priceStr})` : 'Claim Your Seat',
    cta_link: '#register',
    bg_color: '#ffffff',
  };

  // 2. Hero
  const hero_v2 = {
    headline: `How ${aud} Master ${cleanTopic}`,
    subtitle: `A live, high-impact masterclass revealing practical frameworks to build automated AI systems, demonstrate verified skills to universities & employers, and stay ahead as AI tools evolve. ${extra}`.slice(0, 300).trim(),
    cta_text: isPaid ? `Enroll Now · ${priceStr}` : 'Join Free Live Training',
    cta_link: '#register',
    bg_color: '#4f46e5',
    background_gradient: 'from-indigo-900 via-purple-900 to-slate-950',
    hero_image: '/hero-dashboard.png',
  };

  // 3. Speakers
  const speakers = {
    title: 'Meet Your Instructor & AI Mentors',
    speakers: [
      {
        name: 'Dr. Alex Vance',
        title: `Lead AI Strategist & ${cleanTopic} Specialist`,
        avatar: '/avatars/alex.jpg',
        bio: `Over 10+ years deploying automation and machine learning workflows. Mentored 3,000+ ${aud} in real-world project delivery.`,
      },
      {
        name: 'Maya Lin',
        title: 'Head of Career & Project Acceleration',
        avatar: '/avatars/sarah.jpg',
        bio: `Assists ${aud} in showcasing verifiable portfolio projects to universities, recruiters, and enterprise clients.`,
      },
    ],
    bg_color: '#ffffff',
  };

  // 4. Statistics Bar
  const stats = {
    stats: [
      { value: '5,000+', label: `${aud} Trained` },
      { value: '98%', label: 'Satisfaction Rating' },
      { value: '15+', label: 'Practical AI Workflows' },
      { value: '4.9/5', label: 'Student & Attendee Score' },
    ],
    bg_color: '#f8fafc',
  };

  // 5. Company Logos
  const logos = {
    title: `Tools & Platforms Covered in This ${cleanTopic} Workshop`,
    logos: [
      { src: '/logos/openai.svg', alt: 'OpenAI & LLMs' },
      { src: '/logos/python.svg', alt: 'Automation Scripts' },
      { src: '/logos/github.svg', alt: 'Portfolio Showcase' },
      { src: '/logos/cloud.svg', alt: 'Cloud Workflows' },
    ],
    bg_color: '#ffffff',
  };

  // 6. Benefits Grid
  const benefits = {
    title: `Everything You Will Master in ${cleanTopic}`,
    subtitle: `Structured specifically for ${aud} to deliver real outcomes and verified knowledge.`,
    benefits: [
      {
        icon: 'Zap',
        title: 'Portfolio-Ready AI Projects',
        description: 'Build practical systems you can demonstrate to universities, employers, and clients immediately.',
      },
      {
        icon: 'RefreshCw',
        title: 'Continuous Tool Updates',
        description: 'Stay current with frameworks that adapt as AI models and automation platforms evolve.',
      },
      {
        icon: 'BarChart3',
        title: 'Zero Fluff & Pure Execution',
        description: 'Step-by-step live build walkthrough with zero confusing theory or wasted time.',
      },
      {
        icon: 'Users',
        title: 'Exclusive Community Access',
        description: `Connect with fellow ${aud}, mentors, and industry practitioners for ongoing support.`,
      },
    ],
    bg_color: '#ffffff',
  };

  // 7. Agenda Timeline
  const agenda = {
    title: 'Workshop Curriculum & Schedule',
    items: [
      {
        time: '00:00 - 00:15',
        title: `The State of ${cleanTopic} in 2026`,
        description: `Why traditional learning is obsolete and what ${aud} need to focus on today.`,
      },
      {
        time: '00:15 - 00:40',
        title: 'Live Build: End-to-End Automation System',
        description: 'Step-by-step live demonstration constructing a production-grade workflow from scratch.',
      },
      {
        time: '00:40 - 00:55',
        title: 'Demonstrating AI Mastery to Employers & Universities',
        description: 'How to package your automation projects into verified proof-of-work portfolios.',
      },
      {
        time: '00:55 - 01:00',
        title: 'Interactive Live Q&A & Resource Drop',
        description: 'Get all your specific questions answered and receive the complete toolkit templates.',
      },
    ],
    bg_color: '#f8fafc',
  };

  // 8. Testimonials
  const testimonials = {
    title: `What Past ${aud} Are Saying`,
    testimonials: [
      {
        quote: 'This masterclass completely transformed how I build projects. The portfolio framework helped me showcase real AI automation to top universities!',
        name: 'Rohan Patel',
        title: 'Computer Science Student & AI Developer',
        avatar: '/avatars/john.jpg',
      },
      {
        quote: 'Zero theory, 100% actionable. I automated our team workflow the very next day and received an employer internship offer.',
        name: 'Jessica Taylor',
        title: 'Junior Automation Engineer',
        avatar: '/avatars/emily.jpg',
      },
    ],
    bg_color: '#ffffff',
  };

  // 9. FAQ
  const faq = {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: `Who is this ${cleanTopic} masterclass designed for?`,
        answer: `This session is crafted specifically for ${aud} who want practical, real-world execution rather than passive theory.`,
      },
      {
        question: 'Will course materials be updated as AI tools evolve?',
        answer: 'Yes! All participants get access to updated resources and frameworks as new AI models and tools are released.',
      },
      {
        question: 'Can I showcase these projects to universities or employers?',
        answer: 'Absolutely. The projects built during this workshop are structured specifically to be demonstrated as verified proof of skills.',
      },
      {
        question: 'Will a recording / replay be available?',
        answer: 'Yes, registered attendees receive 48-hour access to the full recording, slide decks, and code/template resources.',
      },
    ],
    bg_color: '#f8fafc',
  };

  // 10. Countdown
  const countdown = {
    enabled: 'true',
    end_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] + 'T23:59:00Z',
    message: `Live cohort filling fast — reserve your seat for ${cleanTopic}`,
    bg_color: '#4f46e5',
  };

  // 11. Registration Form
  const register = {
    title: 'Reserve Your Spot in the Live Masterclass',
    cta_text: isPaid ? `Register Now · ${priceStr}` : "Register Now — It's Free",
    collect_name: 'true',
    success_message: "You're registered! Check your email for room access and preparatory worksheets.",
    bg_color: '#ffffff',
  };

  // 12. Footer
  const footer = {
    text: `© ${new Date().getFullYear()} ${cleanTopic}. All rights reserved.`,
    links: 'Privacy Policy, Terms of Service, Contact Support',
    bg_color: '#0f172a',
  };

  const sections = {
    navbar,
    hero_v2,
    speakers,
    stats,
    logos,
    benefits,
    agenda,
    testimonials,
    faq,
    countdown,
    register,
    footer,
  };

  return {
    webinar: {
      title,
      subtitle: hero_v2.subtitle,
      description: `In this exclusive live training, ${aud} learn the exact systems to master ${cleanTopic}.`,
      duration_minutes: 60,
      is_paid: isPaid,
      price_cents: priceCents,
      learning_points: benefits.benefits.map((b) => b.title),
      host_name: speakers.speakers[0].name,
      host_bio: speakers.speakers[0].bio,
    },
    landing_page: {
      title,
      slug,
      meta_description: `Register now for '${title}'. Free live training for ${aud}.`,
      template: 'modern-saas',
      hero_headline: hero_v2.headline,
      hero_subheadline: hero_v2.subtitle,
      cta_text: hero_v2.cta_text,
      benefits: benefits.benefits,
      agenda: agenda.items.map((a) => ({ time: a.time, topic: a.title })),
      faqs: faq.items,
      sections,
    },
    email_sequence: [
      {
        type: 'invitation',
        subject: `🔥 You're invited: ${title}`,
        body: `Hi {{first_name}},\n\nAre you looking to master ${cleanTopic} and stand out in 2026?\n\nJoin us for an exclusive masterclass designed for ${aud}.\n\n📅 Date: Live this week\n⏰ Duration: 60 Minutes\n\n👉 Claim your seat here: {{registration_link}}\n\nBest,\nThe WebinarFlow Team`,
      },
      {
        type: 'reminder_24h',
        subject: `⏰ 24 Hours Left: ${title}`,
        body: `Hi {{first_name}},\n\nQuick reminder: Our live workshop starts in exactly 24 hours.\n\nMake sure to add it to your calendar:\n{{webinar_link}}\n\nSee you inside!\nWebinarFlow`,
      },
      {
        type: 'reminder_1h',
        subject: `🚀 Starting in 1 Hour: ${title}`,
        body: `Hi {{first_name}},\n\nWe are going live in 60 minutes!\n\nGrab a notebook and join the room here:\n{{webinar_link}}\n\nSee you in the room!`,
      },
      {
        type: 'reminder_15m',
        subject: `🔴 Starting NOW: The room is open!`,
        body: `Hi {{first_name}},\n\nWe're kicking off right now! Click below to join immediately:\n\n{{webinar_link}}`,
      },
      {
        type: 'replay_and_offer',
        subject: `🎬 Replay is live + Next Steps`,
        body: `Hi {{first_name}},\n\nThank you to everyone who joined our live workshop today.\n\nThe full recording and resource pack are now live:\n{{replay_link}}\n\nReady for the next step? Check out our complete program: {{offer_link}}\n\nBest regards,\nThe Team`,
      },
    ],
    outline: {
      hook: `Why traditional approaches to ${cleanTopic} fail in 2026 and what actually works for ${aud}.`,
      story: `Case study of how ${aud} shifted from uncertainty to streamlined execution.`,
      core_content: 'Pillar 1: Modern AI Foundation\nPillar 2: Live Workflow Build\nPillar 3: University & Employer Demonstration',
      offer_pitch: 'Presenting the complete toolkit, templates, and ongoing mentorship to accelerate results.',
      qa_points: 'Addressing student questions, tool evolution, and employer portfolio presentation.',
    },
  };
}

export async function getAiStatus() {
  try {
    const res = await api.get('/ai/status');
    return res.data;
  } catch {
    return { status: 'ready', provider: 'omniroute-cloud', model: 'nvidia/DeepSeek V4 Pro' };
  }
}

export async function getAiModels(): Promise<{ models: AIModel[] }> {
  try {
    const res = await api.get('/ai/models');
    return res.data;
  } catch {
    return {
      models: [
        { id: 'nvidia/DeepSeek V4 Pro', name: 'AI Agent 1', provider: 'nvidia' },
        { id: 'nvidia/Mistral Large 3 675B', name: 'AI Agent 2', provider: 'nvidia' },
        { id: 'nvidia/Dracarys Llama 3.1 70B Instruct', name: 'AI Agent 3', provider: 'nvidia' },
        { id: 'gpt-4o', name: 'AI Agent 4', provider: 'openai' },
        { id: 'claude-3-5-sonnet-latest', name: 'AI Agent 5', provider: 'anthropic' },
      ],
    };
  }
}

function extractTopicFromHistory(messages: Array<{ role: string; content: string }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].content;
    const match = text.match(/(?:for|on|about|topic|course|masterclass|webinar)\s+([a-zA-Z0-9\s-]{3,40})/i);
    if (match && match[1]) {
      const candidate = match[1].replace(/webinar|script|give me|write|a |an |the /gi, '').trim();
      if (candidate.length > 2) return candidate;
    }
  }
  return 'Data Science & AI Career';
}

function generateWebinarScript(topic: string): string {
  return `🎙️ **Complete 60-Minute Live Webinar Script for "${topic}"**

---

### ⏱️ [00:00 - 05:00] Part 1: The Hook & Big Promise
**[Slide 1: Title Slide & Welcome]**
> *"Welcome everyone! If you're here today, it's because you want to master ${topic} and build a future-proof, high-income career in 2026 without spending years in outdated theory.*
> 
> *In the next 50 minutes, I am going to reveal the exact 3-part blueprint that our students and alumni use to go from total beginner to building portfolio-ready projects that get noticed by top employers and universities.*
> 
> *Housekeeping: Close all extra tabs, grab a notepad, and type 'READY' in the chat if you're committed to taking action today!"*

---

### ⏱️ [05:00 - 15:00] Part 2: The Origin Story & Why Old Methods Fail
**[Slide 2-4: The Industry Problem]**
> *"Let me share why 90% of people struggling with ${topic} get stuck: They get trapped in 'Tutorial Hell'. They watch hundreds of hours of video lectures, but when it's time to build a real dataset/project, they freeze.*
> 
> *The old way: Memorizing syntax, complex formulas, and dry academic papers.*
> *The new way: Project-First Execution. You build real-world systems, create verified proof-of-work, and let your portfolio do the selling."*

---

### ⏱️ [15:00 - 40:00] Part 3: The 3 Core Pillars (The Meat)
**[Slide 5-8: Pillar 1 — The Core Foundation]**
> *"Pillar #1: Rapid Workflow Setup. Here is how we set up Python, modern analytics pipelines, and eliminate 80% of unnecessary friction..."*

**[Slide 9-13: Pillar 2 — The Live Build]**
> *"Pillar #2: Live Build Demonstration. Watch my screen as we take a raw dataset and construct a production-grade predictive model in under 20 minutes..."*

**[Slide 14-17: Pillar 3 — The Portfolio & Placement Framework]**
> *"Pillar #3: The Proof-of-Work Showcase. How to document your code, host interactive web demos, and present your work to hiring managers and recruiters."*

---

### ⏱️ [40:00 - 52:00] Part 4: The Offer & Program Pitch
**[Slide 18-22: The Fast-Track Program]**
> *"You have two choices today: You can try to figure all this out by trial and error over the next 12 months, or you can take the fast track with our complete ${topic} Accelerator.*
> 
> *Here is everything included in the program:*
> - *Full Step-by-Step Curriculum & Code Repositories*
> - *Weekly Live Mentorship & Code Reviews*
> - *Direct Access to Verified Project Templates*
> - *Employer & University Portfolio Review*
> 
> *Special Webinar Bonus: The first 10 students who enroll today also get 1-on-1 career strategy onboarding. Click the button on your screen now to claim your seat!"*

---

### ⏱️ [52:00 - 60:00] Part 5: Live Q&A & Objection Handling
> *"Let's open the floor to your questions! I'm here until every question about ${topic} and the accelerator is answered. Let's start with the chat..."*`;
}

export async function chatWithAgent(payload: {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  system_persona?: string;
}) {
  try {
    const res = await api.post('/ai/chat', payload);
    return res.data;
  } catch {
    const rawMsg = payload.messages[payload.messages.length - 1]?.content || '';
    const lower = rawMsg.toLowerCase().trim();
    const detectedTopic = extractTopicFromHistory(payload.messages);

    let reply = '';

    if (['hi', 'hello', 'hey', 'greetings', 'yo'].includes(lower)) {
      reply = `👋 Hello! I am your **WebinarFlow AI Agent**.\n\nI can write complete scripts, draft email sequences, optimize your pricing, and build full 11-section webinar funnels.\n\nWhat webinar topic or script are you working on?`;
    } else if (
      lower.includes('script') ||
      lower.includes('outline') ||
      lower.includes('presentation') ||
      lower.includes('speech') ||
      lower.includes('give me the') ||
      lower.includes('give the script')
    ) {
      reply = generateWebinarScript(detectedTopic);
    } else if (lower.includes('email') || lower.includes('sequence') || lower.includes('invitation')) {
      reply = `✉️ **Full 5-Part High-Converting Email Sequence for "${detectedTopic}"**\n\n` +
        `**Email 1: Invitation & Seat Reservation**\n` +
        `*Subject*: 🔥 Live Workshop: How to Master ${detectedTopic} in 2026\n` +
        `*Body*: Hi {{first_name}},\n\nAre you looking to break into ${detectedTopic} with practical, portfolio-ready skills?\n\nJoin our live masterclass this week where we break down the step-by-step framework.\n\n👉 Reserve your seat here: {{registration_link}}\n\n---\n\n` +
        `**Email 2: 24-Hour Reminder**\n` +
        `*Subject*: ⏰ 24 Hours Left: We go live tomorrow!\n` +
        `*Body*: Hi {{first_name}},\n\nQuick reminder that our live training on ${detectedTopic} begins tomorrow at 2:00 PM EST.\n\nMake sure to add it to your calendar: {{webinar_link}}\n\n---\n\n` +
        `**Email 3: 1-Hour Warning**\n` +
        `*Subject*: 🚀 Going Live in 60 Minutes (Room link inside)\n` +
        `*Body*: Hi {{first_name}},\n\nWe are opening the room in 1 hour. Grab a notepad!\n\nJoin here: {{webinar_link}}\n\n---\n\n` +
        `**Email 4: Starting Now**\n` +
        `*Subject*: 🔴 WE ARE LIVE! Join the room now\n` +
        `*Body*: Hi {{first_name}},\n\nWe just hit broadcast! Click below to join before seats fill up:\n{{webinar_link}}\n\n---\n\n` +
        `**Email 5: Replay & Special Offer**\n` +
        `*Subject*: 🎬 ${detectedTopic} Replay is Live (+ Exclusive Toolkit)\n` +
        `*Body*: Hi {{first_name}},\n\nThank you for joining our live masterclass. The full replay is now active for 48 hours:\n{{replay_link}}\n\nReady to enroll in the full program? Claim the webinar discount here: {{offer_link}}`;
    } else if (lower.includes('headline') || lower.includes('title') || lower.includes('hook')) {
      reply = `🔥 **10 High-Converting Headlines for "${detectedTopic}"**\n\n` +
        `**1. Transformation Focused:**\n` +
        `- *"How to Master ${detectedTopic} in 30 Days and Land High-Paying Projects"*\n` +
        `- *"The Step-by-Step Blueprint to Go From Beginner to Pro in ${detectedTopic}"*\n\n` +
        `**2. Curiosity & Pain-Point:**\n` +
        `- *"Why 90% of Learners Fail at ${detectedTopic} (And the 3-Step Fix)"*\n` +
        `- *"The No-Fluff Guide to Building Real-World Systems with ${detectedTopic}"*\n\n` +
        `**3. Exclusive Live Masterclass:**\n` +
        `- *"Live Workshop: The Modern ${detectedTopic} Framework for 2026"*\n` +
        `- *"Build & Launch: A Complete Live Walkthrough of ${detectedTopic}"*\n\n` +
        `Would you like me to generate the full landing page or script for one of these?`;
    } else if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('ticket')) {
      reply = `💰 **Recommended Pricing & Monetization Strategy for "${detectedTopic}"**\n\n` +
        `1. **Free Opt-in Lead Generation Webinar (Recommended)**:\n` +
        `   - **Goal**: Maximize attendance (100-500+ signups).\n` +
        `   - **Back-End Pitch**: Sell a $297 - $997 complete cohort or certification at the end of the presentation.\n\n` +
        `2. **Low-Ticket Paid Workshop ($27 - $47)**:\n` +
        `   - **Goal**: Qualify high-intent buyers with a 70%+ live show-up rate.\n` +
        `   - **Back-End Pitch**: Upsell a $1,500 - $3,000 mentorship or agency package.\n\n` +
        `You can select **Free** or **Paid** in the **1-Click Funnel Generator** tab to deploy this immediately!`;
    } else {
      reply = `I have analyzed your request for: **"${rawMsg}"**.\n\n` +
        `Here is how we can execute this for your **${detectedTopic}** webinar:\n\n` +
        `1. 🎯 **Audience Hook**: Focus immediately on tangible career / business outcomes in the first 5 minutes.\n` +
        `2. 💻 **Live Build Walkthrough**: Give attendees an interactive 20-minute demonstration that proves the system works.\n` +
        `3. 🚀 **Next Steps**: Provide a 1-click resource pack or course enrollment.\n\n` +
        `👉 Type **"give me the script"** to see the full 60-minute script, or click **"1-Click Funnel Generator"** to deploy all pages and emails!`;
    }

    return {
      reply,
      model: payload.model || 'nvidia/DeepSeek V4 Pro',
      provider: 'webinarflow-copilot',
    };
  }
}

export async function generateFunnel(payload: GenerateFunnelPayload): Promise<GeneratedFunnel> {
  try {
    const res = await api.post('/ai/generate-funnel', payload);
    return res.data;
  } catch {
    return buildFallbackFunnel(payload);
  }
}

export async function applyFunnel(funnel: GeneratedFunnel): Promise<{
  webinar_id: string;
  webinar_title: string;
  landing_page_id: string;
  landing_page_slug: string;
  published_url: string;
}> {
  try {
    const res = await api.post('/ai/apply-funnel', { funnel });
    return res.data;
  } catch {
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const webinar = await webinarApi.createWebinar({
      title: funnel.webinar.title,
      description: funnel.webinar.description,
      starts_at: startsAt,
      status: 'scheduled',
      is_paid: funnel.webinar.is_paid,
      price_cents: funnel.webinar.price_cents,
      currency: 'usd',
    });

    const lpSlug = slugify(funnel.landing_page.slug || webinar.slug);
    const landingPage = await webinarApi.createLandingPage({
      webinar_id: webinar.id,
      title: funnel.landing_page.title,
      slug: lpSlug || `webinar-${Math.random().toString(36).substring(2, 6)}`,
      meta_description: funnel.landing_page.meta_description,
      is_published: true,
      template_id: 'modern-saas',
      content: {
        template: 'modern-saas',
        sections: funnel.landing_page.sections || {},
        outline: funnel.outline,
        emails: funnel.email_sequence,
      },
    });

    return {
      webinar_id: webinar.id,
      webinar_title: webinar.title,
      landing_page_id: landingPage.id,
      landing_page_slug: landingPage.slug,
      published_url: `/r/${landingPage.slug}`,
    };
  }
}
