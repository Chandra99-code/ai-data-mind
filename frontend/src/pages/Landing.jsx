import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, LineChart, Zap, Brain, Database, ShieldCheck, PlayCircle, Check } from "lucide-react";

const features = [
  { icon: Brain, title: "Autonomous Data Scientist", desc: "An AI agent understands your dataset, surfaces insights, and recommends next steps — no prompting required." },
  { icon: LineChart, title: "Automatic EDA", desc: "Distributions, correlations, outliers, and category breakdowns generated the moment you upload." },
  { icon: Zap, title: "One-Click ML", desc: "Regression, classification, clustering, and forecasting with model metrics and feature importance." },
  { icon: Database, title: "Any Data Source", desc: "CSV, Excel, JSON, Parquet — drag, drop, and analyze at speed." },
  { icon: ShieldCheck, title: "Enterprise Ready", desc: "Workspace-scoped datasets, role-aware access, session security, and audit-friendly reporting." },
  { icon: Sparkles, title: "Executive Reports", desc: "Publish polished briefings with KPIs, charts, and AI-written narrative — export to PDF instantly." },
];

const plans = [
  { name: "Free", price: "$0", tag: "Get started", features: ["3 datasets", "Auto EDA", "Basic AI chat", "Community support"] },
  { name: "Pro", price: "$29", tag: "Most popular", accent: true, features: ["Unlimited datasets", "ML + forecasting", "Priority Claude access", "PDF reports", "Chat history"] },
  { name: "Business", price: "$99", tag: "For teams", features: ["Everything in Pro", "Workspaces & sharing", "Audit logs", "SSO", "Dedicated support"] },
];

const faqs = [
  { q: "Which models power DataMind AI?", a: "We route heavy analytical reasoning through Claude Sonnet 4.5 for insight quality, and combine it with in-house pandas/scikit-learn engines for statistics and ML." },
  { q: "Is my data secure?", a: "Datasets are workspace-scoped, encrypted in transit, and never used to train foundation models. You can delete uploads at any time." },
  { q: "What file formats are supported?", a: "CSV, Excel, JSON, and Parquet — up to 50MB in the current tier. Enterprise plans lift limits and add connectors." },
  { q: "Do I need to know SQL?", a: "No. Ask questions in natural language. DataMind translates them into statistics, charts, and where relevant, SQL." },
];

