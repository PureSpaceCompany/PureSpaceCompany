"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  SprayCan, Star, Shield, Clock, Sparkles, ChevronRight,
  Check, Menu, X, Phone, Mail, MapPin, ArrowRight,
  Home, Building2, Sofa,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-us" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const SERVICES = [
  {
    icon: Home,
    title: "Residential Cleaning",
    desc: "Complete home cleaning tailored to your schedule and preferences. From kitchens to bathrooms, we cover every corner.",
    features: ["Deep clean & maintenance", "Eco-friendly products", "Flexible scheduling"],
  },
  {
    icon: Building2,
    title: "Commercial Cleaning",
    desc: "Professional office and commercial space cleaning to keep your workplace spotless and your team productive.",
    features: ["After-hours availability", "Custom cleaning plans", "Insured & bonded team"],
  },
  {
    icon: Sofa,
    title: "Move In / Move Out",
    desc: "Thorough top-to-bottom cleaning for move-ins and move-outs. Leave your old place spotless or start fresh.",
    features: ["Appliance deep clean", "Cabinet interiors", "Window cleaning"],
  },
];

const STATS = [
  { value: "500+", label: "Happy Clients" },
  { value: "4.9★", label: "Average Rating" },
  { value: "5 yrs", label: "In Business" },
  { value: "100%", label: "Satisfaction" },
];

