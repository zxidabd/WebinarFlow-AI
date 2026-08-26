/** Corporate Webinar Template — Microsoft/HubSpot enterprise quality */

import type { TemplateDefinition } from './registry';

export const corporate: TemplateDefinition = {
  id: 'corporate',
  name: 'Corporate Webinar',
  description: 'Professional design for B2B and enterprise webinars.',
  preview: 'Corporate webinar page with multiple speakers, case studies, and registration panel.',
  thumbnail: '/templates/corporate.png',
  colors: ['#2563eb', '#1e293b', '#f1f5f9', '#475569'],
  fonts: { heading: 'Inter', body: 'Inter' },
  sections: [
    {
      id: 'hero',
      name: 'Hero',
      icon: 'Layout',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Enterprise Webinar: The Future of [Topic]', placeholder: 'Main headline' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea', default: 'Join industry leaders for an exclusive deep dive into strategies, insights, and actionable frameworks.', placeholder: 'Supporting text' },
        { key: 'cta_text', label: 'CTA Button Text', type: 'text', default: 'Register Now', placeholder: 'Button label' },
        { key: 'cta_link', label: 'CTA Link', type: 'text', default: '#register', placeholder: '/register or #register' },
        { key: 'background_color', label: 'Background Color', type: 'color', default: '#1e293b' },
        { key: 'hero_image', label: 'Hero Image URL', type: 'image', default: '/corporate-hero.jpg', placeholder: 'URL to hero image' },
        { key: 'logo_url', label: 'Company Logo URL', type: 'image', default: '/corp-logo.svg', placeholder: 'Overlay logo' },
      ],
    },
    {
      id: 'speakers',
      name: 'Multiple Speakers',
      icon: 'Users',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Meet the Speakers' },
        {
          key: 'speakers', label: 'Speakers', type: 'array', default: [
            { name: 'Michael Torres', title: 'VP of Sales, GlobalTech', avatar: '/avatars/michael.jpg', company: 'GlobalTech Inc.', bio: '20+ years leading enterprise sales organizations.' },
            { name: 'Priya Sharma', title: 'Director of Marketing', avatar: '/avatars/priya.jpg', company: 'DataFlow Systems', bio: 'Award-winning B2B marketing strategist.' },
          ],
          fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'company', label: 'Company', type: 'text' },
            { key: 'avatar', label: 'Avatar URL', type: 'image' },
            { key: 'bio', label: 'Bio', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'schedule',
      name: 'Event Schedule',
      icon: 'Calendar',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Event Schedule' },
        { key: 'date', label: 'Event Date', type: 'text', default: 'August 15, 2026', placeholder: 'e.g. August 15, 2026' },
        {
          key: 'items', label: 'Schedule Items', type: 'array', default: [
            { time: '10:00 AM', title: 'Welcome & Keynote', speaker: 'Michael Torres' },
            { time: '10:45 AM', title: 'Industry Trends Panel', speaker: 'All Speakers' },
            { time: '11:30 AM', title: 'Breakout: Strategy', speaker: 'Workshop' },
          ],
          fields: [
            { key: 'time', label: 'Time', type: 'text' },
            { key: 'title', label: 'Session Title', type: 'text' },
            { key: 'speaker', label: 'Speaker', type: 'text' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
      ],
    },
    {
      id: 'benefits',
      name: 'Business Benefits',
      icon: 'Briefcase',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'What You\'ll Learn' },
        {
          key: 'benefits', label: 'Benefits', type: 'array', default: [
            { title: 'Revenue Growth', description: 'Proven frameworks to increase pipeline by 40%.' },
            { title: 'Operational Efficiency', description: 'Automate manual processes and reduce costs.' },
            { title: 'Competitive Advantage', description: 'Stay ahead with cutting-edge strategies.' },
          ],
          fields: [
            { key: 'title', label: 'Benefit Title', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'case_studies',
      name: 'Case Studies',
      icon: 'FileText',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Client Success Stories' },
        {
          key: 'studies', label: 'Case Studies', type: 'array', default: [
            { company: 'Acme Corp', metric: '3X ROI', quote: 'Transformed our webinar strategy entirely.', industry: 'SaaS' },
          ],
          fields: [
            { key: 'company', label: 'Company Name', type: 'text' },
            { key: 'metric', label: 'Key Metric', type: 'text' },
            { key: 'quote', label: 'Quote', type: 'textarea' },
            { key: 'industry', label: 'Industry', type: 'text' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
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
            { question: 'Who should attend?', answer: 'This webinar is designed for executives and decision-makers.' },
            { question: 'How long is the webinar?', answer: 'Approximately 60 minutes including Q&A.' },
          ],
          fields: [
            { key: 'question', label: 'Question', type: 'text' },
            { key: 'answer', label: 'Answer', type: 'textarea' },
          ],
        },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#ffffff' },
      ],
    },
    {
      id: 'register',
      name: 'Registration Panel',
      icon: 'ClipboardList',
      fields: [
        { key: 'title', label: 'Panel Title', type: 'text', default: 'Reserve Your Seat' },
        { key: 'cta_text', label: 'Button Text', type: 'text', default: 'Register for Free' },
        { key: 'collect_company', label: 'Collect Company Name', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], default: 'true' },
        { key: 'success_message', label: 'Success Message', type: 'textarea', default: 'Thank you. You will receive a confirmation email shortly.' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#f8fafc' },
      ],
    },
    {
      id: 'contact',
      name: 'Contact Section',
      icon: 'Mail',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Have Questions?' },
        { key: 'email', label: 'Contact Email', type: 'text', default: 'events@company.com', placeholder: 'events@yourcompany.com' },
        { key: 'phone', label: 'Contact Phone', type: 'text', default: '+1 (555) 123-4567' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#1e293b' },
      ],
    },
    {
      id: 'footer',
      name: 'Footer',
      icon: 'Copyright',
      fields: [
        { key: 'text', label: 'Footer Text', type: 'text', default: '© 2026 Your Company. All rights reserved.' },
        { key: 'links', label: 'Links (comma-separated)', type: 'text', default: 'Privacy Policy, Terms of Service, Contact' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#0f172a' },
      ],
    },
  ],
  defaults: {},
};
