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
  ArrowLeft,
  Clock,
  Menu,
  X,
  Plus,
  Trash2,
  FileText,
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
  const [activeTab, setActiveTab] = useState<'chat' | 'funnel'>('chat');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Sync active studio mode from URL query parameters (e.g. ?tab=funnel or ?tab=chat)
  useEffect(() => {
    const handleCheckTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'funnel') {
          setActiveTab('funnel');
        } else if (tab === 'chat') {
          setActiveTab('chat');
        }
      }
    };

    handleCheckTab();
    window.addEventListener('popstate', handleCheckTab);
    return () => window.removeEventListener('popstate', handleCheckTab);
  }, []);

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
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from localStorage immediately, then sync with server for cross-device persistence
  useEffect(() => {
    let localList: ChatSession[] = INITIAL_SESSIONS;
    try {
      const saved = localStorage.getItem('webinarflow_ai_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localList = parsed;
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch {
      // Handled gracefully
    }

    // Cross-device sync: merges chats made on desktop and mobile into one unified history
    aiApi.syncChatSessions(localList).then((synced) => {
      if (Array.isArray(synced) && synced.length > 0) {
        setSessions(synced);
        try {
          localStorage.setItem('webinarflow_ai_chat_sessions', JSON.stringify(synced));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const saveSessions = (updated: ChatSession[], sessionToSync?: ChatSession) => {
    setSessions(updated);
    try {
      localStorage.setItem('webinarflow_ai_chat_sessions', JSON.stringify(updated));
    } catch {
      // Handled gracefully
    }

    if (sessionToSync) {
      aiApi.saveChatSession(sessionToSync).catch(() => {});
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || INITIAL_SESSIONS[0];

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          content: '👋 Hi! What would you like to build, draft, or ask today?',
        },
      ],
    };
    const updated = [newChat, ...sessions];
    saveSessions(updated, newChat);
    setActiveSessionId(newId);
    setShowHistoryDrawer(false);
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
    aiApi.deleteChatSession(sessionId).catch(() => {});
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0].id);
    }
    toast.success('Chat removed from history');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');

    const currentTitle = activeSession.title;
    const shouldRename = currentTitle === 'New Conversation' || currentTitle === 'Getting Started with AI Agent';
    const newTitle = shouldRename ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '') : currentTitle;

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

    const updatedSessionObj: ChatSession = {
      ...activeSession,
      title: newTitle,
      category,
      messages: newConvo,
    };

    const updatedSessions = sessions.map((s) =>
      s.id === activeSession.id ? updatedSessionObj : s
    );
    saveSessions(updatedSessions, updatedSessionObj);
    setIsChatLoading(true);

    try {
      const res = await aiApi.chatWithAgent({
        messages: newConvo,
      });

      const finalConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...newConvo,
        { role: 'assistant', content: res.reply },
      ];

      const completedSessionObj: ChatSession = {
        ...updatedSessionObj,
        messages: finalConvo,
      };

      const withAssistantReply = updatedSessions.map((s) =>
        s.id === activeSession.id ? completedSessionObj : s
      );
      saveSessions(withAssistantReply, completedSessionObj);
    } catch {
      const fallbackConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...newConvo,
        {
          role: 'assistant',
          content: 'I have analyzed your request. You can configure your campaign in the "Funnel Builder" tab or ask any follow-up question!',
        },
      ];
      const fallbackSessionObj: ChatSession = {
        ...updatedSessionObj,
        messages: fallbackConvo,
      };
      const withFallback = updatedSessions.map((s) =>
        s.id === activeSession.id ? fallbackSessionObj : s
      );
      saveSessions(withFallback, fallbackSessionObj);
    } finally {
      setIsChatLoading(false);
    }
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

  const recentSessions = sessions.filter((s) => s.category === 'recent');
  const funnelSessions = sessions.filter((s) => s.category === 'funnels');
  const copySessions = sessions.filter((s) => s.category === 'copy');

  return (
    // Full Edge-to-Edge Container: fills 100% of viewport, zero page scroll!
    <div className="h-full w-full flex flex-col bg-background text-foreground dark:bg-[#0b0305] dark:text-white overflow-hidden select-none transition-colors">
      {/* ChatGPT-Style Slide-over Chat History Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setShowHistoryDrawer(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
          />

          {/* Drawer Panel */}
          <aside className="relative z-50 w-72 sm:w-80 h-full bg-card border-r border-border flex flex-col text-foreground dark:bg-[#120406] dark:border-[#5a1a23]/60 dark:text-white shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between gap-2 bg-muted/40 dark:bg-[#1a0609] dark:border-[#5a1a23]/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#852533] dark:text-[#f8a5b2]" />
                <span className="font-bold text-sm text-foreground dark:text-white">Chat History</span>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3 border-b border-border dark:border-[#5a1a23]/40">
              <Button
                onClick={handleCreateNewChat}
                className="w-full bg-[#852533] hover:bg-[#6b1e28] text-white shadow-md font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4 text-white" />
                <span>New Chat</span>
              </Button>
            </div>

            {/* Categorized Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {recentSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-foreground/80 dark:text-white">
                    <Clock className="h-3 w-3 text-[#852533] dark:text-[#f8a5b2]" />
                    <span>Recent Chats</span>
                  </div>
                  <div className="space-y-0.5">
                    {recentSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setShowHistoryDrawer(false);
                          toast.success(`Switched to: ${s.title}`);
                        }}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-[#852533] text-white font-semibold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <span className="truncate font-medium">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {funnelSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-foreground/80 dark:text-white">
                    <Wand2 className="h-3 w-3 text-amber-500" />
                    <span>Funnel Discussions</span>
                  </div>
                  <div className="space-y-0.5">
                    {funnelSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setShowHistoryDrawer(false);
                          toast.success(`Switched to: ${s.title}`);
                        }}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-[#852533] text-white font-semibold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <span className="truncate font-medium">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {copySessions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-foreground/80 dark:text-white">
                    <Sparkles className="h-3 w-3 text-pink-500" />
                    <span>Marketing & Copy</span>
                  </div>
                  <div className="space-y-0.5">
                    {copySessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setShowHistoryDrawer(false);
                          toast.success(`Switched to: ${s.title}`);
                        }}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-[#852533] text-white font-semibold shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <span className="truncate font-medium">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteChat(s.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border dark:border-[#5a1a23]/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Memory Saved</span>
              </span>
            </div>
          </aside>
        </div>
      )}

      {/* TOP HEADER IN A SINGLE CLEAN LINE */}
      <header className="h-14 px-3 sm:px-6 border-b border-border bg-card/90 dark:border-[#5a1a23]/60 dark:bg-[#140507] flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Menu toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground dark:bg-white/5 dark:hover:bg-white/10 dark:text-white flex items-center gap-1.5 transition-colors shrink-0"
            title="Open Chat History"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-[#852533] dark:text-[#f8a5b2]" />
          </button>
        </div>

        {/* Center: Simple Mode Switcher (Funnel Builder / AI Chat) */}
        <div className="flex items-center bg-muted/80 dark:bg-black/60 p-0.5 sm:p-1 rounded-xl border border-border dark:border-[#5a1a23]/60 shrink-0">
          <button
            onClick={() => {
              setActiveTab('chat');
              if (typeof window !== 'undefined' && window.history.replaceState) {
                window.history.replaceState(null, '', '/dashboard/ai-agent?tab=chat');
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-[#852533] text-white shadow-sm ring-1 ring-[#a63344]/50'
                : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => {
              setActiveTab('funnel');
              if (typeof window !== 'undefined' && window.history.replaceState) {
                window.history.replaceState(null, '', '/dashboard/ai-agent?tab=funnel');
              }
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'funnel'
                ? 'bg-[#852533] text-white shadow-sm ring-1 ring-[#a63344]/50'
                : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            🚀 Funnel Builder
          </button>
        </div>

        {/* Right: Return to Main Dashboard */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/dashboard"
            className="bg-[#852533] hover:bg-[#6b1e28] text-white border border-[#a63344]/40 text-xs h-8 px-2.5 sm:px-3 rounded-xl font-semibold shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            title="Go to Main Dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-white" />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* MODE 1: FULL-PAGE CHATGPT-STYLE AI AGENT (Zero outer scroll, 100% full screen) */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 relative bg-muted/20 dark:bg-[#0c0305]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 max-w-4xl w-full mx-auto">
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
                  className={`max-w-[85%] sm:max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
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

          {/* ChatGPT-Style Bottom Input Bar: Pinned & 16px font to NEVER zoom on iOS Safari */}
          <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-card/95 border-t border-border dark:bg-[#120406]/95 dark:border-[#5a1a23]/40 shrink-0">
            <form
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto flex items-center gap-2 bg-background border border-border focus-within:border-[#852533] dark:bg-black/70 dark:border-[#5a1a23]/60 dark:focus-within:border-[#a63344] rounded-2xl px-3 py-1.5 shadow-inner transition-all"
            >
              {/* Note: text-[16px] is MANDATORY on mobile to completely disable iOS Safari auto-zoom */}
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask WebinarFlow AI anything..."
                className="flex-1 bg-transparent border-0 text-foreground dark:text-white text-[16px] sm:text-sm placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 py-1.5 px-1 min-w-0"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isChatLoading || !chatInput.trim()}
                className="h-9 w-9 p-0 rounded-xl bg-[#852533] hover:bg-[#6b1e28] text-white border border-[#a63344]/40 shadow-sm shrink-0 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* MODE 2: FULL-PAGE FUNNEL BUILDER */}
      {activeTab === 'funnel' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto bg-muted/20 dark:bg-[#0b0305]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
            {/* Configuration Form */}
            <div className="lg:col-span-5 flex flex-col space-y-4 bg-card border border-border dark:bg-[#140507]/90 dark:border-[#5a1a23]/50 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Configure Webinar Funnel
                </h2>
                <p className="text-xs text-muted-foreground dark:text-[#f1d0d5]/70 mt-0.5">
                  Generate full landing page, 5-email sequence, and webinar outline in seconds.
                </p>
              </div>

              <form onSubmit={handleGenerateFunnel} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1">
                      Webinar Topic or Main Title *
                    </label>
                    <Input
                      required
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. AI Automation for Students & Creators"
                      className="bg-background border-input text-foreground dark:bg-black/60 dark:border-[#5a1a23]/60 dark:text-white text-[16px] sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1">
                      Target Audience
                    </label>
                    <Input
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Students, Freelancers, Creators"
                      className="bg-background border-input text-foreground dark:bg-black/60 dark:border-[#5a1a23]/60 dark:text-white text-[16px] sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1">Pricing Model</label>
                      <select
                        value={isPaid ? 'paid' : 'free'}
                        onChange={(e) => setIsPaid(e.target.value === 'paid')}
                        className="w-full h-9 rounded-md bg-background border border-input text-foreground dark:bg-black/60 dark:border-[#5a1a23]/60 dark:text-white px-3 text-xs focus:outline-none"
                      >
                        <option value="free">Free Training</option>
                        <option value="paid">Paid Masterclass</option>
                      </select>
                    </div>

                    {isPaid && (
                      <div>
                        <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1">Ticket Price ($)</label>
                        <Input
                          type="number"
                          value={priceDollars}
                          onChange={(e) => setPriceDollars(e.target.value)}
                          placeholder="47"
                          className="bg-background border-input text-foreground dark:bg-black/60 dark:border-[#5a1a23]/60 dark:text-white text-[16px] sm:text-sm h-9"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Landing Page Template</span>
                      <span className="text-[11px] text-[#852533] dark:text-[#f8a5b2] font-normal">Choose 1 of 3</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate('modern-saas')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          selectedTemplate === 'modern-saas'
                            ? 'border-[#852533] bg-[#852533]/10 dark:bg-[#45141B]/70 text-[#852533] dark:text-white ring-2 ring-[#852533]/50'
                            : 'border-border bg-background dark:border-[#5a1a23]/60 dark:bg-black/40 text-muted-foreground dark:text-gray-400 hover:border-[#852533]'
                        }`}
                      >
                        <span className="text-base mb-0.5">🚀</span>
                        <span className="text-[11px] font-bold">Modern SaaS</span>
                        <span className="text-[9px] opacity-70">Stripe / Linear</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTemplate('corporate')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          selectedTemplate === 'corporate'
                            ? 'border-[#852533] bg-[#852533]/10 dark:bg-[#45141B]/70 text-[#852533] dark:text-white ring-2 ring-[#852533]/50'
                            : 'border-border bg-background dark:border-[#5a1a23]/60 dark:bg-black/40 text-muted-foreground dark:text-gray-400 hover:border-[#852533]'
                        }`}
                      >
                        <span className="text-base mb-0.5">🏢</span>
                        <span className="text-[11px] font-bold">Corporate</span>
                        <span className="text-[9px] opacity-70">Executive B2B</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTemplate('education')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          selectedTemplate === 'education'
                            ? 'border-[#852533] bg-[#852533]/10 dark:bg-[#45141B]/70 text-[#852533] dark:text-white ring-2 ring-[#852533]/50'
                            : 'border-border bg-background dark:border-[#5a1a23]/60 dark:bg-black/40 text-muted-foreground dark:text-gray-400 hover:border-[#852533]'
                        }`}
                      >
                        <span className="text-base mb-0.5">🎓</span>
                        <span className="text-[11px] font-bold">Education</span>
                        <span className="text-[9px] opacity-70">Academy</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/90 dark:text-gray-300 mb-1">
                      Custom Instructions (Optional)
                    </label>
                    <Textarea
                      rows={3}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="e.g. Focus on portfolio projects students can show to universities or employers, include live practical case studies"
                      className="bg-background border-input text-foreground dark:bg-black/60 dark:border-[#5a1a23]/60 dark:text-white text-[16px] sm:text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating || !topic.trim()}
                  className="w-full bg-[#852533] hover:bg-[#6b1e28] text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#852533]/20 transition-all hover:scale-[1.01] mt-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Generating Funnel with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 text-white" />
                      Generate Complete Funnel
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Generated Output Preview */}
            <div
              ref={previewContainerRef}
              className="lg:col-span-7 flex flex-col bg-card border border-border dark:bg-[#140507]/80 dark:border-[#5a1a23]/50 rounded-2xl overflow-hidden shadow-sm min-h-[500px]"
            >
              {generatedFunnel ? (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-muted/40 border-b border-border dark:bg-black/60 dark:border-[#5a1a23]/40">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewSection('landing')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          previewSection === 'landing'
                            ? 'bg-[#852533] text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground bg-muted dark:text-gray-400 dark:hover:text-white dark:bg-white/5'
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
                            : 'text-muted-foreground hover:text-foreground bg-muted dark:text-gray-400 dark:hover:text-white dark:bg-white/5'
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
                            : 'text-muted-foreground hover:text-foreground bg-muted dark:text-gray-400 dark:hover:text-white dark:bg-white/5'
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

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {previewSection === 'landing' && (
                      <div className="space-y-4 text-xs">
                        <div className="p-4 rounded-xl bg-muted/40 border border-border dark:bg-black/50 dark:border-[#5a1a23]/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Hero Section</span>
                            <Badge variant="outline" className="border-border text-foreground dark:border-[#a63344]/40 dark:text-[#f8d7dc] text-[10px]">
                              {generatedFunnel.landing_page.sections?.navbar?.logo_text || 'WebinarFlow'}
                            </Badge>
                          </div>
                          <h3 className="text-base font-bold text-foreground dark:text-white leading-snug">
                            {generatedFunnel.landing_page.hero_headline}
                          </h3>
                          <p className="text-muted-foreground dark:text-gray-300 text-xs leading-relaxed">
                            {generatedFunnel.landing_page.hero_subheadline}
                          </p>
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <Badge className="bg-[#852533] hover:bg-[#852533] text-white px-3 py-1 text-xs">
                              {generatedFunnel.landing_page.cta_text}
                            </Badge>
                          </div>
                        </div>

                        {generatedFunnel.landing_page.sections?.stats?.stats && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {generatedFunnel.landing_page.sections.stats.stats.map((st: any, i: number) => (
                              <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border dark:bg-black/40 dark:border-[#5a1a23]/30 text-center">
                                <div className="font-bold text-[#852533] dark:text-[#f8a5b2] text-xs">{st.value}</div>
                                <div className="text-[10px] text-muted-foreground dark:text-gray-400">{st.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-[#852533] dark:text-[#f8a5b2] uppercase font-bold text-[10px] tracking-wider">Key Benefits</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {generatedFunnel.landing_page.benefits.map((b, i) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border dark:bg-black/40 dark:border-[#5a1a23]/30">
                                <h5 className="font-bold text-[#852533] dark:text-[#f8a5b2] text-xs">{b.title}</h5>
                                <p className="text-[10px] text-muted-foreground dark:text-gray-400 mt-1 leading-relaxed">{b.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {previewSection === 'emails' && (
                      <div className="space-y-3.5">
                        {generatedFunnel.email_sequence.map((em, i) => (
                          <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border dark:bg-black/50 dark:border-[#5a1a23]/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[#852533] dark:text-[#f8a5b2] border-[#852533]/30 text-[10px] font-semibold uppercase">
                                {em.type}
                              </Badge>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${em.subject}\n\n${em.body}`);
                                  toast.success('Email copied to clipboard!');
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white flex items-center gap-1 font-medium transition-colors"
                              >
                                <Copy className="h-3.5 w-3.5" /> Copy
                              </button>
                            </div>
                            <h4 className="font-bold text-foreground dark:text-white text-xs">{em.subject}</h4>
                            <p className="text-xs text-muted-foreground dark:text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-background dark:bg-black/40 p-3 rounded-lg border border-border dark:border-white/5">
                              {em.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {previewSection === 'outline' && (
                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-lg bg-muted/40 border border-border dark:bg-black/40 dark:border-[#5a1a23]/40">
                          <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]">1. The Hook</span>
                          <p className="text-muted-foreground dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.hook}</p>
                        </div>
                        <div className="p-3.5 rounded-lg bg-muted/40 border border-border dark:bg-black/40 dark:border-[#5a1a23]/40">
                          <span className="text-indigo-600 dark:text-indigo-300 font-bold uppercase text-[10px]">2. Origin Story & Problem</span>
                          <p className="text-muted-foreground dark:text-gray-300 mt-1 leading-relaxed">{generatedFunnel.outline.story}</p>
                        </div>
                        <div className="p-3.5 rounded-lg bg-muted/40 border border-border dark:bg-black/40 dark:border-[#5a1a23]/40">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">3. Core Content Pillars</span>
                          <p className="text-muted-foreground dark:text-gray-300 mt-1 whitespace-pre-line leading-relaxed">{generatedFunnel.outline.core_content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-muted-foreground dark:text-gray-400 space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#852533]/10 border border-[#852533]/20 shadow-inner text-[#852533] dark:bg-[#2b0c11]/80 dark:border-[#6b202c] dark:text-[#f8a5b2]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-foreground dark:text-white">Your Funnel Preview will appear here</h3>
                  <p className="text-xs max-w-sm text-muted-foreground dark:text-[#f1d0d5]/70 leading-relaxed">
                    Enter your webinar details on the left and click <strong>Generate</strong> to see your landing page, 5 emails, and script outline ready for 1-click launch.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
