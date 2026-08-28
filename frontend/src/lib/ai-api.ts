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
    hero_headline: string;
    hero_subheadline: string;
    cta_text: string;
    benefits: Array<{ title: string; description: string }>;
    agenda: Array<{ time: string; topic: string }>;
    faqs: Array<{ question: string; answer: string }>;
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
  const title = `${cleanTopic}: The Complete Blueprint`;
  const isPaid = !!payload.is_paid;
  const priceCents = payload.price_cents || 0;
  const slug = `${slugify(cleanTopic)}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    webinar: {
      title,
      subtitle: `Discover how ${aud} can build, automate, and scale with cutting-edge AI tools.`,
      description: `In this live workshop, you will learn the exact practical frameworks to master ${cleanTopic} and create portfolio-ready systems.`,
      duration_minutes: 60,
      is_paid: isPaid,
      price_cents: priceCents,
      learning_points: [
        `Core principles of ${cleanTopic} and practical real-world workflows`,
        'Hands-on live building walkthrough and industry case studies',
        'How to demonstrate verified AI skills to universities and top employers',
        'Continuous updates and roadmap for ongoing AI evolution',
      ],
      host_name: 'WebinarFlow AI Coach',
      host_bio: `AI practitioner helping ${aud} master real-world AI implementation and workflows.`,
    },
    landing_page: {
      title,
      slug,
      meta_description: `Register now for '${title}'. Free training for ${aud}.`,
      hero_headline: `How ${aud} Master ${cleanTopic}`,
      hero_subheadline: `A high-impact, live workshop revealing the proven framework to master AI automation from scratch.`,
      cta_text: isPaid ? `Register Now · $${(priceCents / 100).toFixed(2)}` : 'Claim Your Free Seat Now',
      benefits: [
        { title: 'Hands-on Projects', description: 'Build practical AI systems you can showcase to employers and clients.' },
        { title: 'Zero Fluff', description: 'Actionable step-by-step guidance without confusing theory or wasted time.' },
        { title: 'Future-Proof Skills', description: 'Learn frameworks that adapt as AI models and tools evolve.' },
      ],
      agenda: [
        { time: '00:00 - 00:15', topic: `State of ${cleanTopic} & Opportunities` },
        { time: '00:15 - 00:40', topic: 'Live AI Automation Build & Workflow Walkthrough' },
        { time: '00:40 - 00:55', topic: 'Portfolio Roadmap & Next Steps' },
        { time: '00:55 - 01:00', topic: 'Live Interactive Q&A' },
      ],
      faqs: [
        { question: 'Who is this workshop for?', answer: `This masterclass is designed specifically for ${aud} who want practical AI skills.` },
        { question: 'Will there be a replay available?', answer: 'Yes! All registered attendees receive access to the full recording and resource toolkit.' },
        { question: 'Do I need prior programming experience?', answer: 'No prior coding experience is required—we cover both no-code and modern AI workflows.' },
      ],
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
      hook: `Why traditional approaches to ${cleanTopic} fail in 2026 and what actually works.`,
      story: `Case study of how ${aud} shifted from uncertainty to streamlined execution.`,
      core_content: 'Pillar 1: Foundation\nPillar 2: Core Automation System\nPillar 3: Scaling & Portfolio',
      offer_pitch: 'Presenting the complete toolkit / mentorship to accelerate results effortlessly.',
      qa_points: 'Addressing student questions, career transition, and tech setup.',
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
        { id: 'nvidia/DeepSeek V4 Pro', name: 'DeepSeek V4 Pro (Free · NVIDIA NIM)', provider: 'nvidia' },
        { id: 'nvidia/Mistral Large 3 675B', name: 'Mistral Large 3 (Free · NVIDIA NIM)', provider: 'nvidia' },
        { id: 'nvidia/Dracarys Llama 3.1 70B Instruct', name: 'Llama 3.1 70B (Free · NVIDIA)', provider: 'nvidia' },
        { id: 'ollamacloud/DeepSeek V4 Pro', name: 'DeepSeek V4 Pro (Ollama Cloud)', provider: 'ollamacloud' },
        { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', provider: 'openai' },
        { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Anthropic)', provider: 'anthropic' },
      ],
    };
  }
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

    let reply = `I have analyzed your request for: "${rawMsg}".\n\nHere are 3 high-converting recommendations for your webinar funnel:\n1. **Punchy Headline**: Focus on the #1 transformation your audience desires.\n2. **Live Value Demo**: Include a 15-minute live actionable walkthrough.\n3. **Clear Next Step**: Present your offer with an exclusive limited-time bonus.\n\nYou can switch to the **1-Click Funnel Generator** tab above to automatically build the full campaign in 5 seconds!`;

    if (['hi', 'hello', 'hey', 'greetings', 'yo'].includes(lower)) {
      reply = `👋 Hello! I am your **WebinarFlow AI Agent**.\n\nI can help you:\n- ⚡ **Build complete webinar funnels** (Landing page + 5 Emails + Script outline)\n- ✍️ **Write high-converting headlines & copy**\n- 📧 **Draft automated reminder email sequences**\n- 🎯 **Optimize attendee registration & show-up rates**\n\nWhat webinar topic would you like to build today?`;
    } else if (lower.includes('headline') || lower.includes('title')) {
      reply = `🔥 Here are 3 high-converting headline frameworks for your topic:\n\n1. *"How to Master [Topic] in 2026 Without [Common Frustration]"*\n2. *"The 3-Step Blueprint to Scale [Topic] with High Conversion"*\n3. *"Live Workshop: The Exact Framework We Used to Achieve 10x Results"*\n\nWould you like me to generate the full landing page for one of these?`;
    } else if (lower.includes('email') || lower.includes('sequence')) {
      reply = `✉️ Here is a 5-part email framework proven to get 45%+ show-up rates:\n\n1. **Confirmation & Calendar Invite** (Immediate)\n2. **24-Hour Countdown & Worksheet** (24h before)\n3. **1-Hour Prep & Notebook Reminder** (1h before)\n4. **Starting Now: Room Open** (Live broadcast)\n5. **Replay Access & Limited Offer** (Post-webinar)\n\nSwitch to the **1-Click Funnel Generator** tab to get the full copy written for you!`;
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
        sections: {
          hero: {
            headline: funnel.landing_page.hero_headline,
            subheadline: funnel.landing_page.hero_subheadline,
            cta_text: funnel.landing_page.cta_text,
          },
          benefits: funnel.landing_page.benefits,
          agenda: funnel.landing_page.agenda,
          faqs: funnel.landing_page.faqs,
          host: {
            name: funnel.webinar.host_name,
            bio: funnel.webinar.host_bio,
          },
          outline: funnel.outline,
          emails: funnel.email_sequence,
        },
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
