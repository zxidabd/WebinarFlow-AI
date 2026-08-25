'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  User,
  Brain,
  Workflow,
  Presentation,
  Mail,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { slideUp, slideRight, staggerContainer, viewportOnce, EASE_OUT } from '@/lib/motion';

interface Agent {
  name: string;
  role: string;
  icon: LucideIcon;
}

const AGENTS: Agent[] = [
  {
    name: 'You',
    role: 'Describe your goal in one sentence',
    icon: User,
  },
  {
    name: 'Planner Agent',
    role: 'Builds the funnel blueprint & timeline',
    icon: Brain,
  },
  {
    name: 'Funnel Agent',
    role: 'Generates pages, offers & upsells',
    icon: Workflow,
  },
  {
    name: 'Slide Agent',
    role: 'Turns the script into a slide deck',
    icon: Presentation,
  },
  {
    name: 'Email Agent',
    role: 'Writes nurture & follow-up sequences',
    icon: Mail,
  },
  {
    name: 'CRM Agent',
    role: 'Syncs registrants & deals to pipeline',
    icon: Users,
  },
  {
    name: 'Analytics Agent',
    role: 'Tracks attribution & reports live',
    icon: BarChart3,
  },
];

function Node({
  agent,
  index,
  activeIndex,
}: {
  agent: Agent;
  index: number;
  activeIndex: number;
}) {
  const { name, role, icon: Icon } = agent;
  const isActive = activeIndex === index;
  const isYou = name === 'You';

  return (
    <motion.div
      variants={slideRight}
      className="relative flex items-center gap-4"
    >
      {/* Node card */}
      <motion.div
        animate={{
          scale: isActive ? 1.02 : 1,
          boxShadow: isActive
            ? '0 0 35px -5px rgba(255,255,255,0.1)'
            : '0 0 0px rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className={`relative flex w-full items-center gap-4 rounded-xl border bg-[#0A0A0A] p-3.5 shadow-md transition-all duration-300 ${
          isActive ? 'border-white/30 bg-[#121212]' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isYou
              ? 'border-white/20 bg-white text-black'
              : isActive
              ? 'border-white/30 bg-white/10 text-white'
              : 'border-white/10 bg-[#141414] text-[#D6D6D6]'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#F5F5F5]">{name}</p>
          <p className="truncate text-xs text-[#B8B8B8]/60">{role}</p>
        </div>
        {/* Step index */}
        <div className="flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-2 text-[11px] font-mono text-[#B8B8B8]/70">
          {String(index).padStart(2, '0')}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Connector({ index, activeIndex }: { index: number; activeIndex: number }) {
  if (index === 0) return null;
  const isLit = activeIndex >= index;
  return (
    <div className="relative ml-[1.25rem] h-6 w-px overflow-hidden bg-white/10">
      {/* The glowing pulse traveling down the connector */}
      <motion.div
        className="absolute inset-x-0 h-6 w-px bg-gradient-to-b from-white via-white/80 to-transparent"
        initial={{ y: '-100%' }}
        animate={{ y: isLit ? '100%' : '-100%' }}
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
          repeat: isLit ? Infinity : 0,
          repeatDelay: 1.0,
        }}
      />
    </div>
  );
}

export default function AgentWorkflow() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, amount: 0.3 });

  return (
    <section
      id="agents"
      ref={sectionRef}
      className="relative scroll-mt-24 overflow-hidden py-24"
    >
      {/* Background ambience */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-white/[0.02] blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-2">
        {/* Left: copy */}
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.span
            variants={slideUp}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#D6D6D6]"
          >
            AI Agents
          </motion.span>
          <motion.h2
            variants={slideUp}
            className="mt-5 text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl"
          >
            One prompt. An entire <span className="text-gradient">AI team</span> goes to work.
          </motion.h2>
          <motion.p
            variants={slideUp}
            className="mt-4 max-w-lg text-base text-[#B8B8B8] sm:text-lg"
          >
            A coordinated crew of specialist agents plans, builds, writes, syncs,
            and measures your funnel — handing off to each other automatically.
          </motion.p>

          {/* Inline stats */}
          <motion.div variants={slideUp} className="mt-8 flex flex-wrap gap-8">
            {[
              { label: 'Agents in a run', value: '7' },
              { label: 'Avg. setup time', value: '< 5 min' },
              { label: 'Manual steps', value: '0' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-semibold text-gradient">{s.value}</p>
                <p className="text-xs text-[#B8B8B8]/50">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: animated workflow pipeline */}
        <AgentPipeline inView={inView} />
      </div>
    </section>
  );
}

/** Self-contained pipeline with its own active-step ticker. */
function AgentPipeline({ inView }: { inView: boolean }) {
  const [activeIndex, setActive] = useState(0);
  const count = AGENTS.length;

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => {
      setActive((i) => (i + 1) % count);
    }, 1400);
    return () => clearInterval(interval);
  }, [inView, count]);

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="relative"
    >
      {/* Outer panel */}
      <div className="rounded-3xl border border-white/10 bg-[#050505] p-5 shadow-2xl shadow-black/80 sm:p-7 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-wider text-[#B8B8B8]/60">Agent Workflow</p>
          <div className="flex items-center gap-2 text-xs text-[#B8B8B8]/60">
            <span className="flex h-2 w-2 rounded-full bg-[#D6D6D6] shadow-[0_0_8px] shadow-[#D6D6D6]/60" />
            live
          </div>
        </div>

        <div className="relative">
          {AGENTS.map((agent, i) => (
            <div key={agent.name}>
              <Node agent={agent} index={i} activeIndex={activeIndex} />
              <Connector index={i} activeIndex={activeIndex} />
            </div>
          ))}
        </div>

        {/* Output row */}
        <motion.div
          variants={slideUp}
          className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium text-[#D6D6D6]"
        >
          <span className="text-white">✓</span>
          Funnel generated, sequences live, CRM synced
        </motion.div>
      </div>
    </motion.div>
  );
}
