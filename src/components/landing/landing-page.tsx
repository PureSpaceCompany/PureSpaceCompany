"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star, Shield, Clock, Sparkles, ChevronRight,
  Check, Menu, X, Phone, Mail, MapPin, ArrowRight,
  Home, Building2, RefreshCw, CalendarCheck, KeyRound,
  Zap, BadgeCheck, HeartHandshake,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why Us", href: "#why-us" },
  { label: "Contact", href: "#contact" },
];

const SERVICES = [
  {
    icon: Home,
    badge: "Most Popular",
    title: "Vacation Rental Turnover",
    desc: "Fast, reliable turnovers between Airbnb, VRBO, and short-term rental guests. We work around your check-out / check-in windows so your listing is always guest-ready.",
    features: [
      "Scheduled around check-out/check-in",
      "Fresh linens & towels restocked",
      "Toiletries & supplies replenished",
      "Damage & inventory check",
      "Photo-ready presentation",
    ],
    highlight: true,
  },
  {
    icon: Building2,
    badge: null,
    title: "Commercial Cleaning",
    desc: "Professional cleaning for offices, retail spaces, and small businesses. We handle everything so your team walks into a pristine environment every morning.",
    features: [
      "Before or after business hours",
      "Custom recurring plans",
      "Fully insured & bonded crew",
      "Supply & consumable management",
      "Single point of contact",
    ],
    highlight: false,
  },
  {
    icon: RefreshCw,
    badge: null,
    title: "Deep Clean & Move-Out",
    desc: "A thorough top-to-bottom clean for property resets, tenant move-outs, or seasonal refreshes. We leave nothing behind.",
    features: [
      "Appliance interiors",
      "Cabinet & drawer interiors",
      "Baseboards, vents & blinds",
      "Window sills & tracks",
      "Grout & tile scrubbing",
    ],
    highlight: false,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: CalendarCheck,
    title: "Book Your Clean",
    desc: "Submit your property details and preferred schedule. We sync with your booking calendar so turnovers are automatic.",
  },
  {
    step: "02",
    icon: KeyRound,
    title: "We Handle Access",
    desc: "Our team arrives within your check-out / check-in window. No need to be on-site — we manage entry securely.",
  },
  {
    step: "03",
    icon: Zap,
    title: "Fast Turnaround",
    desc: "Linens swapped, supplies restocked, every room staged. We're done before your next guests arrive.",
  },
  {
    step: "04",
    icon: BadgeCheck,
    title: "Quality Confirmed",
    desc: "You get a completion notification with a checklist. Your guests walk in to a hotel-quality clean every time.",
  },
];

const WHY_US = [
  { icon: Shield, title: "Fully Insured & Bonded", desc: "Every job is covered. Your property is protected." },
  { icon: Clock, title: "Never Misses a Turnover", desc: "We track your calendar — not the other way around." },
  { icon: Star, title: "Hotel-Grade Standards", desc: "The same attention to detail your 5-star guests expect." },
  { icon: HeartHandshake, title: "Dedicated Team", desc: "Same cleaners, same standards, every visit." },
  { icon: Sparkles, title: "Eco-Friendly Products", desc: "Safe for families, pets, and repeat guests." },
  { icon: BadgeCheck, title: "Satisfaction Guaranteed", desc: "Not happy? We come back — no questions asked." },
];

const REVIEWS = [
  {
    name: "Amanda R.",
    role: "Airbnb Superhost · Austin",
    stars: 5,
    text: "StayShine has transformed my Airbnb operation. Turnovers are seamless, my listing stays at 4.95+ stars, and I never worry about gaps between guests.",
  },
  {
    name: "Carlos M.",
    role: "VRBO Host · 3 properties",
    stars: 5,
    text: "I manage three vacation rentals and StayShine handles all of them. They sync with my booking calendar and I literally don't have to think about it.",
  },
  {
    name: "Priya L.",
    role: "Office Manager · Austin",
    stars: 5,
    text: "Our office has never been this consistently clean. The team is professional, on time, and somehow always misses nothing.",
  },
];

interface Props {
  companyName: string;
  phone: string;
  email: string;
  dashboardHref: string | null;
}

