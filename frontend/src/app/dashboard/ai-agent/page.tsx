'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Wand2,
  MessageSquare,
  Send,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Code2,
  ArrowRight,
  RefreshCw,
  FileText,
  Mail,
  ListOrdered,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  History,
  X,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as aiApi from '@/lib/ai-api';

interface ChatSession {
  id: string;
  title: string;
  category: 'recent' | 'funnels' | 'copy';
  createdAt: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'session-welcome',
    title: 'Getting Started with AI Agent',
    category: 'recent',
    createdAt: Date.now(),
    messages: [
      {
        role: 'assistant',
        content:
          '👋 Hello! I am your **WebinarFlow AI Agent**.\n\nI can build complete 11-section webinar funnels, write high-converting email sequences, answer technical questions, and help optimize your conversion rates.\n\nWhat would you like to create or ask today?',
      },
    ],
  },
  {
    id: 'session-funnel-strategy',
    title: 'High-Converting Webinar Funnel Strategy',
    category: 'funnels',
    createdAt: Date.now() - 3600000 * 2,
    messages: [
      { role: 'user', content: 'What is the highest converting structure for a 45-minute webinar pitch?' },
      {
        role: 'assistant',
        content:
          '### High-Converting Webinar Structure:\n\n1. **The Hook (0-5 min)**: State the #1 bottleneck and make a big promise.\n2. **The Origin Story (5-15 min)**: Why conventional advice fails.\n3. **Core Pillars (15-35 min)**: 3 actionable frameworks with social proof.\n4. **The Offer Pitch (35-42 min)**: Value stack, bonuses, and time-sensitive CTA.\n5. **Live Q&A (42-45+ min)**: Answer technical and pricing objections.',
      },
    ],
  },
  {
    id: 'session-email-sequence',
    title: 'Urgent 1-Hour Reminder Email Copy',
    category: 'copy',
    createdAt: Date.now() - 86400000,
    messages: [
      { role: 'user', content: 'Write an urgent 1-hour before webinar reminder email.' },
      {
        role: 'assistant',
        content:
          '**Subject**: [STARTING IN 60 MIN] Join the live masterclass now!\n\n**Body**:\nHey there,\n\nWe are going live in exactly 60 minutes! Click the link below to enter the live room early and grab your seat before we hit capacity:\n\n👉 **[Enter Live Webinar Room]**\n\nSee you inside!',
      },
    ],
  },
];

// Formatted Chat Message Renderer with Code Highlight & Copy
function ChatMessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed text-[#1F1F1F]">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.slice(3, firstLineEnd).trim() || 'code';
          const codeContent = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div
              key={index}
              className="my-2.5 rounded-xl bg-black/90 border border-[#5a1a23]/60 overflow-hidden shadow-md font-mono text-[11px]"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1a0609] border-b border-[#5a1a23]/40 text-gray-400 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-[#f8a5b2] uppercase tracking-wider">
                  <Code2 className="h-3 w-3" />
                  {lang}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeContent, index)}
                  className="flex items-center gap-1 hover:text-white text-[#f8d7dc] transition-colors py-0.5 px-2 rounded bg-white/5 hover:bg-white/10"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span className="font-sans">Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-emerald-300/90 whitespace-pre leading-relaxed">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={index} className="space-y-1.5">
            {renderMarkdownBlocks(part, index)}
          </div>
        );
      })}
    </div>
  );
}

