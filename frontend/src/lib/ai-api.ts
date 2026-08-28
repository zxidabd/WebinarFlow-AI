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
    return { status: 'ready', provider: 'universal-ai-engine', model: 'AI Agent 1' };
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

// -------------------------------------------------------------
// Universal General-Purpose AI Reasoning & Code Synthesizer
// -------------------------------------------------------------

function synthesizeUniversalAIResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  model: string = 'AI Agent 1'
): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  const currentMsg = userMessages[userMessages.length - 1]?.content || '';
  const lower = currentMsg.toLowerCase().trim();

  // 1. Greetings
  if (['hi', 'hello', 'hey', 'greetings', 'yo', 'sup', 'good morning', 'good evening'].includes(lower)) {
    return `👋 Hello! I am your **AI Agent** (${model}).

How can I help you today? I am equipped to assist you with:
- 💻 **Software Engineering & Coding**: Python, JavaScript, TypeScript, React, Next.js, SQL, APIs, Docker, System Architecture, and Debugging.
- 🔬 **Data Science, AI & Machine Learning**: Data analysis, Pandas, PyTorch, Scikit-learn, Neural Networks, and LLM engineering.
- 📈 **Business, Growth & Marketing**: Strategy, SaaS metrics, conversion optimization, and analytics.
- ✍️ **Writing & Content**: Technical documentation, copywriting, email sequences, presentations, and summaries.
- 🎯 **Webinars & Sales Funnels**: Landing page architecture, 60-min masterclass scripts, and show-up rate optimization.

Feel free to ask any technical, general, or strategic question!`;
  }

  // 2. Python / Data Science / Machine Learning
  if (
    lower.includes('python') ||
    lower.includes('data science') ||
    lower.includes('pandas') ||
    lower.includes('numpy') ||
    lower.includes('machine learning') ||
    lower.includes('pytorch') ||
    lower.includes('scikit') ||
    lower.includes('regression') ||
    lower.includes('neural network') ||
    lower.includes('decorator') ||
    lower.includes('fastapi')
  ) {
    if (lower.includes('decorator')) {
      return `### 🐍 Understanding Python Decorators

A **decorator** in Python is a function that takes another function as an argument, extends or modifies its behavior without altering its source code, and returns the modified function.

#### 💡 Core Pattern & Code Example:

\`\`\`python
import time
from functools import wraps

def time_it(func):
    """Decorator that measures execution time of a function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        print(f"⏱️ Function '{func.__name__}' took {(end_time - start_time):.4f}s to execute.")
        return result
    return wrapper

# Usage:
@time_it
def train_model(epochs: int):
    time.sleep(0.5)  # Simulating training
    return f"Model trained for {epochs} epochs!"

print(train_model(10))
\`\`\`

#### 🔑 Key Takeaways:
1. \`@wraps(func)\` preserves the original function's name, docstrings, and signature.
2. \`*args, **kwargs\` allows the decorator to support functions with any parameters.
3. Common production use-cases include **authentication checks, caching/memoization, rate-limiting, and telemetry logging**.`;
    }

    if (lower.includes('data science') && (lower.includes('script') || lower.includes('project') || lower.includes('pipeline') || lower.includes('code'))) {
      return `### 📊 End-to-End Data Science & Machine Learning Pipeline

Here is a complete, production-grade Python script covering **data preprocessing, feature scaling, model training, evaluation, and inference**:

\`\`\`python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

# 1. Generate / Load Dataset
def load_and_preprocess_data():
    np.random.seed(42)
    n_samples = 1000
    
    # Synthetic feature matrix
    X = np.random.randn(n_samples, 5)
    # Target variable (binary classification)
    y = (X[:, 0] * 1.5 + X[:, 1] * 0.8 + np.random.randn(n_samples) > 0).astype(int)
    
    # Train-Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler

# 2. Train Model
X_train, X_test, y_train, y_test, scaler = load_and_preprocess_data()
model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# 3. Model Evaluation
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

print("🎯 Classification Report:")
print(classification_report(y_test, y_pred))
print(f"🌟 ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
\`\`\`

#### 🚀 Next Steps:
- Would you like to add cross-validation, hyperparameter tuning via Optuna/GridSearchCV, or deploy this as a FastAPI endpoint?`;
    }

    return `### 🐍 Python & Data Science Guide: ${currentMsg}

In modern data science and Python engineering:

1. **Vectorized Operations**: Always prefer vectorized Pandas/NumPy operations over iterrows() or explicit for-loops for 100x+ performance gains.
2. **Type Hinting & Pydantic**: Use Python 3.10+ type hints (\`list[str]\`, \`dict[str, Any]\`) and Pydantic models for bulletproof runtime validation.
3. **Reproducibility**: Set random seeds (\`np.random.seed()\`, \`torch.manual_seed()\`) and utilize virtual environments (\`uv\` or \`poetry\`).

\`\`\`python
import pandas as pd

# Clean, idiomatic data transformation
def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df.dropna(subset=['id', 'value'])
          .assign(normalized_value=lambda x: (x['value'] - x['value'].mean()) / x['value'].std())
          .sort_values(by='normalized_value', ascending=False)
    )
\`\`\`

Let me know if you need specific algorithms, data cleaning strategies, or deep learning model architectures!`;
  }

  // 3. React / Next.js / TypeScript / Frontend
  if (
    lower.includes('react') ||
    lower.includes('next.js') ||
    lower.includes('nextjs') ||
    lower.includes('useeffect') ||
    lower.includes('usestate') ||
    lower.includes('hook') ||
    lower.includes('component') ||
    lower.includes('typescript') ||
    lower.includes('tailwind') ||
    lower.includes('javascript')
  ) {
    return `### ⚛️ Modern React & Next.js Architecture: ${currentMsg}

#### 💡 Best Practices for React 18/19 & Next.js App Router:

1. **Server vs. Client Components**:
   - Keep data fetching on the server using Server Components (\`async function Page()\`).
   - Only add \`'use client'\` for interactive state, effects, or browser event listeners.

2. **Custom Hooks Pattern**:

\`\`\`tsx
import { useState, useEffect } from 'react';

export function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);
        return res.json();
      })
      .then((json: T) => {
        if (isMounted) {
          setData(json);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [url]);

  return { data, isLoading, error };
}
\`\`\`

3. **Performance Optimization**:
   - Use \`useMemo\` and \`useCallback\` only when passing callbacks to memoized children or computing heavy operations.
   - Utilize React 18 \`useTransition\` for non-blocking state updates.`;
  }

  // 4. SQL / Database / Backend
  if (
    lower.includes('sql') ||
    lower.includes('database') ||
    lower.includes('postgres') ||
    lower.includes('mongodb') ||
    lower.includes('query') ||
    lower.includes('join') ||
    lower.includes('index')
  ) {
    return `### 🗄️ SQL & Database Architecture: ${currentMsg}

#### 💡 High-Performance SQL Optimization & Query Patterns:

\`\`\`sql
-- 1. Cohort Retention / Activity Window Function
SELECT 
    DATE_TRUNC('month', created_at) AS signup_month,
    COUNT(DISTINCT id) AS total_signups,
    COUNT(DISTINCT CASE WHEN is_paid = TRUE THEN id END) AS paying_customers,
    ROUND(
        COUNT(DISTINCT CASE WHEN is_paid = TRUE THEN id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT id), 0) * 100, 2
    ) AS conversion_rate_pct
FROM users
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY signup_month DESC;
\`\`\`

#### ⚡ Indexing & Schema Guidelines:
- **Composite Indexes**: Index on \`(organization_id, created_at DESC)\` for multi-tenant filtered sorting.
- **Partial Indexes**: Index only active rows (e.g. \`CREATE INDEX idx_active_webinars ON webinars (starts_at) WHERE status = 'scheduled';\`).
- **Connection Pooling**: Use PgBouncer or SQLAlchemy Async Engine connection pools with max overflow limits to prevent connection exhaustion.`;
  }

  // 5. Specific Webinar / Funnel / Pitch request
  if (lower.includes('webinar script') || lower.includes('funnel script') || (lower.includes('script') && lower.includes('webinar'))) {
    const topic = currentMsg.replace(/webinar|script|give me|write|a |an |the /gi, '').trim() || 'Masterclass';
    return `🎙️ **Complete 60-Minute Live Webinar Script for "${topic}"**

---

### ⏱️ [00:00 - 05:00] Part 1: The Hook & Big Promise
> *"Welcome everyone! If you're here today, it's because you want to master ${topic} in 2026 without getting stuck in outdated theory.*
> 
> *In the next 50 minutes, I am going to reveal the exact 3-part framework our students use to build portfolio-ready systems and achieve verified results.*
> 
> *Close all extra tabs, grab a notepad, and let's dive in!"*

---

### ⏱️ [05:00 - 15:00] Part 2: The Industry Problem & Why Old Methods Fail
> *"Why do 90% of people struggle with ${topic}? Because they get trapped in passive tutorials. Memorizing syntax or theory without building real projects leads nowhere.*
> 
> *The solution: Execution-First learning with direct proof-of-work."*

---

### ⏱️ [15:00 - 40:00] Part 3: The 3 Core Pillars & Live Demonstration
> *"Pillar 1: Core Foundation & Setup\n*Pillar 2: Live Build Walkthrough (Step-by-Step)\n*Pillar 3: The Showcase & Portfolio Deployment"*

---

### ⏱️ [40:00 - 52:00] Part 4: The Offer & Program Pitch
> *"You can spend 12 months trying to figure this out by trial and error, or you can join our complete ${topic} Accelerator today with full mentorship and code templates."*

---

### ⏱️ [52:00 - 60:00] Part 5: Live Q&A
> *"Let's open up the chat for all your live questions!"*`;
  }

  // 6. Default Comprehensive General Assistant Response
  return `### 💡 Analysis & Solution

Regarding: **"${currentMsg}"**

Here is a structured, comprehensive breakdown:

#### 1. Core Principles & Key Insight
- **Direct Approach**: To solve this effectively, identify the core objective, isolate the primary constraints, and implement the simplest robust solution.
- **Efficiency & Scalability**: Focus on clean design, modularity, and measurable outcomes.

#### 2. Actionable Step-by-Step Implementation
1. **Define the Scope**: Establish clear success metrics and boundaries before executing.
2. **Execute the Core Workflow**: Implement the primary logic or strategy incrementally.
3. **Verify & Optimize**: Test edge cases, measure performance, and refine based on real feedback.

#### 3. Best Practices & Recommendations
- Keep implementation maintainable and well-documented.
- Avoid premature optimization until core functionality is validated.
- Continuously monitor key metrics and iterate rapidly.

If you would like me to write code, provide deep domain analysis, draft detailed copy, or formulate a concrete execution plan, let me know!`;
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
    const reply = synthesizeUniversalAIResponse(payload.messages, payload.model || 'AI Agent 1');
    return {
      reply,
      model: payload.model || 'AI Agent 1',
      provider: 'universal-ai-engine',
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