const PRICING = [
  {
    name: "Standard",
    price: "$120",
    period: "per visit",
    desc: "Perfect for regular home maintenance",
    features: ["Up to 2,000 sq ft", "All main rooms", "Bathrooms & kitchen", "Vacuuming & mopping", "Surface wipe-down"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Deep Clean",
    price: "$220",
    period: "per visit",
    desc: "Thorough cleaning for a fresh start",
    features: ["Up to 3,000 sq ft", "Everything in Standard", "Inside appliances", "Baseboards & vents", "Cabinet interiors", "Window sills"],
    cta: "Most Popular",
    highlight: true,
  },
  {
    name: "Commercial",
    price: "Custom",
    period: "quote",
    desc: "Tailored for offices & businesses",
    features: ["Any size space", "Flexible hours", "Recurring contracts", "Dedicated team", "Supply management"],
    cta: "Contact Us",
    highlight: false,
  },
];

const REVIEWS = [
  { name: "Sarah M.", stars: 5, text: "Absolutely incredible service. My home has never looked this clean. They pay attention to every single detail." },
  { name: "James T.", stars: 5, text: "We've been using them for our office for over a year. Reliable, professional, and always on time." },
  { name: "Maria L.", stars: 5, text: "Booked the move-out clean and got my full deposit back. Worth every penny!" },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-xl">
              <SprayCan className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold text-lg tracking-tight ${scrolled ? "text-gray-900" : "text-white"}`}>CleanPro</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className={`text-sm font-medium transition-colors ${scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
            <Link href="/login"
              className="ml-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Staff Login
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-gray-700" : "text-white"}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1 shadow-lg">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                {l.label}
              </button>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className="block text-center mt-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Staff Login
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900" />
        {/* Decorative blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Professional Cleaning Services
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            A Cleaner Space,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              A Better Life
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            We deliver spotless results for homes and businesses. Reliable, eco-friendly, and always on time — so you can focus on what matters.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollTo("#contact")}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5">
              Get a Free Quote <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => scrollTo("#services")}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all">
              Our Services <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 text-xs">
          <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          scroll
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              What We Offer
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Our Services</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From weekly maintenance to one-time deep cleans, we have a service that fits your needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {SERVICES.map((s) => (
              <div key={s.title}
                className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-blue-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="why-us" className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-6">
                Why Choose Us
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                We Clean Like It's <span className="text-blue-600">Our Own Home</span>
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Every member of our team is background-checked, trained, and passionate about delivering results. We use eco-friendly products that are safe for your family and pets.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, title: "Fully Insured & Bonded", desc: "Every job is covered. You're protected." },
                  { icon: Clock, title: "Always On Time", desc: "We respect your schedule — guaranteed." },
                  { icon: Star, title: "Satisfaction Guaranteed", desc: "Not happy? We'll come back for free." },
                  { icon: Sparkles, title: "Eco-Friendly Products", desc: "Safe for kids, pets, and the planet." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual card stack */}
            <div className="relative h-80 md:h-auto">
              <div className="relative mx-auto w-full max-w-sm">
                {/* Background card */}
                <div className="absolute inset-0 bg-blue-600 rounded-3xl rotate-3 opacity-20" />
                {/* Main card */}
                <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200">
                  <div className="text-5xl font-black mb-2">4.9</div>
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map((i) => <Star key={i} className="w-5 h-5 fill-white text-white" />)}
                  </div>
                  <div className="text-white/80 text-sm mb-6">Based on 300+ verified reviews</div>
                  <div className="space-y-3">
                    {REVIEWS.slice(0,2).map((r) => (
                      <div key={r.name} className="bg-white/15 rounded-2xl p-3">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 fill-white text-white" />)}
                        </div>
                        <p className="text-xs text-white/90 leading-relaxed line-clamp-2">"{r.text}"</p>
                        <p className="text-xs text-white/60 mt-1 font-medium">— {r.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Simple, Clear Rates</h2>
            <p className="text-gray-500 max-w-xl mx-auto">No hidden fees, no surprises. Pick the plan that works for you.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {PRICING.map((p) => (
              <div key={p.name}
                className={`rounded-3xl p-8 border transition-all duration-300 ${
                  p.highlight
                    ? "bg-blue-600 border-blue-600 shadow-2xl shadow-blue-200 scale-105 text-white"
                    : "bg-white border-gray-100 shadow-sm hover:shadow-lg"
                }`}>
                {p.highlight && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold text-white mb-4">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.name}</h3>
                <p className={`text-sm mb-5 ${p.highlight ? "text-blue-100" : "text-gray-500"}`}>{p.desc}</p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-gray-900"}`}>{p.price}</span>
                  <span className={`text-sm ml-1 ${p.highlight ? "text-blue-200" : "text-gray-400"}`}>/ {p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? "text-blue-100" : "text-gray-600"}`}>
                      <Check className={`w-4 h-4 shrink-0 ${p.highlight ? "text-white" : "text-blue-600"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollTo("#contact")}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    p.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">What Our Clients Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-gray-50 rounded-3xl p-7 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-700 leading-relaxed mb-5 italic">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
                    {r.name[0]}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{r.name}</span>
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-6">
                Get in Touch
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
                Ready for a <span className="text-blue-600">Spotless Space?</span>
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed">
                Fill out the form and we'll get back to you within 24 hours with a free, no-obligation quote.
              </p>

              <div className="space-y-5">
                {[
                  { icon: Phone, label: "Phone", value: "(512) 000-0000" },
                  { icon: Mail, label: "Email", value: "hello@cleanpro.com" },
                  { icon: MapPin, label: "Service Area", value: "Austin, TX & surrounding areas" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <c.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-medium">{c.label}</div>
                      <div className="text-gray-800 font-medium">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact form */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 text-sm">Thank you for reaching out. We'll be in touch within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-blue-600 text-sm font-medium hover:underline">
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
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="(512) 000-0000"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Message</label>
                    <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us about your space and what you need..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none transition" />
                  </div>
                  <button type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    Send Message <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-400 text-center">We'll respond within 24 hours. No spam, ever.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <SprayCan className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">CleanPro</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              {NAV_LINKS.map((l) => (
                <button key={l.href} onClick={() => scrollTo(l.href)}
                  className="hover:text-white transition-colors">{l.label}</button>
              ))}
              <Link href="/login" className="hover:text-white transition-colors">Staff Login</Link>
            </nav>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} CleanPro Services. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
