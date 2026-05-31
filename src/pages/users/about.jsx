import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  Eye,
  FileText,
  Shield,
  Smartphone,
  Target,
} from "lucide-react";
import AppShell from "../../components/common/AppShell";
import "./about.css";

const features = [
  {
    icon: <Clock size={28} />,
    title: "Attendance Tracking",
    description: "Record daily time-in and time-out entries quickly and accurately.",
  },
  {
    icon: <Calendar size={28} />,
    title: "Attendance History",
    description: "Access and review attendance records and work-hour logs anytime.",
  },
  {
    icon: <FileText size={28} />,
    title: "Leave Management",
    description: "Submit, monitor, and manage leave requests with ease.",
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Reports & Analytics",
    description: "Generate attendance reports and gain valuable workforce insights.",
  },
  {
    icon: <Shield size={28} />,
    title: "Secure Access",
    description: "Protect employee data with secure authentication and access controls.",
  },
  {
    icon: <Smartphone size={28} />,
    title: "Responsive Design",
    description: "Use OnePunchIn seamlessly on desktop, tablet, and mobile devices.",
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

export default function About() {
  return (
    <AppShell>
      <div className="page page-stack about-page">
        <section className="hero-panel glass-card about-hero">
          <div>
            <span className="eyebrow">Smart Attendance Management</span>
            <h1 className="page-title">OnePunchIn</h1>
            <p className="page-subtitle">
              A modern Daily Time Record system designed to simplify attendance
              tracking, work-hour monitoring, leave management, and workforce
              productivity.
            </p>
          </div>
        </section>

        <section className="about-split">
          <article className="about-card glass-card">
            <Target className="about-card-icon mission" size={38} />
            <h2>Our Mission</h2>
            <p>
              To provide organizations with a reliable, secure, and user-friendly
              attendance management platform that streamlines daily operations
              and improves workforce accountability.
            </p>
          </article>

          <article className="about-card glass-card">
            <Eye className="about-card-icon vision" size={38} />
            <h2>Our Vision</h2>
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
                <div className="feature-icon">{feature.icon}</div>
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
