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

<<<<<<< ours
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
=======
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

const highlights = [
  {
    value: "5,200+",
    label: "Print & digital titles",
    description: "Continuously refreshed across every college and program.",
  },
  {
    value: "24/7",
    label: "Portal availability",
    description: "Search, reserve, and download even when the campus is closed.",
  },
  {
    value: "12",
    label: "Specialist zones",
    description: "Quiet study rooms, group pods, media labs, and innovation hubs.",
  },
  {
    value: "3",
    label: "Ways to borrow",
    description: "On-campus pickup, click-and-collect, and instant digital downloads.",
  },
];

const howItWorks = [
  {
    title: "Create your student account",
    description: "Register with your campus email and validated ID (03-0000-00000) to unlock borrowing and digital downloads.",
    action: { label: "Student Sign Up", to: "/student/signup" },
  },
  {
    title: "Explore the catalog",
    description: "Search by title, author, department tags, or availability. Save favourites and request holds in advance.",
    action: { label: "Open Catalog", to: "/student/catalog" },
  },
  {
    title: "Manage visits & loans",
    description: "Track requests, renew borrowed materials, and log campus visits directly from the portal dashboard.",
    action: { label: "Go to My Account", to: "/student/account" },
  },
];

const digitalHighlights = [
  {
    title: "Smart recommendations",
    description: "Receive suggestions based on your department, recent searches, and borrowing activity.",
  },
  {
    title: "Unified requests",
    description: "Place holds, renew items, and book consultations without juggling multiple forms.",
  },
  {
    title: "Visit planning",
    description: "Log entry schedules and notify the librarian team before you arrive on campus.",
  },
];

const testimonials = [
  {
    quote:
      "The student portal helps me reserve thesis materials before my shift ends. Everything is ready when I arrive the next morning.",
    name: "Elise M.",
    role: "Library student assistant, CAHS",
  },
  {
    quote:
      "Having the ebook collection on my phone means I can review cases anywhere. The filters make it easy to find what my class needs.",
    name: "Noah R.",
    role: "3rd year Criminology student",
  },
];

