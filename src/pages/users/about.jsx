import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  ClipboardCheck,
  Database,
  Gauge,
  Eye,
  FileText,
  Fingerprint,
  LockKeyhole,
  LogIn,
  LogOut,
  Shield,
  Smartphone,
  Target,
  Timer,
  Users,
} from "lucide-react";
import AppShell from "../../components/common/AppShell";
import "./about.css";

const features = [
  {
    icon: <Clock size={28} />,
    title: "Attendance Tracking",
    description: "Record daily time-in and time-out entries quickly and accurately.",
    tone: "cyan",
  },
  {
    icon: <Calendar size={28} />,
    title: "Attendance History",
    description: "Access and review attendance records and work-hour logs anytime.",
    tone: "green",
  },
  {
    icon: <FileText size={28} />,
    title: "Leave Management",
    description: "Submit, monitor, and manage leave requests with ease.",
    tone: "amber",
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Reports & Analytics",
    description: "Generate attendance reports and gain valuable workforce insights.",
    tone: "rose",
  },
  {
    icon: <Shield size={28} />,
    title: "Secure Access",
    description: "Protect employee data with secure authentication and access controls.",
    tone: "violet",
  },
  {
    icon: <Smartphone size={28} />,
    title: "Responsive Design",
    description: "Use OnePunchIn seamlessly on desktop, tablet, and mobile devices.",
    tone: "blue",
  },
];

const reasons = [
  "Fast and reliable attendance recording",
  "Easy-to-use interface",
  "Accurate work-hour tracking",
  "Centralized attendance management",
  "Secure employee data protection",
  "Scalable for organizations of all sizes",
];

const workflow = [
  { icon: <LogIn size={22} />, label: "Time In" },
  { icon: <Timer size={22} />, label: "Break" },
  { icon: <LogOut size={22} />, label: "Time Out" },
  { icon: <ClipboardCheck size={22} />, label: "Review" },
];

const heroStats = [
  { icon: <Gauge size={18} />, value: "4-step", label: "daily flow" },
  { icon: <Users size={18} />, value: "Team", label: "visibility" },
  { icon: <LockKeyhole size={18} />, value: "Secure", label: "access" },
];

const overviewItems = [
  {
    icon: <Fingerprint size={24} />,
    title: "Punch Capture",
    detail: "Employees record check-ins, breaks, and check-outs through one focused workflow.",
  },
  {
    icon: <Database size={24} />,
    title: "Record Sync",
    detail: "Attendance entries, logs, leave requests, and profile data stay organized in one source.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Admin Review",
    detail: "Managers can review trends, late minutes, leave status, and workforce activity faster.",
  },
];

export default function About() {
  return (
    <AppShell>
      <div className="page page-stack about-page">
        <section className="hero-panel glass-card about-hero">
          <div className="about-hero-copy">
            <span className="eyebrow">Smart Attendance Management</span>
            <h1 className="page-title">OnePunchIn</h1>
            <p className="page-subtitle">
              A modern Daily Time Record system designed to simplify attendance
              tracking, work-hour monitoring, leave management, and workforce
              productivity.
            </p>

            <div className="about-hero-stats">
              {heroStats.map((stat) => (
                <div className="hero-stat" key={stat.label}>
                  {stat.icon}
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-hero-visual" aria-hidden="true">
            <div className="dtr-device">
              <div className="device-status">
                <span></span>
                <span></span>
              </div>
              <div className="device-clock">
                <Clock size={34} />
                <span>Ready</span>
              </div>
              <div className="fingerprint-ring">
                <Fingerprint size={34} />
              </div>
            </div>
          </div>
        </section>

        <section className="about-workflow" aria-label="Daily attendance workflow">
          {workflow.map((item) => (
            <div className="workflow-step" key={item.label}>
              <div className="workflow-icon">{item.icon}</div>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="about-overview">
          <div className="overview-copy">
            <span className="eyebrow">Built For Daily Operations</span>
            <h2>From punch-in to payroll-ready records</h2>
            <p>
              OnePunchIn keeps the common DTR workflow easy for employees while
              giving administrators a reliable view of attendance, leave, and
              activity patterns.
            </p>
          </div>

          <div className="overview-list">
            {overviewItems.map((item) => (
              <article className="overview-item" key={item.title}>
                <div className="overview-icon">{item.icon}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-split">
          <article className="about-card glass-card">
            <div className="about-card-heading">
              <Target className="about-card-icon mission" size={34} />
              <h2>Our Mission</h2>
            </div>
            <p>
              To provide organizations with a reliable, secure, and user-friendly
              attendance management platform that streamlines daily operations
              and improves workforce accountability.
            </p>
          </article>

          <article className="about-card glass-card">
            <div className="about-card-heading">
              <Eye className="about-card-icon vision" size={34} />
              <h2>Our Vision</h2>
            </div>
            <p>
              To become a trusted digital attendance solution that empowers
              organizations to enhance productivity and workforce efficiency
              through innovative technology.
            </p>
          </article>
        </section>

        <section className="about-section">
          <header className="section-heading">
            <h2>Key Features</h2>
            <p>Everything you need to manage attendance efficiently.</p>
          </header>

          <div className="about-feature-grid">
            {features.map((feature) => (
              <article className="about-feature-card glass-card" key={feature.title}>
                <div className={`feature-icon ${feature.tone}`}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-choice glass-card">
          <h2>Why Choose OnePunchIn?</h2>

          <div className="about-choice-grid">
            {reasons.map((item) => (
              <div className="about-choice-item" key={item}>
                <Check size={18} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