export function LandingPage({ companyName, phone, email, dashboardHref }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
  }

  function scrollTo(href: string) {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  const displayPhone = phone || "(512) 000-0000";
  const displayEmail = email || `hello@stayshines.com`;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size="sm" variant={scrolled ? "dark" : "light"} />

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className={`text-sm font-medium transition-colors ${scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo("#contact")}
              className="ml-2 px-4 py-2 bg-[#C8A46A] hover:bg-[#b8923a] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              Get a Quote
            </button>
            <Link href={dashboardHref ?? "/login"}
              className={`text-sm font-medium transition-colors ${scrolled ? "text-gray-400 hover:text-gray-700" : "text-white/50 hover:text-white/80"}`}>
              {dashboardHref ? "Dashboard" : "Staff Login"}
            </Link>
          </nav>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-gray-700" : "text-white"}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1 shadow-lg">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo("#contact")} className="block w-full text-center mt-2 px-4 py-2.5 bg-[#C8A46A] text-white text-sm font-semibold rounded-xl hover:bg-[#b8923a] transition-colors">
              Get a Quote
            </button>
            <Link href={dashboardHref ?? "/login"} onClick={() => setMenuOpen(false)}
              className="block text-center mt-1 px-4 py-2 text-sm text-gray-400 hover:text-gray-600">
              {dashboardHref ? "Dashboard" : "Staff Login"}
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#163A70] to-[#0d2244]" />
        {/* Decorative blobs */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#C8A46A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating cards — decorative */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 w-56">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70 text-xs font-medium">Turnover Complete</span>
            </div>
            <p className="text-white text-sm font-semibold">Unit 4B · Rainey St.</p>
            <p className="text-white/50 text-xs mt-1">Ready for guests in 2h 15m</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 fill-[#C8A46A] text-[#C8A46A]" />)}
            </div>
            <p className="text-white/80 text-xs leading-relaxed">"Always spotless before our guests arrive."</p>
            <p className="text-white/40 text-xs mt-1.5 font-medium">— Airbnb Superhost</p>
          </div>
        </div>

        <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A46A]/20 border border-[#C8A46A]/40 rounded-full text-[#C8A46A] text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Trusted by Airbnb Superhosts & Local Businesses
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Five-Star Cleans,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8A46A] to-[#f0d090]">
              Every Turnover
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            {companyName} specializes in vacation rental turnovers and commercial cleaning in Austin, TX.
            We sync with your calendar so every guest walks into a hotel-quality clean.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollTo("#contact")}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#C8A46A] hover:bg-[#b8923a] text-white font-semibold rounded-2xl transition-all shadow-lg shadow-[#C8A46A]/30 hover:-translate-y-0.5">
              Get a Free Quote <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => scrollTo("#services")}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all">
              See Our Services <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Trust bar */}
          <div className="mt-16 flex flex-wrap justify-center gap-6 md:gap-10">
            {[
              { value: "Airbnb", label: "Turnover Specialists" },
              { value: "VRBO", label: "Trusted Partner" },
              { value: "Same-Day", label: "Availability" },
              { value: "100%", label: "Satisfaction Guarantee" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl md:text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 text-xs">
          <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          scroll
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F3] text-[#163A70] rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              What We Do
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Built for Short-Term Rentals</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From same-day Airbnb turnovers to commercial contracts — we keep your space guest-ready and business-ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {SERVICES.map((s) => (
              <div key={s.title}
                className={`group relative rounded-3xl p-8 border transition-all duration-300 ${
                  s.highlight
                    ? "bg-[#163A70] border-[#163A70] shadow-2xl shadow-[#163A70]/20 text-white"
                    : "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1"
                }`}>
                {s.badge && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#C8A46A] rounded-full text-xs font-semibold text-white mb-5">
                    <Sparkles className="w-3 h-3" /> {s.badge}
                  </div>
                )}
                {!s.badge && <div className="h-6 mb-1" />}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 ${s.highlight ? "bg-white/20" : "bg-[#163A70]"}`}>
                  <s.icon className={`w-6 h-6 ${s.highlight ? "text-white" : "text-white"}`} />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${s.highlight ? "text-white" : "text-gray-900"}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed mb-5 ${s.highlight ? "text-white/75" : "text-gray-500"}`}>{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${s.highlight ? "text-white/90" : "text-gray-600"}`}>
                      <Check className={`w-4 h-4 shrink-0 ${s.highlight ? "text-[#C8A46A]" : "text-[#163A70]"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollTo("#contact")}
                  className={`mt-7 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    s.highlight
                      ? "bg-[#C8A46A] hover:bg-[#b8923a] text-white"
                      : "border border-[#163A70] text-[#163A70] hover:bg-[#163A70] hover:text-white"
                  }`}>
                  Get a Quote
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F3] text-[#163A70] rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              Simple Process
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Hands-Off Turnovers</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Set it up once. We handle everything — from scheduling to quality checks.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#C8A46A]/40 to-transparent" />

            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="relative inline-flex">
                  <div className="w-20 h-20 mx-auto bg-[#FAF8F3] rounded-2xl flex items-center justify-center mb-5 border border-[#C8A46A]/20">
                    <step.icon className="w-9 h-9 text-[#163A70]" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#C8A46A] rounded-full text-white text-xs font-black flex items-center justify-center shadow-sm">
                    {step.step.replace("0", "")}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA strip */}
          <div className="mt-16 bg-gradient-to-r from-[#163A70] to-[#0d2244] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-extrabold text-white mb-1">Ready to automate your turnovers?</h3>
              <p className="text-white/60 text-sm">Join hosts and businesses that never stress about cleaning again.</p>
            </div>
            <button onClick={() => scrollTo("#contact")}
              className="shrink-0 px-7 py-3.5 bg-[#C8A46A] hover:bg-[#b8923a] text-white font-semibold rounded-2xl transition-all shadow-lg shadow-[#C8A46A]/30 hover:-translate-y-0.5 flex items-center gap-2">
              Start Today <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="why-us" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F3] text-[#163A70] rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              Why Choose Us
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Your Guests Deserve the Best</h2>
            <p className="text-gray-500 max-w-xl mx-auto">We don't just clean — we protect your ratings, your reviews, and your revenue.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_US.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="w-11 h-11 bg-[#FAF8F3] rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-[#163A70]" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Hosts & Businesses Love Us</h2>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-sm font-semibold text-gray-700">4.9 average</span>
              <span className="ml-1 text-sm text-gray-400">· 100+ reviews</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-gray-50 rounded-3xl p-7 border border-gray-100 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 leading-relaxed mb-5 italic flex-1">"{r.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#163A70] to-[#C8A46A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F3] text-[#163A70] rounded-full text-xs font-semibold uppercase tracking-wide mb-6">
                Get in Touch
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
                Let's Keep Your<br />
                <span className="text-[#163A70]">Property Spotless</span>
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed">
                Tell us about your property or business and we'll put together a custom plan. Most quotes come back within a few hours.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  { icon: Phone, label: "Call or Text", value: displayPhone },
                  { icon: Mail, label: "Email", value: displayEmail },
                  { icon: MapPin, label: "Service Area", value: "Austin, TX & surrounding areas" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#FAF8F3] rounded-xl flex items-center justify-center shrink-0">
                      <c.icon className="w-5 h-5 text-[#163A70]" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium">{c.label}</div>
                      <div className="text-gray-800 font-medium">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini trust badges */}
              <div className="flex flex-wrap gap-3">
                {["Airbnb Turnover Experts", "Same-Day Available", "Insured & Bonded"].map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#163A70]" /> {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 text-sm">Thanks for reaching out. We'll reply with a custom quote within a few hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-[#163A70] text-sm font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Jane Smith"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A70]/20 focus:border-[#C8A46A] transition" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="(512) 000-0000"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A70]/20 focus:border-[#C8A46A] transition" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A70]/20 focus:border-[#C8A46A] transition" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Service Needed</label>
                    <select value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A70]/20 focus:border-[#C8A46A] transition bg-white text-gray-700">
                      <option value="">Select a service…</option>
                      <option value="airbnb-turnover">Airbnb / VRBO Turnover</option>
                      <option value="commercial">Commercial Cleaning</option>
                      <option value="deep-clean">Deep Clean / Move-Out</option>
                      <option value="other">Other / Not Sure</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tell Us About Your Property</label>
                    <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="e.g. 2-bed Airbnb, need turnovers Mon–Fri between 11am–3pm..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A70]/20 focus:border-[#C8A46A] resize-none transition" />
                  </div>
                  <button type="submit"
                    className="w-full py-3 bg-[#163A70] hover:bg-[#0f2a54] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#163A70]/20 hover:shadow-[#163A70]/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    Request a Free Quote <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-400 text-center">We'll respond within a few hours. No spam, ever.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d1f3c] text-gray-400 py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
            <div>
              <Logo size="sm" variant="light" />
              <p className="text-sm text-white/40 mt-3 max-w-xs leading-relaxed">
                Professional vacation rental turnovers and commercial cleaning in Austin, TX.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-10">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Navigation</p>
                <nav className="flex flex-col gap-2">
                  {NAV_LINKS.map((l) => (
                    <button key={l.href} onClick={() => scrollTo(l.href)}
                      className="text-sm text-gray-400 hover:text-white transition-colors text-left">{l.label}</button>
                  ))}
                </nav>
              </div>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Contact</p>
                <div className="flex flex-col gap-2 text-sm">
                  <span>{displayPhone}</span>
                  <span>{displayEmail}</span>
                  <span>Austin, TX</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            <Link href={dashboardHref ?? "/login"} className="text-gray-500 hover:text-gray-300 transition-colors">
              {dashboardHref ? "Dashboard" : "Staff Login"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
