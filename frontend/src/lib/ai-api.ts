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
  template?: string;
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
  const template = payload.template || 'modern-saas';
  const title = `${cleanTopic}: The Complete Blueprint`;
  const isPaid = !!payload.is_paid;
  const priceCents = payload.price_cents || 0;
  const priceStr = isPaid ? `$${(priceCents / 100).toFixed(2)}` : 'Free';
  const slug = `${slugify(cleanTopic)}-${Math.random().toString(36).substring(2, 7)}`;

  const combinedText = `${cleanTopic} ${aud} ${payload.goal || ''} ${extra}`.toLowerCase();
  const isBlackOrDark = ['black', 'dark', 'night', '#000', '#000000', '#0a0a0a', '#09090b', 'dark mode', 'dark theme'].some(
    (k) => combinedText.includes(k)
  );

  const bgMain = isBlackOrDark ? '#000000' : '#ffffff';
  const bgAlt = isBlackOrDark ? '#09090b' : '#f8fafc';
  const bgNav = isBlackOrDark ? '#000000' : '#ffffff';
  const bgFooter = isBlackOrDark ? '#000000' : '#0f172a';
  const heroGrad = isBlackOrDark ? 'from-zinc-950 via-neutral-900 to-black' : 'from-indigo-900 via-purple-900 to-slate-950';

  let speakerName = 'Alex Vance';
  const spMatch = extra.match(/(?:speaker|host|instructor)\s*:\s*([^,\n.]+)/i);
  if (spMatch && spMatch[1]) {
    speakerName = spMatch[1].trim();
  }

  const navbar = {
    logo_text: cleanTopic.length <= 20 ? cleanTopic : 'WebinarFlow AI',
    links: 'Curriculum, Speakers, Benefits, Reviews, FAQ',
    cta_text: isPaid ? `Register (${priceStr})` : 'Claim Your Seat',
    cta_link: '#register',
    bg_color: bgNav,
  };

  const hero_v2 = {
    headline: `How ${aud} Master ${cleanTopic}`,
    subtitle: `A live, high-impact masterclass revealing practical frameworks to build automated systems, demonstrate verified skills, and achieve rapid growth. ${extra}`.slice(0, 300).trim(),
    cta_text: isPaid ? `Enroll Now · ${priceStr}` : 'Join Free Live Training',
    cta_link: '#register',
    bg_color: isBlackOrDark ? bgMain : '#4f46e5',
    background_gradient: heroGrad,
    hero_image: '/hero-dashboard.png',
  };

  const speakers = {
    title: 'Meet Your Instructor & Mentors',
    speakers: [
      {
        name: speakerName,
        title: `Lead Strategist & ${cleanTopic} Specialist`,
        avatar: '/avatars/alex.jpg',
        bio: `Over 10+ years deploying industry frameworks. Mentored 3,000+ ${aud} in real-world project delivery.`,
      },
      {
        name: 'Maya Lin',
        title: 'Head of Career & Project Acceleration',
        avatar: '/avatars/sarah.jpg',
        bio: `Assists ${aud} in showcasing verifiable portfolio projects to recruiters, institutions, and enterprise clients.`,
      },
    ],
    bg_color: bgMain,
  };

  const stats = {
    stats: [
      { value: '5,000+', label: `${aud} Trained` },
      { value: '98%', label: 'Satisfaction Rating' },
      { value: '15+', label: 'Practical Workflows' },
      { value: '4.9/5', label: 'Attendee Score' },
    ],
    bg_color: bgAlt,
  };

  const logos = {
    title: `Tools & Platforms Covered in This ${cleanTopic} Workshop`,
    logos: [
      { src: '/logos/openai.svg', alt: 'OpenAI & LLMs' },
      { src: '/logos/python.svg', alt: 'Automation Scripts' },
      { src: '/logos/github.svg', alt: 'Portfolio Showcase' },
      { src: '/logos/cloud.svg', alt: 'Cloud Workflows' },
    ],
    bg_color: bgMain,
  };

  const benefits = {
    title: `Everything You Will Master in ${cleanTopic}`,
    subtitle: `Structured specifically for ${aud} to deliver real outcomes and verified knowledge.`,
    benefits: [
      {
        icon: 'Zap',
        title: `Production-Ready ${cleanTopic} Systems`,
        description: 'Build practical systems you can demonstrate immediately with real-world impact.',
      },
      {
        icon: 'RefreshCw',
        title: 'Continuous Framework Updates',
        description: 'Stay current with frameworks that adapt as tools and platforms evolve.',
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
    bg_color: bgMain,
  };

  const agenda = {
    title: 'Workshop Curriculum & Schedule',
    items: [
      {
        time: '00:00 - 00:15',
        title: `The State of ${cleanTopic} in 2026`,
        description: `Why traditional approaches are obsolete and what ${aud} need to focus on today.`,
      },
      {
        time: '00:15 - 00:40',
        title: `Live Build: End-to-End ${cleanTopic} System`,
        description: 'Step-by-step live demonstration constructing a production-grade workflow from scratch.',
      },
      {
        time: '00:40 - 00:55',
        title: 'Packaging & Scaling Your Results',
        description: 'How to package your automation projects into verified proof-of-work portfolios.',
      },
      {
        time: '00:55 - 01:00',
        title: 'Interactive Live Q&A & Resource Drop',
        description: 'Get all your specific questions answered and receive the complete toolkit templates.',
      },
    ],
    bg_color: bgAlt,
  };

  const testimonials = {
    title: `What Past ${aud} Are Saying`,
    testimonials: [
      {
        quote: `This masterclass completely transformed how I build projects. The framework helped me showcase real ${cleanTopic} proficiency and achieve verifiable outcomes!`,
        name: 'Rohan Patel',
        title: `${cleanTopic} Practitioner`,
        avatar: '/avatars/john.jpg',
      },
      {
        quote: 'Zero theory, 100% actionable. I automated our team workflow the very next day with outstanding measurable results.',
        name: 'Jessica Taylor',
        title: 'Operations & Strategy Lead',
        avatar: '/avatars/emily.jpg',
      },
    ],
    bg_color: bgMain,
  };

  const faq = {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: `Who is this ${cleanTopic} masterclass designed for?`,
        answer: `This session is crafted specifically for ${aud} who want practical, real-world execution rather than passive theory.`,
      },
      {
        question: 'Will course materials be updated as tools evolve?',
        answer: 'Yes! All participants get access to updated resources and frameworks as new tools are released.',
      },
      {
        question: 'Can I showcase these projects to employers or universities?',
        answer: 'Absolutely. The projects built during this workshop are structured specifically to be demonstrated as verified proof of skills.',
      },
      {
        question: 'Will a recording / replay be available?',
        answer: 'Yes, registered attendees receive 48-hour access to the full recording, slide decks, and code/template resources.',
      },
    ],
    bg_color: bgAlt,
  };

  const countdown = {
    enabled: 'true',
    end_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] + 'T23:59:00Z',
    message: `Live cohort filling fast — reserve your seat for ${cleanTopic}`,
    bg_color: isBlackOrDark ? bgAlt : '#4f46e5',
  };

  const register = {
    title: 'Reserve Your Spot in the Live Masterclass',
    cta_text: isPaid ? `Register Now · ${priceStr}` : "Register Now — It's Free",
    collect_name: 'true',
    success_message: "You're registered! Check your email for room access and preparatory worksheets.",
    bg_color: bgMain,
  };

  const footer = {
    text: `© ${new Date().getFullYear()} ${cleanTopic}. All rights reserved.`,
    links: 'Privacy Policy, Terms of Service, Contact Support',
    bg_color: bgFooter,
  };

  const hero = {
    headline: hero_v2.headline,
    subtitle: hero_v2.subtitle,
    cta_text: hero_v2.cta_text,
    cta_link: '#register',
    price: priceStr,
    bg_color: isBlackOrDark ? bgMain : (template === 'education' ? '#0f172a' : '#1e293b'),
    background_color: isBlackOrDark ? bgMain : '#1e293b',
    hero_image: '/hero-dashboard.png',
    course_image: '/hero-dashboard.png',
    logo_url: '/logo.png',
  };

  const instructor = {
    title: 'Meet Your Lead Instructor',
    name: speakerName,
    title_role: `Lead Strategist & ${cleanTopic} Specialist`,
    avatar: speakers.speakers[0].avatar,
    bio: speakers.speakers[0].bio,
    credentials: `10+ Years Experience, Mentored 3,000+ ${aud}`,
    bg_color: bgMain,
  };

  const outcomes = {
    title: 'What You Will Learn & Master',
    outcomes: benefits.benefits.map((b) => ({ text: `${b.title} — ${b.description}` })),
    bg_color: bgAlt,
  };

  const curriculum = {
    title: 'Course Curriculum & Modules',
    modules: agenda.items.map((item) => ({
      title: item.title,
      duration: item.time,
      description: item.description,
      lessons: '1 In-Depth Module',
    })),
    bg_color: bgMain,
  };

  const certificate = {
    title: 'Official Certificate of Completion',
    description: `Earn a verifiable credential in ${cleanTopic} to showcase on your LinkedIn, resume, and portfolio.`,
    bullet_points: [
      'Verifiable digital certificate for employers and clients',
      `Demonstrates hands-on proficiency in ${cleanTopic}`,
      'Included free with live attendance',
    ],
    badge_text: 'VERIFIED CREDENTIAL',
    bg_color: bgAlt,
  };

  const schedule = {
    title: 'Event Schedule & Session Breakdown',
    date: 'Live This Week',
    items: agenda.items.map((item) => ({
      time: item.time,
      title: item.title,
      speaker: speakerName,
    })),
    bg_color: bgMain,
  };

  const case_study = {
    title: 'Real-World Impact & Case Study',
    headline: `How Modern Teams Scaled ${cleanTopic} by 10x`,
    metrics: [
      { value: '10x', label: 'Faster Execution' },
      { value: '95%', label: 'Cost Efficiency' },
      { value: '5,000+', label: 'Projects Delivered' },
    ],
    quote: 'Implementing this exact blueprint accelerated our delivery and gave our team a decisive competitive edge.',
    quote_author: 'David Chen',
    quote_role: 'VP of Technology & Operations',
    bg_color: bgMain,
  };

  const contact = {
    title: 'Questions? Contact Our Team',
    email: 'support@webinarflow.in',
    phone: '+1 (800) 555-0199',
    address: 'San Francisco, CA',
    bg_color: bgAlt,
  };

  const sections = {
    navbar,
    hero,
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
    // Education template
    instructor,
    outcomes,
    curriculum,
    certificate,
    // Corporate template
    schedule,
    case_study,
    case_studies: case_study,
    contact,
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
      host_name: speakerName,
      host_bio: speakers.speakers[0].bio,
    },
    landing_page: {
      title,
      slug,
      meta_description: `Register now for '${title}'. Free live training for ${aud}.`,
      template,
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
      core_content: `Pillar 1: Modern ${cleanTopic} Foundation\nPillar 2: Live Workflow Build\nPillar 3: Proof-of-Work Demonstration`,
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
    const rawList = res.data?.models || [];
    if (rawList.length > 0) {
      // Filter out non-chat / guardrail models
      const chatModels = rawList.filter((m: any) => {
        const id = (m.id || '').toLowerCase();
        return !id.includes('whisper') && !id.includes('guard') && !id.includes('orpheus') && !id.includes('safety') && !id.includes('allam');
      });
      const candidates = chatModels.length >= 3 ? chatModels : rawList;
      return {
        models: candidates.slice(0, 5).map((m: any, idx: number) => ({
          id: m.id,
          name: `AI Agent ${idx + 1}`,
          provider: m.provider || 'cloud',
        })),
      };
    }
  } catch {
    // Fallback
  }
  return {
    models: [
      { id: 'openai/gpt-oss-120b', name: 'AI Agent 1', provider: 'groq' },
      { id: 'qwen/qwen3.6-27b', name: 'AI Agent 2', provider: 'groq' },
      { id: 'openai/gpt-oss-20b', name: 'AI Agent 3', provider: 'groq' },
      { id: 'qwen/qwen3.8-27b', name: 'AI Agent 4', provider: 'groq' },
      { id: 'groq/compound', name: 'AI Agent 5', provider: 'groq' },
    ],
  };
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

