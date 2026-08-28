'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  Zap,
  Send,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Mail,
  FileText,
  LayoutTemplate,
  MessageSquare,
  Wand2,
  Sliders,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import * as aiApi from '@/lib/ai-api';
import type { GeneratedFunnel } from '@/lib/ai-api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAgentCopilotModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'funnel' | 'chat'>('funnel');
  const [models, setModels] = useState<aiApi.AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('nvidia/DeepSeek V4 Pro');

  // Funnel Builder State
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [goal, setGoal] = useState('High Lead Generation & Sales Conversion');
  const [isPaid, setIsPaid] = useState(false);
  const [priceDollars, setPriceDollars] = useState('47');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFunnel, setGeneratedFunnel] = useState<GeneratedFunnel | null>(null);
  const [previewSection, setPreviewSection] = useState<'landing' | 'emails' | 'outline'>('landing');
  const [isDeploying, setIsDeploying] = useState(false);

  // Chat Co-pilot State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        '👋 Hello! I am your **WebinarFlow AI Agent**. I can help you build high-converting webinar funnels, craft persuasive email sequences, rewrite landing pages, or strategize your next live launch. What are we creating today?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      aiApi
        .getAiModels()
        .then((res) => {
          if (res.models && res.models.length > 0) {
            setModels(res.models);
            setSelectedModel(res.models[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a webinar topic or title');
      return;
    }

    setIsGenerating(true);
    try {
      const funnel = await aiApi.generateFunnel({
        topic: topic.trim(),
        target_audience: targetAudience.trim() || undefined,
        goal: goal.trim() || undefined,
        is_paid: isPaid,
        price_cents: isPaid ? Math.round(parseFloat(priceDollars || '0') * 100) : 0,
        custom_instructions: customInstructions.trim() || undefined,
        model: selectedModel,
      });
      setGeneratedFunnel(funnel);
      toast.success('Funnel assets generated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Generation failed, using smart template');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeployFunnel = async () => {
    if (!generatedFunnel) return;
    setIsDeploying(true);
    try {
      const res = await aiApi.applyFunnel(generatedFunnel);
      toast.success('Funnel created in your workspace!');
      onClose();
      router.push(`/dashboard/webinars/${res.webinar_id}/landing-pages/${res.landing_page_id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deploy funnel');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userMsg = inputMessage.trim();
    const newConvo = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newConvo);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const res = await aiApi.chatWithAgent({
        messages: newConvo,
        model: selectedModel,
      });
      setChatMessages([...newConvo, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setChatMessages([
        ...newConvo,
        { role: 'assistant', content: 'I encountered an issue connecting to the AI provider. Please verify OmniRoute is running.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161826]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">WebinarFlow AI Agent</h2>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs py-0">
                  ● Connected to OmniRoute
                </Badge>
              </div>
              <p className="text-xs text-gray-400">Autonomous Webinar Funnel Architect & Co-pilot</p>
            </div>
          </div>

          {/* Model Selector & Close */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
              <Bot className="h-3.5 w-3.5 text-indigo-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#121420] text-white">
                      {m.name || m.id}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="nvidia/DeepSeek V4 Pro" className="bg-[#121420] text-white">DeepSeek V4 Pro (NVIDIA)</option>
                    <option value="nvidia/Mistral Large 3 675B" className="bg-[#121420] text-white">Mistral Large 3 (NVIDIA)</option>
                    <option value="gpt-4o" className="bg-[#121420] text-white">GPT-4o</option>
                    <option value="claude-3-5-sonnet-latest" className="bg-[#121420] text-white">Claude 3.5 Sonnet</option>
                  </>
                )}
              </select>
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
        <div className="flex border-b border-white/10 bg-[#121420] px-6">
          <button
            onClick={() => setActiveTab('funnel')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'funnel'
                ? 'border-indigo-500 text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wand2 className="h-4 w-4 text-indigo-400" />
            1-Click Funnel Generator
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-indigo-500 text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-pink-400" />
            AI Co-Pilot Chat
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'funnel' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Column: Generator Form */}
              <div className="lg:col-span-5 flex flex-col space-y-4 bg-[#141624] border border-white/5 rounded-xl p-5">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Configure Webinar Funnel
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
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
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. AI Automation Agency Masterclass"
                        className="bg-black/40 border-white/10 text-white text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Target Audience
                      </label>
                      <Input
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. Freelancers, Agency Owners, Consultants"
                        className="bg-black/40 border-white/10 text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Pricing Model</label>
                        <select
                          value={isPaid ? 'paid' : 'free'}
                          onChange={(e) => setIsPaid(e.target.value === 'paid')}
                          className="w-full h-9 rounded-md bg-black/40 border border-white/10 px-3 text-xs text-white focus:outline-none"
                        >
                          <option value="free">Free Training</option>
                          <option value="paid">Paid Masterclass</option>
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
                            className="bg-black/40 border-white/10 text-white text-sm h-9"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Custom Instructions (Optional)
                      </label>
                      <Textarea
                        rows={2}
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g. Focus on zero coding, 5-figure retainers, include case studies"
                        className="bg-black/40 border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isGenerating || !topic.trim()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/25"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Funnel with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Complete Funnel
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Right Column: Generated Output & 1-Click Launch */}
              <div className="lg:col-span-7 flex flex-col bg-[#141624] border border-white/5 rounded-xl overflow-hidden">
                {generatedFunnel ? (
                  <div className="flex flex-col h-full">
                    {/* Preview Sub-tabs */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPreviewSection('landing')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'landing' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🎨 Landing Page
                        </button>
                        <button
                          onClick={() => setPreviewSection('emails')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'emails' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          ✉️ 5-Email Sequence
                        </button>
                        <button
                          onClick={() => setPreviewSection('outline')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            previewSection === 'outline' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
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
                          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 uppercase font-semibold text-[10px]">Hero Section</span>
                              <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 text-[10px]">
                                {generatedFunnel.landing_page.sections?.navbar?.logo_text || 'WebinarFlow'}
                              </Badge>
                            </div>
                            <h4 className="text-base font-bold text-white">{generatedFunnel.landing_page.hero_headline}</h4>
                            <p className="text-gray-300 text-xs leading-relaxed">{generatedFunnel.landing_page.hero_subheadline}</p>
                            <div className="pt-1 flex items-center gap-2">
                              <Badge className="bg-indigo-600 hover:bg-indigo-600">{generatedFunnel.landing_page.cta_text}</Badge>
                              {generatedFunnel.landing_page.sections?.countdown?.message && (
                                <span className="text-[11px] text-amber-400 font-mono">
                                  ⏳ {generatedFunnel.landing_page.sections.countdown.message}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stats Bar */}
                          {generatedFunnel.landing_page.sections?.stats?.stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {generatedFunnel.landing_page.sections.stats.stats.map((st: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-black/30 border border-white/5 text-center">
                                  <div className="font-bold text-indigo-300 text-xs">{st.value}</div>
                                  <div className="text-[10px] text-gray-400">{st.label}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Speakers */}
                          {generatedFunnel.landing_page.sections?.speakers?.speakers && (
                            <div className="space-y-1.5">
                              <span className="text-gray-400 uppercase font-semibold text-[10px]">Instructors & Mentors</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {generatedFunnel.landing_page.sections.speakers.speakers.map((sp: any, i: number) => (
                                  <div key={i} className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                                    <div className="font-semibold text-white text-[11px]">{sp.name}</div>
                                    <div className="text-[10px] text-indigo-300">{sp.title}</div>
                                    <p className="text-[10px] text-gray-400 line-clamp-2">{sp.bio}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Benefits */}
                          <div className="space-y-1.5">
                            <span className="text-gray-400 uppercase font-semibold text-[10px]">Key Benefits</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {generatedFunnel.landing_page.benefits.map((b, i) => (
                                <div key={i} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                                  <h5 className="font-semibold text-indigo-300 text-[11px]">{b.title}</h5>
                                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{b.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Agenda */}
                          <div className="space-y-1.5">
                            <span className="text-gray-400 uppercase font-semibold text-[10px]">Curriculum & Agenda</span>
                            <div className="space-y-1">
                              {generatedFunnel.landing_page.agenda.map((a, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                                  <span className="font-mono text-indigo-400 text-[11px] shrink-0 mr-2">{a.time}</span>
                                  <span className="text-gray-200 text-[11px] truncate">{a.topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Testimonials */}
                          {generatedFunnel.landing_page.sections?.testimonials?.testimonials && (
                            <div className="space-y-1.5">
                              <span className="text-gray-400 uppercase font-semibold text-[10px]">Testimonials</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {generatedFunnel.landing_page.sections.testimonials.testimonials.map((t: any, i: number) => (
                                  <div key={i} className="p-2 rounded-lg bg-black/20 border border-white/5 italic text-gray-300 text-[10px]">
                                    &ldquo;{t.quote}&rdquo;
                                    <div className="not-italic text-[10px] font-semibold text-indigo-300 mt-1">— {t.name}, {t.title}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* FAQs */}
                          <div className="space-y-1.5">
                            <span className="text-gray-400 uppercase font-semibold text-[10px]">Frequently Asked Questions</span>
                            <div className="space-y-1">
                              {generatedFunnel.landing_page.faqs.map((f, i) => (
                                <div key={i} className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-0.5">
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
                            <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 text-[10px]">
                                  {em.type}
                                </Badge>
                                <button
                                  onClick={() => copyToClipboard(`${em.subject}\n\n${em.body}`, 'Email')}
                                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                              </div>
                              <h5 className="font-semibold text-white text-xs">{em.subject}</h5>
                              <p className="text-[11px] text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-black/30 p-2 rounded-lg">
                                {em.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewSection === 'outline' && (
                        <div className="space-y-3 text-xs">
                          <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-amber-400 font-semibold uppercase text-[10px]">1. The Hook</span>
                            <p className="text-gray-200 mt-1">{generatedFunnel.outline.hook}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-indigo-400 font-semibold uppercase text-[10px]">2. The Story</span>
                            <p className="text-gray-200 mt-1">{generatedFunnel.outline.story}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-purple-400 font-semibold uppercase text-[10px]">3. Core Framework</span>
                            <p className="text-gray-200 mt-1 whitespace-pre-line">{generatedFunnel.outline.core_content}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-emerald-400 font-semibold uppercase text-[10px]">4. Offer Pitch</span>
                            <p className="text-gray-200 mt-1">{generatedFunnel.outline.offer_pitch}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400 space-y-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Sparkles className="h-8 w-8 animate-pulse" />
                    </div>
                    <h4 className="text-base font-semibold text-white">Your Funnel Preview will appear here</h4>
                    <p className="text-xs text-gray-400 max-w-sm">
                      Enter your webinar details on the left and click <b>Generate</b> to see your landing page, 5 emails, and script outline ready for 1-click launch.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Mode 2: Chat Co-pilot */
            <div className="flex flex-col h-full bg-[#141624] border border-white/5 rounded-xl overflow-hidden">
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-[#1e2133] text-gray-200 rounded-tl-none border border-white/5 whitespace-pre-line'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3 items-center text-xs text-gray-400">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/50 text-white">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <span>AI Agent is typing...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-black/40 flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask your AI agent (e.g. 'Write a high-converting headline for my sales webinar')..."
                  className="bg-[#181a29] border-white/10 text-white text-xs flex-1"
                />
                <Button type="submit" disabled={isChatLoading || !inputMessage.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
