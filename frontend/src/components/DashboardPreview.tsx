'use client';

import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Target,
  DollarSign,
  Download,
  FileText,
  Image as ImageIcon,
  Code2,
  Presentation,
} from 'lucide-react';
import { slideRight, slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

const REVENUE_DATA = [
  { month: 'Jan', revenue: 18, registrations: 420 },
  { month: 'Feb', revenue: 24, registrations: 560 },
  { month: 'Mar', revenue: 31, registrations: 720 },
  { month: 'Apr', revenue: 42, registrations: 940 },
  { month: 'May', revenue: 58, registrations: 1280 },
  { month: 'Jun', revenue: 76, registrations: 1640 },
  { month: 'Jul', revenue: 98, registrations: 2120 },
];

const BAR_DATA = [
  { day: 'Mon', rate: 64 },
  { day: 'Tue', rate: 72 },
  { day: 'Wed', rate: 81 },
  { day: 'Thu', rate: 76 },
  { day: 'Fri', rate: 88 },
  { day: 'Sat', rate: 70 },
  { day: 'Sun', rate: 65 },
];

interface Stat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: typeof Users;
}

const STATS: Stat[] = [
  { label: 'Revenue', value: '$98.4k', delta: '+24.8%', up: true, icon: DollarSign },
  { label: 'Registrations', value: '12,480', delta: '+18.2%', up: true, icon: Users },
  { label: 'Attendance Rate', value: '76.4%', delta: '+5.1%', up: true, icon: CheckCircle2 },
  { label: 'Conversion Rate', value: '8.9%', delta: '-0.6%', up: false, icon: Target },
];

interface ExportFormat {
  label: string;
  icon: typeof FileText;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { label: 'PPTX', icon: Presentation },
  { label: 'PDF', icon: FileText },
  { label: 'HTML', icon: Code2 },
  { label: 'Images', icon: ImageIcon },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white shadow-xl">
      <p className="mb-1 font-medium text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[#B8B8B8]">
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPreview() {
  return (
    <section
      id="dashboard"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24"
    >
      {/* Heading */}
      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto max-w-2xl text-center"
      >
        <motion.span
          variants={slideUp}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#D6D6D6]"
        >
          Live Dashboard
        </motion.span>
        <motion.h2
          variants={slideUp}
          className="mt-5 text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl"
        >
          See your funnel <span className="text-gradient">perform in real time</span>
        </motion.h2>
        <motion.p variants={slideUp} className="mt-4 text-base text-[#B8B8B8] sm:text-lg">
          Registrations, attendance, conversion, and revenue — attributed back to
          every step of the funnel.
        </motion.p>
      </motion.div>

      {/* Dashboard panel — slides in from the right */}
      <motion.div
        variants={slideRight}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-14"
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#050505] p-4 shadow-2xl shadow-black sm:p-6 backdrop-blur-xl">
          {/* Window chrome */}
          <div className="mb-5 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-white/20" />
            <span className="h-3 w-3 rounded-full bg-white/20" />
            <span className="h-3 w-3 rounded-full bg-white/20" />
            <div className="ml-3 hidden flex-1 items-center gap-2 rounded-md border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-xs font-mono text-[#B8B8B8]/50 sm:flex">
              app.webinarflow.ai/dashboard
            </div>
          </div>

          {/* Stat cards */}
          <motion.div
            variants={staggerContainer(0.08, 0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {STATS.map((s) => (
              <motion.div
                key={s.label}
                variants={slideUp}
                className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <s.icon className="h-5 w-5 text-[#D6D6D6]" />
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      s.up ? 'text-[#D6D6D6]' : 'text-[#888888]'
                    }`}
                  >
                    {s.up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {s.delta}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-[#F5F5F5]">{s.value}</p>
                <p className="text-xs text-[#B8B8B8]/50">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Charts */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Revenue area chart */}
            <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-[#F5F5F5]">Revenue overview</p>
                <span className="text-xs text-[#B8B8B8]/50">Last 7 months</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REVENUE_DATA} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D6D6D6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#D6D6D6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#888888" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#888888" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#D6D6D6" strokeWidth={2} fill="url(#revGrad)" />
                    <Area type="monotone" dataKey="registrations" stroke="#888888" strokeWidth={1.5} fill="url(#regGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance bar chart */}
            <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-[#F5F5F5]">Attendance</p>
                <span className="text-xs text-[#B8B8B8]/50">This week</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BAR_DATA} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D6D6D6" />
                        <stop offset="100%" stopColor="#444444" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="rate" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Asset export row */}
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#141414] text-[#D6D6D6]">
                <Download className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-[#F5F5F5]">Export assets</p>
                <p className="text-xs text-[#B8B8B8]/50">Generated deck & funnel, ready to ship</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.label}
                  type="button"
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-[#B8B8B8] transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <fmt.icon className="h-3.5 w-3.5 text-[#B8B8B8]/60 transition-colors group-hover:text-white" />
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