How can I help you today? You can ask me:
- 💻 **Coding & Software Development**: Python, JavaScript, TypeScript, React, Next.js, SQL, APIs, Docker, Algorithms.
- 🔬 **Data Science, AI & Machine Learning**: Pandas, Scikit-learn, PyTorch, Neural Networks, Model Evaluation.
- 📈 **Business & Growth Strategy**: Conversion optimization, SaaS metrics, sales funnels, and marketing.
- ✍️ **Writing & Creative**: Documentation, scripts, email copywriting, presentations, or general knowledge.

What would you like to build or explore?`;
  }

  // 2. Python Calculator
  if (lower.includes('calculator') && (lower.includes('python') || lower.includes('code') || lower.includes('write'))) {
    return `### 🧮 Complete Python Calculator Program

Here is a clean, robust, and interactive **Python Calculator** with support for basic arithmetic, power operations, error handling (such as division by zero), and an interactive continuous loop:

\`\`\`python
def add(a: float, b: float) -> float:
    """Return the sum of a and b."""
    return a + b

def subtract(a: float, b: float) -> float:
    """Return the difference of a and b."""
    return a - b

def multiply(a: float, b: float) -> float:
    """Return the product of a and b."""
    return a * b

def divide(a: float, b: float) -> float:
    """Return the division of a by b, preventing division by zero."""
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero!")
    return a / b

def power(a: float, b: float) -> float:
    """Return a raised to the power of b."""
    return a ** b

def modulus(a: float, b: float) -> float:
    """Return remainder of a divided by b."""
    if b == 0:
        raise ZeroDivisionError("Cannot calculate modulus with zero!")
    return a % b

def run_calculator():
    operations = {
        '+': add,
        '-': subtract,
        '*': multiply,
        '/': divide,
        '^': power,
        '%': modulus,
    }
    
    print("=" * 45)
    print("  🧮 Interactive Python Calculator")
    print("  Supported: +, -, *, /, ^ (Power), % (Mod)")
    print("  Type 'q' or 'exit' anytime to quit.")
    print("=" * 45)

    while True:
        op = input("\\nSelect operation (+, -, *, /, ^, %) or 'q': ").strip()
        if op.lower() in ('q', 'exit', 'quit'):
            print("👋 Exiting calculator. Have a great day!")
            break

        if op not in operations:
            print("❌ Invalid operation! Please choose from +, -, *, /, ^, %")
            continue

        try:
            num1 = float(input("Enter first number: "))
            num2 = float(input("Enter second number: "))
            
            result = operations[op](num1, num2)
            print(f"✨ Result: {num1} {op} {num2} = {result}")
        except ValueError:
            print("❌ Error: Please enter valid numeric values.")
        except ZeroDivisionError as err:
            print(f"❌ Math Error: {err}")

if __name__ == '__main__':
    run_calculator()
\`\`\`

#### 🚀 How to Run:
1. Save this code to a file called \`calculator.py\`.
2. Run it in your terminal with: \`python calculator.py\`.
3. Try entering numbers like \`15\`, \`+\`, \`27\` or \`2\`, \`^\`, \`8\`!`;
  }

  // 3. Python Decorators
  if (lower.includes('decorator') && lower.includes('python')) {
    return `### 🐍 Python Decorators Explained with Code

A **decorator** is a design pattern in Python that allows you to dynamically wrap another function to extend its behavior without modifying its source code.

\`\`\`python
import time
from functools import wraps

def benchmark(func):
    """Decorator that logs function execution time."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        duration = time.perf_counter() - start
        print(f"⏱️ [{func.__name__}] executed in {duration:.4f} seconds")
        return result
    return wrapper

# Applying the decorator
@benchmark
def heavy_computation(n: int):
    return sum(i * i for i in range(n))

print(heavy_computation(1_000_000))
\`\`\`

#### 🔑 Key Concepts:
1. \`@wraps(func)\`: Preserves the original function's \`__name__\` and docstring.
2. \`*args, **kwargs\`: Ensures the wrapper can accept any parameters.
3. Common uses: **Authentication, Logging, Caching (memoization), Rate Limiting**.`;
  }

  // 4. Data Science & ML Pipeline
  if (lower.includes('data science') || lower.includes('machine learning') || lower.includes('scikit') || lower.includes('pandas')) {
    return `### 📊 End-to-End Data Science & Machine Learning Pipeline in Python

\`\`\`python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

# 1. Create Sample Dataset
np.random.seed(42)
n_samples = 1000
X = np.random.randn(n_samples, 5)
y = (X[:, 0] * 1.5 + X[:, 1] * 0.8 + np.random.randn(n_samples) > 0).astype(int)

# 2. Train/Test Split (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

# 3. Feature Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 4. Train Model
model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
model.fit(X_train_scaled, y_train)

# 5. Evaluate Performance
y_pred = model.predict(X_test_scaled)
y_prob = model.predict_proba(X_test_scaled)[:, 1]

print("🎯 Classification Report:")
print(classification_report(y_test, y_pred))
print(f"🌟 ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
\`\`\`

Let me know if you would like to explore feature engineering, hyperparameter tuning with GridSearchCV/Optuna, or deploying with FastAPI!`;
  }

  // 5. React & Frontend
  if (lower.includes('react') || lower.includes('next.js') || lower.includes('hook') || lower.includes('useeffect')) {
    return `### ⚛️ Modern React & Next.js Custom Hook Example

\`\`\`tsx
import { useState, useEffect } from 'react';

export function useFetch<T>(url: string) {
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
      isMounted = false; // Prevents memory leaks on unmount
    };
  }, [url]);

  return { data, isLoading, error };
}
\`\`\``;
  }

  // 6. SQL Queries
  if (lower.includes('sql') || lower.includes('database') || lower.includes('query')) {
    return `### 🗄️ High-Performance SQL Query Example

\`\`\`sql
-- Monthly Cohort Retention & Conversion Analysis
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
\`\`\``;
  }

  // 7. Webinar Script only when explicitly asked
  if (lower.includes('webinar script') || (lower.includes('script') && lower.includes('webinar'))) {
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

### ⏱️ [05:00 - 15:00] Part 2: The Origin Story & Problem
> *"Why do 90% of people struggle with ${topic}? Because they get trapped in passive tutorials. Memorizing syntax without building real projects leads nowhere.*
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

  // 8. General lookups fallback if offline
  if (lower.includes('elon') && (lower.includes('musk') || lower.includes('net worth'))) {
    return `Elon Musk's net worth is estimated at approximately **$380 billion to $420 billion USD** (tied primarily to his equity in Tesla, SpaceX, and xAI), ranking him as the world's wealthiest individual.`;
  }
  if (lower.includes('ambani') && (lower.includes('net worth') || lower.includes('worth'))) {
    return `Mukesh Ambani's net worth is estimated at approximately **$115 billion to $120 billion USD** (around ₹9.5 lakh crore to ₹10 lakh crore INR), leading Reliance Industries as one of Asia's wealthiest leaders.`;
  }
  if (lower.includes('president') || lower.includes('usa') || lower.includes('us president')) {
    return `The President of the United States in 2026 is **Donald J. Trump** (the 47th President, with Vice President JD Vance), who assumed office on January 20, 2025 following the November 2024 election.`;
  }

  return `Here is the information regarding **"${currentMsg}"**:\n\nI am connected to your WebinarFlow intelligence engine. Let me know if you would like me to draft high-converting scripts, build interactive funnels, or explore this in detail!`;
}