const testimonials = [
  { name: "Priya Ramaswamy", role: "Head of Analytics, Northwind", quote: "DataMind cut our weekly reporting cycle from three days to under an hour. The insights are stunningly specific." },
  { name: "Marcus Ito", role: "Product Lead, Vantage", quote: "It's the fastest path from raw CSV to executive summary I've ever used. Feels like hiring a senior data scientist." },
  { name: "Aïcha Diallo", role: "COO, Meridian Retail", quote: "Forecasting quality rivals what our data team ships — without waiting a week for a dashboard." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40">
        <div className="glass">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
              <span className="font-display font-bold tracking-tight text-lg">DataMind<span className="text-indigo-400">.ai</span></span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
              <a href="#features" className="hover:text-neutral-100 transition-colors" data-testid="nav-features">Features</a>
              <a href="#preview" className="hover:text-neutral-100 transition-colors" data-testid="nav-preview">Product</a>
              <a href="#pricing" className="hover:text-neutral-100 transition-colors" data-testid="nav-pricing">Pricing</a>
              <a href="#faq" className="hover:text-neutral-100 transition-colors" data-testid="nav-faq">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-neutral-300 hover:text-white transition-colors" data-testid="nav-login">Sign in</Link>
              <Link to="/signup" className="btn-primary" data-testid="nav-signup">Start free</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="brand-glow absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2" />
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "url(https://images.pexels.com/photos/17485657/pexels-photo-17485657.png)",
          backgroundSize: "cover", backgroundPosition: "center",
          maskImage: "radial-gradient(circle at 50% 30%, black 30%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 30%, black 30%, transparent 65%)",
        }}/>
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-mono text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
              powered by Claude Sonnet 4.5 · new insights every second
            </div>
            <h1 className="font-display font-bold tracking-tighter text-5xl sm:text-6xl lg:text-7xl leading-[0.95] mt-6 max-w-4xl">
              Your entire data team,<br/>
              <span className="text-neutral-500">condensed into an</span> <span style={{ color: "#c7d2fe" }}>agent</span>.
            </h1>
            <p className="mt-6 text-lg text-neutral-400 max-w-2xl leading-relaxed">
              Upload a spreadsheet. DataMind AI cleans it, explores it, models it, forecasts it,
              and writes the executive report — before your coffee gets cold.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2" data-testid="hero-get-started">
                Start analyzing — free <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <a href="#preview" className="btn-ghost inline-flex items-center gap-2" data-testid="hero-see-demo">
                <PlayCircle className="h-4 w-4" strokeWidth={1.5} /> See live product
              </a>
            </div>
            <div className="mt-16 grid grid-cols-3 md:grid-cols-6 gap-6 items-center opacity-60">
              {["Northwind", "Meridian", "Vantage", "Loop", "Helix", "Basalt"].map((n) => (
                <div key={n} className="font-display text-neutral-500 text-lg tracking-tighter">{n}.</div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section id="preview" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="label-eyebrow mb-4">01 — Live workspace</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl">A workspace that feels like the future of analytics.</h2>
        <div className="mt-10 card-surface p-2 md:p-3 shadow-[0_20px_80px_rgba(99,102,241,0.08)]">
          <div className="rounded-lg overflow-hidden border border-white/[0.06]">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#08090A] border-b border-white/[0.06]">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <div className="ml-3 text-xs font-mono text-neutral-500">datamind.ai / workspace</div>
            </div>
            <div className="grid grid-cols-12 min-h-[420px]">
              <div className="col-span-3 border-r border-white/[0.06] p-4 space-y-2 bg-[#0A0B0D]">
                {["Overview","Datasets","AI Chat","ML Studio","Reports"].map((s,i)=>(
                  <div key={s} className={`text-sm px-3 py-2 rounded-md ${i===0?"bg-white/[0.06] text-white":"text-neutral-500"}`}>{s}</div>
                ))}
              </div>
              <div className="col-span-9 p-6 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[{l:"Rows",v:"48,213"},{l:"Columns",v:"27"},{l:"AI insights",v:"14"}].map(k=>(
                    <div key={k.l} className="card-surface p-4">
                      <div className="label-eyebrow">{k.l}</div>
                      <div className="font-mono text-2xl mt-1">{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="card-surface p-4">
                  <div className="label-eyebrow mb-3">Revenue forecast — next 12 weeks</div>
                  <svg viewBox="0 0 400 100" className="w-full h-24">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5"/>
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,80 C40,60 80,70 120,50 C160,30 200,55 240,40 C280,25 320,45 360,20 L400,15 L400,100 L0,100 Z" fill="url(#g1)"/>
                    <path d="M0,80 C40,60 80,70 120,50 C160,30 200,55 240,40 C280,25 320,45 360,20 L400,15" stroke="#818CF8" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="label-eyebrow mb-4">02 — Capabilities</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-3xl">Everything a senior data scientist would do — automated, refined, on-demand.</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card-surface p-6">
              <f.icon className="h-6 w-6 text-indigo-400" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
        <div className="label-eyebrow mb-4">03 — Pricing</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight">Simple pricing. Serious upside.</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {plans.map(p => (
            <div key={p.name} className={`card-surface p-8 ${p.accent ? "ring-1 ring-indigo-500/40 bg-[#151619]" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-widest text-neutral-500">{p.tag}</div>
                {p.accent && <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300">Recommended</span>}
              </div>
              <h3 className="font-display text-2xl mt-3">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl tracking-tighter">{p.price}</span>
                <span className="text-neutral-500 text-sm">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" strokeWidth={2}/> {f}</li>
                ))}
              </ul>
              <Link to="/signup" className={`mt-8 inline-flex items-center gap-2 ${p.accent ? "btn-primary" : "btn-ghost"}`} data-testid={`pricing-${p.name.toLowerCase()}-cta`}>
                Get {p.name} <ArrowRight className="h-4 w-4" strokeWidth={2}/>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="label-eyebrow mb-4">04 — What teams say</div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="card-surface p-6">
              <p className="text-neutral-200 leading-relaxed">"{t.quote}"</p>
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-neutral-500">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <div className="label-eyebrow mb-4">05 — Questions</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight">Frequently asked.</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f,i)=>(
            <details key={i} className="card-surface p-6 group" data-testid={`faq-${i}`}>
              <summary className="cursor-pointer flex items-center justify-between list-none">
                <span className="font-display text-lg">{f.q}</span>
                <span className="text-neutral-500 group-open:rotate-45 transition-transform duration-200">+</span>
              </summary>
              <p className="mt-3 text-neutral-400 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} />
              <span className="font-display font-bold">DataMind.ai</span>
            </div>
            <p className="mt-4 text-sm text-neutral-500 max-w-xs">The AI data scientist for teams that move fast.</p>
          </div>
          <div>
            <div className="label-eyebrow mb-3">Product</div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
            </ul>
          </div>
          <div>
            <div className="label-eyebrow mb-3">Company</div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>About</li><li>Careers</li><li>Contact</li>
            </ul>
          </div>
          <div>
            <div className="label-eyebrow mb-3">Legal</div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>Privacy</li><li>Terms</li><li>Security</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span>© 2026 DataMind AI · All rights reserved.</span>
          <span>build/{new Date().toISOString().slice(0,10)}</span>
        </div>
      </footer>
    </div>
  );
}
