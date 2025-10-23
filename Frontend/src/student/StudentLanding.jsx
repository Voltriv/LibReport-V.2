import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const sections = [
  {
    title: "General Collection",
    description: "Core academic titles, theses, and local authors organized for quick browsing across disciplines.",
  },
  {
    title: "Reference & Research",
    description: "Encyclopedias, indexes, and research guides curated by librarians to support in-depth study.",
  },
  {
    title: "Periodicals Lounge",
    description: "A quiet corner stocked with current journals, magazines, and newspapers for daily discovery.",
  },
  {
    title: "Media & Innovation Hub",
    description: "Multimedia resources, viewing stations, and collaborative tables for presentations and creative work.",
  },
];

const services = [
  {
    title: "Reference Assistance",
    details: "Connect with librarians for research consultations, resource recommendations, and citation help.",
  },
  {
    title: "Circulation & Borrowing",
    details: "Borrow print and digital materials, manage holds, and renew items directly from your student account.",
  },
  {
    title: "Orientation & Workshops",
    details: "Join guided tours and skills workshops that introduce collections, databases, and research strategies.",
  },
  {
    title: "Online Request Center",
    details: "Submit recommendations, book study tables, and request scanned chapters through our digital request forms.",
  },
];

const resources = [
  {
    title: "Open Access Books",
    blurb: "Browse curated open textbooks and monographs available for unlimited use.",
  },
  {
    title: "Open Access Journals",
    blurb: "Discover peer-reviewed journals and conference proceedings across major academic fields.",
  },
  {
    title: "Open Educational Repositories",
    blurb: "Search institutional repositories and OER directories for multimedia study aids.",
  },
];

const ebooks = [
  {
    title: "LibReport E-Library",
    blurb: "Search the growing catalogue of locally digitized books, theses, and institutional publications.",
  },
  {
    title: "Partner Platforms",
    blurb: "Access licensed collections through our partner universities and national library subscriptions.",
  },
  {
    title: "Download & Read Anywhere",
    blurb: "Borrow PDFs for limited-time offline use and sync highlights across your devices.",
  },
];

const StudentLanding = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const target = location.state?.scrollTo;
    if (!target) return undefined;
    const timeout = window.setTimeout(() => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
    navigate(location.pathname, { replace: true, state: {} });
    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="bg-slate-50 text-slate-900">
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1535905748047-14b2415c97bd?auto=format&fit=crop&w=1600&q=80"
            alt="Library interior"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/70" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center text-white lg:py-32">
          <span className="rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/80">
            Welcome to the LibReport Student Portal
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Discover resources, services, and spaces that power your learning.
          </h1>
          <p className="max-w-2xl text-base text-white/90 sm:text-lg">
            Explore the library, access digital collections, and manage your visits in one connected experience designed for
            students of every program.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/student/catalog"
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-brand-greenDark"
            >
              Explore Catalog
            </Link>
            <Link
              to="/student/signup"
              className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white hover:text-brand-green"
            >
              Create Student Account
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-5xl space-y-6 px-4 py-16 lg:px-0">
        <h2 className="text-center text-3xl font-semibold text-slate-900">About the Library</h2>
        <p className="text-center text-base text-slate-600">
          The LibReport Student Portal mirrors the on-campus library experience with dedicated spaces for quiet study, collaborative
          projects, and research support. Our librarians curate both physical and digital collections so you can reach essential
          titles anytime, anywhere.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold text-slate-900">Library Objectives</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Foster a culture of independent, critical, and creative thinking.</li>
              <li>• Sustain a welcoming space for collaborative and individual learning.</li>
              <li>• Preserve and showcase institutional knowledge and publications.</li>
              <li>• Support faculty and students with timely research assistance.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-semibold text-slate-900">Library Service Hours</h3>
            <p className="mt-2 text-sm text-slate-600">
              Monday to Friday · 7:30 AM – 6:00 PM
              <br />
              Saturday · 8:00 AM – 5:30 PM
              <br />
              Sunday & Holidays · Closed
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Visit the <Link to="/student/catalog" className="text-brand-green hover:underline">online catalog</Link> or book a
              research consultation to make the most of your time in the library.
            </p>
          </div>
        </div>
      </section>

      <section id="sections" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold text-slate-900">Library Sections</h2>
          <p className="mt-2 text-center text-base text-slate-600">
            Each section is designed to meet a specific study need—from curated reference materials to multimedia creation hubs.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl bg-slate-50 p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{section.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Library Services</h2>
            <p className="mt-3 text-base text-slate-600">
              Our team is ready to support your learning journey—from first-year orientation to capstone completion. Connect with us
              on-site or online to get the most out of our services.
            </p>
            <div className="mt-6 grid gap-4">
              {services.map((service) => (
                <div key={service.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{service.details}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600 shadow-inner">
            <h3 className="text-lg font-semibold text-slate-900">Ready to plan your visit?</h3>
            <p className="mt-3">
              Log visits through the LibReport tracker to save time at the lobby, or request a remote consultation with a subject
              specialist. Your student account connects all services seamlessly.
            </p>
            <Link
              to="/student/signup"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-green px-5 py-2 text-white shadow-sm transition hover:bg-brand-greenDark"
            >
              Sign up now
            </Link>
          </div>
        </div>
      </section>

      <section id="resources" className="bg-slate-900 py-16 text-slate-100">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold">Electronic Resources</h2>
          <p className="mt-3 text-center text-base text-slate-300">
            Access scholarly content anytime through the library's trusted digital gateways.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {resources.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-800/70 p-6 shadow-lg ring-1 ring-slate-700">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.blurb}</p>
                <a
                  href="#resources"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-brand-gold hover:text-white"
                >
                  View directories →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ebooks" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Ebook Collection</h2>
            <p className="mt-3 text-base text-slate-600">
              Downloadable ebooks complement our print holdings, giving you the flexibility to study whenever—and wherever—you need
              to. Titles are organized by program with smart recommendations based on your reading history.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {ebooks.map((item) => (
                <li key={item.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green to-brand-greenDark p-8 text-white shadow-xl">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1491841651911-c44c30c34548?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center opacity-40" />
            <div className="relative space-y-4">
              <h3 className="text-2xl font-semibold">Ready to browse ebooks?</h3>
              <p className="text-sm text-white/90">
                Sign in with your student account to unlock personalized recommendations, saved searches, and offline access.
              </p>
              <Link
                to="/student/catalog"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-green hover:bg-brand-gold hover:text-white"
              >
                View Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-4 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Check our Library Catalog</h2>
          <p className="text-sm text-slate-600">
            Sign in with your LibReport student account to search for available titles, place holds, and download digital copies.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/student/signin"
              className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-greenDark"
            >
              Student Sign In
            </Link>
            <Link
              to="/student/signup"
              className="rounded-full border border-brand-green px-5 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentLanding;
