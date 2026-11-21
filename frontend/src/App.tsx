import { useEffect, useMemo, useState, createContext, useContext } from "react";
import type { ReactNode, FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
  MapPin,
  Wallet,
  Bookmark,
  Eye,
  Pencil,
  Trash2,
  Ban,
  CircleCheck,
  CircleX,
  ChartNoAxesCombined,
  Mail,
  Phone,
  CalendarDays,
  ExternalLink,
  Send,
  ListFilter,
  RefreshCw,
  UserRound,
  PanelLeftClose,
  ClipboardList,
  Globe,
  Bot,
  Upload,
} from "lucide-react";
import {
  authService,
  applicationService,
  jobService,
  reviewService,
  store,
  userService,
} from "./services/store";
import type { Application, Job, Role, User } from "./types";
import { api, tokenStore } from "./services/api";
import ChatPage from "./pages/ChatPage";
import CVBuilderPage from "./pages/CVBuilderPage";
import { cvParserService } from "./services/cvParser";
import { chatApi } from "./services/chat";

const AuthContext = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
}>({ user: null, setUser: () => {} });
const ToastContext = createContext<
  (message: string, type?: "success" | "error" | "info") => void
>(() => {});
const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const roleLabel = (r: Role) =>
  r === "STUDENT"
    ? "Sinh viên"
    : r === "EMPLOYER"
      ? "Nhà tuyển dụng"
      : "Quản trị viên";
const statusClass = (s: string) =>
  s === "ACCEPTED" || s === "APPROVED" || s === "ACTIVE" || s === "OPEN"
    ? "status-green"
    : s === "REJECTED" || s === "INACTIVE" || s === "BLOCKED" || s === "CLOSED"
      ? "status-red"
      : s === "PENDING"
        ? "status-amber"
        : "status-blue";


// Việc đã lưu được lưu riêng theo tài khoản trên trình duyệt; không thay đổi API hiện tại.
const savedKey = (userId: string) => `studentjob:saved:${userId}`;
function readSaved(userId: string): string[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(savedKey(userId)) || "[]"); return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : []; }
  catch { return []; }
}
function toggleSaved(userId: string, jobId: string): boolean {
  const current = readSaved(userId);
  const next = current.includes(jobId) ? current.filter(id => id !== jobId) : [...current, jobId];
  localStorage.setItem(savedKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event("sj:saved-updated"));
  return next.includes(jobId);
}
const jobTypeVi = (type: string) => ({PART_TIME: "Bán thời gian", FULL_TIME: "Toàn thời gian", FREELANCE: "Làm tự do", INTERNSHIP: "Thực tập"} as Record<string,string>)[type] || type;

