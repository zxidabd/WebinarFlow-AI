/** Education / Course Template — Coursera/Udemy quality */

import type { TemplateDefinition } from './registry';

export const education: TemplateDefinition = {
  id: 'education',
  name: 'Education / Course',
  description: 'Modern education landing page for coaches, educators, and online courses.',
  preview: 'Course landing page with instructor profile, curriculum, testimonials, and certificate section.',
  thumbnail: '/templates/education.png',
  colors: ['#7c3aed', '#0f172a', '#faf5ff', '#a78bfa'],
  fonts: { heading: 'Inter', body: 'Inter' },
  sections: [
    {
      id: 'hero',
      name: 'Course Hero',
      icon: 'Layout',
      fields: [
        { key: 'headline', label: 'Course Headline', type: 'text', default: 'Master Webinar Funnel Strategy', placeholder: 'Course title' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea', default: 'A step-by-step program to build, launch, and optimize high-converting webinar funnels from scratch.', placeholder: 'Course description' },
        { key: 'cta_text', label: 'CTA Button Text', type: 'text', default: 'Enroll Now — Free', placeholder: 'Button label' },
        { key: 'cta_link', label: 'CTA Link', type: 'text', default: '#register', placeholder: '#register' },
        { key: 'price', label: 'Display Price', type: 'text', default: 'Free', placeholder: 'Free, $49, etc.' },
        { key: 'course_image', label: 'Course Image URL', type: 'image', default: '/course-thumbnail.jpg', placeholder: 'Course preview image' },
        { key: 'bg_color', label: 'Background Color', type: 'color', default: '#0f172a' },
      ],
    },
    {
      id: 'instructor',
      name: 'Instructor Profile',
      icon: 'UserCircle',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Meet Your Instructor' },
        { key: 'name', label: 'Instructor Name', type: 'text', default: 'Dr. Sarah Mitchell' },
        { key: 'title_role', label: 'Role/Title', type: 'text', default: 'Funnel Strategist & Educator' },
        { key: 'avatar', label: 'Avatar URL', type: 'image', default: '/avatars/instructor.jpg' },
        { key: 'bio', label: 'Bio', type: 'textarea', default: 'Sarah has helped 500+ students build profitable webinar funnels. With 15 years of experience in digital marketing, she breaks down complex strategies into actionable steps.' },
        { key: 'credentials', label: 'Credentials (comma-sep)', type: 'text', default: 'PhD Marketing, ex-Google, 500+ students' },
      ],
    },
    {
      id: 'outcomes',
      name: 'Learning Outcomes',
      icon: 'Target',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'What You\'ll Learn' },
        {
          key: 'outcomes', label: 'Outcomes', type: 'array', default: [
            { text: 'Build a complete webinar funnel from scratch' },
            { text: 'Write high-converting landing page copy' },
            { text: 'Set up email sequences that sell' },
            { text: 'Track and optimize conversion metrics' },
            { text: 'Scale from zero to 6-figure launches' },
          ],
          fields: [
            { key: 'text', label: 'Outcome', type: 'text' },
          ],
        },
      ],
    },
    {
      id: 'curriculum',
      name: 'Curriculum Overview',
      icon: 'BookOpen',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Curriculum' },
        { key: 'subtitle', label: 'Subtitle', type: 'text', default: '6 modules covering everything you need to know.' },
        {
          key: 'modules', label: 'Modules', type: 'array', default: [
            { title: 'Module 1: Funnel Foundations', lessons: '5 lessons', duration: '45 min' },
            { title: 'Module 2: Audience & Offer', lessons: '4 lessons', duration: '35 min' },
            { title: 'Module 3: Content Creation', lessons: '6 lessons', duration: '60 min' },
            { title: 'Module 4: Launch Strategy', lessons: '5 lessons', duration: '50 min' },
          ],
          fields: [
            { key: 'title', label: 'Module Title', type: 'text' },
            { key: 'lessons', label: 'Lessons Count', type: 'text' },
            { key: 'duration', label: 'Duration', type: 'text' },
          ],
        },
      ],
    },
    {
      id: 'testimonials',
      name: 'Student Testimonials',
      icon: 'MessageSquare',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'What Students Say' },
        {
          key: 'testimonials', label: 'Testimonials', type: 'array', default: [
            { quote: 'This course changed my entire approach to webinars. My conversion rate went from 2% to 15%.', name: 'James Wilson', title: 'Course Graduate', avatar: '/avatars/james.jpg', rating: '5' },
            { quote: 'The most practical, actionable course I\'ve ever taken. Highly recommended.', name: 'Maria Garcia', title: 'Course Graduate', avatar: '/avatars/maria.jpg', rating: '5' },
          ],
          fields: [
            { key: 'quote', label: 'Quote', type: 'textarea' },
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'avatar', label: 'Avatar URL', type: 'image' },
            { key: 'rating', label: 'Rating (1-5)', type: 'text' },
          ],
        },
      ],
    },
    {
      id: 'certificate',
      name: 'Certificate Section',
      icon: 'Award',
      fields: [
        { key: 'title', label: 'Section Title', type: 'text', default: 'Get Certified' },
        { key: 'description', label: 'Description', type: 'textarea', default: 'Earn a certificate of completion to showcase your new skills.' },
        { key: 'image', label: 'Certificate Image URL', type: 'image', default: '/certificate.png' },
      ],
    },
    {
      id: 'countdown',
      name: 'Countdown Timer',
      icon: 'Timer',
      fields: [
        { key: 'enabled', label: 'Show Countdown', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], default: 'true' },
        { key: 'end_date', label: 'Enrollment Deadline (ISO)', type: 'text', default: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] + 'T23:59:00Z' },
        { key: 'message', label: 'Message', type: 'text', default: 'Enrollment closes in' },
      ],
    },
    {
      id: 'register',
      name: 'Registration Form',
      icon: 'ClipboardList',
      fields: [
        { key: 'title', label: 'Form Title', type: 'text', default: 'Start Learning Today' },
        { key: 'cta_text', label: 'Button Text', type: 'text', default: 'Enroll Free' },
        { key: 'success_message', label: 'Success Message', type: 'textarea', default: 'Welcome! Check your email for course access.' },
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
            { question: 'Is this course really free?', answer: 'Yes, the entire course is available at no cost.' },
            { question: 'How long do I have access?', answer: 'Lifetime access — including all future updates.' },
            { question: 'Do I need any prior experience?', answer: 'No, the course starts from the fundamentals.' },
          ],
          fields: [
            { key: 'question', label: 'Question', type: 'text' },
            { key: 'answer', label: 'Answer', type: 'textarea' },
          ],
        },
      ],
    },
    {
      id: 'footer',
      name: 'Footer',
      icon: 'Copyright',
      fields: [
        { key: 'text', label: 'Footer Text', type: 'text', default: '© 2026 Course Platform. All rights reserved.' },
        { key: 'links', label: 'Links (comma-separated)', type: 'text', default: 'Privacy Policy, Terms, Support' },
      ],
    },
  ],
  defaults: {
    hero: { headline: '', subtitle: '', cta_text: 'Enroll Now — Free', cta_link: '#register', price: 'Free', course_image: '', bg_color: '#0f172a' },
    instructor: { title: 'Meet Your Instructor', name: '', title_role: '', avatar: '', bio: '', credentials: '' },
    outcomes: { title: 'What You\'ll Learn', outcomes: [] },
    curriculum: { title: 'Curriculum', subtitle: '', modules: [] },
    testimonials: { title: 'What Students Say', testimonials: [] },
    certificate: { title: 'Get Certified', description: '', image: '' },
    countdown: { enabled: 'false', end_date: '', message: '' },
    register: { title: 'Start Learning Today', cta_text: 'Enroll Free', success_message: '' },
    faq: { title: 'Frequently Asked Questions', items: [] },
    footer: { text: '© 2026 Course Platform', links: '' },
  },
};
