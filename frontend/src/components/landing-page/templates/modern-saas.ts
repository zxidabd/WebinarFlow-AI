/** Modern SaaS Template — Stripe/Linear/Vercel quality */

import type { TemplateDefinition } from './registry';

export const modernSaaS: TemplateDefinition = {
  id: 'modern-saas',
  name: 'Modern SaaS',
  description: 'Clean, premium design for tech companies and AI products.',
  preview: 'Modern SaaS landing page with hero, benefits, testimonials, agenda, and countdown.',
  thumbnail: '/templates/modern-saas.png',
  colors: ['#6366f1', '#0f172a', '#f8fafc', '#94a3b8'],
  fonts: { heading: 'Inter', body: 'Inter' },
  sections: [
    {
      id: 'navbar',
      name: 'Navbar',
      icon: 'Navigation',
      fields: [
        { key: 'logo_text', label: 'Logo Text', type: 'text', default: 'WebinarFlow' },
        { key: 'links', label: 'Nav Links (comma separated)', type: 'text', default: 'About, FAQ, Register' },
        { key: 'cta_text', label: 'CTA Button', type: 'text', default: 'Register' },
        { key: 'cta_link', label: 'CTA Link', type: 'text', default: '#register' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'hero_v2',
      name: 'Hero',
      icon: 'Layout',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Build Webinar Funnels That Convert', placeholder: 'Main headline' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea', default: 'AI-powered webinar platform that generates landing pages, scripts, email sequences, and sales assets in minutes.', placeholder: 'Supporting text' },
        { key: 'cta_text', label: 'CTA Button Text', type: 'text', default: 'Get Early Access', placeholder: 'Button label' },
        { key: 'cta_link', label: 'CTA Link', type: 'text', default: '#register', placeholder: '/register or #register' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#4f46e5' },
        { key: 'background_gradient', label: 'Background Gradient (optional)', type: 'text', default: 'from-indigo-600 via-purple-600 to-blue-500', placeholder: 'Tailwind gradient classes' },
        { key: 'hero_image', label: 'Hero Image URL', type: 'image', default: '/hero-dashboard.png', placeholder: 'URL to hero image' },
      ],
    },
    {
      id: 'speakers',
      name: 'Speakers',
      icon: 'Users',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Meet Your Hosts' },
        {
          key: 'speakers', label: 'Speakers', type: 'array', default: [
            { name: 'Sarah Chen', title: 'CEO, WebinarFlow', avatar: '/avatars/sarah.jpg', bio: '10+ years in digital marketing and funnel optimization.' },
            { name: 'Alex Rivera', title: 'Head of Growth', avatar: '/avatars/alex.jpg', bio: 'Built multiple 7-figure webinar funnels.' },
          ],
          fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'title', label: 'Title/Role', type: 'text' },
            { key: 'avatar', label: 'Avatar URL', type: 'image' },
            { key: 'bio', label: 'Bio', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'stats',
      name: 'Statistics Bar',
      icon: 'BarChart3',
      fields: [
        {
          key: 'stats', label: 'Statistics', type: 'array', default: [
            { value: '10K+', label: 'Webinars Created' },
            { value: '98%', label: 'Satisfaction Rate' },
            { value: '3X', label: 'Avg. Conversion' },
            { value: '50K+', label: 'Active Users' },
          ],
          fields: [
            { key: 'value', label: 'Value', type: 'text' },
            { key: 'label', label: 'Label', type: 'text' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
      ],
    },
    {
      id: 'logos',
      name: 'Company Logos',
      icon: 'Building2',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Trusted by Industry Leaders' },
        {
          key: 'logos', label: 'Logos', type: 'array', default: [
            { src: '/logos/acme.svg', alt: 'Acme Corp' },
            { src: '/logos/tech.svg', alt: 'Tech Inc' },
          ],
          fields: [
            { key: 'src', label: 'Logo URL', type: 'image' },
            { key: 'alt', label: 'Alt Text', type: 'text' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'benefits',
      name: 'Benefits Grid',
      icon: 'Grid3X3',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Everything You Need' },
        { key: 'subtitle', label: 'Section Subtitle', type: 'textarea', default: 'All the tools to launch high-converting webinar funnels.' },
        {
          key: 'benefits', label: 'Benefits', type: 'array', default: [
            { icon: 'Zap', title: 'AI-Powered', description: 'Generate complete funnels from a single topic.' },
            { icon: 'Palette', title: 'Beautiful Templates', description: 'Production-quality landing pages out of the box.' },
            { icon: 'BarChart3', title: 'Real-time Analytics', description: 'Track conversions, attendance, and revenue.' },
            { icon: 'Mail', title: 'Automated Emails', description: 'Registration confirmations, reminders, and follow-ups.' },
          ],
          fields: [
            { key: 'icon', label: 'Icon Name (lucide)', type: 'text' },
            { key: 'title', label: 'Benefit Title', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'agenda',
      name: 'Agenda Timeline',
      icon: 'Calendar',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Webinar Agenda' },
        {
          key: 'items', label: 'Agenda Items', type: 'array', default: [
            { time: '00:00', title: 'Welcome & Introductions', description: 'Meet the hosts and overview.' },
            { time: '05:00', title: 'The Funnel Framework', description: 'The 3-step system that works.' },
            { time: '20:00', title: 'Live Demo', description: 'See it built in real-time.' },
            { time: '45:00', title: 'Q&A', description: 'Your questions answered live.' },
          ],
          fields: [
            { key: 'time', label: 'Time', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
      ],
    },
    {
      id: 'testimonials',
      name: 'Testimonials',
      icon: 'MessageSquare',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'What People Are Saying' },
        {
          key: 'testimonials', label: 'Testimonials', type: 'array', default: [
            { quote: 'WebinarFlow AI doubled our conversion rate in the first week.', name: 'John Smith', title: 'CMO, GrowthCo', avatar: '/avatars/john.jpg' },
            { quote: 'The templates save us days of work. Absolutely game-changing.', name: 'Emily Davis', title: 'Marketing Director', avatar: '/avatars/emily.jpg' },
          ],
          fields: [
            { key: 'quote', label: 'Quote', type: 'textarea' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'avatar', label: 'Avatar URL', type: 'image' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'faq',
      name: 'FAQ',
      icon: 'HelpCircle',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Frequently Asked Questions' },
        {
          key: 'items', label: 'FAQ Items', type: 'array', default: [
            { question: 'Do I need technical skills?', answer: 'No. Our AI builds everything for you.' },
            { question: 'How long does it take?', answer: 'Most users launch their first funnel in under 30 minutes.' },
          ],
          fields: [
            { key: 'question', label: 'Question', type: 'text' },
            { key: 'answer', label: 'Answer', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
      ],
    },
    {
      id: 'countdown',
      name: 'Countdown Timer',
      icon: 'Timer',
      fields: [
        { key: 'enabled', label: 'Show Countdown', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], default: 'true' },
        { key: 'end_date', label: 'End Date (ISO)', type: 'text', default: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] + 'T23:59:00Z', placeholder: '2026-08-01T23:59:00Z' },
        { key: 'message', label: 'Message', type: 'text', default: 'Seats fill fast — reserve yours now' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#4f46e5' },
      ],
    },
    {
      id: 'register',
      name: 'Registration Form',
      icon: 'ClipboardList',
      fields: [
        { key: 'title', label: 'Widget Title', type: 'text', default: 'Reserve Your Spot' },
        { key: 'cta_text', label: 'Button Text', type: 'text', default: 'Register Now — It\'s Free' },
        { key: 'collect_name', label: 'Collect Name', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], default: 'true' },
        { key: 'success_message', label: 'Success Message', type: 'textarea', default: 'You\'re registered! Check your email for details.' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'footer',
      name: 'Footer',
      icon: 'Copyright',
      fields: [
        { key: 'text', label: 'Footer Text', type: 'text', default: '© 2026 WebinarFlow AI. All rights reserved.' },
        { key: 'links', label: 'Links (comma-separated)', type: 'text', default: 'Privacy Policy, Terms of Service' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#0f172a' },
      ],
    },
  ],
  defaults: {},
};
