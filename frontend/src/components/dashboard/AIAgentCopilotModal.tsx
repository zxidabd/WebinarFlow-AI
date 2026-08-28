'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  MessageSquare,
  Send,
  Loader2,
  X,
  Copy,
  Check,
  CheckCircle2,
  Bot,
  Zap,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as aiApi from '@/lib/ai-api';

interface AIAgentCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Formatted Chat Message Renderer with Code Highlight & Copy
function ChatMessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.slice(3, firstLineEnd).trim() || 'code';
          const codeContent = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div
              key={index}
              className="my-2.5 rounded-xl bg-black/80 border border-[#5a1a23]/60 overflow-hidden shadow-md font-mono text-[11px]"
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
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Code</span>
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

        // Render rich formatted text blocks including tables, headers, and lists
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
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`sp-${partIndex}-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // 1. Horizontal Rule (---, ***, ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(
        <hr key={`hr-${partIndex}-${i}`} className="border-t border-[#5a1a23]/70 my-3" />
      );
      i++;
      continue;
    }

    // 2. Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      const startLine = i;
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const dataRows = tableLines.slice(2).map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div
            key={`tbl-${partIndex}-${startLine}`}
            className="my-3 overflow-x-auto rounded-xl border border-[#5a1a23] bg-black/70 shadow-lg"
          >
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#24080c] border-b border-[#5a1a23] text-white">
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-semibold text-[#f8d7dc] tracking-wide">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5a1a23]/40">
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition-colors hover:bg-[#381016]/30 ${
                      rIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-gray-200">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${partIndex}-${i}`} className="text-base font-bold text-white mt-3 mb-1.5">
          {renderInlineFormatting(line.replace('# ', ''))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${partIndex}-${i}`} className="text-sm font-bold text-white mt-2.5 mb-1">
          {renderInlineFormatting(line.replace('## ', ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${partIndex}-${i}`} className="text-xs font-bold text-[#f8a5b2] mt-2 mb-1">
          {renderInlineFormatting(line.replace('### ', ''))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${partIndex}-${i}`} className="text-xs font-semibold text-[#f8d7dc] mt-1.5 mb-0.5">
          {renderInlineFormatting(line.replace('#### ', ''))}
        </h5>
      );
      i++;
      continue;
    }

    // 4. Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${partIndex}-${i}`}
          className="border-l-2 border-[#a63344] pl-2.5 py-1 italic text-gray-300 my-1 bg-[#45141b]/15 rounded-r"
        >
          {renderInlineFormatting(line.replace('> ', ''))}
        </blockquote>
      );
      i++;
      continue;
    }

    // 5. Bullet Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`bullet-${partIndex}-${i}`} className="flex items-start gap-2 ml-1 text-gray-200">
          <span className="text-[#f8a5b2] mt-0.5 font-bold">•</span>
          <span>{renderInlineFormatting(line.slice(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    // 6. Numbered Lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${partIndex}-${i}`} className="flex items-start gap-2 ml-1 text-gray-200">
          <span className="font-semibold text-[#f8a5b2] min-w-[16px]">{numMatch[1]}.</span>
          <span>{renderInlineFormatting(numMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Standard Paragraph
    elements.push(
      <p key={`p-${partIndex}-${i}`} className="text-gray-200 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function renderInlineFormatting(text: string) {
  // Bold **text**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return (
        <strong key={bIdx} className="font-bold text-white">
          {bPart.slice(2, -2)}
        </strong>
      );
    }
    // Inline code `code`
    const codeParts = bPart.split(/(`.*?`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith('`') && cPart.endsWith('`')) {
        return (
          <code
            key={cIdx}
            className="px-1.5 py-0.5 rounded bg-black/60 border border-[#5a1a23]/60 text-amber-300 font-mono text-[11px]"
          >
            {cPart.slice(1, -1)}
          </code>
        );
      }
      return cPart;
    });
  });
}