const supportChannels = [
  {
    icon: "💬",
    title: "Ask a Librarian",
    description: "Weekday live chat from 8:00 AM to 5:00 PM for research questions and borrowing concerns.",
    contact: "Messenger: @LibReportLibrary",
  },
  {
    icon: "📧",
    title: "Email & Tickets",
    description: "Send detailed requests or attach syllabi so our team can prepare resources before your visit.",
    contact: "library@libreport.edu",
  },
  {
    icon: "🏛️",
    title: "On-campus Help Desk",
    description: "Visit the circulation desk for ID validation, loan pickups, and technical assistance.",
    contact: "Ground Floor · Learning Resource Center",
>>>>>>> theirs
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
<<<<<<< ours
          <span className="rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/80">
=======
          <span className="btn-pill-sm bg-white/20 text-white/85">
>>>>>>> theirs
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
<<<<<<< ours
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
=======
            <Link to="/student/catalog" className="btn-student-primary btn-pill-sm">
              Explore Catalog
            </Link>
            <Link to="/student/signup" className="btn-student-inverse btn-pill-sm">
>>>>>>> theirs
              Create Student Account
            </Link>
          </div>
        </div>
      </section>

<<<<<<< ours
=======
      <section className="bg-white/90 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl font-semibold text-brand-green">{item.value}</div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="btn-pill-sm bg-brand-green-soft text-brand-green">Get started in minutes</span>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">Build your study routine in three steps</h2>
            <p className="mt-3 text-base text-slate-600">
              From creating your profile to checking out ebooks, the LibReport portal keeps every touchpoint in sync so you can
              focus on your coursework.
            </p>
            <div className="mt-8 space-y-4">
              {howItWorks.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-soft text-sm font-semibold text-brand-green">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600">{item.description}</p>
                      {item.action && (
                        <Link to={item.action.to} className="student-inline-link">
                          {item.action.label}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-lg">
            <div className="absolute -top-24 -right-20 h-52 w-52 rounded-full bg-brand-green-soft blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-brand-gold-soft blur-3xl" aria-hidden="true" />
            <div className="relative space-y-4">
              <span className="btn-pill-sm bg-white/60 text-brand-green shadow-sm">What you get</span>
              <h3 className="text-2xl font-semibold text-slate-900">A single dashboard for library life</h3>
              <p className="text-sm text-slate-600">
                Switch between catalog searches, visit requests, and downloads without juggling separate apps or forms.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {digitalHighlights.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200">
                    <span className="student-check-icon">✓</span>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/student/signin" className="btn-student-primary btn-pill-sm">
                  Sign In to Continue
                </Link>
                <Link to="/student/catalog" className="btn-student-outline btn-pill-sm">
                  Browse Titles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

>>>>>>> theirs
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
<<<<<<< ours
            <Link
              to="/student/signup"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-green px-5 py-2 text-white shadow-sm transition hover:bg-brand-greenDark"
            >
=======
            <Link to="/student/signup" className="mt-6 inline-flex justify-center btn-student-primary">
>>>>>>> theirs
              Sign up now
            </Link>
          </div>
        </div>
      </section>

<<<<<<< ours
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

=======
>>>>>>> theirs
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
<<<<<<< ours
              <Link
                to="/student/catalog"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-green hover:bg-brand-gold hover:text-white"
              >
=======
              <Link to="/student/catalog" className="btn-student-outline bg-white text-brand-green">
>>>>>>> theirs
                View Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>

<<<<<<< ours
=======
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold text-slate-900">Student Stories</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Hear how classmates use LibReport to balance campus life, coursework, and research.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {testimonials.map((item) => (
              <figure
                key={item.name}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-green">
                  <path
                    fill="currentColor"
                    d="M10 3H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1v4a1 1 0 0 0 1.64.77l3.08-2.57A4 4 0 0 0 12 12V5a2 2 0 0 0-2-2Zm11 0h-5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1v4a1 1 0 0 0 1.64.77l3.08-2.57A4 4 0 0 0 23 12V5a2 2 0 0 0-2-2Z"
                  />
                </svg>
                <blockquote className="mt-4 text-sm text-slate-700">“{item.quote}”</blockquote>
                <figcaption className="mt-3 text-sm font-semibold text-slate-900">{item.name}</figcaption>
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.role}</p>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="btn-pill-sm bg-brand-green-soft text-brand-green">Support that follows you</span>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">We’re here when you need library help</h2>
              <p className="mt-3 text-base text-slate-600">
                Reach out from campus or off-site. Librarians respond quickly whether you prefer chat, email, or in-person
                support.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {supportChannels.map((channel) => (
                  <div
                    key={channel.title}
                    className="flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="text-2xl" aria-hidden="true">{channel.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{channel.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{channel.description}</p>
                    </div>
                    <p className="mt-auto text-xs font-semibold uppercase tracking-wide text-brand-green">{channel.contact}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-brand-green to-brand-greenDark p-8 text-white shadow-xl">
              <h3 className="text-2xl font-semibold">Planning an on-campus visit?</h3>
              <p className="mt-3 text-sm text-white/80">
                Bring your validated student ID and confirm your schedule through the tracker so we can prepare the resources you
                need.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-white/85">
                <li className="flex items-start gap-3">
                  <span className="student-check-icon bg-white/20 text-white">✓</span>
                  Check in with the circulation desk when you arrive.
                </li>
                <li className="flex items-start gap-3">
                  <span className="student-check-icon bg-white/20 text-white">✓</span>
                  Download PDFs ahead of time for blended or remote sessions.
                </li>
                <li className="flex items-start gap-3">
                  <span className="student-check-icon bg-white/20 text-white">✓</span>
                  Request specialized materials at least two days before your visit.
                </li>
              </ul>
              <Link to="/student/catalog" className="btn-student-inverse mt-8 w-full justify-center">
                Plan Your Next Visit
              </Link>
            </div>
          </div>
        </div>
      </section>

>>>>>>> theirs
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-4 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Check our Library Catalog</h2>
          <p className="text-sm text-slate-600">
            Sign in with your LibReport student account to search for available titles, place holds, and download digital copies.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
<<<<<<< ours
            <Link
              to="/student/signin"
              className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-greenDark"
            >
=======
            <Link to="/student/signin" className="btn-student-primary">
>>>>>>> theirs
              Student Sign In
            </Link>
            <Link
              to="/student/signup"
<<<<<<< ours
              className="rounded-full border border-brand-green px-5 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
=======
              className="btn-student-outline"
>>>>>>> theirs
            >
              Create Account
            </Link>
          </div>
<<<<<<< ours
=======
          <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Need help getting started?</p>
              <p className="text-xs text-slate-500">Email the librarians at <a className="text-brand-green hover:underline" href="mailto:library@libreport.edu">library@libreport.edu</a> or visit the circulation desk.</p>
            </div>
            <Link to="/student/catalog" className="btn-student-primary btn-pill-sm">
              Browse Titles
            </Link>
          </div>
>>>>>>> theirs
        </div>
      </section>
    </div>
  );
};

export default StudentLanding;
