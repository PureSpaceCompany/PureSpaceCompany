"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star, Shield, Clock, Sparkles, Check, Menu, X,
  Phone, Mail, MapPin, ArrowRight, ChevronRight,
  Home, Building2, Package, Wrench, KeyRound, Heart,
  BadgeCheck, Leaf,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { label: "Services",    href: "#services" },
  { label: "How It Works",href: "#how-it-works" },
  { label: "About Us",    href: "#about" },
  { label: "Contact",     href: "#contact" },
];

const SERVICES = [
  {
    icon: Home,
    title: "Residential Cleaning",
    desc: "We bring care and attention to every corner of your home — from deep cleans to regular maintenance visits. Come home to a space that truly feels like yours.",
    features: ["Regular & deep cleaning", "Kitchen & bathroom detail", "Bedroom & living areas", "Floors, baseboards & windows", "Customized to your home"],
    highlight: true,
    badge: "Most Requested",
  },
  {
    icon: Building2,
    title: "Office & Commercial",
    desc: "A clean, organized workspace lifts your team's mood and impresses every client who walks through the door. We work around your schedule.",
    features: ["Before or after business hours", "Recurring plans available", "Fully insured & bonded", "Supply management", "Single point of contact"],
    highlight: false,
    badge: null,
  },
  {
    icon: Package,
    title: "Move-In / Move-Out",
    desc: "Starting fresh or leaving on good terms — our thorough move cleans cover every surface so you hand over the keys with confidence.",
    features: ["Appliance interiors", "Cabinet & drawer interiors", "Baseboards, vents & blinds", "Window sills & tracks", "Grout & tile scrubbing"],
    highlight: false,
    badge: null,
  },
  {
    icon: KeyRound,
    title: "Vacation Rental Turnover",
    desc: "We sync with your booking calendar and handle every turnover — so your guests always walk into a hotel-quality clean without you lifting a finger.",
    features: ["Scheduled around check-in/out", "Linen & towel restocking", "Supplies replenished", "Damage & inventory check", "Photo-ready staging"],
    highlight: false,
    badge: null,
  },
  {
    icon: Wrench,
    title: "Handyman & Maintenance",
    desc: "Small repairs, light maintenance, and those to-do items that keep piling up. We take care of your space inside and out.",
    features: ["Minor repairs & fixes", "Light assembly", "Fixture replacements", "Seasonal maintenance", "Property walk-through"],
    highlight: false,
    badge: null,
  },
  {
    icon: Sparkles,
    title: "Organization & Staging",
    desc: "We declutter, organize, and stage your home to look its best — whether for everyday living, a special occasion, or putting it on the market.",
    features: ["Closet & room organization", "Decluttering sessions", "Pre-sale staging", "Seasonal refreshes", "Storage solutions"],
    highlight: false,
    badge: null,
  },
];

const WHY_US = [
  { icon: Heart,      title: "Care in Every Detail",      desc: "We treat your home as if it were our own — with respect, attention, and genuine pride in our work." },
  { icon: Shield,     title: "Trusted & Insured",          desc: "Every team member is vetted, insured, and bonded. Your property is always protected." },
  { icon: BadgeCheck, title: "Satisfaction Guaranteed",    desc: "Not satisfied? We come back and make it right — no questions asked." },
  { icon: Clock,      title: "Reliable Every Time",        desc: "We show up on time, every time. Dependability isn't a bonus — it's our baseline." },
  { icon: Leaf,       title: "Eco-Friendly Products",      desc: "Safe for your family, your pets, and the environment. We use green-certified products." },
  { icon: Sparkles,   title: "Versatile Services",         desc: "From homes to offices to rentals — one company, one trusted team, complete care." },
];