export function AIAgentCopilotModal({ isOpen, onClose }: AIAgentCopilotModalProps) {
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

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        '👋 Hello! I am your **WebinarFlow AI Agent**.\n\nI can write code, answer technical & data science questions, draft email sequences, and build complete 11-section webinar funnels.\n\nWhat would you like to work on today?',
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, selectedModel]);

  if (!isOpen) return null;

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
      toast.success('Funnel created! Preview your landing page and emails on the right.');
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
      toast.success(`Funnel deployed! Published slug: ${res.landing_page_slug}`);
      setTimeout(() => {
        window.location.href = `/dashboard/webinars/${res.webinar_id}/landing-pages/${res.landing_page_id}`;
      }, 1200);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deploy funnel to workspace.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newConvo: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...chatMessages,
      { role: 'user', content: userText },
    ];
    setChatMessages(newConvo);
    setIsChatLoading(true);

    try {
      const res = await aiApi.chatWithAgent({
        messages: newConvo,
        model: selectedModel,
      });
      setChatMessages([...newConvo, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatMessages([
        ...newConvo,
        {
          role: 'assistant',
          content: 'I have analyzed your request. Click "1-Click Funnel Generator" or ask any technical question!',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-[#0c0406] border border-[#5a1a23]/60 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#5a1a23]/40 bg-[#190609]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#852533] via-[#6b1e28] to-[#45141B] border border-[#a63344]/50 shadow-md">
              <Sparkles className="h-5 w-5 text-[#f8d7dc]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                WebinarFlow AI Agent
              </h2>
              <p className="text-xs text-[#f1d0d5]/80">Autonomous Technical Assistant & Funnel Co-pilot</p>
            </div>
          </div>

            {/* Unified All-in-One Engine Badge & Close */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#2a0c10] border border-[#a63344]/50 rounded-lg px-3 py-1 text-xs text-[#f8d7dc] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold">All-in-One AI Agent</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-[#5a1a23]/40 bg-[#130406] px-6">
          <button
            onClick={() => setActiveTab('funnel')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'funnel'
                ? 'border-[#a63344] text-[#f8d7dc] bg-[#45141b]/35'
                : 'border-transparent text-gray-400 hover:text-[#f8d7dc] hover:bg-[#45141b]/15'
            }`}
          >
            <Wand2 className="h-4 w-4 text-[#f8a5b2]" />
            1-Click Funnel Generator
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-[#a63344] text-[#f8d7dc] bg-[#45141b]/35'
                : 'border-transparent text-gray-400 hover:text-[#f8d7dc] hover:bg-[#45141b]/15'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-[#f8a5b2]" />
            AI Co-Pilot Chat
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0304]">
          {activeTab === 'funnel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Column: Generator Form */}
              <div className="lg:col-span-5 flex flex-col space-y-4 bg-[#140507]/90 border border-[#5a1a23]/50 rounded-xl p-5 shadow-lg">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Configure Webinar Funnel
                  </h3>
                  <p className="text-xs text-[#f1d0d5]/70 mt-0.5">
                    Tell the AI your webinar topic and audience to generate the complete campaign.
                  </p>
                </div>

                <form onSubmit={handleGenerateFunnel} className="space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Webinar Topic or Main Title *
                      </label>
                      <Input
                        required
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. AI Automation for Students"
                        className="bg-black/60 border-[#5a1a23]/60 focus:border-[#a63344] text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Target Audience
                      </label>
                      <Input
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Students, Freelancers, Creators"
                        className="bg-black/60 border-[#5a1a23]/60 focus:border-[#a63344] text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Pricing Model</label>
                        <select
                          value={isPaid ? 'paid' : 'free'}
                          onChange={(e) => setIsPaid(e.target.value === 'paid')}
                          className="w-full h-9 rounded-md bg-black/60 border border-[#5a1a23]/60 px-3 text-xs text-white focus:outline-none"
                        >
                          <option value="free" className="bg-[#120406]">Free Training</option>
                          <option value="paid" className="bg-[#120406]">Paid Masterclass</option>
                        </select>
                      </div>

                      {isPaid && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">Ticket Price ($)</label>
                          <Input
                            type="number"
                            value={priceDollars}
                            onChange={(e) => setPriceDollars(e.target.value)}
                            placeholder="47"
                            className="bg-black/60 border-[#5a1a23]/60 focus:border-[#a63344] text-white text-sm h-9"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3-Option Template Style Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                        <span>Landing Page Template</span>
                        <span className="text-[10px] text-[#f8a5b2] font-normal">Select 1 of 3 designs</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTemplate('modern-saas')}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === 'modern-saas'
                              ? 'border-[#f87171] bg-[#45141B]/70 text-white shadow-md ring-1 ring-[#f87171]/50'
                              : 'border-[#5a1a23]/60 bg-black/40 text-gray-400 hover:border-[#a63344] hover:text-gray-200'
                          }`}
                        >
                          <span className="text-sm mb-0.5">🚀</span>
                          <span className="text-[11px] font-semibold text-white">Modern SaaS</span>
                          <span className="text-[9px] text-[#f8d7dc]/70">Stripe / Linear</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTemplate('corporate')}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === 'corporate'
                              ? 'border-[#f87171] bg-[#45141B]/70 text-white shadow-md ring-1 ring-[#f87171]/50'
                              : 'border-[#5a1a23]/60 bg-black/40 text-gray-400 hover:border-[#a63344] hover:text-gray-200'
                          }`}
                        >
                          <span className="text-sm mb-0.5">🏢</span>
                          <span className="text-[11px] font-semibold text-white">Corporate</span>
                          <span className="text-[9px] text-[#f8d7dc]/70">Executive B2B</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTemplate('education')}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            selectedTemplate === 'education'
                              ? 'border-[#f87171] bg-[#45141B]/70 text-white shadow-md ring-1 ring-[#f87171]/50'
                              : 'border-[#5a1a23]/60 bg-black/40 text-gray-400 hover:border-[#a63344] hover:text-gray-200'
                          }`}
                        >
                          <span className="text-sm mb-0.5">🎓</span>
                          <span className="text-[11px] font-semibold text-white">Education</span>
                          <span className="text-[9px] text-[#f8d7dc]/70">Course & Academy</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Custom Instructions (Optional)
                      </label>
                      <Textarea
                        rows={3}
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g. Focus on portfolio projects students can demonstrate to universities or employers, include live updates"
                        className="bg-black/60 border-[#5a1a23]/60 focus:border-[#a63344] text-white text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isGenerating || !topic.trim()}
                    className="w-full bg-gradient-to-r from-[#6b1e28] via-[#852533] to-[#731f2b] hover:from-[#7d232f] hover:to-[#8a2635] text-white font-semibold py-2.5 rounded-xl border border-[#a63344]/50 shadow-lg shadow-[#2a060a]/60 hover:shadow-[#45141B]/50 transition-all hover:scale-[1.01]"
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

              {/* Right Column: Generated Output & 1-Click Launch */}
              <div className="lg:col-span-7 flex flex-col bg-[#140507]/80 border border-[#5a1a23]/50 rounded-xl overflow-hidden shadow-lg">
                {generatedFunnel ? (
                  <div className="flex flex-col h-full">
                    {/* Preview Sub-tabs */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-[#5a1a23]/40">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPreviewSection('landing')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'landing' ? 'bg-[#852533] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🎨 Landing Page
                        </button>
                        <button
                          onClick={() => setPreviewSection('emails')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'emails' ? 'bg-[#852533] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          ✉️ 5-Email Sequence
                        </button>
                        <button
                          onClick={() => setPreviewSection('outline')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'outline' ? 'bg-[#852533] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🎙️ Presentation Outline
                        </button>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleDeployFunnel}
                        disabled={isDeploying}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg"
                      >
                        {isDeploying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                        Deploy to Workspace
                      </Button>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {previewSection === 'landing' && (
                        <div className="space-y-3.5 text-xs">
                          {/* Hero */}
                          <div className="p-3.5 rounded-xl bg-black/50 border border-[#5a1a23]/40 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Hero Section</span>
                              <Badge variant="outline" className="border-[#a63344]/40 text-[#f8d7dc] text-[10px]">
                                {generatedFunnel.landing_page.sections?.navbar?.logo_text || 'WebinarFlow'}
                              </Badge>
                            </div>
                            <h4 className="text-base font-bold text-white">{generatedFunnel.landing_page.hero_headline}</h4>
                            <p className="text-gray-300 text-xs leading-relaxed">{generatedFunnel.landing_page.hero_subheadline}</p>
                            <div className="pt-1 flex items-center gap-2">
                              <Badge className="bg-[#852533] hover:bg-[#852533] text-white">{generatedFunnel.landing_page.cta_text}</Badge>
                              {generatedFunnel.landing_page.sections?.countdown?.message && (
                                <span className="text-[11px] text-amber-300 font-mono">
                                  ⏳ {generatedFunnel.landing_page.sections.countdown.message}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stats Bar */}
                          {generatedFunnel.landing_page.sections?.stats?.stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {generatedFunnel.landing_page.sections.stats.stats.map((st: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-black/40 border border-[#5a1a23]/30 text-center">
                                  <div className="font-bold text-[#f8a5b2] text-xs">{st.value}</div>
                                  <div className="text-[10px] text-gray-400">{st.label}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Speakers */}
                          {generatedFunnel.landing_page.sections?.speakers?.speakers && (
                            <div className="space-y-1.5">
                              <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Instructors & Mentors</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {generatedFunnel.landing_page.sections.speakers.speakers.map((sp: any, i: number) => (
                                  <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-[#5a1a23]/30 space-y-0.5">
                                    <div className="font-semibold text-white text-[11px]">{sp.name}</div>
                                    <div className="text-[10px] text-[#f8a5b2]">{sp.title}</div>
                                    <p className="text-[10px] text-gray-400 line-clamp-2">{sp.bio}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Benefits */}
                          <div className="space-y-1.5">
                            <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Key Benefits</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {generatedFunnel.landing_page.benefits.map((b, i) => (
                                <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-[#5a1a23]/30">
                                  <h5 className="font-semibold text-[#f8a5b2] text-[11px]">{b.title}</h5>
                                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{b.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Agenda */}
                          <div className="space-y-1.5">
                            <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Curriculum & Agenda</span>
                            <div className="space-y-1">
                              {generatedFunnel.landing_page.agenda.map((a, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-[#5a1a23]/30">
                                  <span className="font-mono text-[#f8a5b2] text-[11px] shrink-0 mr-2">{a.time}</span>
                                  <span className="text-gray-200 text-[11px] truncate">{a.topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Testimonials */}
                          {generatedFunnel.landing_page.sections?.testimonials?.testimonials && (
                            <div className="space-y-1.5">
                              <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Testimonials</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {generatedFunnel.landing_page.sections.testimonials.testimonials.map((t: any, i: number) => (
                                  <div key={i} className="p-2 rounded-lg bg-black/30 border border-[#5a1a23]/30 italic text-gray-300 text-[10px]">
                                    &ldquo;{t.quote}&rdquo;
                                    <div className="not-italic text-[10px] font-semibold text-[#f8a5b2] mt-1">— {t.name}, {t.title}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* FAQs */}
                          <div className="space-y-1.5">
                            <span className="text-[#f8a5b2] uppercase font-semibold text-[10px]">Frequently Asked Questions</span>
                            <div className="space-y-1">
                              {generatedFunnel.landing_page.faqs.map((f, i) => (
                                <div key={i} className="p-2 rounded-lg bg-black/30 border border-[#5a1a23]/30 space-y-0.5">
                                  <div className="font-semibold text-gray-200 text-[11px]">Q: {f.question}</div>
                                  <div className="text-gray-400 text-[10px]">A: {f.answer}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {previewSection === 'emails' && (
                        <div className="space-y-3">
                          {generatedFunnel.email_sequence.map((em, i) => (
                            <div key={i} className="p-3 rounded-xl bg-black/50 border border-[#5a1a23]/40 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[#f8a5b2] border-[#a63344]/30 text-[10px]">
                                  {em.type}
                                </Badge>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${em.subject}\n\n${em.body}`);
                                    toast.success('Email copied to clipboard!');
                                  }}
                                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                              </div>
                              <h5 className="font-semibold text-white text-xs">{em.subject}</h5>
                              <p className="text-[11px] text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-black/40 p-2.5 rounded-lg border border-white/5">
                                {em.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewSection === 'outline' && (
                        <div className="space-y-3 text-xs">
                          <div className="p-3 rounded-lg bg-black/40 border border-[#5a1a23]/40">
                            <span className="text-amber-400 font-semibold uppercase text-[10px]">1. The Hook</span>
                            <p className="text-gray-300 mt-1">{generatedFunnel.outline.hook}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-[#5a1a23]/40">
                            <span className="text-indigo-300 font-semibold uppercase text-[10px]">2. Origin Story & Problem</span>
                            <p className="text-gray-300 mt-1">{generatedFunnel.outline.story}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-[#5a1a23]/40">
                            <span className="text-emerald-400 font-semibold uppercase text-[10px]">3. Core Content Pillars</span>
                            <p className="text-gray-300 mt-1 whitespace-pre-line">{generatedFunnel.outline.core_content}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-[#5a1a23]/40">
                            <span className="text-pink-400 font-semibold uppercase text-[10px]">4. Offer Pitch</span>
                            <p className="text-gray-300 mt-1">{generatedFunnel.outline.offer_pitch}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/40 border border-[#5a1a23]/40">
                            <span className="text-purple-300 font-semibold uppercase text-[10px]">5. Q&A and Objections</span>
                            <p className="text-gray-300 mt-1">{generatedFunnel.outline.qa_points}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b0c11]/80 border border-[#6b202c] shadow-inner text-[#f8a5b2]">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-semibold text-white">Your Funnel Preview will appear here</h4>
                    <p className="text-xs max-w-sm text-[#f1d0d5]/70">
                      Enter your webinar details on the left and click <strong>Generate</strong> to see your landing page, 5 emails, and script outline ready for 1-click launch.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab 2: AI Co-Pilot Chat */
            <div className="flex flex-col h-full bg-[#140507]/90 border border-[#5a1a23]/50 rounded-xl overflow-hidden shadow-lg">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#45141B] text-[#f8a5b2] border border-[#6b202c] text-xs font-bold shadow-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#852533] text-white border border-[#a63344]/40 shadow-sm'
                          : 'bg-[#170508]/90 border border-[#5a1a23]/60 text-gray-200 shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p>{msg.content}</p>
                      ) : (
                        <ChatMessageContent content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#45141B] text-[#f8a5b2] border border-[#6b202c] text-xs font-bold">
                      AI
                    </div>
                    <div className="rounded-2xl bg-[#170508]/90 border border-[#5a1a23]/60 px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f8a5b2]" />
                      Thinking and crafting response...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-black/60 border-t border-[#5a1a23]/40 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask your AI Agent anything (e.g. 'write python calculator code', 'explain React hooks', 'write email copy')..."
                  className="bg-black/60 border-[#5a1a23]/60 focus:border-[#a63344] text-white text-xs placeholder:text-gray-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-gradient-to-r from-[#6b1e28] via-[#852533] to-[#731f2b] hover:from-[#7d232f] hover:to-[#8a2635] text-white border border-[#a63344]/40 px-4 font-semibold text-xs shadow-md shadow-[#2a060a]/60 hover:shadow-[#45141B]/50 transition-all hover:scale-[1.02]"
                >
                  <Send className="h-3.5 w-3.5 mr-1 text-[#f8d7dc]" />
                  Send
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