function App() {
  const [user, setUser] = useState<User | null>(() => store.session());

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [dark, setDark] = useState(false);
  const [, setDataVersion] = useState(0);

  // Theo dõi thay đổi dữ liệu và phiên đăng nhập
  useEffect(() => {
    const refresh = () => setDataVersion((v) => v + 1);

    window.addEventListener("sj:data-updated", refresh);

    const expired = () => {
      store.setSession(null);
      setUser(null);
    };

    window.addEventListener("sj:auth-expired", expired);

    jobService.load().catch(() => {});

    return () => {
      window.removeEventListener("sj:data-updated", refresh);
      window.removeEventListener("sj:auth-expired", expired);
    };
  }, []);

  // Khôi phục tài khoản từ backend
  useEffect(() => {
    if (!tokenStore.get()) return;

    api.auth
      .me()
      .then(({ user: apiUser }) => {
        const restored = {
          id: String(apiUser.id),
          name: apiUser.email.split("@")[0],
          email: apiUser.email,
          role: apiUser.role,
          status: "ACTIVE" as const,
          joinedAt: new Date().toISOString().slice(0, 10),
        };

        setUser(restored);

        if (apiUser.role === "STUDENT") {
          applicationService.loadMine().catch(console.error);
        }

        if (apiUser.role === "EMPLOYER" || apiUser.role === "ADMIN") {
          jobService.load().catch(console.error);
        }
      })
      .catch(() => {
        tokenStore.clear();
        store.setSession(null);
        setUser(null);
      });
  }, []);

  // Tự động ẩn thông báo
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => {
        setToast(null);
      }, 3200);

      return () => window.clearTimeout(timer);
    }
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <ToastContext.Provider
        value={(message, type = "success") => setToast({ message, type })}
      >
        <div className={dark ? "app-shell dark" : "app-shell"}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route
              path="/student/*"
              element={
                <Protected role="STUDENT">
                  <StudentRoutes />
                </Protected>
              }
            />

            <Route
              path="/employer/*"
              element={
                <Protected role="EMPLOYER">
                  <EmployerRoutes />
                </Protected>
              }
            />

            <Route
              path="/admin/*"
              element={
                <Protected role="ADMIN">
                  <AdminRoutes />
                </Protected>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>

          {toast && (
            <div role="status" className={`toast ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : toast.type === "error" ? (
                  <CircleX size={18} />
                ) : (
                  <Bell size={18} />
                )}
              </span>

              {toast.message}

              <button
                aria-label="Đóng thông báo"
                onClick={() => setToast(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

function useToast() {
  return useContext(ToastContext);
}
function Protected({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useContext(AuthContext);
  const loc = useLocation();
  if (!user)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
function PublicNav() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  return (
    <header className="public-nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <GraduationCap size={23} />
          </span>
          <span>
            student<span className="brand-blue">job</span>
          </span>
        </Link>
        <nav className={open ? "public-links open" : "public-links"}>
          <NavLink to="/jobs">Tìm việc làm</NavLink>
          <NavLink to="/companies">Khám phá công ty</NavLink>
          <a href="/#how-it-works">Cách hoạt động</a>
          {user ? (
            <Link to={`/${user.role.toLowerCase()}/dashboard`}>Tổng quan</Link>
          ) : null}
          <div className="nav-actions">
            {user ? (
              <>
                <span className="nav-user">
                  <span className="avatar small">{user.name.slice(0, 1)}</span>
                  {user.name.split(" ")[0]}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    authService.logout();
                    window.location.href = "/";
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" to="/login">
                  Đăng nhập
                </Link>
                <Link className="btn btn-primary btn-sm" to="/register">
                  Bắt đầu ngay <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </nav>
        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Mở hoặc đóng menu"
        >
          <Menu />
        </button>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <Link className="brand" to="/">
            <span className="brand-mark">
              <GraduationCap size={23} />
            </span>
            <span>
              student<span className="brand-blue">job</span>
            </span>
          </Link>
          <p className="muted footer-copy">
            A better start to tương lai career. Find flexible work, build experience,
            and grow on tương lai terms.
          </p>
        </div>
        <div>
          <b>Khám phá</b>
          <Link to="/jobs">Tìm việc làm</Link>
          <a href="/#how-it-works">Cách hoạt động</a>
        </div>
        <div>
          <b>Dành cho nhà tuyển dụng</b>
          <Link to="/register">Đăng tin tuyển dụng</Link>
          <Link to="/login">Đăng nhập nhà tuyển dụng</Link>
        </div>
        <div>
          <b>Hỗ trợ</b>
          <a href="mailto:hello@studentjob.demo">Liên hệ</a>
          <Link to="/unauthorized">Trung tâm hỗ trợ</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 StudentJob Marketplace</span>
        <span>Đồng hành cùng sinh viên trên hành trình nghề nghiệp.</span>
      </div>
    </footer>
  );
}
function Home() {
  const jobs = jobService
    .all()
    .filter((j) => j.status === "OPEN" && j.moderation === "APPROVED");
  return (
    <>
      <PublicNav />
      <main>
        <section className="hero">
          <div className="hero-glow glow-one" />
          <div className="hero-glow glow-two" />
          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={15} /> HÀNH TRÌNH SỰ NGHIỆP BẮT ĐẦU TỪ ĐÂY
            </div>
            <h1>
              Tìm công việc phù hợp với
              <br />
              tương lai <span className="gradient-text">của bạn.</span>
            </h1>
            <p className="hero-sub">
              Cơ hội việc làm thiết thực dành cho sinh viên. Tích lũy kinh nghiệm cho
              bước tiến tiếp theo.
            </p>
            <JobSearchBox />
            <div className="hero-proof">
              <div className="avatar-stack">
                <span>A</span>
                <span>M</span>
                <span>L</span>
                <span>+</span>
              </div>
              <span>
                <b>2,400+</b> sinh viên đang tìm kiếm cơ hội
              </span>
              <span className="proof-divider" />
              <span className="proof-stars">
                <Star size={14} fill="currentColor" /> 4,9/5 trải nghiệm sinh viên
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-orbit orbit-a" />
            <div className="art-orbit orbit-b" />
            <div className="art-card art-card-main">
              <div className="art-card-head">
                <span className="company-icon blue-bg">
                  <CodeGlyph />
                </span>
                <span className="tag tag-green">Đang tuyển dụng</span>
              </div>
              <h3>Frontend Developer</h3>
              <p className="muted">Northstar Studio · Hybrid</p>
              <div className="art-skills">
                <span>React</span>
                <span>TypeScript</span>
                <span>UI/UX</span>
              </div>
              <div className="art-card-foot">
                <b>
                  ₫5–8M <small>/ month</small>
                </b>
                <span className="art-arrow">
                  <ArrowUpRightGlyph />
                </span>
              </div>
            </div>
            <div className="art-float float-top">
              <span className="float-icon green-bg">
                <Check size={17} />
              </span>
              <span>
                <b>Ứng tuyển thành công!</b>
                <small>Frontend Developer Intern</small>
              </span>
            </div>
            <div className="art-float float-bottom">
              <span className="float-icon purple-bg">
                <ChartNoAxesCombined size={18} />
              </span>
              <span>
                <b>Phát triển kỹ năng</b>
                <small>Tiến gần hơn đến mục tiêu của bạn</small>
              </span>
            </div>
            <div className="art-dot dot-one" />
            <div className="art-dot dot-two" />
          </div>
        </section>
        <section className="stats-strip">
          <div>
            <b>1,200+</b>
            <span>Cơ hội đang tuyển</span>
          </div>
          <div>
            <b>850+</b>
            <span>Doanh nghiệp tuyển dụng</span>
          </div>
          <div>
            <b>12k+</b>
            <span>Cộng đồng sinh viên</span>
          </div>
          <div>
            <b>94%</b>
            <span>Sẵn sàng giới thiệu</span>
          </div>
        </section>
        <section className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue-eyebrow">
                KHÁM PHÁ CƠ HỘI
              </span>
              <h2>Tìm công việc dành cho bạn</h2>
              <p>Dù học ngành nào, bạn cũng có thể bắt đầu từ một cơ hội phù hợp.</p>
            </div>
            <Link className="text-link" to="/jobs">
              Xem tất cả việc làm <ArrowRight size={16} />
            </Link>
          </div>
          <div className="category-grid">
            {[
              {
                name: "Technology",
                sub: "Build what’s next",
                icon: "⌘",
                color: "blue",
              },
              {
                name: "Marketing",
                sub: "Tell great stories",
                icon: "✳",
                color: "orange",
              },
              {
                name: "Design",
                sub: "Make ideas real",
                icon: "◈",
                color: "purple",
              },
              {
                name: "Data & Analytics",
                sub: "Find the insight",
                icon: "▥",
                color: "green",
              },
              {
                name: "Education",
                sub: "Help others grow",
                icon: "✎",
                color: "pink",
              },
              {
                name: "Operations",
                sub: "Make things happen",
                icon: "◉",
                color: "yellow",
              },
            ].map((c) => (
              <Link
                to={`/jobs?category=${encodeURIComponent(c.name)}`}
                className="category-card"
                key={c.name}
              >
                <span className={`category-icon ${c.color}`}>{c.icon}</span>
                <span>
                  <b>{c.name}</b>
                  <small>{c.sub}</small>
                </span>
                <ArrowRight className="category-arrow" size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="section featured-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow blue-eyebrow">GỢI Ý DÀNH CHO BẠN</span>
                <h2>Cơ hội đáng quan tâm</h2>
                <p>Môi trường tốt, công việc linh hoạt và nhiều cơ hội học hỏi.</p>
              </div>
              <Link className="text-link" to="/jobs">
                Xem tất cả vị trí <ArrowRight size={16} />
              </Link>
            </div>
            <div className="job-grid">
              {jobs.slice(0, 3).map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </div>
        </section>
        <section className="section container" id="how-it-works">
          <div className="section-heading centered">
            <span className="eyebrow blue-eyebrow">BẮT ĐẦU DỄ DÀNG</span>
            <h2>Ba bước đến công việc phù hợp</h2>
            <p>Quy trình đơn giản, rõ ràng và dễ thực hiện.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-num">01</span>
              <span className="step-icon">
                <Search size={24} />
              </span>
              <h3>Khám phá</h3>
              <p>
                Find roles that match tương lai skills, schedule, interests, and
                ambitions.
              </p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <span className="step-num">02</span>
              <span className="step-icon">
                <Send size={24} />
              </span>
              <h3>Tự tin ứng tuyển</h3>
              <p>
                Share tương lai story and let employers see what makes you a great
                fit.
              </p>
            </div>
            <div className="step-connector" />
            <div className="step-card">
              <span className="step-num">03</span>
              <span className="step-icon">
                <Sparkles size={24} />
              </span>
              <h3>Phát triển sự nghiệp</h3>
              <p>
                Build real-world experience, learn from teams, and take your
                next step.
              </p>
            </div>
          </div>
        </section>
        <section className="employer-cta container">
          <div className="cta-decoration" />
          <div className="cta-icon">
            <Building2 size={25} />
          </div>
          <div>
            <span className="eyebrow">DÀNH CHO NHÀ TUYỂN DỤNG</span>
            <h2>Kết nối thế hệ nhân tài trẻ.</h2>
            <p>Tiếp cận sinh viên năng động, sẵn sàng tạo ra giá trị.</p>
          </div>
          <Link className="btn btn-light" to="/register">
            Tìm ứng viên phù hợp <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
function CodeGlyph() {
  return <span className="code-glyph">&lt;/&gt;</span>;
}
function ArrowUpRightGlyph() {
  return <ArrowRight size={17} />;
}
function JobSearchBox() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const go = useNavigate();
  return (
    <form
      className="hero-search"
      onSubmit={(e) => {
        e.preventDefault();
        go(
          `/jobs?q=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}`,
        );
      }}
    >
      <label className="search-field">
        <Search size={19} />
        <input
          aria-label="Chức danh hoặc từ khóa"
          placeholder="Công việc, kỹ năng hoặc công ty"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <span className="search-divider" />
      <label className="search-field location-field">
        <MapPin size={18} />
        <input
          aria-label="Địa điểm"
          placeholder="Thành phố hoặc làm từ xa"
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" type="submit">
        Tìm việc làm <ArrowRight size={16} />
      </button>
    </form>
  );
}
function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { user } = useContext(AuthContext);
  const [saved, setSaved] = useState(() => user?.role === "STUDENT" ? readSaved(user.id).includes(job.id) : false);
  useEffect(() => { const refresh = () => setSaved(user?.role === "STUDENT" ? readSaved(user.id).includes(job.id) : false); window.addEventListener("sj:saved-updated", refresh); return () => window.removeEventListener("sj:saved-updated", refresh); }, [user?.id, user?.role, job.id]);
  return (
    <article className={`job-card ${compact ? "compact" : ""}`}>
      <div className="job-card-top">
        <CompanyMark name={job.company} />
        <div className="sj-job-card-actions">
          <span className={`status-pill ${statusClass(job.status)}`}>{job.status === "OPEN" ? "Đang tuyển" : "Đã đóng"}</span>
          {user?.role === "STUDENT" && <button type="button" className={`sj-save-mini ${saved ? "is-saved" : ""}`} title={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"} aria-label={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"} onClick={() => setSaved(toggleSaved(user.id, job.id))}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/></button>}
        </div>
      </div>
      <Link to={`/jobs/${job.id}`} className="job-title">
        {job.title}
      </Link>
      <div className="company-name">{job.company}</div>
      <div className="job-meta">
        <span>
          <MapPin size={14} />
          {job.location}
        </span>
        <span>
          <Clock3 size={14} />
          {jobTypeVi(job.type)}
        </span>
      </div>
      <div className="job-tags">
        {job.skills.slice(0, 3).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="job-card-bottom">
        <div>
          <b>
            {money(job.salaryMin)} – {money(job.salaryMax)}
          </b>
          <small>/ tháng · {date(job.postedAt)}</small>
        </div>
        <Link
          className="round-link"
          aria-label={`Xem ${job.title}`}
          to={`/jobs/${job.id}`}
        >
          <ArrowUpRightGlyph />
        </Link>
      </div>
    </article>
  );
}
function CompanyMark({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const colors = [
    "company-blue",
    "company-purple",
    "company-orange",
    "company-green",
  ];
  return (
    <span className={`company-mark ${colors[name.length % colors.length]}`}>
      {initials}
    </span>
  );
}
function Jobs() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const [q, setQ] = useState(params.get("q") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [type, setType] = useState("ALL");
  const [category, setCategory] = useState(params.get("category") || "ALL");
  const [salary, setSalary] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 6;
  const all = jobService
    .all()
    .filter((j) => j.status === "OPEN" && j.moderation === "APPROVED");
  const filtered = useMemo(
    () =>
      all.filter(
        (j) =>
          (!q ||
            `${j.title} ${j.company} ${j.skills.join(" ")}`
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!location ||
            j.location.toLowerCase().includes(location.toLowerCase()) ||
            (location.toLowerCase().includes("remote") &&
              j.arrangement === "Remote")) &&
          (type === "ALL" || j.type === type) &&
          (category === "ALL" || j.category === category) &&
          (salary === "ALL" ||
            (salary === "under5"
              ? j.salaryMax < 5000000
              : salary === "5to8"
                ? j.salaryMax >= 5000000 && j.salaryMin <= 8000000
                : j.salaryMin > 8000000)),
      ),
    [all, q, location, type, category, salary],
  );
  const sorted = [...filtered].sort((a, b) =>
    sort === "salary"
      ? b.salaryMax - a.salaryMax
      : sort === "relevance"
        ? a.title.localeCompare(b.title)
        : b.postedAt.localeCompare(a.postedAt),
  );
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const results = sorted.slice((page - 1) * perPage, page * perPage);
  useEffect(() => setPage(1), [q, location, type, category, salary, sort]);
  return (
    <>
      <PublicNav />
      <main className="listing-page">
        <div className="listing-hero">
          <div className="container">
            <span className="eyebrow blue-eyebrow">CƠ HỘI TIẾP THEO DÀNH CHO BẠN</span>
            <h1>
              Tìm việc làm phù hợp với{" "}
              <span className="gradient-text">cuộc sống của bạn.</span>
            </h1>
            <p>
              Khám phá những cơ hội việc làm linh hoạt từ các nhà tuyển dụng.
            </p>
            <div className="listing-search">
              <Search size={19} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Vị trí, công ty hoặc kỹ năng"
                aria-label="Tìm kiếm vị trí"
              />
              <span className="search-divider" />
              <MapPin size={18} />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Địa điểm hoặc làm từ xa"
                aria-label="Lọc theo địa điểm"
              />
              <button className="btn btn-primary" onClick={() => setPage(1)}>
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>
        <div className="container listing-layout">
          <aside
            className={`filter-panel ${showFilters ? "filters-open" : ""}`}
          >
            <div className="filter-head">
              <b>
                <SlidersHorizontal size={17} /> Bộ lọc
              </b>
              <button
                className="text-button"
                onClick={() => {
                  setType("ALL");
                  setCategory("ALL");
                  setSalary("ALL");
                  setLocation("");
                  setQ("");
                }}
              >
                Đặt lại tất cả
              </button>
            </div>
            <FilterGroup label="Job type">
              {[
                ["ALL", "All types"],
                ["PART_TIME", "Part-time"],
                ["FULL_TIME", "Full-time"],
                ["FREELANCE", "Freelance"],
              ].map(([v, l]) => (
                <label className="radio-option" key={v}>
                  <input
                    type="radio"
                    name="jobtype"
                    checked={type === v}
                    onChange={() => setType(v)}
                  />
                  <span>{l}</span>
                </label>
              ))}
            </FilterGroup>
            <FilterGroup label="Category">
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="ALL">Tất cả lĩnh vực</option>
                {[
                  "Technology",
                  "Marketing",
                  "Design",
                  "Data & Analytics",
                  "Education",
                  "Operations",
                  "Customer Service",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FilterGroup>
            <FilterGroup label="Salary range">
              <select
                className="form-control"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              >
                <option value="ALL">Mọi mức lương</option>
                <option value="under5">Dưới 5 triệu</option>
                <option value="5to8">5 – 8 triệu</option>
                <option value="over8">Trên 8 triệu</option>
              </select>
            </FilterGroup>
            <div className="filter-note">
              <Sparkles size={16} />
              <span>
                <b>Bạn mới bắt đầu?</b>
                <br />
                Công việc đầu tiên có thể ở gần bạn hơn bạn nghĩ.
              </span>
            </div>
          </aside>
          <section className="results-area">
            <div className="results-toolbar">
              <div>
                <h2>
                  Open positions{" "}
                  <span className="count-bubble">{sorted.length}</span>
                </h2>
                <p className="muted">
                  Showing {sorted.length ? (page - 1) * perPage + 1 : 0}–
                  {Math.min(page * perPage, sorted.length)} of {sorted.length}{" "}
                  opportunities
                </p>
              </div>
              <div className="toolbar-actions">
                <button
                  className="btn btn-outline filter-toggle"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={16} /> Bộ lọc
                </button>
                <label className="sort-select">
                  <ArrowDownUp size={15} />
                  <select
                    aria-label="Sắp xếp công việc"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="salary">Lương cao nhất</option>
                    <option value="relevance">Tên công việc A–Z</option>
                  </select>
                </label>
              </div>
            </div>
            {results.length ? (
              <>
                <div className="job-grid listing-grid">
                  {results.map((j) => (
                    <JobCard key={j.id} job={j} />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Trước
                    </button>
                    {Array.from({ length: pages }, (_, i) => (
                      <button
                        key={i}
                        className={`page-num ${page === i + 1 ? "active" : ""}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={page === pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Tiếp <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Search size={25} />
                </span>
                <h3>Không tìm thấy công việc phù hợp</h3>
                <p>
                  Try another keyword or broaden tương lai search to see more
                  opportunities.
                </p>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setQ("");
                    setLocation("");
                    setType("ALL");
                    setCategory("ALL");
                    setSalary("ALL");
                  }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="filter-group">
      <b>{label}</b>
      {children}
    </div>
  );
}

function JobDetails() {
  const { id = "" } = useParams();
  const job = jobService.byId(id);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const [applyOpen, setApplyOpen] = useState(false);

  const [message, setMessage] = useState(
    "Tôi quan tâm đến vị trí này và mong muốn được trao đổi thêm về cách kỹ năng của mình có thể đóng góp cho công ty.",
  );

  const [selectedCv, setSelectedCv] = useState<File | null>(null);

  const [saved, setSaved] = useState(() => user?.role === "STUDENT" ? readSaved(user.id).includes(id) : false);
  const [contacting, setContacting] = useState(false);

  // Chat sử dụng employer_profiles.id, đã có sẵn trong job.employerId.
  async function contactEmployer() {
    if (!job) return;

    if (!user) {
      navigate("/login", { state: { from: `/jobs/${id}` } });
      return;
    }

    if (user.role !== "STUDENT") {
      toast("Chỉ ứng viên mới có thể liên hệ nhà tuyển dụng.", "error");
      return;
    }

    const employerProfileId = Number(job.employerId);
    if (!Number.isSafeInteger(employerProfileId) || employerProfileId <= 0) {
      toast("Công việc chưa có hồ sơ nhà tuyển dụng hợp lệ.", "error");
      return;
    }

    setContacting(true);
    try {
      const response = await chatApi.create(employerProfileId);
      navigate(`/student/messages?conversation=${response.conversationId}`);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Không thể mở cuộc trò chuyện.",
        "error",
      );
    } finally {
      setContacting(false);
    }
  }

  if (!job) {
    return (
      <>
        <PublicNav />
        <div className="container">
          <EmptyPage
            title="Job not found"
            text="This listing may have been removed or the link is incorrect."
            action={
              <Link className="btn btn-primary" to="/jobs">
                Tìm việc làm
              </Link>
            }
          />
        </div>
        <Footer />
      </>
    );
  }

  const reviews = store.reviews().filter((r) => r.jobId === job.id);

  const companyUser = store.users().find((u) => u.id === job.employerId);

  const already =
    user &&
    store
      .applications()
      .some((a) => a.jobId === job.id && a.studentId === user.id);

  return (
    <>
      <PublicNav />

      <main className="detail-page container">
        <Link className="back-link" to="/jobs">
          <ArrowLeft size={16} />
          Quay lại danh sách việc làm
        </Link>

        <div className="detail-layout">
          <section className="detail-main">
            <div className="detail-header card">
              <div className="detail-company-row">
                <CompanyMark name={job.company} />

                <div>
                  <span className="company-name">{job.company}</span>

                  <div className="muted tiny">
                    <MapPin size={13} />
                    {job.location} · Đăng ngày {date(job.postedAt)}
                  </div>
                </div>

                <button
                  className={`icon-btn save-btn ${saved ? "saved" : ""}`}
                  onClick={() => {
                    if (!user || user.role !== "STUDENT") { toast("Đăng nhập bằng tài khoản sinh viên để lưu việc làm.", "info"); return; }
                    const nowSaved = toggleSaved(user.id, id);
                    setSaved(nowSaved);
                    toast(nowSaved ? "Đã lưu việc làm" : "Đã bỏ lưu việc làm", "success");
                  }}
                  aria-label="Lưu việc làm"
                >
                  <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
                </button>
              </div>

              <h1>{job.title}</h1>

              <div className="detail-chips">
                <span>
                  <Wallet size={15} />
                  {money(job.salaryMin)} – {money(job.salaryMax)}
                </span>

                <span>
                  <Clock3 size={15} />
                  {job.type.replace("_", " ")}
                </span>

                <span>
                  <Globe size={15} />
                  {job.arrangement}
                </span>

                <span>
                  <MapPin size={15} />
                  {job.location}
                </span>
              </div>

              <div className="detail-apply-row">
                {/* Nút ứng tuyển cũ */}
                <button
                  className="btn btn-primary btn-lg"
                  disabled={
                    job.status !== "OPEN" ||
                    job.moderation !== "APPROVED" ||
                    !!already
                  }
                  onClick={() => {
                    if (!user) {
                      navigate("/login", {
                        state: {
                          from: `/jobs/${id}`,
                        },
                      });
                      return;
                    }

                    if (user.role !== "STUDENT") {
                      navigate("/unauthorized");
                      return;
                    }

                    setApplyOpen(true);
                  }}
                >
                  {already
                    ? "Already applied"
                    : job.status !== "OPEN"
                      ? "Position closed"
                      : "Apply for this job"}

                  <ArrowRight size={17} />
                </button>

                {/* Nút chat mới */}
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={contactEmployer}
                  disabled={contacting}
                >
                  <Send size={17} />

                  {contacting
                    ? "Đang mở cuộc trò chuyện..."
                    : "Liên hệ nhà tuyển dụng"}
                </button>

                <span className="muted tiny">
                  {job.applicants} people applied · Deadline{" "}
                  {date(job.deadline)}
                </span>
              </div>
            </div>

            <div className="card detail-section">
              <h2>Giới thiệu vị trí</h2>
              <p>{job.description}</p>

              <h3>Nhiệm vụ công việc</h3>
              <ul className="detail-list">
                {job.responsibilities.map((x) => (
                  <li key={x}>
                    <CheckCircle2 size={17} />
                    {x}
                  </li>
                ))}
              </ul>

              <h3>Yêu cầu ứng viên</h3>
              <ul className="detail-list">
                {job.requirements.map((x) => (
                  <li key={x}>
                    <CheckCircle2 size={17} />
                    {x}
                  </li>
                ))}
              </ul>

              <h3>Kỹ năng cần có</h3>
              <div className="job-tags large-tags">
                {job.skills.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>

            <div className="card detail-section">
              <h2>Giới thiệu công ty</h2>

              <div className="company-about">
                <CompanyMark name={job.company} />

                <div>
                  <b>{job.company}</b>
                  <p className="muted">
                    A team focused on creating meaningful work and learning
                    opportunities.
                  </p>
                </div>
              </div>

              {reviews.length > 0 && (
                <div className="reviews-block">
                  <h3>
                    Team reviews{" "}
                    <span className="muted tiny">({reviews.length})</span>
                    <span className="review-average">
                      <Star size={13} fill="currentColor" />{" "}
                      {(
                        reviews.reduce((sum, r) => sum + r.rating, 0) /
                        reviews.length
                      ).toFixed(1)}{" "}
                      / 5 average
                    </span>
                  </h3>

                  {reviews.map((r) => (
                    <div className="review-row" key={r.id}>
                      <div className="review-stars">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={13}
                            fill={i < r.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>

                      <p>{r.comment}</p>
                      <small className="muted">{date(r.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="detail-side">
            <div className="card side-card">
              <h3>Tổng quan công việc</h3>

              <SideInfo
                icon={<BriefcaseBusiness />}
                label="Job type"
                value={job.type.replace("_", " ")}
              />

              <SideInfo
                icon={<Wallet />}
                label="Salary range"
                value={`${money(job.salaryMin)} – ${money(job.salaryMax)}`}
              />

              <SideInfo
                icon={<MapPin />}
                label="Địa điểm"
                value={job.location}
              />

              <SideInfo
                icon={<Globe />}
                label="Work style"
                value={job.arrangement}
              />

              <SideInfo
                icon={<CalendarDays />}
                label="Apply by"
                value={date(job.deadline)}
              />

              <div className="side-divider" />

              <div className="side-tip">
                <Sparkles size={18} />
                <span>
                  <b>Chuẩn bị hồ sơ ứng tuyển</b>
                  <small>
                    Share a little about tương lai experience and what excites you
                    about this role.
                  </small>
                </span>
              </div>
            </div>

            <div className="card side-card company-side">
              <h3>Nhà tuyển dụng</h3>

              <div className="company-about">
                <CompanyMark name={job.company} />

                <div>
                  <b>{job.company}</b>
                  <small className="muted">Nhà tuyển dụng mẫu đã xác minh</small>
                </div>
              </div>

              <span className="status-pill status-green">
                <ShieldCheck size={13} />
                Dữ liệu minh họa
              </span>

              {companyUser?.email && (
                <p className="muted tiny">
                  Thông tin liên hệ chỉ dùng để minh họa.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {applyOpen && (
        <Modal
          title="Apply for this position"
          onClose={() => setApplyOpen(false)}
        >
          <p className="muted modal-sub">
            Ứng tuyển vị trí <b>{job.title}</b> at {job.company}
          </p>

          <label className="field-label">
            Lời giới thiệu ngắn
            <textarea
              className="form-control"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Giới thiệu lý do bạn quan tâm vị trí này..."
            />
          </label>

          <div className="application-cv">
            <FileText size={18} />

            <span>
              <b>{user?.cvUrl ? "Đã đính kèm CV" : "Chưa có liên kết CV"}</b>

              <small>
                {user?.cvUrl || "You can add a CV link in tương lai profile."}
              </small>
            </span>

            <Link
              to="/student/profile"
              onClick={() => setApplyOpen(false)}
              className="text-link"
            >
              Chỉnh sửa
            </Link>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Tải CV PDF từ máy tính
            </label>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;

                if (!file) {
                  setSelectedCv(null);
                  return;
                }

                if (
                  file.type !== "application/pdf" &&
                  !file.name.toLowerCase().endsWith(".pdf")
                ) {
                  toast("Chỉ chấp nhận file PDF", "error");
                  e.target.value = "";
                  setSelectedCv(null);
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  toast("CV không được vượt quá 5MB", "error");
                  e.target.value = "";
                  setSelectedCv(null);
                  return;
                }

                setSelectedCv(file);
              }}
            />

            {selectedCv && (
              <p style={{ marginTop: 8, fontSize: 13 }}>
                Đã chọn: {selectedCv.name}
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setApplyOpen(false)}
            >
              Hủy
            </button>

            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  const result = await applicationService.apply(
                    job.id,
                    user!,
                    message,
                  );

                  // Nếu ứng viên chọn CV thì upload lên Backend
                  if (selectedCv) {
                    try {
                      await api.applications.uploadCv(
                        result.applicationId,
                        selectedCv,
                      );
                    } catch (uploadError) {
                      await applicationService.loadMine();

                      toast(
                        "Đã gửi đơn nhưng upload CV thất bại: " +
                          (uploadError instanceof Error
                            ? uploadError.message
                            : "Lỗi không xác định"),
                        "error",
                      );

                      setApplyOpen(false);
                      navigate("/student/applications");
                      return;
                    }
                  }

                  // Tải lại danh sách đơn ứng tuyển
                  await applicationService.loadMine();

                  setSelectedCv(null);
                  setApplyOpen(false);

                  toast("Ứng tuyển thành công!");

                  navigate("/student/applications");
                } catch (e) {
                  toast(
                    e instanceof Error ? e.message : "Không thể ứng tuyển",
                    "error",
                  );
                }
              }}
            >
              <Send size={16} />
              Gửi đơn ứng tuyển
            </button>
          </div>
        </Modal>
      )}

      <Footer />
    </>
  );
}
function SideInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="side-info">
      <span className="side-info-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <b>{value}</b>
      </span>
    </div>
  );
}
function Login() {
  const { user, setUser } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (user)
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
  return (
    <AuthLayout
      sideTitle="Your next opportunity is closer than you think."
      sideText="A little experience today can open up a world of possibilities tomorrow."
    >
      <div className="auth-heading">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Về trang chủ
        </Link>
        <span className="eyebrow blue-eyebrow">CHÀO MỪNG TRỞ LẠI</span>
        <h1>Rất vui được gặp lại bạn.</h1>
        <p>Đăng nhập để tiếp tục hành trình của bạn.</p>
      </div>
      <form
        className="auth-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          try {
            const u = await authService.login(email.trim(), password);
            setUser(u);
            if (u.role === "STUDENT") {
              applicationService.loadMine().catch(console.error);
            }

            if (u.role === "EMPLOYER" || u.role === "ADMIN") {
              jobService.load().catch(console.error);
            }
            toast(`Welcome back, ${u.name.split(" ")[0]}!`);
            const from = (location.state as { from?: string } | null)?.from;
            navigate(from || `/${u.role.toLowerCase()}/dashboard`, {
              replace: true,
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign in");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="field-label">
          Địa chỉ email
          <input
            className="form-control"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="field-label">
          Mật khẩu
          <input
            className="form-control"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
          />
        </label>
        {error && (
          <div className="form-error">
            <CircleHelp size={16} />
            {error}
          </div>
        )}
        <button
          className="btn btn-primary btn-block btn-lg"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"} <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-bottom">
        Bạn chưa có tài khoản StudentJob? <Link to="/register">Tạo tài khoản</Link>
      </p>
      <p className="security-note">
        <ShieldCheck size={14} /> Đăng nhập được xác thực qua hệ thống StudentJob.
      </p>
    </AuthLayout>
  );
}
function Register() {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState<"STUDENT" | "EMPLOYER">("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verify">("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (user)
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
  const requestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.requestRegistrationOtp({
        name,
        email,
        password,
        role,
        company,
      });
      setStep("verify");
      toast(
        "Mã OTP đã được gửi đến email của bạn. Mã có hiệu lực 5 phút.",
        "success",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể gửi mã xác thực",
      );
    } finally {
      setLoading(false);
    }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.verifyRegistrationOtp(email, otp);
      toast(
        "Xác minh email và đăng ký thành công. Hãy đăng nhập để tiếp tục.",
        "success",
      );
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác minh OTP thất bại");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthLayout
      sideTitle="Make room for what comes next."
      sideText="Start building experience, meeting great teams, and turning tương lai skills into opportunities."
    >
      <div className="auth-heading">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Về trang chủ
        </Link>
        <span className="eyebrow blue-eyebrow">
          {step === "details" ? "GET STARTED" : "EMAIL VERIFICATION"}
        </span>
        <h1>
          {step === "details" ? "Create tương lai account." : "Verify tương lai email."}
        </h1>
        <p>
          {step === "details"
            ? "Choose how you want to use StudentJob."
            : `Enter the 6-digit OTP sent to ${email}.`}
        </p>
      </div>
      {step === "details" ? (
        <>
          <div className="role-choice">
            <button
              type="button"
              className={
                role === "STUDENT" ? "role-option selected" : "role-option"
              }
              onClick={() => setRole("STUDENT")}
            >
              <GraduationCap size={22} />
              <span>
                <b>Tôi là sinh viên</b>
                <small>Tìm việc làm và tích lũy kinh nghiệm</small>
              </span>
              {role === "STUDENT" && <CheckCircle2 size={17} />}
            </button>
            <button
              type="button"
              className={
                role === "EMPLOYER" ? "role-option selected" : "role-option"
              }
              onClick={() => setRole("EMPLOYER")}
            >
              <Building2 size={22} />
              <span>
                <b>Tôi là nhà tuyển dụng</b>
                <small>Tìm kiếm sinh viên tiềm năng</small>
              </span>
              {role === "EMPLOYER" && <CheckCircle2 size={17} />}
            </button>
          </div>
          <form className="auth-form" onSubmit={requestOtp}>
            <label className="field-label">
              {role === "STUDENT" ? "Full name" : "Contact name"}
              <input
                className="form-control"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên"
              />
            </label>
            {role === "EMPLOYER" && (
              <label className="field-label">
                Tên công ty
                <input
                  className="form-control"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Tên công ty của bạn"
                />
              </label>
            )}
            <label className="field-label">
              Địa chỉ email
              <input
                className="form-control"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="field-label">
              Mật khẩu
              <input
                className="form-control"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
              />
            </label>
            {error && (
              <div className="form-error">
                <CircleHelp size={16} />
                {error}
              </div>
            )}
            <button
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending verification code..."
                : "Send verification code"}{" "}
              <ArrowRight size={17} />
            </button>
            <p className="muted tiny">
              We will send a one-time password to tương lai email. The code expires
              in 5 minutes.
            </p>
          </form>
        </>
      ) : (
        <form className="auth-form" onSubmit={verify}>
          <label className="field-label">
            Mã xác minh 6 chữ số
            <input
              className="form-control"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
            />
          </label>
          {error && (
            <div className="form-error">
              <CircleHelp size={16} />
              {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-block btn-lg"
            type="submit"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify email and create account"}{" "}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="btn btn-outline btn-block"
            disabled={loading}
            onClick={() => {
              setStep("details");
              setOtp("");
              setError("");
            }}
          >
            Quay lại thông tin đăng ký
          </button>
        </form>
      )}
      <p className="auth-bottom">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthLayout>
  );
}
function AuthLayout({
  children,
  sideTitle,
  sideText,
}: {
  children: ReactNode;
  sideTitle: string;
  sideText: string;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand brand-white" to="/">
          <span className="brand-mark">
            <GraduationCap size={23} />
          </span>
          <span>
            student<span>job</span>
          </span>
        </Link>
        <div className="auth-aside-copy">
          <span className="auth-quote-mark">“</span>
          <h2>{sideTitle}</h2>
          <p>{sideText}</p>
          <div className="auth-quote-person">
            <span className="avatar">AM</span>
            <span>
              <b>Alex Morgan</b>
              <small>Sinh viên Kỹ thuật phần mềm</small>
            </span>
          </div>
        </div>
        <div className="auth-aside-bottom">
          <span>
            <ShieldCheck size={15} /> Hành trình mới bắt đầu tại đây
          </span>
          <span>© 2026 StudentJob</span>
        </div>
        <div className="auth-shape shape-one" />
        <div className="auth-shape shape-two" />
      </aside>
      <main className="auth-main">
        <div className="auth-form-wrap">{children}</div>
      </main>
    </div>
  );
}
function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, setUser } = useContext(AuthContext);
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  const links =
    role === "STUDENT"
      ? [
          ["Tổng quan", "/student/dashboard", LayoutDashboard],
          ["Tìm việc làm", "/jobs", Compass],
          ["Việc làm đã lưu", "/student/saved", Bookmark],
          ["Khám phá công ty", "/companies", Building2],
          ["Đơn ứng tuyển", "/student/applications", ClipboardList],
          ["Hồ sơ cá nhân", "/student/profile", UserRound],
          ["CV của tôi", "/student/cvs", FileText],
          ["Phân tích CV", "/student/ai-cv", Bot],
          ["Tin nhắn", "/student/messages", Mail],
        ]
      : role === "EMPLOYER"
        ? [
            ["Tổng quan", "/employer/dashboard", LayoutDashboard],
            ["Tin tuyển dụng", "/employer/jobs", BriefcaseBusiness],
            ["Ứng viên", "/employer/jobs", Users],
            ["Tin nhắn", "/employer/messages", Mail],
          ]
        : [
            ["Tổng quan", "/admin/dashboard", LayoutDashboard],
            ["Quản lý người dùng", "/admin/users", Users],
            ["Duyệt tin tuyển dụng", "/admin/jobs", ShieldCheck],
            ["Đơn ứng tuyển", "/admin/applications", ClipboardList],
          ];
  const title =
    role === "STUDENT"
      ? "Không gian sinh viên"
      : role === "EMPLOYER"
        ? "Không gian tuyển dụng"
        : "Quản trị hệ thống";
  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link className="brand sidebar-brand" to="/">
          <span className="brand-mark">
            <GraduationCap size={23} />
          </span>
          <span>
            student<span className="brand-blue">job</span>
          </span>
        </Link>
        <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
        <div className="workspace-pill">
          <span className={`workspace-icon ${role.toLowerCase()}`}>
            {role === "STUDENT" ? (
              <GraduationCap size={17} />
            ) : role === "EMPLOYER" ? (
              <Building2 size={17} />
            ) : (
              <ShieldCheck size={17} />
            )}
          </span>
          <span>
            <b>{title}</b>
            <small>Tài khoản {roleLabel(role)}</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav">
          {links.map(([label, path, Icon]) => (
            <NavLink
              key={label as string}
              to={path as string}
              end={
                path === "/student/dashboard" ||
                path === "/employer/dashboard" ||
                path === "/admin/dashboard"
              }
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                `side-nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label as string}</span>
              {label === "Đơn ứng tuyển" && (
                <span className="nav-count">
                  {
                    applicationService
                      .all()
                      .filter((a) => a.studentId === user?.id).length
                  }
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-card-icon">
              <CircleHelp size={18} />
            </span>
            <b>Cần hỗ trợ?</b>
            <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn.</p>
            <a href="mailto:hello@studentjob.demo">
              Liên hệ hỗ trợ <ArrowRight size={13} />
            </a>
          </div>
          <button
            className="side-nav-link"
            onClick={() => {
              authService.logout();
              setUser(null);
              navigate("/");
            }}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
          <div className="sidebar-profile">
            <span className="avatar">
              {user?.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </span>
            <Settings size={17} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="Đóng menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu dash-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Mở hoặc đóng thanh bên"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Không gian làm việc <span>/</span> <b>{roleLabel(role)}</b>
          </div>
          <div className="topbar-actions">
            <span className="topbar-date">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("vi-VN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              className="icon-btn notification-btn"
              aria-label="Thông báo"
              onClick={() => window.alert("Bạn chưa có thông báo mới.")}
            >
              <Bell size={18} />
              <i />
            </button>
            <span className="avatar top-avatar">
              {user?.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
        <footer className="dashboard-footer">
          <span>© 2026 StudentJob Marketplace</span>
          <span>
            Vì thế hệ trẻ tương lai <Sparkles size={13} />
          </span>
        </footer>
      </div>
    </div>
  );
}
function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow blue-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
  trend,
  variant = "blue",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  variant?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${variant}`}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      {trend && (
        <div className="metric-trend">
          <span>
            <ArrowRight size={12} />
          </span>
          {trend}
        </div>
      )}
    </div>
  );
}


function Companies() {
  const [query, setQuery] = useState("");
  const jobs = jobService.all().filter(j => j.status === "OPEN" && j.moderation === "APPROVED");
  const companies = Array.from(new Set(jobs.map(j => j.company))).sort((a,b) => a.localeCompare(b, "vi"));
  const visible = companies.filter(name => name.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  return <><PublicNav/><main className="sj-discovery container"><div className="sj-discovery-head"><span className="eyebrow blue-eyebrow">KHÁM PHÁ NHÀ TUYỂN DỤNG</span><h1>Công ty đang tuyển dụng</h1><p>Tìm hiểu các doanh nghiệp và xem những vị trí tuyển dụng đang mở.</p><label className="sj-discovery-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên công ty" aria-label="Tìm công ty"/></label></div><div className="sj-company-grid">{visible.map(name => { const openJobs = jobs.filter(j=>j.company===name); return <article className="sj-company-card" key={name}><div className="sj-company-card-head"><CompanyMark name={name}/><span className="tag tag-green">Đang tuyển</span></div><h2>{name}</h2><p>{openJobs.length} vị trí đang tuyển dụng</p><div className="sj-company-tags">{Array.from(new Set(openJobs.map(j=>j.category))).slice(0,3).map(cat=><span key={cat}>{cat}</span>)}</div><Link className="btn btn-primary btn-sm" to={`/jobs?q=${encodeURIComponent(name)}`}>Xem việc làm <ArrowRight size={15}/></Link></article>; })}</div>{visible.length===0 && <div className="sj-empty">Không tìm thấy công ty phù hợp.</div>}</main><Footer/></>;
}
function SavedJobs() {
  const {user} = useContext(AuthContext);
  const [ids,setIds] = useState<string[]>(()=>readSaved(user?.id || ""));
  useEffect(()=>{ const refresh=()=>setIds(readSaved(user?.id || "")); window.addEventListener("sj:saved-updated",refresh); return ()=>window.removeEventListener("sj:saved-updated",refresh); },[user?.id]);
  const jobs=jobService.all().filter(j=>ids.includes(j.id));
  return <><PageHeader title="Việc làm đã lưu" subtitle="Những cơ hội bạn quan tâm, được lưu trên trình duyệt này."/><div className="sj-saved-summary"><Bookmark size={20}/><span>Bạn đã lưu <b>{jobs.length}</b> công việc</span></div>{jobs.length ? <div className="job-grid sj-saved-grid">{jobs.map(job=><JobCard key={job.id} job={job}/>)}</div>:<div className="sj-empty"><Bookmark size={36}/><h3>Chưa có việc làm đã lưu</h3><p>Nhấn biểu tượng đánh dấu trên tin tuyển dụng để lưu lại và xem sau.</p><Link className="btn btn-primary" to="/jobs">Khám phá việc làm <ArrowRight size={16}/></Link></div>}</>;
}
function CVAnalysis() {
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [result,setResult] = useState<Awaited<ReturnType<typeof cvParserService.parse>>|null>(null);
  const [error,setError] = useState("");
  const run=async()=>{if(!file)return;setBusy(true);setError("");setResult(null);try{setResult(await cvParserService.parse(file));}catch(e){setError(e instanceof Error?e.message:"Không thể phân tích CV.");}finally{setBusy(false);}};
  return <><PageHeader title="Phân tích CV tự động" subtitle="Tải CV PDF hoặc DOCX để trích xuất thông tin và kiểm tra nội dung trước khi tạo CV."/><div className="sj-analysis-layout"><section className="panel sj-analysis-panel"><div className="sj-analysis-icon"><Bot size={29}/></div><h2>Phân tích thông tin CV</h2><p className="muted">Sử dụng chức năng phân tích CV của hệ thống. Kết quả phụ thuộc vào API backend đang kết nối, không phải điểm đánh giá AI tự tạo.</p><label className="sj-file-drop"><Upload size={24}/><b>{file?file.name:"Chọn CV từ máy tính"}</b><small>PDF hoặc DOCX, tối đa 5 MB</small><input type="file" accept=".pdf,.docx" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("");}}/></label><button className="btn btn-primary" type="button" disabled={!file||busy} onClick={run}>{busy?<RefreshCw size={17}/>:<Sparkles size={17}/>} {busy?"Đang phân tích...":"Phân tích CV"}</button>{error&&<p className="sj-analysis-error" role="alert">{error}</p>}</section><section className="panel sj-analysis-panel"><h2>Kết quả trích xuất</h2>{result?<><p className="sj-analysis-success"><CheckCircle2 size={18}/> Đã phân tích tài liệu thành công</p><dl className="sj-analysis-fields"><dt>Họ tên</dt><dd>{result.data.personal_info?.full_name||"Chưa nhận diện"}</dd><dt>Email</dt><dd>{result.data.personal_info?.email||"Chưa nhận diện"}</dd><dt>Số điện thoại</dt><dd>{result.data.personal_info?.phone||"Chưa nhận diện"}</dd><dt>Kỹ năng</dt><dd>{result.data.skills?.join(", ")||"Chưa nhận diện"}</dd><dt>Học vấn</dt><dd>{result.data.education?.length||0} mục</dd><dt>Kinh nghiệm</dt><dd>{result.data.experience?.length||0} mục</dd></dl>{result.warnings?.length? <div className="sj-analysis-warnings"><b>Thông tin cần kiểm tra:</b><ul>{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>:null}<Link className="btn btn-primary btn-sm" to="/student/cvs">Chuyển đến trình tạo CV <ArrowRight size={15}/></Link></>:<div className="sj-analysis-placeholder"><FileText size={40}/><p>Kết quả sẽ hiển thị tại đây sau khi bạn tải CV lên và nhấn phân tích.</p></div>}</section></div></>;
}

function StudentRoutes() {
  return (
    <Shell role="STUDENT">
      <Routes>
        <Route path="dashboard" element={<StudentDashboard />} />

        <Route path="profile" element={<StudentProfile />} />
        <Route path="saved" element={<SavedJobs />} />
        <Route path="ai-cv" element={<CVAnalysis />} />

        {/* Kiểm tra route CV */}
        <Route path="cvs" element={<CVBuilderPage />} />

        <Route path="applications" element={<StudentApplications />} />

        <Route path="messages" element={<ChatPage />} />

        <Route
          path="applications/:id"
          element={<ApplicationDetails role="STUDENT" />}
        />

        <Route path="applications/:id/review" element={<ReviewPage />} />

        {/* Kiểm tra route không khớp */}
        <Route
          path="*"
          element={<Navigate to="/student/dashboard" replace />}
        />
      </Routes>
    </Shell>
  );
}

function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const apps = applicationService.all().filter((a) => a.studentId === user?.id);
  const recommended = jobService
    .all()
    .filter((j) => j.status === "OPEN" && j.moderation === "APPROVED")
    .slice(0, 3);
  return (
    <>
      <PageHeader
        eyebrow="YOUR SPACE TO GROW"
        title={`Good afternoon, ${user?.name.split(" ")[0] || "there"} 👋`}
        subtitle="Here's what's happening with tương lai job search."
        action={
          <Link className="btn btn-primary" to="/jobs">
            <Search size={16} /> Khám phá việc làm
          </Link>
        }
      />
      <div className="metrics-grid four">
        <Metric
          label="Total applications"
          value={apps.length}
          icon={<FileText />}
          trend="Your journey so far"
        />
        <Metric
          label="Awaiting response"
          value={apps.filter((a) => a.status === "PENDING").length}
          icon={<Clock3 />}
          variant="amber"
          trend="Keep an eye on updates"
        />
        <Metric
          label="Accepted"
          value={apps.filter((a) => a.status === "ACCEPTED").length}
          icon={<CheckCircle2 />}
          variant="green"
          trend="Nice work!"
        />
        <Metric
          label="Not selected"
          value={apps.filter((a) => a.status === "REJECTED").length}
          icon={<Activity />}
          variant="purple"
          trend="Every application teaches you"
        />
      </div>
      <div className="dashboard-two-col">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Đơn ứng tuyển gần đây</h2>
              <p>Hoạt động ứng tuyển mới nhất</p>
            </div>
            <Link className="text-link" to="/student/applications">
              Xem tất cả <ArrowRight size={15} />
            </Link>
          </div>
          {apps.length ? (
            <div className="activity-list">
              {apps.slice(0, 4).map((a) => (
                <ApplicationRow key={a.id} app={a} showStudent={false} />
              ))}
            </div>
          ) : (
            <EmptyPage
              title="Your journey starts here"
              text="Apply for a role that interests you and tương lai applications will show up here."
              action={
                <Link to="/jobs" className="btn btn-primary">
                  Tìm công việc đầu tiên
                </Link>
              }
            />
          )}
        </section>
        <section className="panel profile-progress-panel">
          <div className="panel-heading">
            <div>
              <h2>Hồ sơ của bạn</h2>
              <p>Tạo ấn tượng tốt với nhà tuyển dụng</p>
            </div>
            <span className="progress-ring">
              <UserRound size={20} />
            </span>
          </div>
          <div className="profile-progress">
            <div className="progress-bar">
              <span
                style={{
                  width: `${([user?.phone, user?.university, user?.major, user?.skills?.length, user?.bio, user?.cvUrl].filter(Boolean).length / 6) * 100}%`,
                }}
              />
            </div>
            <b>
              {Math.round(
                ([
                  user?.phone,
                  user?.university,
                  user?.major,
                  user?.skills?.length,
                  user?.bio,
                  user?.cvUrl,
                ].filter(Boolean).length /
                  6) *
                  100,
              )}
              % complete
            </b>
          </div>
          <p className="muted small-text">
            A complete profile helps employers understand what you bring to the
            table.
          </p>
          <Link to="/student/profile" className="btn btn-outline btn-block">
            Hoàn thiện hồ sơ của bạn <ArrowRight size={15} />
          </Link>
          <div className="profile-tip">
            <Sparkles size={17} />
            <span>
              <b>Mẹo hữu ích</b>
              <small>
                Bổ sung kỹ năng và CV để hồ sơ ứng tuyển nổi bật hơn.
              </small>
            </span>
          </div>
        </section>
      </div>
      <section className="panel recommended-panel">
        <div className="panel-heading">
          <div>
            <h2>Dành riêng cho bạn</h2>
            <p>Những vị trí phù hợp để khám phá</p>
          </div>
          <Link className="text-link" to="/jobs">
            Xem tất cả việc làm <ArrowRight size={15} />
          </Link>
        </div>
        <div className="job-grid">
          {recommended.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </section>
    </>
  );
}
function ApplicationRow({
  app,
  showStudent = true,
}: {
  app: Application;
  showStudent?: boolean;
}) {
  const job = jobService.byId(app.jobId);
  const student = store.users().find((u) => u.id === app.studentId);
  return (
    <Link
      to={
        showStudent
          ? `/employer/applications/${app.id}`
          : `/student/applications/${app.id}`
      }
      className="activity-row"
    >
      <CompanyMark name={job?.company || "SJ"} />
      <div className="activity-row-main">
        <b>{showStudent ? student?.name : job?.title || "Job listing"}</b>
        <span>
          {showStudent ? job?.title : job?.company} · {date(app.appliedAt)}
        </span>
      </div>
      <span className={`status-pill ${statusClass(app.status)}`}>
        {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
      </span>
      <ArrowRight className="activity-arrow" size={16} />
    </Link>
  );
}
function StudentProfile() {
  const { user, setUser } = useContext(AuthContext);
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    university: user?.university || "",
    major: user?.major || "",
    skills: user?.skills?.join(", ") || "",
    bio: user?.bio || "",
    cvUrl: user?.cvUrl || "",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = await userService.loadProfile();

        if (cancelled) return;

        setUser(profile);

        setForm({
          name: profile.name || "",
          phone: profile.phone || "",
          university: profile.university || "",
          major: profile.major || "",
          skills: profile.skills?.join(", ") || "",
          bio: profile.bio || "",
          cvUrl: profile.cvUrl || "",
        });
      } catch (error) {
        if (!cancelled) {
          toast(
            error instanceof Error
              ? error.message
              : "Không thể tải hồ sơ",
            "error"
          );
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <>
      <PageHeader
        eyebrow="YOUR PERSONAL BRAND"
        title="My profile"
        subtitle="Help employers get to know the person behind the application."
        action={
          !editing ? (
            <button
              className="btn btn-primary"
              onClick={() => setEditing(true)}
            >
              <Pencil size={16} /> Chỉnh sửa hồ sơ
            </button>
          ) : (
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditing(false);
                setForm({
                  name: user?.name || "",
                  phone: user?.phone || "",
                  university: user?.university || "",
                  major: user?.major || "",
                  skills: user?.skills?.join(", ") || "",
                  bio: user?.bio || "",
                  cvUrl: user?.cvUrl || "",
                });
              }}
            >
              Hủy
            </button>
          )
        }
      />
      <div className="profile-page-grid">
        <section className="panel profile-main-panel">
          <div className="profile-hero">
            <span className="avatar profile-avatar">
              {form.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <h2>{form.name || "Your name"}</h2>
              <p>
                {form.major || "Add tương lai field of study"}{" "}
                {form.university ? `· ${form.university}` : ""}
              </p>
              <span className="profile-email">
                <Mail size={14} />
                {user?.email}
              </span>
            </div>
            <span className="status-pill status-green">Hồ sơ sinh viên</span>
          </div>
          <div className="form-section-head">
            <h3>Thông tin cá nhân</h3>
            <p>Cập nhật thông tin để nhà tuyển dụng có thể liên hệ.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast("Full name is required", "error");
                return;
              }
              const updated = {
                ...user!,
                name: form.name,
                phone: form.phone,
                university: form.university,
                major: form.major,
                skills: form.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                bio: form.bio,
                cvUrl: form.cvUrl,
              };
              userService.save(updated);
              setUser(updated);
              setEditing(false);
              toast("Đã lưu hồ sơ thành công!");
            }}
          >
            <div className="form-grid">
              <Field label="Full name">
                <input
                  className="form-control"
                  value={form.name}
                  disabled={!editing}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Email address">
                <input
                  className="form-control"
                  value={user?.email || ""}
                  disabled
                />
              </Field>
              <Field label="Phone number">
                <input
                  className="form-control"
                  value={form.phone}
                  disabled={!editing}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+84..."
                />
              </Field>
              <Field label="University">
                <input
                  className="form-control"
                  value={form.university}
                  disabled={!editing}
                  onChange={(e) => update("university", e.target.value)}
                  placeholder="Trường đại học của bạn"
                />
              </Field>
              <Field label="Major / field of study">
                <input
                  className="form-control"
                  value={form.major}
                  disabled={!editing}
                  onChange={(e) => update("major", e.target.value)}
                  placeholder="Ví dụ: Kỹ thuật phần mềm"
                />
              </Field>
              <Field label="Skills (comma separated)">
                <input
                  className="form-control"
                  value={form.skills}
                  disabled={!editing}
                  onChange={(e) => update("skills", e.target.value)}
                  placeholder="React, SQL, Giao tiếp"
                />
              </Field>
              <Field label="CV URL" wide>
                <input
                  className="form-control"
                  type="url"
                  value={form.cvUrl}
                  disabled={!editing}
                  onChange={(e) => update("cvUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="About me" wide>
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.bio}
                  disabled={!editing}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Chia sẻ sở thích và mục tiêu nghề nghiệp của bạn..."
                />
              </Field>
            </div>
            {editing && (
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">
                  <Check size={16} /> Lưu thay đổi
                </button>
              </div>
            )}
          </form>
        </section>
        <aside className="profile-side">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Mức độ hoàn thiện hồ sơ</h2>
                <p>Mỗi bước nhỏ đều có ý nghĩa</p>
              </div>
              <Sparkles size={19} className="brand-blue" />
            </div>
            <div className="strength-score">
              <span>
                {Math.round(
                  ([
                    user?.phone,
                    user?.university,
                    user?.major,
                    user?.skills?.length,
                    user?.bio,
                    user?.cvUrl,
                  ].filter(Boolean).length /
                    6) *
                    100,
                )}
                %
              </span>
              <small>hoàn thành</small>
            </div>
            <div className="strength-checks">
              {[
                ["Contact number", user?.phone],
                ["University", user?.university],
                ["Field of study", user?.major],
                ["Skills", user?.skills?.length],
                ["About me", user?.bio],
                ["CV link", user?.cvUrl],
              ].map(([l, v]) => (
                <div key={String(l)}>
                  <span className={v ? "check-done" : "check-empty"}>
                    {v ? <Check size={12} /> : null}
                  </span>
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div className="panel profile-tip-panel">
            <span className="tip-icon">
              <ShieldCheck size={19} />
            </span>
            <h3>Cung cấp thông tin chính xác</h3>
            <p>
              Use accurate information and a current CV so employers can get a
              clear picture of tương lai experience.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field-label ${wide ? "field-wide" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function StudentApplications() {
  const { user } = useContext(AuthContext);

  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");

  // Lấy danh sách công việc từ store
  const jobs = store.jobs();

  // Lấy các đơn ứng tuyển của tài khoản hiện tại
  const allApps = applicationService
    .all()
    .filter((a) => a.studentId === user?.id);

  // Tìm công việc tương ứng với đơn ứng tuyển
  const findJob = (jobId: string) => {
    return (
      jobs.find((job) => String(job.id) === String(jobId)) ??
      jobService.byId(jobId)
    );
  };

  // Lọc theo trạng thái và từ khóa
  const apps = allApps.filter((a) => {
    const job = findJob(a.jobId);
    const jobTitle = a.jobTitle || job?.title || "";
    const jobCompany = a.jobCompany || job?.company || "";

    const matchesStatus = filter === "ALL" || a.status === filter;

    const searchText = `${jobTitle} ${jobCompany}`.toLowerCase();

    const matchesSearch = searchText.includes(q.trim().toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Thống kê trạng thái
  const total = allApps.length;

  const pending = allApps.filter((a) => a.status === "PENDING").length;

  const accepted = allApps.filter((a) => a.status === "ACCEPTED").length;

  const rejected = allApps.filter((a) => a.status === "REJECTED").length;

  return (
    <>
      <PageHeader
        eyebrow="QUẢN LÝ ỨNG TUYỂN"
        title="Đơn ứng tuyển của tôi"
        subtitle="Theo dõi tiến độ và trạng thái các đơn ứng tuyển."
        action={
          <Link to="/jobs" className="btn btn-primary">
            <Plus size={16} />
            Tìm thêm việc làm
          </Link>
        }
      />

      {/* Thống kê */}
      
      
      <div className="application-summary">
        <div>
          <span>Tổng đơn ứng tuyển</span>
          <b>{applicationService.all().length}</b>
        </div>

        <div>
          <span>Đang chờ</span>
          <b>
            {applicationService.all().filter(
              (a) => a.status === "PENDING"
            ).length}
          </b>
        </div>

        <div>
          <span>Đã chấp nhận</span>
          <b>
            {applicationService.all().filter(
              (a) => a.status === "ACCEPTED"
            ).length}
          </b>
        </div>

        <div>
          <span>Đã từ chối</span>
          <b>
            {applicationService.all().filter(
              (a) => a.status === "REJECTED"
            ).length}
          </b>
        </div>
      </div>


      <section className="panel">
        {/* Tìm kiếm và lọc */}
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo công việc hoặc công ty..."
            />
          </label>

          <label className="sort-select">
            <ListFilter size={15} />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc đơn ứng tuyển"
            >
              <option value="ALL">Tất cả trạng thái</option>

              <option value="PENDING">Đang chờ</option>

              <option value="ACCEPTED">Đã chấp nhận</option>

              <option value="REJECTED">Đã từ chối</option>
            </select>
          </label>
        </div>

        {apps.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Công việc & Công ty</th>
                  <th>Ngày ứng tuyển</th>
                  <th>Trạng thái</th>
                  <th>CV</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {apps.map((a) => {
                  const job = findJob(a.jobId);
                  const jobTitle =
                    a.jobTitle || job?.title || "Chưa có thông tin công việc";
                  const jobCompany = a.jobCompany || job?.company || "";

                  const statusLabel =
                    a.status === "PENDING"
                      ? "Đang chờ"
                      : a.status === "ACCEPTED"
                        ? "Đã chấp nhận"
                        : a.status === "REJECTED"
                          ? "Đã từ chối"
                          : a.status;

                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="table-job">
                          <CompanyMark name={jobCompany || "SJ"} />

                          <span>
                            <b>{jobTitle}</b>

                            <small>{jobCompany}</small>
                          </span>
                        </div>
                      </td>

                      <td>{date(a.appliedAt)}</td>

                      <td>
                        {a.cvUrl ? (
                          <span className="muted">Đã có CV</span>
                        ) : (
                          <span className="muted">Chưa có CV</span>
                        )}
                      </td>

                      <td>
                        {a.cvUrl ? (
                          <a
                            className="table-link"
                            href={a.cvUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Xem CV
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>

                      <td>
                        <Link
                          className="table-action"
                          to={`/student/applications/${a.id}`}
                          aria-label="Xem đơn ứng tuyển"
                        >
                          <ArrowRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPage
            title="Không tìm thấy đơn ứng tuyển"
            text={
              q || filter !== "ALL"
                ? "Hãy thử từ khóa hoặc bộ lọc khác."
                : "Bạn chưa có đơn ứng tuyển nào."
            }
            action={
              <Link to="/jobs" className="btn btn-primary">
                Tìm việc làm
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
function ApplicationDetails({ role }: { role: "STUDENT" | "EMPLOYER" }) {
  const { id = "" } = useParams();
  const { user } = useContext(AuthContext);
  const app = applicationService.all().find((a) => a.id === id);
  const job = app ? jobService.byId(app.jobId) : undefined;
  const studentName = app?.studentName || "Applicant";
  if (role === "STUDENT" && app && app.studentId !== user?.id)
    return <Navigate to="/unauthorized" />;
  if (role === "EMPLOYER" && job && job.employerUserId !== user?.id)
    return <Navigate to="/unauthorized" />;
  if (!app)
    return (
      <EmptyPage
        title="Application not found"
        text="Open the application from the applicants list after loading the job's applications."
        action={
          <Link
            className="btn btn-primary"
            to={role === "STUDENT" ? "/student/applications" : "/employer/jobs"}
          >
            Quay lại
          </Link>
        }
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="APPLICATION DETAILS"
        title={role === "STUDENT" ? "Application overview" : studentName}
        subtitle={job?.title || "Job listing"}
        action={
          <Link
            className="btn btn-outline"
            to={role === "STUDENT" ? "/student/applications" : "/employer/jobs"}
          >
            <ArrowLeft size={15} /> Quay lại
          </Link>
        }
      />
      <div className="detail-layout application-detail-layout">
        <section className="panel detail-section">
          <h2>Trạng thái ứng tuyển</h2>
          <span className={`status-pill ${statusClass(app.status)}`}>
            {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
          </span>
          <div className="application-timeline">
            <div className="timeline-item done">
              <span>
                <Check size={13} />
              </span>
              <div>
                <b>Đã gửi đơn ứng tuyển</b>
                <small>{date(app.appliedAt)}</small>
              </div>
            </div>
            <div
              className={`timeline-item ${app.status !== "PENDING" ? "done" : ""}`}
            >
              <span>
                {app.status === "PENDING" ? (
                  <Clock3 size={13} />
                ) : app.status === "ACCEPTED" ? (
                  <Check size={13} />
                ) : (
                  <X size={13} />
                )}
              </span>
              <div>
                <b>
                  {app.status === "PENDING"
                    ? "Awaiting employer decision"
                    : app.status === "ACCEPTED"
                      ? "Application accepted"
                      : "Application not selected"}
                </b>
                <small>
                  {app.status === "PENDING"
                    ? "The employer has not updated this application yet."
                    : "Your application status was updated."}
                </small>
              </div>
            </div>
          </div>
          <h3>Lời giới thiệu</h3>
          <p>{app.message || "No message was provided."}</p>
          <h3>CV đã nộp</h3>
          {app.cvUrl ? (
            <a
              className="btn btn-outline"
              href={app.cvUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={16} /> Mở liên kết CV <ExternalLink size={14} />
            </a>
          ) : (
            <p className="muted">Chưa có liên kết CV được nộp.</p>
          )}
        </section>
        <aside className="panel detail-section">
          <h2>
            {role === "STUDENT" ? "Job information" : "Applicant profile"}
          </h2>
          {role === "STUDENT" ? (
            <>
              <CompanyMark name={job?.company || "SJ"} />
              <h3>{job?.title}</h3>
              <p className="muted">{job?.company}</p>
              <p className="muted tiny">
                <MapPin size={13} />
                {job?.location}
              </p>
              {job && (
                <Link to={`/jobs/${job.id}`} className="text-link">
                  Xem chi tiết công việc <ArrowRight size={15} />
                </Link>
              )}
              {app.status === "ACCEPTED" && (
                <Link
                  className="btn btn-primary btn-block review-button"
                  to={`/student/applications/${app.id}/review`}
                >
                  Viết đánh giá <Star size={15} />
                </Link>
              )}
            </>
          ) : (
            <>
              <span className="avatar profile-avatar">
                {studentName
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <h3>{studentName}</h3>
              <p className="muted">
                {app.studentMajor || "Student"}{" "}
                {app.studentUniversity ? `· ${app.studentUniversity}` : ""}
              </p>
              {app.studentEmail && (
                <p className="muted tiny">
                  <Mail size={13} />
                  {app.studentEmail}
                </p>
              )}
              {app.studentPhone && (
                <p className="muted tiny">
                  <Phone size={13} />
                  {app.studentPhone}
                </p>
              )}
              <h3>Kỹ năng / hồ sơ</h3>
              <p className="muted">
                {app.studentUniversity || "Student applicant"}
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
function ReviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const app = applicationService
    .all()
    .find((a) => a.id === id && a.studentId === user?.id);
  const job = app ? jobService.byId(app.jobId) : undefined;
  const existing = store
    .reviews()
    .some((r) => r.jobId === app?.jobId && r.studentId === user?.id);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  if (!app || app.status !== "ACCEPTED" || !job || existing)
    return (
      <>
        <PageHeader
          eyebrow="SHARE YOUR EXPERIENCE"
          title="Leave a review"
          subtitle="Reviews help students make more informed choices."
        />
        <EmptyPage
          title={
            existing
              ? "You have already reviewed this job"
              : "Review not available"
          }
          text={
            existing
              ? "Each eligible job can be reviewed once."
              : "Only accepted applications are eligible for reviews in this demo."
          }
          action={
            <Link className="btn btn-primary" to="/student/applications">
              Quay lại đơn ứng tuyển
            </Link>
          }
        />
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="SHARE YOUR EXPERIENCE"
        title="How was the experience?"
        subtitle={`Leave an honest review for ${job.company}.`}
      />
      <section className="panel review-form-panel">
        <div className="review-job">
          <CompanyMark name={job.company} />
          <span>
            <b>{job.title}</b>
            <small>{job.company}</small>
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              reviewService.create(job.id, user!, rating, comment);
              toast("Thanks for sharing tương lai review!");
              navigate(`/student/applications/${app.id}`);
            } catch (err) {
              toast(
                err instanceof Error ? err.message : "Could not save review",
                "error",
              );
            }
          }}
        >
          <fieldset className="rating-field">
            <legend>Đánh giá của bạn</legend>
            <div className="rating-input">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  aria-label={`${i + 1} stars`}
                  onClick={() => setRating(i + 1)}
                >
                  <Star size={31} fill={i < rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <small className="muted">
              {
                [
                  "",
                  "Not great",
                  "Could be better",
                  "It was okay",
                  "Really good",
                  "Excellent experience",
                ][rating]
              }
            </small>
          </fieldset>
          <Field label="Your review">
            <textarea
              className="form-control"
              required
              minLength={10}
              maxLength={600}
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bạn đã học được gì? Môi trường làm việc thế nào?"
            />
          </Field>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
            >
              Hủy
            </button>
            <button className="btn btn-primary" type="submit">
              <Star size={16} /> Gửi đánh giá
            </button>
          </div>
        </form>
        <p className="muted tiny">
          Demo rule: only accepted applications can be reviewed, and each job
          can be reviewed once per student.
        </p>
      </section>
    </>
  );
}
function EmployerRoutes() {
  return (
    <Shell role="EMPLOYER">
      <Routes>
        <Route path="dashboard" element={<EmployerDashboard />} />
        <Route path="jobs" element={<EmployerJobs />} />
        <Route path="messages" element={<ChatPage />} />
        <Route path="jobs/new" element={<JobEditor />} />
        <Route path="jobs/:id/edit" element={<JobEditor />} />
        <Route path="jobs/:id/applications" element={<EmployerApplicants />} />
        <Route
          path="applications/:id"
          element={<ApplicationDetails role="EMPLOYER" />}
        />
        <Route
          path="*"
          element={<Navigate to="/employer/dashboard" replace />}
        />
      </Routes>
    </Shell>
  );
}
function EmployerDashboard() {
  const { user } = useContext(AuthContext);

  // API /jobs/mine đã trả về job của Employer hiện tại
  const jobs = jobService.all();

  const apps = applicationService
    .all()
    .filter((a) => jobs.some((j) => j.id === a.jobId));

  return (
    <>
      <PageHeader
        eyebrow="RECRUITMENT OVERVIEW"
        title={`Welcome back, ${user?.name.split(" ")[0] || "there"}`}
        subtitle="Here's tương lai hiring activity at a glance."
        action={
          <Link className="btn btn-primary" to="/employer/jobs/new">
            <Plus size={17} /> Đăng tin tuyển dụng
          </Link>
        }
      />
      <div className="metrics-grid four">
        <Metric
          label="Total job listings"
          value={jobs.length}
          icon={<BriefcaseBusiness />}
        />
        <Metric
          label="Open positions"
          value={jobs.filter((j) => j.status === "OPEN").length}
          icon={<Globe />}
          variant="green"
        />
        <Metric
          label="Closed positions"
          value={jobs.filter((j) => j.status === "CLOSED").length}
          icon={<Ban />}
          variant="purple"
        />
        <Metric
          label="Total applicants"
          value={apps.length}
          icon={<Users />}
          variant="amber"
        />
      </div>
      <div className="dashboard-two-col employer-dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Hoạt động ứng tuyển</h2>
              <p>Đơn nhận được trong tuần</p>
            </div>
            <span className="chart-badge">
              <ChartNoAxesCombined size={16} /> Tổng quan
            </span>
          </div>
          <div className="chart-wrap">
            <div className="chart-bars">
              {[
                { d: "Mon", n: 3 },
                { d: "Tue", n: 5 },
                { d: "Wed", n: 2 },
                { d: "Thu", n: 7 },
                { d: "Fri", n: 4 },
                { d: "Sat", n: 2 },
                { d: "Sun", n: 6 },
              ].map((v) => (
                <div className="chart-column" key={v.d}>
                  <span className="bar-value">{v.n}</span>
                  <span
                    className="chart-bar"
                    style={{ height: `${v.n * 12 + 15}px` }}
                  />
                  <small>{v.d}</small>
                </div>
              ))}
            </div>
            <div className="chart-foot">
              <span>
                <i className="chart-legend" />
                Đơn ứng tuyển đã nhận
              </span>
              <b>{apps.length} total</b>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Trạng thái ứng tuyển</h2>
              <p>Trên các tin tuyển dụng của bạn</p>
            </div>
          </div>
          <div className="status-breakdown">
            {[
              {
                label: "Pending",
                n: apps.filter((a) => a.status === "PENDING").length,
                c: "pending",
              },
              {
                label: "Accepted",
                n: apps.filter((a) => a.status === "ACCEPTED").length,
                c: "accepted",
              },
              {
                label: "Rejected",
                n: apps.filter((a) => a.status === "REJECTED").length,
                c: "rejected",
              },
            ].map((v) => (
              <div className="breakdown-row" key={v.label}>
                <span>
                  <i className={`legend-dot ${v.c}`} />
                  {v.label}
                </span>
                <b>{v.n}</b>
                <div className="breakdown-track">
                  <span
                    className={v.c}
                    style={{
                      width: `${apps.length ? (v.n / apps.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link className="btn btn-outline btn-block" to="/employer/jobs">
            Quản lý tin tuyển dụng <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel recommended-panel">
        <div className="panel-heading">
          <div>
            <h2>Tin tuyển dụng của bạn</h2>
            <p>Quản lý vị trí và theo dõi ứng viên</p>
          </div>
          <Link className="text-link" to="/employer/jobs">
            Xem tất cả <ArrowRight size={15} />
          </Link>
        </div>
        {jobs.length ? (
          <div className="employer-job-list">
            {jobs.slice(0, 4).map((j) => (
              <div className="employer-job-row" key={j.id}>
                <CompanyMark name={j.company} />
                <div className="employer-job-main">
                  <b>{j.title}</b>
                  <span>
                    {j.applicants} applicants · Đăng ngày {date(j.postedAt)}
                  </span>
                </div>
                <span className={`status-pill ${statusClass(j.status)}`}>
                  {j.status === "OPEN" ? "Open" : "Closed"}
                </span>
                <Link
                  className="btn btn-outline btn-sm"
                  to={`/employer/jobs/${j.id}/applications`}
                >
                  Xem ứng viên
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPage
            title="No listings yet"
            text="Post tương lai first job to start meeting candidates."
            action={
              <Link to="/employer/jobs/new" className="btn btn-primary">
                Tạo tin tuyển dụng
              </Link>
            }
          />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Đơn ứng tuyển gần đây</h2>
            <p>Ứng viên mới nhất cho các vị trí của bạn</p>
          </div>
        </div>
        {apps.length ? (
          <div className="activity-list">
            {apps.slice(0, 4).map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </div>
        ) : (
          <p className="muted">Đơn ứng tuyển mới sẽ hiển thị tại đây.</p>
        )}
      </section>
    </>
  );
}
function EmployerJobs() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [confirm, setConfirm] = useState<Job | null>(null);
  const jobs = jobService
    .all()
    .filter(
      (j) =>
        (status === "ALL" || j.status === status) &&
        `${j.title} ${j.category}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "salary"
        ? b.salaryMax - a.salaryMax
        : b.postedAt.localeCompare(a.postedAt),
    );
  return (
    <>
      <PageHeader
        eyebrow="YOUR OPEN ROLES"
        title="Job listings"
        subtitle="Create, update, and manage the opportunities you share."
        action={
          <Link to="/employer/jobs/new" className="btn btn-primary">
            <Plus size={16} /> Tạo tin tuyển dụng
          </Link>
        }
      />
      <div className="application-summary">
        <div>
          <span>Tổng tin tuyển dụng</span>
          <b>{jobService.all().length}</b>
        </div>
        <div>
          <span>Đang mở</span>
          <b>{jobService.all().filter((j) => j.status === "OPEN").length}</b>
        </div>
        <div>
          <span>Đã đóng</span>
          <b>{jobService.all().filter((j) => j.status === "CLOSED").length}</b>
        </div>
        <div>
          <span>Ứng viên</span>
          <b>
            {
              applicationService
                .all()
                .filter((a) => jobService.all().some((j) => j.id === a.jobId))
                .length
            }
          </b>
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm tin tuyển dụng..."
            />
          </label>
          <label className="sort-select">
            <ListFilter size={15} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="OPEN">Đang mở</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </label>
          <label className="sort-select">
            <ArrowDownUp size={15} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Mới nhất trước</option>
              <option value="salary">Lương cao nhất</option>
            </select>
          </label>
        </div>
        {jobs.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tin tuyển dụng</th>
                  <th>Ngày đăng</th>
                  <th>Ứng viên</th>
                  <th>Trạng thái</th>
                  <th>Kiểm duyệt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <div className="table-job">
                        <CompanyMark name={j.company} />
                        <span>
                          <b>{j.title}</b>
                          <small>
                            {j.category} · {j.type.replace("_", " ")}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{date(j.postedAt)}</td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/employer/jobs/${j.id}/applications`}
                      >
                        {
                          applicationService
                            .all()
                            .filter((a) => a.jobId === j.id).length
                        }{" "}
                        applicants <ArrowRight size={12} />
                      </Link>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(j.status)}`}>
                        {j.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${statusClass(j.moderation)}`}
                      >
                        {j.moderation}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="table-action"
                          title="Edit listing"
                          to={`/employer/jobs/${j.id}/edit`}
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          className="table-action"
                          title={
                            j.status === "OPEN"
                              ? "Close listing"
                              : "Reopen listing"
                          }
                          onClick={() => {
                            jobService.save({
                              ...j,
                              status: j.status === "OPEN" ? "CLOSED" : "OPEN",
                            });
                            toast(
                              j.status === "OPEN"
                                ? "Listing closed"
                                : "Listing reopened",
                            );
                          }}
                        >
                          {j.status === "OPEN" ? (
                            <Ban size={15} />
                          ) : (
                            <RefreshCw size={15} />
                          )}
                        </button>
                        <button
                          className="table-action danger-action"
                          title="Deletion is not available yet"
                          onClick={() =>
                            toast(
                              "The backend does not support deleting job listings yet.",
                              "info",
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPage
            title="No listings found"
            text={
              q
                ? "Try another search term."
                : "Create tương lai first listing and start building tương lai team."
            }
            action={
              <Link className="btn btn-primary" to="/employer/jobs/new">
                <Plus size={16} /> Tạo tin tuyển dụng
              </Link>
            }
          />
        )}
      </section>
      {confirm && (
        <Modal title="Delete this listing?" onClose={() => setConfirm(null)}>
          <p>
            Bạn sắp xóa <b>{confirm.title}</b>. This action removes
            the listing from the demo workspace.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setConfirm(null)}
            >
              Giữ tin tuyển dụng
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                jobService.remove(confirm.id);
                setConfirm(null);
                toast("Listing deleted");
              }}
            >
              Xóa tin tuyển dụng
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function JobEditor() {
  const { id = "" } = useParams();
  const editing = !!id;
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();
  const existing = editing ? jobService.byId(id) : undefined;
  const [form, setForm] = useState({
    title: existing?.title || "",
    category: existing?.category || "Technology",
    type: existing?.type || "PART_TIME",
    salaryMin: String(existing?.salaryMin || 5000000),
    salaryMax: String(existing?.salaryMax || 8000000),
    location: existing?.location || "Ho Chi Minh City",
    arrangement: existing?.arrangement || "Hybrid",
    deadline: existing?.deadline || "2026-12-31",
    description: existing?.description || "",
    responsibilities: existing?.responsibilities.join("\n") || "",
    requirements: existing?.requirements.join("\n") || "",
    skills: existing?.skills.join(", ") || "",
    status: existing?.status || "OPEN",
  });
  const [errors, setErrors] = useState<string[]>([]);
  if (editing && (!existing || existing.employerUserId !== user?.id))
    return (
      <EmptyPage
        title="Listing not found"
        text="You can only edit listings owned by tương lai account."
        action={
          <Link to="/employer/jobs" className="btn btn-primary">
            Quay lại danh sách
          </Link>
        }
      />
    );
  const change = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }) as typeof f);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (form.title.trim().length < 4)
      errs.push("Add a job title with at least 4 characters.");
    if (!form.description.trim()) errs.push("Job description is required.");
    if (
      Number(form.salaryMin) < 0 ||
      Number(form.salaryMax) < Number(form.salaryMin)
    )
      errs.push("Check that the salary range is valid.");
    if (!form.deadline) errs.push("Choose an application deadline.");
    if (errs.length) {
      setErrors(errs);
      return;
    }
    const job: Job = {
      id: existing?.id || `j-${Date.now()}`,
      title: form.title.trim(),
      company: user?.company || user?.name || "Demo Company",
      employerId: user!.id,
      category: form.category,
      type: form.type as Job["type"],
      salaryMin: Number(form.salaryMin),
      salaryMax: Number(form.salaryMax),
      location: form.location,
      arrangement: form.arrangement as Job["arrangement"],
      deadline: form.deadline,
      description: form.description,
      responsibilities: form.responsibilities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      requirements: form.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: form.status as Job["status"],
      postedAt: existing?.postedAt || new Date().toISOString().slice(0, 10),
      moderation: existing?.moderation || "PENDING",
      applicants: existing?.applicants || 0,
    };
    try {
      await jobService.save(job);
      toast(
        editing
          ? "Listing updated successfully"
          : "Listing submitted for admin moderation",
      );
      navigate("/employer/jobs");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not save job listing",
        "error",
      );
    }
  };
  return (
    <>
      <PageHeader
        eyebrow={editing ? "UPDATE A ROLE" : "GROW YOUR TEAM"}
        title={editing ? "Edit job listing" : "Create a job listing"}
        subtitle="Clear details help the right candidates picture themselves in the role."
        action={
          <button
            className="btn btn-outline"
            onClick={() => navigate("/employer/jobs")}
          >
            <ArrowLeft size={15} /> Quay lại danh sách
          </button>
        }
      />
      <form onSubmit={submit} className="editor-layout">
        <div className="editor-main">
          <section className="panel editor-panel">
            <div className="form-section-head">
              <span className="section-icon">
                <BriefcaseBusiness size={18} />
              </span>
              <div>
                <h3>Chi tiết công việc</h3>
                <p>Nhập thông tin quan trọng để ứng viên dễ dàng tìm hiểu.</p>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Job title *" wide>
                <input
                  className="form-control"
                  required
                  minLength={4}
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Ví dụ: Thực tập sinh lập trình Frontend"
                />
              </Field>
              <Field label="Category *">
                <select
                  className="form-control"
                  value={form.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {[
                    "Technology",
                    "Marketing",
                    "Design",
                    "Data & Analytics",
                    "Education",
                    "Operations",
                    "Customer Service",
                    "Finance",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Job type *">
                <select
                  className="form-control"
                  value={form.type}
                  onChange={(e) => change("type", e.target.value)}
                >
                  <option value="PART_TIME">Bán thời gian</option>
                  <option value="FULL_TIME">Toàn thời gian</option>
                  <option value="FREELANCE">Làm tự do</option>
                </select>
              </Field>
              <Field label="Minimum salary (VND) *">
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  required
                  value={form.salaryMin}
                  onChange={(e) => change("salaryMin", e.target.value)}
                />
              </Field>
              <Field label="Maximum salary (VND) *">
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  required
                  value={form.salaryMax}
                  onChange={(e) => change("salaryMax", e.target.value)}
                />
              </Field>
              <Field label="Location *">
                <input
                  className="form-control"
                  required
                  value={form.location}
                  onChange={(e) => change("location", e.target.value)}
                  placeholder="Thành phố hoặc làm từ xa"
                />
              </Field>
              <Field label="Working arrangement">
                <select
                  className="form-control"
                  value={form.arrangement}
                  onChange={(e) => change("arrangement", e.target.value)}
                >
                  <option>Tại văn phòng</option>
                  <option>Kết hợp</option>
                  <option>Làm từ xa</option>
                </select>
              </Field>
              <Field label="Application deadline *">
                <input
                  className="form-control"
                  type="date"
                  required
                  value={form.deadline}
                  onChange={(e) => change("deadline", e.target.value)}
                />
              </Field>
              <Field label="Listing status">
                <select
                  className="form-control"
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="OPEN">Đang mở</option>
                  <option value="CLOSED">Đã đóng</option>
                </select>
              </Field>
            </div>
          </section>
          <section className="panel editor-panel">
            <div className="form-section-head">
              <span className="section-icon">
                <FileText size={18} />
              </span>
              <div>
                <h3>Mô tả vị trí</h3>
                <p>
                  Help candidates understand the work and how they'll
                  contribute.
                </p>
              </div>
            </div>
            <div className="editor-fields">
              <Field label="About this role *">
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Mô tả công việc, đội nhóm và những điểm hấp dẫn của vị trí..."
                />
              </Field>
              <Field label="Responsibilities (one per line)">
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.responsibilities}
                  onChange={(e) => change("responsibilities", e.target.value)}
                  placeholder={
                    "Build and improve product features\nCollaborate with teammates\nShare progress and learnings"
                  }
                />
              </Field>
              <Field label="Requirements (one per line)">
                <textarea
                  className="form-control"
                  rows={4}
                  value={form.requirements}
                  onChange={(e) => change("requirements", e.target.value)}
                  placeholder={
                    "Currently enrolled in university\nStrong communication skills\nEager to learn"
                  }
                />
              </Field>
              <Field label="Required skills (comma separated)">
                <input
                  className="form-control"
                  value={form.skills}
                  onChange={(e) => change("skills", e.target.value)}
                  placeholder="React, TypeScript, CSS"
                />
              </Field>
            </div>
          </section>
          {errors.length > 0 && (
            <div className="validation-summary">
              <b>Vui lòng kiểm tra thông tin:</b>
              {errors.map((e) => (
                <span key={e}>• {e}</span>
              ))}
            </div>
          )}
          <div className="editor-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/employer/jobs")}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              {editing ? "Lưu thay đổi" : "Tạo tin tuyển dụng"}
            </button>
          </div>
        </div>
        <aside className="editor-aside">
          <div className="panel">
            <span className="tip-icon">
              <Sparkles size={19} />
            </span>
            <h3>Mẹo đăng tin hiệu quả</h3>
            <ul className="editor-tips">
              <li>Đặt tiêu đề công việc rõ ràng, cụ thể.</li>
              <li>Minh bạch về mức lương và hình thức làm việc.</li>
              <li>Nêu rõ nhiệm vụ và kỹ năng cần thiết.</li>
              <li>Đặt hạn ứng tuyển phù hợp.</li>
            </ul>
          </div>
          <div className="panel moderation-note">
            <ShieldCheck size={20} />
            <b>Kiểm duyệt minh họa</b>
            <p>
              New listings start as pending and must be approved by the demo
              administrator before they appear publicly.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
function EmployerApplicants() {
  const toast = useToast();
  const { id = "" } = useParams();
  const { user } = useContext(AuthContext);
  const job = jobService.byId(id);
  const [filter, setFilter] = useState("ALL");
  const [confirm, setConfirm] = useState<{
    app: Application;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);
  useEffect(() => {
    if (!id) return;
    applicationService
      .loadByJob(id)
      .catch((error) =>
        toast(
          error instanceof Error ? error.message : "Could not load applicants",
          "error",
        ),
      );
  }, [id]);
  if (!job || job.employerUserId !== user?.id)
    return (
      <EmptyPage
        title="Listing not found"
        text="You can only view applicants for tương lai own listings."
        action={
          <Link className="btn btn-primary" to="/employer/jobs">
            Quay lại danh sách
          </Link>
        }
      />
    );
  const apps = applicationService
    .all()
    .filter(
      (a) => a.jobId === job.id && (filter === "ALL" || a.status === filter),
    );
  return (
    <>
      <PageHeader
        eyebrow="CANDIDATE PIPELINE"
        title="Applicants"
        subtitle={`${job.title} · ${job.company}`}
        action={
          <Link to="/employer/jobs" className="btn btn-outline">
            <ArrowLeft size={15} /> Quay lại danh sách
          </Link>
        }
      />
      <div className="application-summary">
        <div>
          <span>Tổng ứng viên</span>
          <b>
            {applicationService.all().filter((a) => a.jobId === job.id).length}
          </b>
        </div>
        <div>
          <span>Chờ xét duyệt</span>
          <b>
            {
              applicationService
                .all()
                .filter((a) => a.jobId === job.id && a.status === "PENDING")
                .length
            }
          </b>
        </div>
        <div>
          <span>Đã chấp nhận</span>
          <b>
            {
              applicationService
                .all()
                .filter((a) => a.jobId === job.id && a.status === "ACCEPTED")
                .length
            }
          </b>
        </div>
        <div>
          <span>Đã từ chối</span>
          <b>
            {
              applicationService
                .all()
                .filter((a) => a.jobId === job.id && a.status === "REJECTED")
                .length
            }
          </b>
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <div>
            <h2>Đơn ứng tuyển của ứng viên</h2>
            <p className="muted tiny">
              Xem hồ sơ và cập nhật trạng thái ứng tuyển.
            </p>
          </div>
          <label className="sort-select">
            <ListFilter size={15} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </label>
        </div>
        {apps.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Ngày ứng tuyển</th>
                  <th>Trạng thái</th>
                  <th>CV</th>
                  <th>Quyết định</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const studentName = a.studentName || "Student applicant";
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          to={`/employer/applications/${a.id}`}
                          className="table-job candidate-link"
                        >
                          <span className="avatar small">
                            {studentName
                              .split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span>
                            <b>{studentName}</b>
                            <small>
                              {a.studentMajor ||
                                a.studentUniversity ||
                                "Student applicant"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{date(a.appliedAt)}</td>
                      <td>
                        <span
                          className={`status-pill ${statusClass(a.status)}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.cvUrl?.startsWith("private-cv:") ? (
                          <div className="cv-actions">
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={async () => {
                                try {
                                  await api.applications.viewCv(a.id);
                                } catch (error) {
                                  toast(
                                    error instanceof Error
                                      ? error.message
                                      : "Không thể xem CV",
                                    "error",
                                  );
                                }
                              }}
                            >
                              <Eye size={14} />
                              Xem CV
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={async () => {
                                try {
                                  await api.applications.downloadCv(a.id);
                                } catch (error) {
                                  toast(
                                    error instanceof Error
                                      ? error.message
                                      : "Không thể tải CV",
                                    "error",
                                  );
                                }
                              }}
                            >
                              Tải CV
                            </button>
                          </div>
                        ) : (
                          <span className="muted">Chưa có CV PDF</span>
                        )}
                      </td>
                      <td>
                        {a.status === "PENDING" ? (
                          <div className="table-actions">
                            <button
                              className="table-action approve-action"
                              title="Accept applicant"
                              onClick={() =>
                                setConfirm({ app: a, status: "ACCEPTED" })
                              }
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="table-action danger-action"
                              title="Reject applicant"
                              onClick={() =>
                                setConfirm({ app: a, status: "REJECTED" })
                              }
                            >
                              <X size={16} />
                            </button>
                            <Link
                              className="table-action"
                              to={`/employer/applications/${a.id}`}
                              title="View details"
                            >
                              <Eye size={15} />
                            </Link>
                          </div>
                        ) : (
                          <Link
                            className="table-link"
                            to={`/employer/applications/${a.id}`}
                          >
                            Chi tiết <ArrowRight size={13} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPage
            title="No applicants in this view"
            text="Try another status or check back when students apply."
          />
        )}
      </section>
      {confirm && (
        <Modal
          title={
            confirm.status === "ACCEPTED"
              ? "Accept this applicant?"
              : "Reject this application?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm.status === "ACCEPTED"
              ? "This will mark the candidate as accepted."
              : "This will mark the candidate as not selected."}{" "}
            This is a simulated demo action and updates all relevant views.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setConfirm(null)}
            >
              Hủy
            </button>
            <button
              className={
                confirm.status === "ACCEPTED"
                  ? "btn btn-primary"
                  : "btn btn-danger"
              }
              onClick={async () => {
                try {
                  await applicationService.updateStatus(
                    confirm.app.id,
                    confirm.status,
                  );
                  setConfirm(null);
                  toast(`Application ${confirm.status.toLowerCase()}`);
                } catch (e) {
                  toast(
                    e instanceof Error
                      ? e.message
                      : "Could not update application",
                    "error",
                  );
                }
              }}
            >
              {confirm.status === "ACCEPTED"
                ? "Accept applicant"
                : "Reject application"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function AdminRoutes() {
  return (
    <Shell role="ADMIN">
      <Routes>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetails />} />
        <Route path="jobs" element={<AdminJobs />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}
function AdminDashboard() {
  const users = store.users(),
    jobs = jobService.all(),
    apps = applicationService.all();
  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OVERVIEW"
        title="Admin dashboard"
        subtitle="A clear view of the StudentJob community and its activity."
        action={
          <span className="status-pill status-blue">
            <ShieldCheck size={13} /> Quyền quản trị viên
          </span>
        }
      />
      <div className="metrics-grid four">
        <Metric
          label="Total users"
          value={users.length}
          icon={<Users />}
          trend="Across all account types"
        />
        <Metric
          label="Students"
          value={users.filter((u) => u.role === "STUDENT").length}
          icon={<GraduationCap />}
          variant="green"
        />
        <Metric
          label="Employers"
          value={users.filter((u) => u.role === "EMPLOYER").length}
          icon={<Building2 />}
          variant="purple"
        />
        <Metric
          label="Job listings"
          value={jobs.length}
          icon={<BriefcaseBusiness />}
          variant="amber"
        />
      </div>
      <div className="metrics-grid four admin-secondary-metrics">
        <Metric
          label="Open jobs"
          value={jobs.filter((j) => j.status === "OPEN").length}
          icon={<Globe />}
        />
        <Metric
          label="Closed jobs"
          value={jobs.filter((j) => j.status === "CLOSED").length}
          icon={<Ban />}
          variant="purple"
        />
        <Metric
          label="Pending moderation"
          value={jobs.filter((j) => j.moderation === "PENDING").length}
          icon={<Clock3 />}
          variant="amber"
        />
        <Metric
          label="Applications"
          value={apps.length}
          icon={<FileText />}
          variant="green"
        />
      </div>
      <div className="dashboard-two-col">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Hoạt động hệ thống</h2>
              <p>Tổng quan các chỉ số chính</p>
            </div>
            <Activity size={18} className="brand-blue" />
          </div>
          <div className="status-breakdown admin-breakdown">
            {[
              {
                label: "Active accounts",
                n: users.filter((u) => u.status === "ACTIVE").length,
                total: users.length,
                c: "accepted",
              },
              {
                label: "Approved listings",
                n: jobs.filter((j) => j.moderation === "APPROVED").length,
                total: jobs.length,
                c: "accepted",
              },
              {
                label: "Pending review",
                n: jobs.filter((j) => j.moderation === "PENDING").length,
                total: jobs.length,
                c: "pending",
              },
              {
                label: "Closed listings",
                n: jobs.filter((j) => j.status === "CLOSED").length,
                total: jobs.length,
                c: "rejected",
              },
            ].map((v) => (
              <div className="breakdown-row" key={v.label}>
                <span>
                  <i className={`legend-dot ${v.c}`} />
                  {v.label}
                </span>
                <b>{v.n}</b>
                <div className="breakdown-track">
                  <span
                    className={v.c}
                    style={{ width: `${v.total ? (v.n / v.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Cần xử lý</h2>
              <p>Các mục đang chờ quản trị viên duyệt</p>
            </div>
          </div>
          <div className="admin-task-list">
            <Link to="/admin/jobs" className="admin-task">
              <span className="task-icon amber">
                <Clock3 size={18} />
              </span>
              <span>
                <b>Tin đang chờ duyệt</b>
                <small>
                  {jobs.filter((j) => j.moderation === "PENDING").length}{" "}
                  listings to review
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/admin/users" className="admin-task">
              <span className="task-icon purple">
                <Users size={18} />
              </span>
              <span>
                <b>Quản lý tài khoản</b>
                <small>
                  {users.filter((u) => u.status === "BLOCKED").length} blocked
                  accounts
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/admin/applications" className="admin-task">
              <span className="task-icon blue">
                <ClipboardList size={18} />
              </span>
              <span>
                <b>Tổng quan ứng tuyển</b>
                <small>{apps.length} applications tracked</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Tin tuyển dụng gần đây</h2>
            <p>Nội dung mới nhất trên hệ thống</p>
          </div>
          <Link to="/admin/jobs" className="text-link">
            Duyệt tin tuyển dụng <ArrowRight size={15} />
          </Link>
        </div>
        <div className="employer-job-list">
          {[...jobs]
            .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
            .slice(0, 4)
            .map((j) => (
              <div className="employer-job-row" key={j.id}>
                <CompanyMark name={j.company} />
                <div className="employer-job-main">
                  <b>{j.title}</b>
                  <span>
                    {j.company} · {date(j.postedAt)}
                  </span>
                </div>
                <span className={`status-pill ${statusClass(j.moderation)}`}>
                  {j.moderation}
                </span>
                <Link className="btn btn-outline btn-sm" to="/admin/jobs">
                  Xem xét
                </Link>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}

function AdminUsers() {
  const toast = useToast();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [confirm, setConfirm] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await store.loadUsers();

        if (!cancelled) {
          setUsers(data);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách người dùng"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      (role === "ALL" || u.role === role) &&
      (status === "ALL" || u.status === status) &&
      `${u.name} ${u.email} ${u.company || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  const handleChangeStatus = async () => {
    if (!confirm || saving) return;

    setSaving(true);

    try {
      const updated = await userService.toggleStatus(confirm.id);

      setUsers((current) =>
        current.map((u) =>
          u.id === updated.id ? updated : u
        )
      );

      setConfirm(null);

      toast(
        updated.status === "BLOCKED"
          ? "Đã khóa tài khoản thành công"
          : "Đã mở khóa tài khoản thành công"
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái tài khoản",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
     
      <PageHeader
        eyebrow="COMMUNITY MANAGEMENT"
        title="User management"
        subtitle="Review accounts and keep the marketplace healthy."
      />

      {loading && (
        <p>Đang tải danh sách người dùng...</p>
      )}

      {loadError && (
        <p style={{ color: "red" }}>
          {loadError}
        </p>
      )}

      <div className="application-summary">
        <div>
          <span>Tổng tài khoản</span>
          <b>{store.users().length}</b>
        </div>
        <div>
          <span>Sinh viên</span>
          <b>{store.users().filter((u) => u.role === "STUDENT").length}</b>
        </div>
        <div>
          <span>Nhà tuyển dụng</span>
          <b>{store.users().filter((u) => u.role === "EMPLOYER").length}</b>
        </div>
        <div>
          <span>Ngừng hoạt động</span>
          <b>{store.users().filter((u) => u.status === "BLOCKED").length}</b>
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, email hoặc công ty..."
            />
          </label>
          <label className="sort-select">
            <Users size={15} />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="ALL">Tất cả vai trò</option>
              <option value="STUDENT">Sinh viên</option>
              <option value="EMPLOYER">Nhà tuyển dụng</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>
          <label className="sort-select">
            <ListFilter size={15} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Đã khóa</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Ngày tham gia</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="table-job">
                      <span className="avatar small">
                        {u.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <b>{u.name}</b>
                        <small>{u.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="role-chip">{roleLabel(u.role)}</span>
                  </td>
                  <td>{date(u.joinedAt)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(u.status)}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="table-action"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Link>
                      {u.role !== "ADMIN" && (
                        <button
                          className="table-action"
                          title={
                            u.status === "ACTIVE"
                              ? "Deactivate user"
                              : "Activate user"
                          }
                          onClick={() => setConfirm(u)}
                        >
                          {u.status === "ACTIVE" ? (
                            <Ban size={15} />
                          ) : (
                            <CircleCheck size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && (
          <EmptyPage
            title="No users found"
            text="Try changing tương lai search or filters."
          />
        )}
      </section>
      {confirm && (
        <Modal
          title={`${confirm.status === "ACTIVE" ? "Deactivate" : "Activate"} this account?`}
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm.name}'s account will be marked{" "}
            {confirm.status === "ACTIVE"
              ? "Bạn có chắc muốn khóa tài khoản này?"
              : "Bạn có chắc muốn mở khóa tài khoản này?"}
            demo. This does not send any notification.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setConfirm(null)}
            >
              Hủy
            </button>
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleChangeStatus}
              disabled={saving}
            >
              {saving ? "Đang xử lý..." : "Xác nhận thay đổi"}
            </button>

          </div>
        </Modal>
      )}
    </>
  );
}
function AdminUserDetails() {
  const { id = "" } = useParams();
  const u = store.users().find((x) => x.id === id);
  const toast = useToast();
  if (!u)
    return (
      <EmptyPage
        title="User not found"
        text="This account does not exist in the demo data."
        action={
          <Link className="btn btn-primary" to="/admin/users">
            Quay lại người dùng
          </Link>
        }
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="ACCOUNT DETAILS"
        title={u.name}
        subtitle="Review account information and current status."
        action={
          <Link to="/admin/users" className="btn btn-outline">
            <ArrowLeft size={15} /> Quay lại người dùng
          </Link>
        }
      />
      <div className="profile-page-grid">
        <section className="panel profile-main-panel">
          <div className="profile-hero">
            <span className="avatar profile-avatar">
              {u.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <h2>{u.name}</h2>
              <p>{roleLabel(u.role)}</p>
              <span className={`status-pill ${statusClass(u.status)}`}>
                {u.status}
              </span>
            </div>
          </div>
          <div className="form-section-head">
            <h3>Thông tin tài khoản</h3>
          </div>
          <div className="admin-user-info">
            <SideInfo icon={<Mail />} label="Email address" value={u.email} />
            <SideInfo
              icon={<CalendarDays />}
              label="Joined on"
              value={date(u.joinedAt)}
            />
            <SideInfo
              icon={<ShieldCheck />}
              label="Account role"
              value={roleLabel(u.role)}
            />
            {u.phone && (
              <SideInfo icon={<Phone />} label="Phone" value={u.phone} />
            )}
            {u.company && (
              <SideInfo
                icon={<Building2 />}
                label="Company"
                value={u.company}
              />
            )}
            {u.university && (
              <SideInfo
                icon={<GraduationCap />}
                label="University"
                value={u.university}
              />
            )}
            {u.major && (
              <SideInfo icon={<BookIcon />} label="Major" value={u.major} />
            )}
          </div>
        </section>
        <aside className="panel detail-section">
          <h3>Thao tác tài khoản</h3>
          <p className="muted small-text">
            Thao tác minh họa chỉ ảnh hưởng đến dữ liệu mẫu cục bộ.
          </p>
          {u.role !== "ADMIN" && (
            <button
              className={
                u.status === "ACTIVE"
                  ? "btn btn-danger btn-block"
                  : "btn btn-primary btn-block"
              }
              onClick={() => {
                userService.toggleStatus(u.id);
                toast("Account status updated");
                window.location.reload();
              }}
            >
              {u.status === "ACTIVE" ? <Ban size={16} /> : <Check size={16} />}{" "}
              {u.status === "ACTIVE"
                ? "Deactivate account"
                : "Activate account"}
            </button>
          )}
          <Link to="/admin/users" className="btn btn-outline btn-block">
            Quay lại danh sách người dùng
          </Link>
        </aside>
      </div>
    </>
  );
}
function BookIcon() {
  return <GraduationCap size={17} />;
}
function AdminJobs() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [moderation, setModeration] = useState("ALL");
  const [confirm, setConfirm] = useState<{
    job: Job;
    status: "APPROVED" | "REJECTED";
  } | null>(null);
  const [preview, setPreview] = useState<Job | null>(null);
  const jobs = jobService
    .all()
    .filter(
      (j) =>
        (moderation === "ALL" || j.moderation === moderation) &&
        `${j.title} ${j.company} ${j.category}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
  return (
    <>
      <PageHeader
        eyebrow="CONTENT REVIEW"
        title="Job moderation"
        subtitle="Review listings before they are shown to students."
      />
      <div className="application-summary">
        <div>
          <span>Tổng tin tuyển dụng</span>
          <b>{jobService.all().length}</b>
        </div>
        <div>
          <span>Chờ xét duyệt</span>
          <b>
            {jobService.all().filter((j) => j.moderation === "PENDING").length}
          </b>
        </div>
        <div>
          <span>Đã duyệt</span>
          <b>
            {jobService.all().filter((j) => j.moderation === "APPROVED").length}
          </b>
        </div>
        <div>
          <span>Đã từ chối</span>
          <b>
            {jobService.all().filter((j) => j.moderation === "REJECTED").length}
          </b>
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo chức danh hoặc công ty..."
            />
          </label>
          <label className="sort-select">
            <ShieldCheck size={15} />
            <select
              value={moderation}
              onChange={(e) => setModeration(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái duyệt</option>
              <option value="PENDING">Đang chờ</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tin tuyển dụng</th>
                <th>Nhà tuyển dụng</th>
                <th>Đã gửi</th>
                <th>Trạng thái công việc</th>
                <th>Kiểm duyệt</th>
                <th>Xem xét</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <div className="table-job">
                      <CompanyMark name={j.company} />
                      <span>
                        <b>{j.title}</b>
                        <small>
                          {j.category} · {j.type.replace("_", " ")}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>{j.company}</td>
                  <td>{date(j.postedAt)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(j.status)}`}>
                      {j.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${statusClass(j.moderation)}`}
                    >
                      {j.moderation}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="table-action"
                        title="Preview listing"
                        onClick={() => setPreview(j)}
                      >
                        <Eye size={15} />
                      </button>
                      {j.moderation === "PENDING" && (
                        <>
                          <button
                            className="table-action approve-action"
                            title="Approve listing"
                            onClick={() =>
                              setConfirm({ job: j, status: "APPROVED" })
                            }
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="table-action danger-action"
                            title="Reject listing"
                            onClick={() =>
                              setConfirm({ job: j, status: "REJECTED" })
                            }
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!jobs.length && (
          <EmptyPage
            title="No listings found"
            text="Try changing the search or moderation filter."
          />
        )}
      </section>
      {confirm && (
        <Modal
          title={
            confirm.status === "APPROVED"
              ? "Approve this listing?"
              : "Reject this listing?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            <b>{confirm.job.title}</b> at {confirm.job.company} will be marked{" "}
            {confirm.status.toLowerCase()}. The job's open/closed status remains
            separate from moderation status.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setConfirm(null)}
            >
              Hủy
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  const reason =
                    confirm.status === "REJECTED"
                      ? window.prompt("Reason for rejection?") || ""
                      : "";
                  if (confirm.status === "REJECTED" && !reason.trim()) return;
                  await api.admin.moderate(
                    confirm.job.id,
                    confirm.status,
                    reason,
                  );
                  setConfirm(null);
                  toast(`Listing ${confirm.status.toLowerCase()}`);
                } catch (e) {
                  toast(
                    e instanceof Error
                      ? e.message
                      : "Could not moderate listing",
                    "error",
                  );
                }
              }}
            >
              Xác nhận quyết định
            </button>
          </div>
        </Modal>
      )}
      {preview && (
        <Modal title="Listing preview" onClose={() => setPreview(null)}>
          <div className="preview-job">
            <CompanyMark name={preview.company} />
            <h2>{preview.title}</h2>
            <p className="muted">
              {preview.company} · {preview.location}
            </p>
            <span className={`status-pill ${statusClass(preview.moderation)}`}>
              {preview.moderation}
            </span>
            <div className="detail-chips">
              <span>
                <Wallet size={14} />
                {money(preview.salaryMin)} – {money(preview.salaryMax)}
              </span>
              <span>
                <Clock3 size={14} />
                {preview.type.replace("_", " ")}
              </span>
            </div>
            <h3>Giới thiệu vị trí</h3>
            <p>{preview.description}</p>
            <h3>Trách nhiệm công việc</h3>
            <ul className="detail-list">
              {preview.responsibilities.map((r) => (
                <li key={r}>
                  <CheckCircle2 size={15} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              onClick={() => setPreview(null)}
            >
              Đóng xem trước
            </button>
            {preview.moderation === "PENDING" && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setPreview(null);
                  setConfirm({ job: preview, status: "APPROVED" });
                }}
              >
                Duyệt tin
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function AdminApplications() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await applicationService.loadAllAdmin();

        if (!cancelled) {
          setApplications(result.applications);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách đơn ứng tuyển"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const apps = applications.filter(
    (a) =>
      (status === "ALL" || a.status === status) &&
      `${a.jobTitle || ""} ${a.studentName || ""} ${a.studentEmail || ""} ${a.jobCompany || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="PLATFORM ACTIVITY"
        title="Application overview"
        subtitle="A platform-wide view of student applications and outcomes."
      />
      
    <div className="application-summary">
      <div>
        <span>Tổng đơn ứng tuyển</span>
        <b>{applications.length}</b>
      </div>

      <div>
        <span>Đang chờ</span>
        <b>
          {applications.filter((a) => a.status === "PENDING").length}
        </b>
      </div>

      <div>
        <span>Đã chấp nhận</span>
        <b>
          {applications.filter((a) => a.status === "ACCEPTED").length}
        </b>
      </div>

      <div>
        <span>Đã từ chối</span>
        <b>
          {applications.filter((a) => a.status === "REJECTED").length}
        </b>
      </div>
</div>

      <section className="panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo sinh viên, công việc hoặc công ty..."
            />
          </label>
          <label className="sort-select">
            <ListFilter size={15} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Công việc & nhà tuyển dụng</th>
                <th>Ngày ứng tuyển</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const u = store.users().find((x) => x.id === a.studentId);
                const j = jobService.byId(a.jobId);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="table-job">
                        <span className="avatar small">
                          {u?.name
                            .split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          <b>{u?.name || "Student"}</b>
                          <small>{u?.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="table-cell-title">
                        <b>{j?.title}</b>
                        <small>{j?.company}</small>
                      </span>
                    </td>
                    <td>{date(a.appliedAt)}</td>
                    <td>
                      <span className={`status-pill ${statusClass(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action"
                        onClick={() =>
                          window.alert(
                            `Application message:\n\n${a.message || "Không có lời nhắn."}\n\nCV: ${a.cvUrl || "Chưa cung cấp"}`,
                          )
                        }
                        aria-label="Xem tóm tắt đơn ứng tuyển"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!apps.length && (
          <EmptyPage
            title="No applications found"
            text="Try changing tương lai search or status filter."
          />
        )}
      </section>
    </>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
function EmptyPage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Compass size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Unauthorized() {
  const { user } = useContext(AuthContext);
  return (
    <>
      <PublicNav />
      <div className="center-page">
        <span className="error-code">403</span>
        <span className="empty-icon">
          <ShieldCheck size={27} />
        </span>
        <h1>Bạn không có quyền truy cập</h1>
        <p className="muted">
          {user
            ? `Your ${roleLabel(user.role).toLowerCase()} account doesn't have permission to view this page.`
            : "Please sign in with the right account to continue."}
        </p>
        <div className="center-actions">
          <Link
            className="btn btn-primary"
            to={user ? `/${user.role.toLowerCase()}/dashboard` : "/login"}
          >
            {user ? "Go to tương lai dashboard" : "Sign in"} <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-outline" to="/jobs">
            Tìm việc làm
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
function NotFound() {
  return (
    <>
      <PublicNav />
      <div className="center-page">
        <span className="error-code">404</span>
        <span className="empty-icon">
          <Search size={27} />
        </span>
        <h1>Không tìm thấy trang</h1>
        <p className="muted">Trang bạn tìm kiếm không tồn tại.</p>
        <div className="center-actions">
          <Link className="btn btn-primary" to="/">
            Về trang chủ <ArrowRight size={16} />
          </Link>
          <Link className="btn btn-outline" to="/jobs">
            Tìm việc làm
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
export default App;