const REVIEWS = [
  {
    name: "Amanda R.",
    role: "Homeowner · Austin",
    stars: 5,
    text: "Pure Space transformed our home. They're thorough, careful with our things, and the house smells amazing after every visit. I finally feel at peace when I walk through the door.",
    avatar: "A",
  },
  {
    name: "Carlos M.",
    role: "Property Manager · 3 rentals",
    stars: 5,
    text: "I manage three vacation rentals and Pure Space handles all the turnovers. They sync with my calendar and I never worry about guest-ready condition. Incredible team.",
    avatar: "C",
  },
  {
    name: "Priya L.",
    role: "Office Manager · Downtown Austin",
    stars: 5,
    text: "Our office has never been this clean. They come in after hours, leave no trace, and the team is always professional. Highly recommend for any business.",
    avatar: "P",
  },
];

const PHOTOS = {
  hero:     "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=80&auto=format&fit=crop",
  living:   "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80&auto=format&fit=crop",
  kitchen:  "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80&auto=format&fit=crop",
  bedroom:  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80&auto=format&fit=crop",
  team:     "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&auto=format&fit=crop",
};

interface Props {
  companyName: string;
  phone: string;
  email: string;
  dashboardHref: string | null;
}

export function LandingPage({ companyName, phone, email, dashboardHref }: Props) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [form, setForm]           = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  }

  const displayPhone = phone || "(512) 000-0000";
  const displayEmail = email || "contact@purespacecompany.com";

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900 font-sans">

      {/* ── NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white/96 backdrop-blur-sm shadow-sm border-b border-warm-100" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-5 h-18 flex items-center justify-between py-4">
          <Logo size="sm" variant={scrolled ? "dark" : "light"} />

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  scrolled ? "text-warm-600 hover:text-brand-navy" : "text-white/80 hover:text-white"
                }`}>
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo("#contact")}
              className="px-5 py-2.5 bg-brand-gold hover:bg-[#389966] text-white text-sm font-semibold rounded-full transition-all shadow-md shadow-brand-gold/30 hover:-translate-y-0.5">
              Get a Free Quote
            </button>
            <Link href={dashboardHref ?? "/login"}
              className={`text-xs font-medium transition-colors ${
                scrolled ? "text-warm-400 hover:text-warm-600" : "text-white/40 hover:text-white/70"
              }`}>
              {dashboardHref ? "Dashboard" : "Staff Login"}
            </Link>
          </nav>

          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? "text-warm-700" : "text-white"}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-warm-100 px-5 py-5 space-y-1 shadow-xl">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-warm-700 hover:bg-warm-50 hover:text-brand-navy rounded-xl transition-colors">
                {l.label}
              </button>
            ))}
            <div className="pt-2">
              <button onClick={() => scrollTo("#contact")}
                className="block w-full text-center px-4 py-3 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-[#122d1f] transition-colors">
                Get a Free Quote
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <Image
            src={PHOTOS.hero}
            alt="Beautiful clean living room"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/85 via-brand-navy/60 to-brand-navy/20" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-24 pb-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full text-white/90 text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              Residential & Commercial Cleaning · Austin, TX
            </div>

            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Creating Pure Spaces<br />
              <span className="text-brand-gold italic">for Better Living</span>
            </h1>

            <p className="text-lg md:text-xl text-white/75 leading-relaxed mb-10 max-w-xl">
              We transform homes, offices, and properties into clean, organized, and welcoming spaces — with the care, trust, and attention to detail your space deserves.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => scrollTo("#contact")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-gold hover:bg-[#389966] text-white font-semibold rounded-full transition-all shadow-xl shadow-brand-gold/30 hover:-translate-y-0.5 text-base">
                Book a Free Quote <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => scrollTo("#services")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/25 backdrop-blur-sm transition-all text-base">
                Our Services <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-14 flex flex-wrap gap-5">
              {[
                { icon: Shield, label: "Insured & Bonded" },
                { icon: Leaf,   label: "Eco-Friendly" },
                { icon: Heart,  label: "Satisfaction Guaranteed" },
                { icon: BadgeCheck, label: "Trusted Team" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-white/70 text-sm">
                  <Icon className="w-4 h-4 text-brand-gold" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs">
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
          scroll
        </div>
      </section>

      {/* ── PHOTO STRIP ── */}
      <section className="py-16 px-5 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-warm-400 text-xs uppercase tracking-widest font-semibold mb-8">
            Every space, cared for
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { src: PHOTOS.living,  alt: "Clean bright living room",  label: "Living Spaces" },
              { src: PHOTOS.kitchen, alt: "Spotless modern kitchen",    label: "Kitchens" },
              { src: PHOTOS.bedroom, alt: "Freshly made bedroom",       label: "Bedrooms" },
            ].map((p) => (
              <div key={p.label} className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
                <Image src={p.src} alt={p.alt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width:768px) 50vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 to-transparent" />
                <p className="absolute bottom-4 left-4 text-white font-serif font-semibold text-lg">{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-5 bg-warm-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-gold text-xs uppercase tracking-widest font-semibold mb-3">What We Do</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-warm-900 mb-4">
              Complete Care for Your Space
            </h2>
            <p className="text-warm-500 max-w-xl mx-auto text-lg leading-relaxed">
              From everyday home cleaning to full property management — we offer everything you need to keep your space clean, organized, and welcoming.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title}
                className={`group relative rounded-3xl p-7 border transition-all duration-300 hover:-translate-y-1 ${
                  s.highlight
                    ? "bg-brand-navy border-brand-navy shadow-2xl shadow-brand-navy/25 text-white"
                    : "bg-white border-warm-100 shadow-sm hover:shadow-xl hover:border-warm-200"
                }`}>
                {s.badge && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-gold rounded-full text-xs font-bold text-white mb-4">
                    <Sparkles className="w-3 h-3" /> {s.badge}
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 ${
                  s.highlight ? "bg-white/15" : "bg-brand-cream"
                }`}>
                  <s.icon className={`w-6 h-6 ${s.highlight ? "text-brand-gold" : "text-brand-navy"}`} />
                </div>
                <h3 className={`font-serif text-xl font-bold mb-3 ${s.highlight ? "text-white" : "text-warm-900"}`}>
                  {s.title}
                </h3>
                <p className={`text-sm leading-relaxed mb-5 ${s.highlight ? "text-white/70" : "text-warm-500"}`}>
                  {s.desc}
                </p>
                <ul className="space-y-2 mb-6">
                  {s.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${s.highlight ? "text-white/85" : "text-warm-600"}`}>
                      <Check className={`w-4 h-4 shrink-0 ${s.highlight ? "text-brand-gold" : "text-brand-gold"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollTo("#contact")}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    s.highlight
                      ? "bg-brand-gold hover:bg-[#389966] text-white"
                      : "border border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white"
                  }`}>
                  Request This Service
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl">
              <Image src={PHOTOS.team} alt="Our cleaning team at work" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4">
                <p className="font-serif font-bold text-brand-navy text-lg leading-tight">
                  "Transforming spaces with care, trust & responsibility."
                </p>
                <p className="text-warm-500 text-xs mt-1">— Our Mission</p>
              </div>
            </div>

            {/* Steps */}
            <div>
              <p className="text-brand-gold text-xs uppercase tracking-widest font-semibold mb-3">Simple Process</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-warm-900 mb-4">
                How It Works
              </h2>
              <p className="text-warm-500 text-lg leading-relaxed mb-10">
                Getting a cleaner, more organized space has never been easier. We handle every detail so you can focus on what matters most.
              </p>

              <div className="space-y-8">
                {[
                  { step: "01", title: "Tell Us About Your Space", desc: "Share your property details, preferred schedule, and the services you need. We'll tailor a plan just for you." },
                  { step: "02", title: "We Show Up — You Relax",   desc: "Our trusted team arrives on time, equipped, and ready. No need to be home — we manage everything securely." },
                  { step: "03", title: "Enjoy a Pure Space",        desc: "We leave your home or office spotless, organized, and ready to welcome whoever walks through the door next." },
                  { step: "04", title: "We Check In With You",      desc: "Your satisfaction is our standard. We follow up after every service and come back if anything isn't perfect." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-5">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-navy font-serif font-bold text-lg border border-brand-gold/20">
                      {s.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-warm-900 mb-1">{s.title}</h3>
                      <p className="text-warm-500 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => scrollTo("#contact")}
                className="mt-10 inline-flex items-center gap-2 px-7 py-3.5 bg-brand-navy hover:bg-[#122d1f] text-white font-semibold rounded-full transition-all shadow-lg hover:-translate-y-0.5">
                Get Started Today <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT / MISSION ── */}
      <section id="about" className="py-24 px-5 bg-warm-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-brand-gold text-xs uppercase tracking-widest font-semibold mb-3">Who We Are</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-warm-900 mb-6 leading-tight">
                More Than Just a Cleaning Company
              </h2>
              <p className="text-warm-600 text-lg leading-relaxed mb-6">
                At Pure Space Company, our mission is to transform environments into clean, organized, functional, and welcoming spaces — offering professional services with care, trust, responsibility, and attention to detail.
              </p>
              <p className="text-warm-500 text-base leading-relaxed mb-8">
                We envision becoming a company recognized for excellence, trust, and versatility — continuously expanding our services and offering complete solutions for residences, businesses, and properties of all kinds.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "100%", label: "Satisfaction Guarantee" },
                  { value: "5★",   label: "Average Rating" },
                  { value: "Same-Day", label: "Availability" },
                  { value: "Insured", label: "& Fully Bonded" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 border border-warm-100 shadow-sm text-center">
                    <div className="font-serif text-2xl font-bold text-brand-navy">{s.value}</div>
                    <div className="text-xs text-warm-400 mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why us grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WHY_US.map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-5 border border-warm-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-brand-cream rounded-xl flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-brand-navy" />
                  </div>
                  <h4 className="font-semibold text-warm-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-warm-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="py-24 px-5 bg-brand-navy overflow-hidden relative">
        {/* Decorative blur */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-brand-gold text-xs uppercase tracking-widest font-semibold mb-3">Testimonials</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
              What Our Clients Say
            </h2>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-5 h-5 fill-brand-gold text-brand-gold" />)}
              <span className="ml-2 text-sm font-semibold text-white/80">4.9 average</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-white/8 backdrop-blur-sm border border-white/12 rounded-3xl p-7 flex flex-col hover:bg-white/12 transition-colors">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />)}
                </div>
                <p className="text-white/80 leading-relaxed mb-6 flex-1 italic text-sm">"{r.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-[#389966] flex items-center justify-center text-white font-bold font-serif text-base shrink-0">
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{r.name}</div>
                    <div className="text-white/40 text-xs">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 px-5 bg-warm-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left */}
            <div>
              <p className="text-brand-gold text-xs uppercase tracking-widest font-semibold mb-3">Get in Touch</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-warm-900 mb-5 leading-tight">
                Let's Create Your<br />
                <span className="text-brand-navy">Pure Space</span>
              </h2>
              <p className="text-warm-500 mb-10 leading-relaxed text-lg">
                Tell us about your home or business and we'll put together a custom plan. Most quotes come back within a few hours — no obligation.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  { icon: Phone,  label: "Call or Text",  value: displayPhone },
                  { icon: Mail,   label: "Email",         value: displayEmail },
                  { icon: MapPin, label: "Service Area",  value: "Austin, TX & surrounding areas" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-brand-cream rounded-xl flex items-center justify-center shrink-0 border border-brand-gold/20">
                      <c.icon className="w-5 h-5 text-brand-navy" />
                    </div>
                    <div>
                      <div className="text-xs text-warm-400 font-medium">{c.label}</div>
                      <div className="text-warm-800 font-medium">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-brand-navy rounded-2xl p-6 text-white">
                <p className="font-serif text-lg font-bold mb-2">Our Promise to You</p>
                <p className="text-white/65 text-sm leading-relaxed">
                  Every service we provide is delivered with care, responsibility, and a genuine commitment to making your space better. If you're not satisfied, we come back — no questions asked.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-warm-100">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-gold/30">
                    <Check className="w-8 h-8 text-brand-gold" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-warm-900 mb-2">Message Sent!</h3>
                  <p className="text-warm-400 text-sm leading-relaxed">Thank you for reaching out. We'll reply with a custom quote within a few hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-brand-navy text-sm font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-serif text-xl font-bold text-warm-900 mb-1">Request a Free Quote</h3>
                  <p className="text-warm-400 text-sm mb-5">We'll get back to you within a few hours.</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-warm-700">Full Name</label>
                      <input required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Jane Smith"
                        className="w-full px-4 py-3 text-sm border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy bg-warm-50 transition placeholder:text-warm-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-warm-700">Phone</label>
                      <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="(512) 000-0000"
                        className="w-full px-4 py-3 text-sm border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy bg-warm-50 transition placeholder:text-warm-300" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-warm-700">Email</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 text-sm border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy bg-warm-50 transition placeholder:text-warm-300" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-warm-700">Service Needed</label>
                    <select value={form.service} onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))}
                      className="w-full px-4 py-3 text-sm border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy bg-warm-50 transition text-warm-700">
                      <option value="">Select a service…</option>
                      <option value="residential">Residential Cleaning</option>
                      <option value="commercial">Office & Commercial Cleaning</option>
                      <option value="move">Move-In / Move-Out Clean</option>
                      <option value="vacation">Vacation Rental Turnover</option>
                      <option value="handyman">Handyman & Maintenance</option>
                      <option value="organization">Organization & Staging</option>
                      <option value="other">Other / Not Sure</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-warm-700">Tell Us About Your Space</label>
                    <textarea required rows={4} value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="e.g. 3-bedroom home, need regular cleaning twice a month..."
                      className="w-full px-4 py-3 text-sm border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/15 focus:border-brand-navy bg-warm-50 transition resize-none placeholder:text-warm-300" />
                  </div>

                  <button type="submit"
                    className="w-full py-3.5 bg-brand-navy hover:bg-[#122d1f] text-white font-semibold rounded-xl transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    Send My Request <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-warm-300 text-center">No spam, ever. We'll respond within a few hours.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-warm-900 text-warm-400 py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <Logo size="sm" variant="light" />
              <p className="font-serif text-white/80 text-base mt-2 italic">
                Creating Pure Spaces for Better Living
              </p>
              <p className="text-sm text-warm-500 mt-3 leading-relaxed">
                Professional cleaning, organization, and property care for homes, offices, and rentals in Austin, TX.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-10">
              <div>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Services</p>
                <nav className="flex flex-col gap-2 text-sm">
                  {["Residential Cleaning", "Office Cleaning", "Move-In / Move-Out", "Vacation Rentals", "Handyman", "Organization"].map((s) => (
                    <button key={s} onClick={() => scrollTo("#services")} className="text-left text-warm-400 hover:text-white transition-colors">{s}</button>
                  ))}
                </nav>
              </div>
              <div>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Contact</p>
                <div className="flex flex-col gap-3 text-sm">
                  <span className="text-warm-400">{displayPhone}</span>
                  <span className="text-warm-400">{displayEmail}</span>
                  <span className="text-warm-400">Austin, TX</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-warm-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-warm-500">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            <Link href={dashboardHref ?? "/login"} className="text-warm-600 hover:text-warm-300 transition-colors">
              {dashboardHref ? "Dashboard" : "Staff Login"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
