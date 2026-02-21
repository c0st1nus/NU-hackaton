"use client";

import Link from "next/link";
import { useI18n } from "../dictionaries/i18n";
import { LanguageSwitcher } from "./components/language-switcher";
import { 
  Zap, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight,
  ChevronRight,
  Activity,
  BarChart3,
  Users
} from "lucide-react";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="bg-(--bg) min-h-screen text-(--text-primary) selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-(--bg)/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Zap size={18} className="text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight">FIRE</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/login" className="text-sm text-gray-400 hover:text-(--text-primary) transition-colors">{t.auth.signIn}</Link>
            <div className="w-px h-4 bg-white/10" />
            <LanguageSwitcher />
          </div>

          <Link 
            href="/register" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            {t.landing.startNow}
            <ChevronRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-900/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in">
            <Activity size={14} />
            Next Gen Routing Engine
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-b from-white to-gray-400">
            {t.landing.heroTitle}
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.landing.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {t.landing.startNow}
              <ArrowRight size={18} />
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {t.auth.signIn}
            </Link>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="max-w-5xl mx-auto px-4 mt-20 md:mt-32">
          <div className="relative p-px rounded-2xl bg-linear-to-b from-white/10 to-transparent shadow-2xl overflow-hidden group">
            <div className="aspect-video bg-(--bg-card) rounded-[calc(16px-1px)] overflow-hidden flex flex-col">
               {/* Mock Dashboard Top */}
               <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                   <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                 </div>
                 <div className="ml-4 h-5 w-32 bg-white/5 rounded" />
               </div>
               {/* Mock Content */}
               <div className="flex-1 flex p-4 gap-4">
                 <div className="w-48 bg-white/5 rounded-lg flex flex-col p-3 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-3 w-${Math.floor(Math.random()*12)+8} bg-white/5 rounded`} />
                    ))}
                 </div>
                 <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-blue-600/5 border border-blue-600/20 rounded-lg p-6 flex flex-col justify-end gap-3 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4">
                         <BarChart3 className="text-blue-500/50" size={48} />
                       </div>
                       <div className="h-2 w-1/3 bg-blue-500/40 rounded" />
                       <div className="h-8 w-1/2 bg-white rounded" />
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 flex flex-col gap-4">
                       <div className="w-10 h-10 rounded-full bg-white/10" />
                       <div className="h-3 w-full bg-white/10 rounded" />
                       <div className="h-3 w-4/5 bg-white/10 rounded" />
                    </div>
                    <div className="col-span-3 h-32 bg-white/5 rounded-lg p-4 flex items-center justify-between">
                       <div className="flex gap-3">
                         <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500"><Users size={24} /></div>
                         <div className="flex flex-col justify-center gap-2">
                           <div className="h-3 w-24 bg-white/10 rounded" />
                           <div className="h-2 w-16 bg-white/5 rounded" />
                         </div>
                       </div>
                       <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                         <div className="w-2/3 h-full bg-blue-500" />
                       </div>
                    </div>
                 </div>
               </div>
            </div>
            {/* Overlay glow */}
            <div className="absolute inset-0 bg-linear-to-t from-(--bg) via-transparent to-transparent z-20 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">{t.landing.featuresTitle}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white/2 border border-white/5 hover:bg-white/4 transition-all group">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold mb-4">{t.landing.feature1Title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.landing.feature1Desc}</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/2 border border-white/5 hover:bg-white/4 transition-all group">
              <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold mb-4">{t.landing.feature2Title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.landing.feature2Desc}</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white/2 border border-white/5 hover:bg-white/4 transition-all group">
              <div className="w-14 h-14 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold mb-4">{t.landing.feature3Title}</h3>
              <p className="text-gray-400 leading-relaxed">{t.landing.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 FIRE Intelligent Routing Engine. Hackathon Pro Edition.</p>
        </div>
      </footer>
    </div>
  );
}