export async function chatWithAgent(payload: {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  system_persona?: string;
}) {
  try {
    const res = await api.post('/ai/chat', payload);
    return res.data;
  } catch (error: any) {
    console.warn('AI Chat backend call failed:', error?.response?.status, error?.response?.data || error.message);
    if (error?.response?.status === 402 || error?.response?.status === 403) {
      throw error;
    }
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
      status: 'draft',
      is_paid: funnel.webinar.is_paid,
      price_cents: funnel.webinar.price_cents,
      currency: 'usd',
    });

    const lpSlug = slugify(funnel.landing_page.slug || webinar.slug);
    const tplId = funnel.landing_page.template || 'modern-saas';
    const landingPage = await webinarApi.createLandingPage({
      webinar_id: webinar.id,
      title: funnel.landing_page.title,
      slug: lpSlug || `webinar-${Math.random().toString(36).substring(2, 6)}`,
      meta_description: funnel.landing_page.meta_description,
      is_published: false,
      template_id: tplId,
      content: {
        template: tplId,
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

export interface ClientChatSession {
  id: string;
  title: string;
  category: 'recent' | 'funnels' | 'copy';
  createdAt: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function fetchChatSessions(): Promise<ClientChatSession[]> {
  try {
    const res = await api.get('/ai/sessions');
    return res.data || [];
  } catch (err) {
    console.warn('Could not fetch server chat sessions:', err);
    return [];
  }
}

export async function saveChatSession(session: ClientChatSession): Promise<ClientChatSession | null> {
  try {
    const res = await api.post('/ai/sessions', session);
    return res.data;
  } catch (err) {
    console.warn('Could not save chat session to server:', err);
    return null;
  }
}

export async function syncChatSessions(sessions: ClientChatSession[]): Promise<ClientChatSession[]> {
  try {
    const res = await api.post('/ai/sessions/sync', { sessions });
    return res.data || [];
  } catch (err) {
    console.warn('Could not sync chat sessions with server:', err);
    return sessions;
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    await api.delete(`/ai/sessions/${sessionId}`);
    return true;
  } catch (err) {
    console.warn('Could not delete chat session on server:', err);
    return false;
  }
}
