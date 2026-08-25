import Link from 'next/link';
import { Zap, Facebook, Twitter, Linkedin } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* LEFT PANEL */}
      <div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between bg-[#2d3561] p-10 overflow-hidden">
        {/* Background Tech Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative Triangles Left */}
        <div className="absolute top-20 left-10 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-[#4a6cf7] opacity-60 rotate-45"></div>
        <div className="absolute top-1/3 right-20 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#4a6cf7] opacity-40 -rotate-12"></div>
        <div className="absolute bottom-1/4 left-1/4 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-[#4a6cf7] opacity-50 rotate-90"></div>

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4a6cf7]">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">WebinarFlow AI</span>
          </Link>
        </div>

        {/* Middle: Headline */}
        <div className="relative z-10 max-w-md">
          <h1 className="mb-4 text-4xl font-bold text-white leading-tight">
            Automate Your Webinar Funnels
          </h1>
          <p className="mb-8 text-gray-400 text-lg">
            Create, manage, and scale your automated webinars with the power of AI. Streamline your entire funnel today.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-white"></div>
            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
          </div>
        </div>

        {/* Bottom: Footer & Socials */}
        <div className="relative z-10">
          <div className="mb-6 flex gap-4">
            <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <Facebook className="h-5 w-5 text-white" />
            </Link>
            <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <Twitter className="h-5 w-5 text-white" />
            </Link>
            <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <Linkedin className="h-5 w-5 text-white" />
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="#" className="hover:text-white">Privacy Policy</Link>
            <span>·</span>
            <Link href="#" className="hover:text-white">Contact</Link>
            <span>·</span>
            <span>© 2025 WebinarFlow AI</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative flex w-full lg:w-[58%] flex-col overflow-y-auto bg-white">
        {/* Decorative Triangles Right */}
        <div className="pointer-events-none absolute top-10 right-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-[#4a6cf7] opacity-20 rotate-12"></div>
        <div className="pointer-events-none absolute bottom-20 -right-5 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[32px] border-b-[#4a6cf7] opacity-20 -rotate-45"></div>
        
        {/* Mobile Header (Shows only on small screens) */}
        <div className="flex items-center p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4a6cf7]">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#2d3561]">WebinarFlow AI</span>
          </Link>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12 animate-in fade-in duration-700">
          <div className="w-full max-w-[420px]">
            {/* Title & Subtitle inside right panel */}
            <div className="mb-8">
              <h2 className="text-3xl font-semibold italic text-[#4a6cf7]">{title}</h2>
              {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
            </div>

            {children}
            
            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