function renderMarkdownBlocks(text: string, partIndex: number) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1);

      elements.push(
        <div key={key} className="my-2 overflow-x-auto rounded-lg border border-[#E8BAC5] shadow-sm">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-[#E8BAC5] text-[#1F1F1F] border-b border-[#D49BA9] uppercase tracking-wider text-[10px]">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-3 py-2 font-bold border-r border-[#D49BA9] last:border-r-0">
                    {renderInlineMarkdown(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8BAC5] bg-white/70">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#F3DDE2]/70 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 border-r border-[#E8BAC5] last:border-r-0 text-[#1F1F1F]">
                      {renderInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, lIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---')) return;
      const cells = trimmed.slice(1, -1).split('|');
      tableRows.push(cells);
      inTable = true;
      return;
    }

    if (inTable) {
      flushTable(`tbl-${partIndex}-${lIdx}`);
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${lIdx}`} className="text-sm font-bold text-[#1F1F1F] mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="text-[#6E1F32]">▸</span>
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${lIdx}`} className="text-base font-bold text-[#1F1F1F] mt-3 mb-1 border-b border-[#D49BA9] pb-1">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${lIdx}`} className="text-lg font-extrabold text-[#1F1F1F] mt-3.5 mb-1.5">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${lIdx}`} className="flex items-start gap-2 ml-1 text-[#1F1F1F]">
          <span className="text-[#6E1F32] font-bold mt-0.5">•</span>
          <span>{renderInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={`ol-${lIdx}`} className="flex items-start gap-2 ml-1 text-[#1F1F1F]">
            <span className="text-[#6E1F32] font-bold text-[10px] bg-[#E8BAC5] px-1.5 py-0.5 rounded border border-[#D49BA9]">
              {match[1]}
            </span>
            <span>{renderInlineMarkdown(match[2])}</span>
          </div>
        );
      }
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${lIdx}`} className="text-[#1F1F1F] leading-relaxed">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  if (inTable) {
    flushTable(`tbl-final-${partIndex}`);
  }

  return elements;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-black font-extrabold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={i} className="text-[#4A1422] italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-[#E8BAC5] text-[#501624] rounded font-mono text-[11px] border border-[#D49BA9]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function AIAgentFullPage() {
  const [activeTab, setActiveTab] = useState<'funnel' | 'chat'>('funnel');
  const [models, setModels] = useState<aiApi.AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('nvidia/DeepSeek V4 Pro');

  // Funnel Builder State
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'modern-saas' | 'corporate' | 'education'>('modern-saas');
  const [goal, setGoal] = useState('High Lead Generation & Sales Conversion');
  const [isPaid, setIsPaid] = useState(false);
  const [priceDollars, setPriceDollars] = useState('47');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFunnel, setGeneratedFunnel] = useState<aiApi.GeneratedFunnel | null>(null);
  const [previewSection, setPreviewSection] = useState<'landing' | 'emails' | 'outline'>('landing');
  const [isDeploying, setIsDeploying] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Chat State with Multiple Sessions
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-welcome');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Listen for global 'open-ai-chat-history' event dispatched from topbar or other components
  useEffect(() => {
    const handleOpenHistory = () => {
      setActiveTab('chat');
      setShowMobileHistory(true);
    };
    window.addEventListener('open-ai-chat-history', handleOpenHistory);
    return () => window.removeEventListener('open-ai-chat-history', handleOpenHistory);
  }, []);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('webinarflow_ai_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch {
      // Graceful fallback to default sessions
    }
  }, []);

  // Sync chat sessions to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem('webinarflow_ai_chat_sessions', JSON.stringify(updated));
    } catch {
      // Handled gracefully
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || INITIAL_SESSIONS[0];

  useEffect(() => {
    aiApi
      .getAiModels()
      .then((data) => {
        if (data?.models?.length) {
          setModels(data.models);
          if (!selectedModel) setSelectedModel(data.models[0].id);
        }
      })
      .catch(() => {
        // Handled gracefully
      });
  }, []);

  // Safe inner-container auto scroll without jittering the outer window
  useEffect(() => {
    if (activeTab === 'chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeSession?.messages, activeTab]);

  const handleCreateNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newChat: ChatSession = {
      id: newId,
      title: 'New Conversation',
      category: 'recent',
      createdAt: Date.now(),
      messages: [
        {
          role: 'assistant',
          content: '👋 Hi! What would you like to explore, draft, or code today?',
        },
      ],
    };
    const updated = [newChat, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    setShowMobileHistory(false);
    toast.success('Started a new chat session');
  };

  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      toast.error('Cannot delete the last remaining chat session.');
      return;
    }
    const updated = sessions.filter((s) => s.id !== sessionId);
    saveSessions(updated);
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0].id);
    }
    toast.success('Chat removed from history');
  };

  const handleGenerateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a webinar topic or title.');
      return;
    }

    setIsGenerating(true);
    try {
      const priceCents = isPaid ? Math.round(parseFloat(priceDollars || '0') * 100) : 0;
      const res = await aiApi.generateFunnel({
        topic,
        target_audience: targetAudience,
        goal,
        is_paid: isPaid,
        price_cents: priceCents,
        custom_instructions: customInstructions,
        model: selectedModel,
        template: selectedTemplate,
      });

      if (res && res.landing_page) {
        res.landing_page.template = selectedTemplate;
      }
      setGeneratedFunnel(res);
      toast.success('Funnel created! Preview your landing page and emails below.');
      setTimeout(() => {
        previewContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to generate funnel. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeployFunnel = async () => {
    if (!generatedFunnel) return;
    setIsDeploying(true);
    try {
      const templateToDeploy = selectedTemplate || generatedFunnel.landing_page?.template || 'modern-saas';
      const funnelToDeploy = {
        ...generatedFunnel,
        landing_page: {
          ...generatedFunnel.landing_page,
          template: templateToDeploy,
        },
      };
      const res = await aiApi.applyFunnel(funnelToDeploy);
      toast.success('Funnel saved as Draft! Opening in editor...');
      setTimeout(() => {
        window.location.href = `/dashboard/webinars/${res.webinar_id}/landing-pages/${res.landing_page_id}`;
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save funnel to workspace.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');

    // Determine updated session title if it's currently generic
    const currentTitle = activeSession.title;
    const shouldRename = currentTitle === 'New Conversation' || currentTitle === 'Getting Started with AI Agent';
    const newTitle = shouldRename ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '') : currentTitle;

    // Determine category based on keywords
    let category: 'recent' | 'funnels' | 'copy' = activeSession.category;
    const lower = userText.toLowerCase();
    if (lower.includes('funnel') || lower.includes('webinar') || lower.includes('landing') || lower.includes('agenda')) {
      category = 'funnels';
    } else if (lower.includes('email') || lower.includes('headline') || lower.includes('copy') || lower.includes('subject')) {
      category = 'copy';
    }

    const newConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...activeSession.messages,
      { role: 'user', content: userText },
    ];

    const updatedSessions = sessions.map((s) =>
      s.id === activeSession.id
        ? { ...s, title: newTitle, category, messages: newConvo }
        : s
    );
    saveSessions(updatedSessions);
    setIsChatLoading(true);

    try {
      const res = await aiApi.chatWithAgent({
        messages: newConvo,
        model: selectedModel,
      });

      const finalConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...newConvo,
        { role: 'assistant', content: res.reply },
      ];

      const withAssistantReply = updatedSessions.map((s) =>
        s.id === activeSession.id ? { ...s, messages: finalConvo } : s
      );
      saveSessions(withAssistantReply);
    } catch {
      const fallbackConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...newConvo,
        {
          role: 'assistant',
          content: 'I have analyzed your request. You can configure your campaign in the "1-Click Funnel Generator" tab or ask any follow-up question!',
        },
      ];
      const withFallback = updatedSessions.map((s) =>
        s.id === activeSession.id ? { ...s, messages: fallbackConvo } : s
      );
      saveSessions(withFallback);
    } finally {
      setIsChatLoading(false);
    }
  };

  const recentSessions = sessions.filter((s) => s.category === 'recent');
  const funnelSessions = sessions.filter((s) => s.category === 'funnels');
  const copySessions = sessions.filter((s) => s.category === 'copy');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#5a1a23]/60 bg-gradient-to-r from-[#1c080b] via-[#380f15] to-[#4d151e] p-6 sm:p-8 text-white shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-20 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px]"
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#852533] via-[#6b1e28] to-[#45141B] border border-[#a63344]/50 shadow-lg">
              <Sparkles className="h-6 w-6 text-[#f8d7dc]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                WebinarFlow AI Agent
              </h1>
              <p className="text-xs sm:text-sm text-[#f1d0d5]/80 mt-1">
                Generate high-converting webinar funnels, landing pages, and email sequences in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#5a1a23]/50 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('funnel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'funnel'
                  ? 'bg-[#852533] text-white shadow-md shadow-[#45141B]/40 ring-1 ring-[#a63344]'
                  : 'bg-black/30 text-gray-300 hover:text-white hover:bg-black/50'
              }`}
            >
              <Wand2 className="h-4 w-4 text-[#f8a5b2]" />
              1-Click Funnel Generator
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-[#852533] text-white shadow-md shadow-[#45141B]/40 ring-1 ring-[#a63344]'
                  : 'bg-black/30 text-gray-300 hover:text-white hover:bg-black/50'
              }`}
            >
              <MessageSquare className="h-4 w-4 text-[#f8a5b2]" />
              AI Co-Pilot Chat
            </button>
          </div>

          {/* Quick Chat History Button in Top Header */}
          <Button
            size="sm"
            onClick={() => {
              setActiveTab('chat');
              setShowMobileHistory(true);
            }}
            className="bg-[#2b0c11] hover:bg-[#3d1219] text-white border border-[#a63344]/70 text-xs px-3.5 h-9 rounded-xl flex items-center gap-2 shadow-md font-semibold transition-all hover:scale-105 active:scale-95"
            title="Open Chat History"
          >
            <History className="h-4 w-4 text-[#f8a5b2]" />
            <span>Chat History ({sessions.length})</span>
          </Button>
        </div>
      </div>

      {/* Tab 1: 1-Click Funnel Generator */}
      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration Form */}
          <div className="lg:col-span-5 flex flex-col space-y-4 bg-white dark:bg-[#140507]/90 border border-neutral-200 dark:border-[#5a1a23]/50 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Configure Webinar Funnel
              </h2>
              <p className="text-xs text-neutral-500 dark:text-[#f1d0d5]/70 mt-0.5">
                Tell the AI your webinar topic and audience to generate the complete campaign.
              </p>
            </div>

            <form onSubmit={handleGenerateFunnel} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1">
                    Webinar Topic or Main Title *
                  </label>
                  <Input
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. AI Automation for Students & Creators"
                    className="bg-neutral-50 dark:bg-black/60 border-neutral-300 dark:border-[#5a1a23]/60 text-neutral-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1">
                    Target Audience
                  </label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Students, Freelancers, Creators"
                    className="bg-neutral-50 dark:bg-black/60 border-neutral-300 dark:border-[#5a1a23]/60 text-neutral-900 dark:text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1">Pricing Model</label>
                    <select
                      value={isPaid ? 'paid' : 'free'}
                      onChange={(e) => setIsPaid(e.target.value === 'paid')}
                      className="w-full h-9 rounded-md bg-neutral-50 dark:bg-black/60 border border-neutral-300 dark:border-[#5a1a23]/60 px-3 text-xs text-neutral-900 dark:text-white focus:outline-none"
                    >
                      <option value="free">Free Training</option>
                      <option value="paid">Paid Masterclass</option>
                    </select>
                  </div>

                  {isPaid && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1">Ticket Price ($)</label>
                      <Input
                        type="number"
                        value={priceDollars}
                        onChange={(e) => setPriceDollars(e.target.value)}
                        placeholder="47"
                        className="bg-neutral-50 dark:bg-black/60 border-neutral-300 dark:border-[#5a1a23]/60 text-neutral-900 dark:text-white text-sm h-9"
                      />
                    </div>
                  )}
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Landing Page Template</span>
                    <span className="text-[11px] text-[#852533] dark:text-[#f8a5b2] font-normal">Choose 1 of 3</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('modern-saas')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        selectedTemplate === 'modern-saas'
                          ? 'border-[#852533] bg-[#45141B]/10 dark:bg-[#45141B]/70 text-neutral-900 dark:text-white ring-2 ring-[#852533]/50'
                          : 'border-neutral-200 dark:border-[#5a1a23]/60 bg-neutral-50 dark:bg-black/40 text-neutral-600 dark:text-gray-400 hover:border-[#852533]'
                      }`}
                    >
                      <span className="text-base mb-0.5">🚀</span>
                      <span className="text-[11px] font-bold">Modern SaaS</span>
                      <span className="text-[9px] text-neutral-500 dark:text-[#f8d7dc]/70">Stripe / Linear</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('corporate')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        selectedTemplate === 'corporate'
                          ? 'border-[#852533] bg-[#45141B]/10 dark:bg-[#45141B]/70 text-neutral-900 dark:text-white ring-2 ring-[#852533]/50'
                          : 'border-neutral-200 dark:border-[#5a1a23]/60 bg-neutral-50 dark:bg-black/40 text-neutral-600 dark:text-gray-400 hover:border-[#852533]'
                      }`}
                    >
                      <span className="text-base mb-0.5">🏢</span>
                      <span className="text-[11px] font-bold">Corporate</span>
                      <span className="text-[9px] text-neutral-500 dark:text-[#f8d7dc]/70">Executive B2B</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('education')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        selectedTemplate === 'education'
                          ? 'border-[#852533] bg-[#45141B]/10 dark:bg-[#45141B]/70 text-neutral-900 dark:text-white ring-2 ring-[#852533]/50'
                          : 'border-neutral-200 dark:border-[#5a1a23]/60 bg-neutral-50 dark:bg-black/40 text-neutral-600 dark:text-gray-400 hover:border-[#852533]'
                      }`}
                    >
                      <span className="text-base mb-0.5">🎓</span>
                      <span className="text-[11px] font-bold">Education</span>
                      <span className="text-[9px] text-neutral-500 dark:text-[#f8d7dc]/70">Academy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-1">
                    Custom Instructions (Optional)
                  </label>
                  <Textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Focus on portfolio projects students can show to universities or employers, include live practical case studies"
                    className="bg-neutral-50 dark:bg-black/60 border-neutral-300 dark:border-[#5a1a23]/60 text-neutral-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="w-full bg-gradient-to-r from-[#6b1e28] via-[#852533] to-[#731f2b] hover:from-[#7d232f] hover:to-[#8a2635] text-white font-semibold py-3 rounded-xl border border-[#a63344]/50 shadow-lg shadow-[#45141B]/20 transition-all hover:scale-[1.01] mt-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#f8d7dc]" />
                    Generating Funnel with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-[#f8d7dc]" />
                    Generate Complete Funnel
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column: Generated Output & Preview */}
          <div
            ref={previewContainerRef}
            className="lg:col-span-7 flex flex-col bg-white dark:bg-[#140507]/80 border border-neutral-200 dark:border-[#5a1a23]/50 rounded-2xl overflow-hidden shadow-sm min-h-[500px]"
          >
            {generatedFunnel ? (
              <div className="flex flex-col h-full">
                {/* Sub-tabs & Deploy Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-neutral-100 dark:bg-black/60 border-b border-neutral-200 dark:border-[#5a1a23]/40">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewSection('landing')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        previewSection === 'landing'
                          ? 'bg-[#852533] text-white shadow-sm'
                          : 'text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-white/5 border border-neutral-200 dark:border-transparent'
                      }`}
                    >
                      🎨 Landing Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSection('emails')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        previewSection === 'emails'
                          ? 'bg-[#852533] text-white shadow-sm'
                          : 'text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-white/5 border border-neutral-200 dark:border-transparent'
                      }`}
                    >
                      ✉️ 5-Email Sequence
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSection('outline')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        previewSection === 'outline'
                          ? 'bg-[#852533] text-white shadow-sm'
                          : 'text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-white/5 border border-neutral-200 dark:border-transparent'
                      }`}
                    >
                      🎙️ Outline
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleDeployFunnel}
                    disabled={isDeploying}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-md shrink-0 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    {isDeploying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                    Save to Workspace (Draft) →
                  </Button>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {previewSection === 'landing' && (
                    <div className="space-y-4 text-xs">
                      {/* Hero Preview */}
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-[#5a1a23]/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Hero Section</span>
                          <Badge variant="outline" className="border-neutral-300 dark:border-[#a63344]/40 text-neutral-700 dark:text-[#f8d7dc] text-[10px]">
                            {generatedFunnel.landing_page.sections?.navbar?.logo_text || 'WebinarFlow'}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                          {generatedFunnel.landing_page.hero_headline}
                        </h3>
                        <p className="text-neutral-600 dark:text-gray-300 text-xs leading-relaxed">
                          {generatedFunnel.landing_page.hero_subheadline}
                        </p>
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <Badge className="bg-[#852533] hover:bg-[#852533] text-white px-3 py-1 text-xs">
                            {generatedFunnel.landing_page.cta_text}
                          </Badge>
                          {generatedFunnel.landing_page.sections?.countdown?.message && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-300 font-mono font-medium">
                              ⏳ {generatedFunnel.landing_page.sections.countdown.message}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      {generatedFunnel.landing_page.sections?.stats?.stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {generatedFunnel.landing_page.sections.stats.stats.map((st: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/30 text-center">
                              <div className="font-bold text-[#852533] dark:text-[#f8a5b2] text-xs">{st.value}</div>
                              <div className="text-[10px] text-neutral-500 dark:text-gray-400">{st.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Instructors & Mentors */}
                      {generatedFunnel.landing_page.sections?.speakers?.speakers && (
                        <div className="space-y-2">
                          <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">
                            Instructors & Mentors
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {generatedFunnel.landing_page.sections.speakers.speakers.map((sp: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/30 space-y-1">
                                <div className="font-bold text-neutral-900 dark:text-white text-xs">{sp.name}</div>
                                <div className="text-[11px] text-[#852533] dark:text-[#f8a5b2] font-medium">{sp.title}</div>
                                <p className="text-[10px] text-neutral-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{sp.bio}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Benefits */}
                      <div className="space-y-2">
                        <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Key Benefits</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {generatedFunnel.landing_page.benefits.map((b, i) => (
                            <div key={i} className="p-3 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/30">
                              <h5 className="font-bold text-[#852533] dark:text-[#f8a5b2] text-xs">{b.title}</h5>
                              <p className="text-[10px] text-neutral-600 dark:text-gray-400 mt-1 leading-relaxed">{b.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Agenda */}
                      <div className="space-y-2">
                        <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Curriculum & Agenda</span>
                        <div className="space-y-1.5">
                          {generatedFunnel.landing_page.agenda.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-[#5a1a23]/30">
                              <span className="font-mono font-bold text-[#852533] dark:text-[#f8a5b2] text-xs shrink-0 mr-3">{a.time}</span>
                              <span className="text-neutral-800 dark:text-gray-200 text-xs truncate font-medium">{a.topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FAQs */}
                      <div className="space-y-2">
                        <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Frequently Asked Questions</span>
                        <div className="space-y-1.5">
                          {generatedFunnel.landing_page.faqs.map((f, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-[#5a1a23]/30 space-y-0.5">
                              <div className="font-semibold text-neutral-800 dark:text-gray-200 text-xs">Q: {f.question}</div>
                              <div className="text-neutral-500 dark:text-gray-400 text-[11px]">A: {f.answer}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {previewSection === 'emails' && (
                    <div className="space-y-3.5">
                      {generatedFunnel.email_sequence.map((em, i) => (
                        <div key={i} className="p-4 rounded-xl bg-neutral-50 dark:bg-black/50 border border-neutral-200 dark:border-[#5a1a23]/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[#852533] dark:text-[#f8a5b2] border-[#852533]/30 text-[10px] font-semibold uppercase">
                              {em.type}
                            </Badge>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${em.subject}\n\n${em.body}`);
                                toast.success('Email copied to clipboard!');
                              }}
                              className="text-xs text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 font-medium transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                          </div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-xs">{em.subject}</h4>
                          <p className="text-xs text-neutral-700 dark:text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-white dark:bg-black/40 p-3 rounded-lg border border-neutral-200 dark:border-white/5">
                            {em.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewSection === 'outline' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/40">
                        <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]">1. The Hook</span>
                        <p className="text-neutral-700 dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.hook}</p>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/40">
                        <span className="text-blue-600 dark:text-indigo-300 font-bold uppercase text-[10px]">2. Origin Story & Problem</span>
                        <p className="text-neutral-700 dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.story}</p>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/40">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">3. Core Content Pillars</span>
                        <p className="text-neutral-700 dark:text-gray-300 mt-1 whitespace-pre-line leading-relaxed">{generatedFunnel.outline.core_content}</p>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/40">
                        <span className="text-rose-600 dark:text-pink-400 font-bold uppercase text-[10px]">4. Offer Pitch</span>
                        <p className="text-neutral-700 dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.offer_pitch}</p>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-[#5a1a23]/40">
                        <span className="text-purple-600 dark:text-purple-300 font-bold uppercase text-[10px]">5. Q&A and Objections</span>
                        <p className="text-neutral-700 dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.qa_points}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-neutral-500 dark:text-gray-400 space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-[#2b0c11]/80 border border-neutral-200 dark:border-[#6b202c] shadow-inner text-[#852533] dark:text-[#f8a5b2]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Your Funnel Preview will appear here</h3>
                <p className="text-xs max-w-sm text-neutral-600 dark:text-[#f1d0d5]/70 leading-relaxed">
                  Enter your webinar details on the left and click <strong>Generate</strong> to see your landing page, 5 emails, and script outline ready for 1-click launch.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: AI Co-Pilot Chat with ChatGPT-Style Chat History Sidebar */}
      {activeTab === 'chat' && (
        <div className="relative flex flex-col md:flex-row bg-white border border-neutral-300 rounded-2xl overflow-hidden shadow-2xl min-h-[650px] h-[78vh]">
          {/* Fullscreen Mobile History Modal - White Background with Black Text */}
          {showMobileHistory && (
            <div className="fixed inset-0 z-[100] flex flex-col bg-white text-neutral-900 animate-in fade-in duration-150 md:hidden">
              {/* Mobile History Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-neutral-800" />
                  <span className="font-bold text-sm text-neutral-900">All Chat History</span>
                  <span className="text-[11px] text-neutral-500 font-medium">({sessions.length} chats)</span>
                </div>
                <button
                  onClick={() => setShowMobileHistory(false)}
                  className="p-1.5 rounded-lg bg-neutral-200 text-neutral-800 hover:bg-neutral-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile History New Chat CTA */}
              <div className="p-3.5 border-b border-neutral-200 bg-white">
                <Button
                  onClick={() => {
                    handleCreateNewChat();
                    setShowMobileHistory(false);
                  }}
                  className="w-full bg-neutral-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-xl border border-neutral-800 shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4 text-white" />
                  <span>+ Start New Chat</span>
                </Button>
              </div>

              {/* Categorized Sessions List for Mobile */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {recentSessions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                      <Clock className="h-3.5 w-3.5 text-neutral-700" />
                      <span>Recent Chats</span>
                    </div>
                    <div className="space-y-1">
                      {recentSessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setShowMobileHistory(false);
                            toast.success(`Switched to: ${s.title}`);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer border transition-all ${
                            activeSessionId === s.id
                              ? 'bg-neutral-100 text-black font-bold border-neutral-300 shadow-sm ring-1 ring-neutral-400'
                              : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:text-black'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
                            <MessageSquare className={`h-4 w-4 shrink-0 ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-400'}`} />
                            <div className="truncate">
                              <div className={`truncate font-semibold text-xs ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-900'}`}>{s.title}</div>
                              <div className="text-[10px] text-neutral-500">{s.messages.length} messages</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteChat(s.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {funnelSessions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                      <Wand2 className="h-3.5 w-3.5 text-amber-600" />
                      <span>Funnel Discussions</span>
                    </div>
                    <div className="space-y-1">
                      {funnelSessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setShowMobileHistory(false);
                            toast.success(`Switched to: ${s.title}`);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer border transition-all ${
                            activeSessionId === s.id
                              ? 'bg-neutral-100 text-black font-bold border-neutral-300 shadow-sm ring-1 ring-neutral-400'
                              : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:text-black'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
                            <Zap className={`h-4 w-4 shrink-0 ${activeSessionId === s.id ? 'text-amber-600' : 'text-neutral-400'}`} />
                            <div className="truncate">
                              <div className={`truncate font-semibold text-xs ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-900'}`}>{s.title}</div>
                              <div className="text-[10px] text-neutral-500">{s.messages.length} messages</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteChat(s.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {copySessions.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                      <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                      <span>Marketing & Copy</span>
                    </div>
                    <div className="space-y-1">
                      {copySessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setShowMobileHistory(false);
                            toast.success(`Switched to: ${s.title}`);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer border transition-all ${
                            activeSessionId === s.id
                              ? 'bg-neutral-100 text-black font-bold border-neutral-300 shadow-sm ring-1 ring-neutral-400'
                              : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:text-black'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
                            <FileText className={`h-4 w-4 shrink-0 ${activeSessionId === s.id ? 'text-rose-600' : 'text-neutral-400'}`} />
                            <div className="truncate">
                              <div className={`truncate font-semibold text-xs ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-900'}`}>{s.title}</div>
                              <div className="text-[10px] text-neutral-500">{s.messages.length} messages</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteChat(s.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Persistent Chat History Sidebar - Clean White Background with Black Text */}
          <aside className="hidden md:flex w-64 lg:w-72 flex-col bg-white border-r border-neutral-200 text-neutral-900 shrink-0">
            {/* Sidebar Top: New Chat CTA */}
            <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between gap-2 bg-white">
              <Button
                onClick={handleCreateNewChat}
                className="flex-1 bg-neutral-900 hover:bg-black text-white border border-neutral-800 shadow-md font-semibold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4 text-white" />
                <span>New Chat</span>
              </Button>
            </div>

            {/* Chat Sessions Grouped into Categorized Sections with Clear Headings and Black Text */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white">
              {/* Section 1: Recent Chats */}
              {recentSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                    <Clock className="h-3.5 w-3.5 text-neutral-700" />
                    <span>Recent Chats</span>
                  </div>
                  <div className="space-y-0.5">
                    {recentSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-neutral-100 text-black font-bold border border-neutral-300 shadow-sm'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-400'}`} />
                          <span className={`truncate ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-700 group-hover:text-black font-medium'}`}>{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Funnel Discussions */}
              {funnelSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                    <Wand2 className="h-3.5 w-3.5 text-amber-600" />
                    <span>Funnel Discussions</span>
                  </div>
                  <div className="space-y-0.5">
                    {funnelSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-neutral-100 text-black font-bold border border-neutral-300 shadow-sm'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Zap className={`h-3.5 w-3.5 shrink-0 ${activeSessionId === s.id ? 'text-amber-600' : 'text-neutral-400'}`} />
                          <span className={`truncate ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-700 group-hover:text-black font-medium'}`}>{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Marketing & Copy */}
              {copySessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-900">
                    <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                    <span>Marketing & Copy</span>
                  </div>
                  <div className="space-y-0.5">
                    {copySessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-neutral-100 text-black font-bold border border-neutral-300 shadow-sm'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`h-3.5 w-3.5 shrink-0 ${activeSessionId === s.id ? 'text-rose-600' : 'text-neutral-400'}`} />
                          <span className={`truncate ${activeSessionId === s.id ? 'text-black font-bold' : 'text-neutral-700 group-hover:text-black font-medium'}`}>{s.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Bottom Footer */}
            <div className="p-3 border-t border-neutral-200 text-[11px] text-neutral-600 flex items-center justify-between bg-neutral-50">
              <span className="font-semibold text-neutral-800">Chat Memory Saved</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </aside>

          {/* Right Main Chat Area - Pure Black Background */}
          <div className="flex-1 flex flex-col min-w-0 bg-black relative">
            {/* Top Chat Bar: Always Sticky at Top, High Contrast, Pure Black with White Text */}
            <div className="sticky top-0 z-20 px-3 sm:px-4 py-2.5 sm:py-3 bg-black border-b border-neutral-800 flex items-center justify-between gap-2 sm:gap-3 text-white shadow-md">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                {/* Mobile Button to open Full History Modal */}
                <Button
                  size="sm"
                  onClick={() => setShowMobileHistory(true)}
                  className="md:hidden bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 text-xs px-2.5 h-8 flex items-center gap-1.5 shrink-0 shadow-md font-semibold active:scale-95 transition-all"
                  title="Open Chat History"
                >
                  <History className="h-4 w-4 text-white" />
                  <span>History ({sessions.length})</span>
                </Button>

                {/* Mobile Direct Dropdown Switcher */}
                <div className="md:hidden flex-1 min-w-0">
                  <select
                    value={activeSessionId}
                    onChange={(e) => {
                      setActiveSessionId(e.target.value);
                      const title = sessions.find((s) => s.id === e.target.value)?.title;
                      if (title) toast.success(`Loaded: ${title}`);
                    }}
                    className="w-full bg-neutral-900 text-white text-xs font-semibold border border-neutral-700 rounded-lg px-2.5 py-1.5 truncate focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                        💬 {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop Chat Title */}
                <div className="hidden md:block truncate">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    {activeSession.title}
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {activeSession.messages.length} messages
                  </span>
                </div>
              </div>

              {/* Quick Actions: New Chat */}
              <Button
                size="sm"
                onClick={handleCreateNewChat}
                className="bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 text-xs h-8 px-3 font-semibold shadow-sm shrink-0 flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span className="hidden xs:inline">New Chat</span>
              </Button>
            </div>

            {/* Chat Messages Feed - Pure Solid Black */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-black">
              {activeSession.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6E1F32] text-white border border-[#551827] text-xs font-bold shadow-sm">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#852533] text-white border border-[#a63344]/40 shadow-sm font-medium'
                        : 'bg-[#F3DDE2] text-[#1F1F1F] border border-[#E8BAC5] shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-[#1F1F1F]">
                        <ChatMessageContent content={msg.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6E1F32] text-white border border-[#551827] text-xs font-bold">
                    AI
                  </div>
                  <div className="rounded-2xl bg-[#F3DDE2] border border-[#E8BAC5] px-4 py-3 text-xs text-[#1F1F1F] flex items-center gap-2 shadow-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-[#6E1F32]" />
                    Thinking and synthesizing response...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Mobile Floating Action Button: Instant 1-Tap Access to Chat History */}
            <button
              type="button"
              onClick={() => setShowMobileHistory(true)}
              className="md:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white text-black font-bold text-xs shadow-2xl border border-neutral-300 transition-all duration-200 active:scale-90 hover:scale-105"
              aria-label="Open Chat History"
            >
              <History className="h-4 w-4 text-black animate-pulse" />
              <span>History ({sessions.length})</span>
            </button>

            {/* Chat Message Input Composer - Pure Solid Black */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 bg-black border-t border-neutral-800 flex gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your AI Agent anything (e.g. 'write a 3-day reminder sequence', 'generate high-converting webinar headlines')..."
                className="bg-neutral-900 border-neutral-800 focus:border-neutral-700 text-white text-xs sm:text-sm placeholder:text-neutral-500"
              />
              <Button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-neutral-100 hover:bg-white text-black border border-neutral-300 px-5 font-bold text-xs shadow-md shrink-0 transition-all hover:scale-[1.02]"
              >
                <Send className="h-3.5 w-3.5 mr-1 text-black" />
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
