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
  Laptop,
  Megaphone,
  Palette,
  BarChart3,
  BookOpen,
} from "lucide-react";
import {
  Navbar as SharedNavbar,
  Footer as SharedFooter,
  Button,
  Input as SharedInput,
  Select as SharedSelect,
  Card as SharedCard,
  Badge,
  Badge as SharedBadge,
  JobCard as SharedJobCard,
  CompanyMark as SharedCompanyMark,
  Modal as SharedModal,
} from "./components/ui";
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
import { cvService } from "./services/cv";
import { aiService } from "./services/ai";
import type { CVAnalyzeResponse, CVHistoryItem, JobFitResult, RecommendedJobItem } from "./services/ai";
import { chatApi } from "./services/chat";
import { loginRedirect } from "./loginRedirect";

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
const jobCategories = ['Technology', 'Marketing', 'Design', 'Data & Analytics', 'Education', 'Operations', 'Customer Service', 'Finance', 'Food & Beverage', 'Sales', 'Administration', 'Accounting & Finance', 'Logistics', 'Retail', 'Hospitality & Tourism', 'Events', 'Healthcare & Wellness', 'Other'];

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
      if (jobService.all().length === 0 && !jobService.isPublicLoading()) {
        jobService.load().catch(() => {});
      }
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

        // Phiên phải được ghi lại trước khi nạp dữ liệu theo vai trò
        store.setSession(restored);

        setUser(restored);

        if (apiUser.role === "STUDENT") {
          applicationService.loadMine().catch(console.error);
        }

        if (
          apiUser.role === "EMPLOYER" ||
          apiUser.role === "ADMIN" ||
          (jobService.all().length === 0 && !jobService.isPublicLoading())
        ) {
          jobService.load().catch(console.error);
        }
      })
      .catch(() => {
        tokenStore.clear();
        store.setSession(null);
        setUser(null);
        if (jobService.all().length === 0 && !jobService.isPublicLoading()) {
          jobService.load().catch(() => {});
        }
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
  return (
    <SharedNavbar
      user={user}
      onLogout={() => {
        authService.logout();
        window.location.href = "/";
      }}
    />
  );
}

function Footer() {
  return <SharedFooter />;
}

function Home() {
  const jobs = jobService
    .all()
    .filter((j) => j.status === "OPEN" && j.moderation === "APPROVED");
  const [featuredTab, setFeaturedTab] = useState("ALL");

  const filteredFeatured = jobs.filter((j) => {
    if (featuredTab === "ALL") return true;
    if (featuredTab === "PART_TIME") return j.type === "PART_TIME";
    if (featuredTab === "INTERNSHIP")
      return (
        j.type === "INTERNSHIP" || j.title.toLowerCase().includes("thực tập") ||
        j.title.toLowerCase().includes("intern")
      );
    if (featuredTab === "REMOTE")
      return j.location.toLowerCase().includes("remote") || j.arrangement === "Remote";
    if (featuredTab === "TECH") return j.category === "Technology";
    return true;
  });

  const spotlightJob = jobs[0];

  const categories = [
    {
      name: "Technology",
      label: "Công nghệ thông tin",
      sub: "Lập trình web, mobile, tester",
      tone: "bg-sky-50 text-[#0369A1] border-sky-200",
      icon: <Laptop size={22} />,
    },
    {
      name: "Marketing",
      label: "Marketing & Truyền thông",
      sub: "Content, SEO, mạng xã hội",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Megaphone size={22} />,
    },
    {
      name: "Design",
      label: "Thiết kế & Sáng tạo",
      sub: "UI/UX, đồ họa, dựng video",
      tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: <Palette size={22} />,
    },
    {
      name: "Data & Analytics",
      label: "Dữ liệu & Phân tích",
      sub: "Data analyst, nhập liệu, SQL",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <BarChart3 size={22} />,
    },
    {
      name: "Education",
      label: "Giáo dục & Đào tạo",
      sub: "Gia sư, trợ giảng tiếng Anh",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <BookOpen size={22} />,
    },
    {
      name: "Operations",
      label: "Vận hành & Hỗ trợ",
      sub: "Chăm sóc khách hàng, admin",
      tone: "bg-cyan-50 text-cyan-700 border-cyan-200",
      icon: <Building2 size={22} />,
    },
  ];

  const marqueeItems = [
    "React & TypeScript",
    "Thực tập sinh AI / Data",
    "UI/UX Designer (Figma)",
    "Digital Marketing",
    "Part-time Linh Hoạt",
    "Trợ giảng Tiếng Anh",
    "Content Creator",
    "Remote Làm Từ Xa",
    "Backend Node.js",
  ];

  const tabs = [
    { key: "ALL", label: "Tất cả" },
    { key: "PART_TIME", label: "Part-time" },
    { key: "INTERNSHIP", label: "Thực tập" },
    { key: "REMOTE", label: "Remote" },
    { key: "TECH", label: "Công nghệ" },
  ];

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-[var(--color-background)] overflow-x-hidden">
        {/* Super VIP Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#F0F9FF] to-[#E0F2FE] border-b border-[var(--color-border)] pt-10 pb-14 md:pt-16 md:pb-20">
          {/* Subtle Architectural Grid & Ambient Glow */}
          <div className="absolute inset-0 vip-grid-bg opacity-70 pointer-events-none" />
          <div className="absolute -top-28 -right-24 w-96 h-96 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column: Brand Headline + Glass Search */}
              <div className="lg:col-span-7">
                <div className="vip-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold vip-shimmer-badge text-[var(--color-primary)] border border-sky-200 shadow-sm mb-5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Sparkles size={13} />
                  <span>STUDENTJOB MARKETPLACE · CƠ HỘI ĐANG MỞ TUYỂN</span>
                </div>

                <h1 className="vip-fade-up vip-delay-1 text-3xl sm:text-5xl lg:text-[52px] font-extrabold text-[var(--color-foreground)] tracking-tight leading-[1.12] mb-5">
                  Kết nối sinh viên với{" "}
                  <span className="bg-gradient-to-r from-[#0369A1] via-[#0EA5E9] to-[#16A34A] bg-clip-text text-transparent">
                    việc làm thực chiến
                  </span>{" "}
                  & thực tập chất lượng.
                </h1>

                <p className="vip-fade-up vip-delay-2 text-base sm:text-[17px] text-[var(--color-muted-foreground)] leading-relaxed max-w-2xl mb-8">
                  Khám phá hàng trăm vị trí bán thời gian, thực tập có lương và dự án linh hoạt lịch học. Tích hợp AI phân tích CV và nhắn tin trực tiếp với nhà tuyển dụng.
                </p>

                {/* Elevated Search Box */}
                <div className="vip-fade-up vip-delay-2 mb-6 p-1.5 rounded-2xl bg-white/80 backdrop-blur-md border border-sky-200/80 shadow-[0_18px_45px_-15px_rgba(3,105,161,0.22)]">
                  <JobSearchBox />
                </div>

                {/* Quick Keyword Pills */}
                <div className="vip-fade-up vip-delay-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[var(--color-foreground)] mr-1">
                    Xu hướng:
                  </span>
                  {[
                    { label: "Công nghệ IT", to: "/jobs?category=Technology" },
                    { label: "Marketing", to: "/jobs?category=Marketing" },
                    { label: "Thiết kế UI/UX", to: "/jobs?category=Design" },
                    { label: "Part-time", to: "/jobs?type=PART_TIME" },
                    { label: "Remote", to: "/jobs?location=Remote" },
                  ].map((pill) => (
                    <Link
                      key={pill.label}
                      to={pill.to}
                      className="px-3 py-1.5 rounded-full bg-white/90 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-sky-50 hover:-translate-y-0.5 text-[var(--color-foreground)] font-semibold shadow-sm transition-all duration-200"
                    >
                      {pill.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Column: Interactive Floating Career Showcase */}
              <div className="lg:col-span-5 relative hidden sm:block">
                <div className="relative mx-auto max-w-md h-[390px] flex items-center justify-center">
                  {/* Orbital Rings */}
                  <div className="absolute w-80 h-80 rounded-full border border-dashed border-sky-300/60" />
                  <div className="absolute w-60 h-60 rounded-full border border-sky-200/70" />

                  {/* Main Spotlight Card */}
                  <div className="relative z-10 w-full max-w-[330px] bg-white/95 backdrop-blur-md border border-sky-200 rounded-2xl p-5 shadow-[0_24px_60px_-15px_rgba(12,74,110,0.18)] hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyMark name={spotlightJob?.company || "SJ"} />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-[var(--color-primary)] block truncate">
                            {spotlightJob?.company || "TechCorp Vietnam"}
                          </span>
                          <span className="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1">
                            <MapPin size={10} /> {spotlightJob?.location || "TP.HCM · Linh hoạt"}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Đang tuyển
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[var(--color-foreground)] leading-snug mb-3 line-clamp-2">
                      {spotlightJob?.title || "Frontend & AI Intern (React / TypeScript)"}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(spotlightJob?.skills?.slice(0, 3) || ["React", "TypeScript", "UI/UX"]).map(
                        (s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-background)] text-[var(--color-foreground)] border border-sky-100"
                          >
                            {s}
                          </span>
                        ),
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-[var(--color-muted-foreground)] block">
                          Mức lương
                        </span>
                        <b className="text-xs font-extrabold text-[var(--color-primary)]">
                          {spotlightJob
                            ? `${money(spotlightJob.salaryMin)} - ${money(spotlightJob.salaryMax)}`
                            : "5 - 8 triệu / tháng"}
                        </b>
                      </div>
                      <Link
                        to={spotlightJob ? `/jobs/${spotlightJob.id}` : "/jobs"}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-sky-800 text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        Ứng tuyển <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Floating AI Score Badge (Top Right) */}
                  <div className="vip-float absolute -top-1 right-0 z-20 bg-white border border-sky-200 rounded-2xl px-3.5 py-2.5 shadow-lg flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-[#0369A1] text-white flex items-center justify-center shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <b className="text-xs font-extrabold text-[var(--color-foreground)] block">
                        AI Đánh giá CV
                      </b>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        Độ phù hợp 92%
                      </span>
                    </div>
                  </div>

                  {/* Floating Live Chat Pill (Bottom Left) */}
                  <div className="vip-float-reverse absolute bottom-1 -left-2 z-20 bg-white border border-emerald-200 rounded-2xl px-3.5 py-2.5 shadow-lg flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={17} />
                    </div>
                    <div>
                      <b className="text-xs font-extrabold text-[var(--color-foreground)] block">
                        Chat trực tiếp HR
                      </b>
                      <span className="text-[11px] text-[var(--color-muted-foreground)]">
                        Phản hồi nhanh chóng
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Infinite Marquee Ticker */}
        <section className="bg-white border-b border-[var(--color-border)] py-3.5 overflow-hidden vip-marquee-wrap">
          <div className="vip-marquee-track items-center">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-4 pr-4 shrink-0">
                {marqueeItems.map((item, idx) => (
                  <Link
                    key={`${dup}-${item}-${idx}`}
                    to={`/jobs?q=${encodeURIComponent(item)}`}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-background)] border border-sky-100 hover:border-[var(--color-primary)] text-xs font-semibold text-[var(--color-foreground)] whitespace-nowrap transition-colors"
                  >
                    <Sparkles size={12} className="text-amber-500 shrink-0" />
                    {item}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Elevated Stats Strip */}
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  val: `${Math.max(jobs.length, 120)}+`,
                  label: "Cơ hội đang mở tuyển",
                  icon: <BriefcaseBusiness size={18} />,
                  tone: "bg-sky-50 text-[#0369A1] border-sky-200",
                },
                {
                  val: "850+",
                  label: "Doanh nghiệp liên kết",
                  icon: <Building2 size={18} />,
                  tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
                },
                {
                  val: "12,000+",
                  label: "Cộng đồng sinh viên",
                  icon: <Users size={18} />,
                  tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
                },
                {
                  val: "98%",
                  label: "Đánh giá hài lòng",
                  icon: <Star size={18} />,
                  tone: "bg-amber-50 text-amber-700 border-amber-200",
                },
              ].map((st) => (
                <div
                  key={st.label}
                  className="bg-white border border-[var(--color-border)] rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg hover:border-sky-300 transition-all duration-200"
                >
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${st.tone}`}
                  >
                    {st.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-[var(--color-foreground)] tracking-tight">
                      {st.val}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)] font-medium mt-0.5">
                      {st.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Opportunities with Live Filter Tabs */}
        <section className="py-10 md:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 mb-8">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1.5">
                  <ChartNoAxesCombined size={14} /> Cơ hội việc làm mới nhất
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-foreground)]">
                  Việc làm nổi bật dành cho sinh viên
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
                  Chọn lọc từ các nhà tuyển dụng uy tín với lịch làm việc linh hoạt.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFeaturedTab(t.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                      featuredTab === t.key
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "bg-white border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[var(--color-primary)] hover:underline"
                >
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {filteredFeatured.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFeatured.slice(0, 6).map((j) => (
                  <div
                    key={j.id}
                    className="hover:-translate-y-1 transition-transform duration-200"
                  >
                    <JobCard job={j} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[var(--color-border)] rounded-2xl p-10 text-center">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-3">
                  Chưa có việc làm nổi bật nào thuộc nhóm lọc này.
                </p>
                <Button variant="outline" size="sm" onClick={() => setFeaturedTab("ALL")}>
                  Xem tất cả vị trí
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* AI Career Tools Spotlight */}
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0C4A6E] to-[#0369A1] text-white p-7 sm:p-8 shadow-lg group">
                <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-sky-100 mb-4">
                  <Sparkles size={13} /> TRỢ LÝ AI THÔNG MINH
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
                  Phân tích & Chấm điểm CV bằng AI
                </h3>
                <p className="text-xs sm:text-sm text-sky-100 leading-relaxed mb-6 max-w-md">
                  Tải lên CV PDF/DOCX để AI trích xuất kỹ năng, chỉ ra điểm cần cải thiện và đề xuất chỉnh sửa chuẩn nhà tuyển dụng trong vài giây.
                </p>
                <Link to="/student/ai-cv">
                  <Button variant="accent" size="md">
                    Thử phân tích CV ngay <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-white border border-[var(--color-border)] p-7 sm:p-8 shadow-sm hover:shadow-lg hover:border-sky-300 transition-all duration-200 group">
                <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-sky-50 group-hover:scale-110 transition-transform duration-500" />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-[var(--color-primary)] border border-sky-200 mb-4">
                  <FileText size={13} /> CÔNG CỤ TẠO HỒ SƠ
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--color-foreground)] mb-2">
                  Trình tạo CV chuyên nghiệp & Lưu trữ
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-6 max-w-md">
                  Tự thiết kế CV ấn tượng với nhiều mẫu hiện đại, xuất file nhanh và dùng trực tiếp khi ứng tuyển chỉ với 1 chạm.
                </p>
                <Link to="/student/cvs">
                  <Button variant="primary" size="md">
                    Mở Trình tạo CV <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Category Explorer Section */}
        <section className="py-14 bg-white border-y border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
                  Khám phá ngành nghề
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-foreground)]">
                  Lĩnh vực nghề nghiệp phổ biến
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
                  Dù học chuyên ngành nào, bạn cũng có thể bắt đầu từ một cơ hội phù hợp.
                </p>
              </div>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--color-primary)] hover:underline"
              >
                Xem tất cả lĩnh vực <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => {
                const count = jobs.filter((j) => j.category === c.name).length;
                return (
                  <Link
                    key={c.name}
                    to={`/jobs?category=${encodeURIComponent(c.name)}`}
                    className="bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:-translate-y-1 hover:shadow-md rounded-2xl p-5 flex items-start gap-4 transition-all duration-200 group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ${c.tone}`}
                    >
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                          {c.label}
                        </h3>
                        {count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[var(--color-primary)] shrink-0">
                            {count} việc
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                        {c.sub}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all duration-200 shrink-0 mt-1"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-14 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
                Quy trình ứng tuyển
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-foreground)]">
                Ba bước đơn giản để có việc làm
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-2">
                Hỗ trợ sinh viên từ bước tìm việc, tối ưu CV bằng AI đến khi nhận thư mời làm việc.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Tìm kiếm vị trí phù hợp",
                  desc: "Lọc công việc theo lịch rảnh, địa điểm gần trường hoặc việc làm từ xa (remote) không gò bó.",
                  icon: <Search size={20} />,
                },
                {
                  step: "02",
                  title: "Ứng tuyển nhanh với CV",
                  desc: "Tối ưu CV bằng AI hoặc dùng Trình tạo CV trực tuyến để gửi hồ sơ đến nhà tuyển dụng trong vài giây.",
                  icon: <FileText size={20} />,
                },
                {
                  step: "03",
                  title: "Phỏng vấn & Phát triển",
                  desc: "Trao đổi trực tiếp qua tin nhắn realtime, tích lũy kinh nghiệm thực chiến và thu nhập xứng đáng.",
                  icon: <ShieldCheck size={20} />,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-white border border-[var(--color-border)] hover:border-sky-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl p-7 text-center transition-all duration-200"
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-[var(--color-primary)] font-extrabold text-base inline-flex items-center justify-center">
                      {item.icon}
                    </span>
                    <span className="text-2xl font-black text-sky-200">{item.step}</span>
                  </div>
                  <h3 className="font-bold text-base text-[var(--color-foreground)] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Super VIP Employer Partner CTA */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C4A6E] via-[#0369A1] to-[#0284C7] p-8 sm:p-12 text-white shadow-[0_24px_60px_-15px_rgba(3,105,161,0.45)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/15 pointer-events-none" />
              <div className="absolute right-12 -bottom-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-sky-100 uppercase tracking-wider mb-3">
                  <Building2 size={13} /> Dành cho nhà tuyển dụng
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  Tiếp cận nguồn nhân lực sinh viên trẻ và năng động
                </h2>
                <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
                  Đăng tin tuyển dụng thực tập sinh, nhân viên bán thời gian, quản lý hồ sơ và nhắn tin trực tiếp với ứng viên ngay trên một nền tảng.
                </p>
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0 w-full lg:w-auto">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button variant="accent" size="md" fullWidth>
                    Đăng tin tuyển dụng ngay <ArrowRight size={15} />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors cursor-pointer"
                  >
                    Đăng nhập doanh nghiệp
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CodeGlyph() {
  return <span className="font-mono text-xs font-bold">&lt;/&gt;</span>;
}

function ArrowUpRightGlyph() {
  return <ArrowRight size={16} />;
}

function JobSearchBox() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const go = useNavigate();
  return (
    <form
      className="bg-white border border-[var(--color-border)] rounded-xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        go(
          `/jobs?q=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}`,
        );
      }}
    >
      <div className="flex-1 flex items-center px-3 py-1.5 gap-2.5 min-w-0">
        <Search size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
        <input
          aria-label="Chức danh hoặc từ khóa"
          placeholder="Vị trí công việc, kỹ năng, công ty..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none"
        />
      </div>
      <div className="hidden sm:block w-px h-6 bg-[var(--color-border)] shrink-0" />
      <div className="flex-1 flex items-center px-3 py-1.5 gap-2.5 min-w-0 border-t sm:border-t-0 border-[var(--color-border)] pt-2 sm:pt-1.5">
        <MapPin size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
        <input
          aria-label="Địa điểm"
          placeholder="Thành phố hoặc làm từ xa (remote)..."
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          className="w-full bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none"
        />
      </div>
      <Button type="submit" variant="primary" size="md" className="shrink-0">
        Tìm việc làm <ArrowRight size={15} />
      </Button>
    </form>
  );
}

function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { user } = useContext(AuthContext);
  return <SharedJobCard job={job} user={user} compact={compact} />;
}

function CompanyMark({ name }: { name: string }) {
  return <SharedCompanyMark name={name} />;
}

function Jobs() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const [q, setQ] = useState(params.get("q") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [type, setType] = useState(params.get("type") || "ALL");
  const [category, setCategory] = useState(params.get("category") || "ALL");
  const [salary, setSalary] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
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
  // Vào trực tiếp /jobs hoặc sau một lỗi tạm thời: nạp lại nếu danh sách công khai đang trống
  useEffect(() => {
    if (jobService.all().length === 0 && !jobService.isPublicLoading()) {
      jobService.load().catch(() => {});
    }
  }, []);

  const handleResetFilters = () => {
    setType("ALL");
    setCategory("ALL");
    setSalary("ALL");
    setLocation("");
    setQ("");
    setPage(1);
  };

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-[var(--color-background)]">
        {/* Search Header */}
        <div className="bg-white border-b border-[var(--color-border)] py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
              Tìm kiếm việc làm
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mb-2">
              Khám phá các vị trí tuyển dụng sinh viên
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mb-6">
              Việc làm bán thời gian, thực tập có lương, và công việc tự do linh hoạt.
            </p>

            {/* Search Input Bar */}
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-4xl shadow-sm">
              <div className="flex-1 flex items-center px-3 py-1.5 gap-2.5 min-w-0">
                <Search size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Vị trí, công ty hoặc kỹ năng..."
                  aria-label="Tìm kiếm vị trí"
                  className="w-full bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none"
                />
              </div>
              <div className="hidden sm:block w-px h-6 bg-[var(--color-border)] shrink-0" />
              <div className="flex-1 flex items-center px-3 py-1.5 gap-2.5 min-w-0 border-t sm:border-t-0 border-[var(--color-border)] pt-2 sm:pt-1.5">
                <MapPin size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Địa điểm hoặc từ xa..."
                  aria-label="Lọc theo địa điểm"
                  className="w-full bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none"
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setPage(1)}
                className="shrink-0"
              >
                Tìm kiếm
              </Button>
            </div>
          </div>
        </div>

        {/* 2-Column Job Board Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Left Column: ALWAYS VISIBLE FILTERS */}
            <aside className="lg:col-span-1">
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 sticky top-20">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4">
                  <span className="font-bold text-sm text-[var(--color-foreground)] flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[var(--color-primary)]" />
                    Bộ lọc tìm kiếm
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Đặt lại
                  </button>
                </div>

                {/* Filter 1: Job Type (Radio list) */}
                <div className="py-3 border-b border-[var(--color-border)]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)] mb-2.5">
                    Hình thức làm việc
                  </label>
                  <div className="space-y-2">
                    {[
                      ["ALL", "Tất cả hình thức"],
                      ["PART_TIME", "Bán thời gian (Part-time)"],
                      ["FULL_TIME", "Toàn thời gian (Full-time)"],
                      ["INTERNSHIP", "Thực tập"],
                      ["FREELANCE", "Làm tự do (Freelance)"],
                    ].map(([v, l]) => (
                      <label
                        key={v}
                        className="flex items-center gap-2.5 text-xs text-[var(--color-foreground)] cursor-pointer select-none py-0.5"
                      >
                        <input
                          type="radio"
                          name="jobtype"
                          checked={type === v}
                          onChange={() => setType(v)}
                          className="accent-[var(--color-primary)] cursor-pointer"
                        />
                        <span>{l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Category (Select) */}
                <div className="py-3 border-b border-[var(--color-border)]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)] mb-2.5">
                    Lĩnh vực nghề nghiệp
                  </label>
                  <SharedSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="ALL">Tất cả lĩnh vực</option>
                    {jobCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </SharedSelect>
                </div>

                {/* Filter 3: Salary Range (Select) */}
                <div className="py-3 border-b border-[var(--color-border)]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)] mb-2.5">
                    Mức lương
                  </label>
                  <SharedSelect
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  >
                    <option value="ALL">Mọi mức lương</option>
                    <option value="under5">Dưới 5 triệu</option>
                    <option value="5to8">5 – 8 triệu</option>
                    <option value="over8">Trên 8 triệu</option>
                  </SharedSelect>
                </div>

                {/* Tip note */}
                <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-[var(--color-foreground)] flex items-start gap-2.5">
                  <Sparkles size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Gợi ý:</strong> Bộ lọc luôn hiển thị trực tiếp giúp bạn dễ dàng tìm kiếm cơ hội phù hợp nhất với thời gian học tập.
                  </p>
                </div>
              </div>
            </aside>

            {/* Right Column: Results Area */}
            <section className="lg:col-span-3">
              <div className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-3.5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
                    Vị trí đang mở tuyển
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-background)] text-[var(--color-primary)] border border-[var(--color-border)]">
                      {sorted.length}
                    </span>
                  </h2>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    Hiển thị {sorted.length ? (page - 1) * perPage + 1 : 0}–
                    {Math.min(page * perPage, sorted.length)} trong số {sorted.length} cơ hội việc làm
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5 shrink-0">
                    <ArrowDownUp size={14} /> Sắp xếp:
                  </span>
                  <div className="w-44">
                    <SharedSelect
                      aria-label="Sắp xếp công việc"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="salary">Lương cao nhất</option>
                      <option value="relevance">Tên công việc A–Z</option>
                    </SharedSelect>
                  </div>
                </div>
              </div>

              {results.length ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </div>

                  {pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Trước
                      </Button>
                      {Array.from({ length: pages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors duration-150 cursor-pointer ${
                            page === i + 1
                              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                              : "bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                          }`}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Tiếp <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-4">
                    <Search size={24} />
                  </div>
                  <h3 className="font-bold text-base text-[var(--color-foreground)] mb-1">
                    Không tìm thấy công việc phù hợp
                  </h3>
                  <p className="text-xs text-[var(--color-muted-foreground)] max-w-sm mb-6 leading-relaxed">
                    Thử thay đổi từ khóa, mở rộng tiêu chí tìm kiếm hoặc xóa bộ lọc để khám phá thêm nhiều cơ hội khác.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Xóa tất cả bộ lọc
                  </Button>
                </div>
              )}
            </section>
          </div>
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
    <div className="py-3 border-b border-[var(--color-border)]">
      <b className="block text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)] mb-2.5">
        {label}
      </b>
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
  const [saved, setSaved] = useState(() =>
    user?.role === "STUDENT" ? readSaved(user.id).includes(id) : false,
  );
  const [contacting, setContacting] = useState(false);
  const [fit, setFit] = useState<JobFitResult | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState("");

  useEffect(() => {
    if (!id) return;
    reviewService.load(id).catch(() => {});
  }, [id]);

  async function runFitAssessment() {
    if (!job) return;
    setFitLoading(true);
    setFitError("");
    try {
      const res = await aiService.assessJobFit(job.id);
      setFit(res.data);
    } catch (e) {
      setFitError(e instanceof Error ? e.message : "Không thể đánh giá độ phù hợp.");
    } finally {
      setFitLoading(false);
    }
  }

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
        <main className="min-h-screen bg-[var(--color-background)] py-16">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-10">
              <div className="w-14 h-14 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
                <Search size={24} />
              </div>
              <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
                Không tìm thấy vị trí tuyển dụng
              </h1>
              <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed mb-6">
                Công việc này có thể đã hết hạn, bị gỡ bỏ hoặc đường dẫn không chính xác.
              </p>
              <Link to="/jobs">
                <Button variant="primary" size="md">
                  Quay lại danh sách việc làm
                </Button>
              </Link>
            </div>
          </div>
        </main>
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

      <main className="min-h-screen bg-[var(--color-background)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Navigation */}
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] hover:underline mb-6 cursor-pointer"
          >
            <ArrowLeft size={16} /> Quay lại danh sách việc làm
          </Link>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <CompanyMark name={job.company} />
                    <div>
                      <span className="font-bold text-sm text-[var(--color-foreground)] block">
                        {job.company}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        <MapPin size={13} className="text-[var(--color-primary)] shrink-0" />
                        {job.location} · Đăng ngày {date(job.postedAt)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                      saved
                        ? "bg-[var(--color-background)] text-[var(--color-primary)] border-[var(--color-primary)]"
                        : "bg-white text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    }`}
                    onClick={() => {
                      if (!user || user.role !== "STUDENT") {
                        toast("Đăng nhập bằng tài khoản sinh viên để lưu việc làm.", "info");
                        return;
                      }
                      const nowSaved = toggleSaved(user.id, id);
                      setSaved(nowSaved);
                      toast(nowSaved ? "Đã lưu việc làm" : "Đã bỏ lưu việc làm", "success");
                    }}
                    title={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
                    aria-label="Lưu việc làm"
                  >
                    <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
                  </button>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mb-4">
                  {job.title}
                </h1>

                {/* Key Spec Badges */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-semibold border border-[var(--color-border)]">
                    <Wallet size={14} className="text-[var(--color-primary)] shrink-0" />
                    {money(job.salaryMin)} – {money(job.salaryMax)} / tháng
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-semibold border border-[var(--color-border)]">
                    <Clock3 size={14} className="text-[var(--color-primary)] shrink-0" />
                    {jobTypeVi(job.type)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-semibold border border-[var(--color-border)]">
                    <Globe size={14} className="text-[var(--color-primary)] shrink-0" />
                    {job.arrangement}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-semibold border border-[var(--color-border)]">
                    <MapPin size={14} className="text-[var(--color-primary)] shrink-0" />
                    {job.location}
                  </span>
                </div>

                {/* Apply and Chat Action Bar */}
                <div className="pt-6 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={job.status !== "OPEN" || job.moderation !== "APPROVED" || !!already}
                      onClick={() => {
                        if (!user) {
                          navigate("/login", { state: { from: `/jobs/${id}` } });
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
                        ? "Đã nộp đơn ứng tuyển"
                        : job.status !== "OPEN"
                          ? "Vị trí đã đóng"
                          : "Ứng tuyển ngay"}
                      <ArrowRight size={17} />
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={contactEmployer}
                      disabled={contacting}
                    >
                      <Send size={16} />
                      {contacting ? "Đang mở chat..." : "Liên hệ nhà tuyển dụng"}
                    </Button>
                  </div>

                  <div className="text-xs text-[var(--color-muted-foreground)] flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} /> {job.applicants} người đã nộp đơn
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} /> Hạn nộp: {date(job.deadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Job Details Card */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-foreground)] mb-3 pb-2 border-b border-[var(--color-border)]">
                    Giới thiệu vị trí
                  </h2>
                  <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed whitespace-pre-line">
                    {job.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)] mb-3">
                    Nhiệm vụ công việc
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[var(--color-foreground)]">
                    {job.responsibilities.map((x) => (
                      <li key={x} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)] mb-3">
                    Yêu cầu ứng viên
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[var(--color-foreground)]">
                    {job.requirements.map((x) => (
                      <li key={x} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)] mb-3">
                    Kỹ năng cần có
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-1 text-xs font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Company & Reviews Card */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-foreground)] mb-4 pb-2 border-b border-[var(--color-border)]">
                    Về công ty {job.company}
                  </h2>
                  <div className="flex items-start gap-4">
                    <CompanyMark name={job.company} />
                    <div>
                      <h3 className="font-bold text-base text-[var(--color-foreground)]">
                        {job.company}
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed mt-1">
                        Doanh nghiệp uy tín đồng hành và tạo điều kiện phát triển kỹ năng cho thế hệ trẻ.
                      </p>
                    </div>
                  </div>
                </div>

                {reviews.length > 0 && (
                  <div className="pt-4 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm text-[var(--color-foreground)] flex items-center gap-2">
                        Đánh giá từ ứng viên ({reviews.length})
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Star size={14} fill="currentColor" />
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} / 5
                      </span>
                    </div>

                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 bg-[var(--color-muted)]/50 rounded-lg border border-[var(--color-border)]"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex gap-1 text-amber-500">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  size={13}
                                  fill={i < r.rating ? "currentColor" : "none"}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-[var(--color-muted-foreground)]">
                              {date(r.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-foreground)] leading-relaxed">
                            {r.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column */}
            <aside className="lg:col-span-1 space-y-6">
              {/* AI Job Fit Assessment Card (Student only) */}
              {user?.role === "STUDENT" && (
                <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                        <Bot size={16} />
                      </span>
                      <h3 className="font-bold text-sm text-[var(--color-foreground)]">
                        Đánh giá độ phù hợp AI
                      </h3>
                    </div>
                    {fit?.score !== null && fit?.score !== undefined && (
                      <Badge
                        variant={
                          fit.band === "good"
                            ? "success"
                            : fit.band === "fair"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {fit.score}% phù hợp
                      </Badge>
                    )}
                  </div>

                  {!fit ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                        So sánh CV của bạn với yêu cầu công việc để biết điểm phù hợp và kỹ năng cần bổ sung.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        disabled={fitLoading}
                        onClick={runFitAssessment}
                      >
                        {fitLoading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Đang phân tích...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Phân tích mức độ phù hợp
                          </>
                        )}
                      </Button>
                      {fitError && (
                        <p className="text-xs text-[var(--color-destructive)]">{fitError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {fit.matchedSkills.length > 0 && (
                        <div>
                          <span className="font-bold text-emerald-700 block mb-1">
                            Kỹ năng đáp ứng ({fit.matchedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {fit.matchedSkills.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {fit.missingSkills.length > 0 && (
                        <div>
                          <span className="font-bold text-amber-800 block mb-1">
                            Kỹ năng còn thiếu ({fit.missingSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {fit.missingSkills.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {fit.strengths.length > 0 && (
                        <div>
                          <span className="font-bold text-[var(--color-foreground)] block mb-1">
                            Điểm mạnh:
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[var(--color-muted-foreground)]">
                            {fit.strengths.map((st, idx) => (
                              <li key={idx}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fit.advice.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
                          <span className="font-bold text-[var(--color-primary)] block">
                            Gợi ý cải thiện:
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[var(--color-foreground)]">
                            {fit.advice.map((ad, idx) => (
                              <li key={idx}>{ad}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        disabled={fitLoading}
                        onClick={runFitAssessment}
                      >
                        <RefreshCw size={13} /> Đánh giá lại
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Job Overview Side Card */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-[var(--color-foreground)] pb-3 border-b border-[var(--color-border)]">
                  Tổng quan vị trí
                </h3>
                <SideInfo
                  icon={<BriefcaseBusiness size={18} />}
                  label="Hình thức làm việc"
                  value={jobTypeVi(job.type)}
                />
                <SideInfo
                  icon={<Wallet size={18} />}
                  label="Mức lương"
                  value={`${money(job.salaryMin)} – ${money(job.salaryMax)}`}
                />
                <SideInfo
                  icon={<MapPin size={18} />}
                  label="Địa điểm làm việc"
                  value={job.location}
                />
                <SideInfo
                  icon={<Globe size={18} />}
                  label="Phương thức"
                  value={job.arrangement}
                />
                <SideInfo
                  icon={<CalendarDays size={18} />}
                  label="Hạn chót ứng tuyển"
                  value={date(job.deadline)}
                />

                <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-lg text-xs text-[var(--color-foreground)] flex items-start gap-2.5 mt-4">
                  <Sparkles size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Mẹo ứng tuyển:</strong> Hãy nêu bật các môn học liên quan, kỹ năng thực hành và sự chủ động của bạn trong thư ứng tuyển.
                  </p>
                </div>
              </div>

              {/* Company Info Side Card */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 space-y-3.5">
                <h3 className="font-bold text-sm text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
                  Nhà tuyển dụng
                </h3>
                <div className="flex items-center gap-3">
                  <CompanyMark name={job.company} />
                  <div>
                    <b className="text-xs text-[var(--color-foreground)] block">{job.company}</b>
                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                      Đối tác tuyển dụng đã xác minh
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck size={14} /> Doanh nghiệp đã chứng thực
                </div>
                {companyUser?.email && (
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    Email liên hệ: {companyUser.email}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Apply Modal */}
      {applyOpen && (
        <SharedModal
          title={`Ứng tuyển: ${job.title}`}
          onClose={() => setApplyOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-muted-foreground)] pb-2 border-b border-[var(--color-border)]">
              Bạn đang nộp hồ sơ ứng tuyển vị trí <strong className="text-[var(--color-foreground)]">{job.title}</strong> tại <strong className="text-[var(--color-foreground)]">{job.company}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                Lời giới thiệu ngắn (Cover letter)
              </label>
              <textarea
                className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg p-3 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Giới thiệu lý do bạn quan tâm và điểm mạnh của bản thân đối với vị trí này..."
              />
            </div>

            <div className="p-3 bg-[var(--color-muted)] rounded-lg border border-[var(--color-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={18} className="text-[var(--color-primary)] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">
                    {user?.cvUrl ? "Đã đính kèm link CV" : "Chưa có liên kết CV trong hồ sơ"}
                  </span>
                  <span className="block text-[11px] text-[var(--color-muted-foreground)] truncate">
                    {user?.cvUrl || "Bạn có thể cập nhật liên kết CV trong hồ sơ cá nhân"}
                  </span>
                </div>
              </div>
              <Link
                to="/student/profile"
                onClick={() => setApplyOpen(false)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline shrink-0"
              >
                Cập nhật
              </Link>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                Hoặc tải file CV PDF từ thiết bị (Tối đa 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="block w-full text-xs text-[var(--color-foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[var(--color-border)] file:text-xs file:font-semibold file:bg-[var(--color-background)] file:text-[var(--color-primary)] hover:file:bg-sky-100 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setSelectedCv(null);
                    return;
                  }
                  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                    toast("Chỉ chấp nhận file định dạng PDF", "error");
                    e.target.value = "";
                    setSelectedCv(null);
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    toast("Kích thước file CV không được vượt quá 5MB", "error");
                    e.target.value = "";
                    setSelectedCv(null);
                    return;
                  }
                  setSelectedCv(file);
                }}
              />
              {selectedCv && (
                <p className="mt-1.5 text-xs text-emerald-700 font-medium">
                  ✓ Đã chọn file: {selectedCv.name}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setApplyOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  try {
                    const result = await applicationService.apply(job.id, user!, message);
                    if (selectedCv) {
                      try {
                        await api.applications.uploadCv(result.applicationId, selectedCv);
                      } catch (uploadError) {
                        await applicationService.loadMine();
                        toast(
                          "Đã gửi đơn nhưng upload file CV thất bại: " +
                            (uploadError instanceof Error ? uploadError.message : "Lỗi không xác định"),
                          "error"
                        );
                        setApplyOpen(false);
                        navigate("/student/applications");
                        return;
                      }
                    }
                    await applicationService.loadMine();
                    setSelectedCv(null);
                    setApplyOpen(false);
                    toast("Ứng tuyển thành công!");
                    navigate("/student/applications");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Không thể ứng tuyển", "error");
                  }
                }}
              >
                <Send size={15} />
                Gửi đơn ứng tuyển
              </Button>
            </div>
          </div>
        </SharedModal>
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
    <div className="flex items-start gap-3 py-1">
      <span className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="block text-[11px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-semibold">
          {label}
        </span>
        <span className="block text-xs font-bold text-[var(--color-foreground)] mt-0.5 break-words">
          {value}
        </span>
      </div>
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
    return (
      <Navigate
        to={loginRedirect(user.role, (location.state as { from?: unknown } | null)?.from)}
        replace
      />
    );

  return (
    <AuthLayout
      sideTitle="Cơ hội nghề nghiệp tiếp theo đang chờ đón bạn."
      sideText="Khám phá hàng ngàn cơ hội thực tập, việc làm part-time linh hoạt phù hợp với lịch học của bạn."
    >
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors duration-150 mb-6 cursor-pointer"
          to="/"
        >
          <ArrowLeft size={14} /> Về trang chủ
        </Link>

        <div className="mb-6">
          <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
            CHÀO MỪNG TRỞ LẠI
          </span>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            Đăng nhập tài khoản
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Đăng nhập để tiếp tục ứng tuyển và theo dõi hồ sơ của bạn.
          </p>
        </div>

        <form
          className="space-y-4"
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

              // Mọi vai trò đều cần danh sách việc làm công khai
              jobService.load().catch(console.error);
              toast(`Chào mừng trở lại, ${u.name.split(" ")[0]}!`);
              const from = (location.state as { from?: string } | null)?.from;
              navigate(loginRedirect(u.role, from), {
                replace: true,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Đăng nhập không thành công");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
              Địa chỉ email
            </label>
            <input
              className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[var(--color-foreground)]">
                Mật khẩu
              </label>
            </div>
            <input
              className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/20 text-[var(--color-destructive)] text-xs flex items-center gap-2">
              <CircleHelp size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center mt-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"} <ArrowRight size={16} />
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Bạn chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              Đăng ký ngay
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Đăng nhập được mã hóa và xác thực an toàn</span>
          </div>
        </div>
      </div>
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
    return (
      <Navigate
        to={user.role === "STUDENT" ? "/" : `/${user.role.toLowerCase()}/dashboard`}
        replace
      />
    );

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
      sideTitle="Khởi đầu hành trình sự nghiệp vững chắc."
      sideText="Kết nối trực tiếp với các nhà tuyển dụng hàng đầu, tích lũy kinh nghiệm thực tế ngay từ khi còn ngồi trên ghế giảng đường."
    >
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors duration-150 mb-6 cursor-pointer"
          to="/"
        >
          <ArrowLeft size={14} /> Về trang chủ
        </Link>

        <div className="mb-6">
          <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
            {step === "details" ? "BẮT ĐẦU NGAY" : "XÁC MINH EMAIL"}
          </span>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight">
            {step === "details" ? "Tạo tài khoản mới" : "Nhập mã OTP xác thực"}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            {step === "details"
              ? "Chọn đối tượng phù hợp và điền thông tin để đăng ký."
              : `Mã xác thực 6 chữ số đã được gửi tới email ${email}.`}
          </p>
        </div>

        {step === "details" ? (
          <>
            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col gap-2 relative ${
                  role === "STUDENT"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]/40 hover:bg-[var(--color-background)]/50"
                }`}
                onClick={() => setRole("STUDENT")}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      role === "STUDENT"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <GraduationCap size={18} />
                  </div>
                  {role === "STUDENT" && (
                    <CheckCircle2 size={16} className="text-[var(--color-primary)]" />
                  )}
                </div>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Sinh viên
                  </b>
                  <small className="text-[10px] text-[var(--color-muted-foreground)] leading-tight block mt-0.5">
                    Tìm việc & thực tập
                  </small>
                </div>
              </button>

              <button
                type="button"
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col gap-2 relative ${
                  role === "EMPLOYER"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-muted-foreground)]/40 hover:bg-[var(--color-background)]/50"
                }`}
                onClick={() => setRole("EMPLOYER")}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      role === "EMPLOYER"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Building2 size={18} />
                  </div>
                  {role === "EMPLOYER" && (
                    <CheckCircle2 size={16} className="text-[var(--color-primary)]" />
                  )}
                </div>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Nhà tuyển dụng
                  </b>
                  <small className="text-[10px] text-[var(--color-muted-foreground)] leading-tight block mt-0.5">
                    Đăng tin & tuyển dụng
                  </small>
                </div>
              </button>
            </div>

            <form className="space-y-4" onSubmit={requestOtp}>
              <div>
                <label htmlFor="register-name" className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  {role === "STUDENT" ? "Họ và tên" : "Tên người đại diện"}
                </label>
                <input
                  id="register-name"
                  name="name"
                  autoComplete="name"
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {role === "EMPLOYER" && (
                <div>
                  <label htmlFor="register-company" className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                    Tên công ty / Doanh nghiệp
                  </label>
                  <input
                    id="register-company"
                    name="company"
                    autoComplete="organization"
                    className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Công ty TNHH Công Nghệ..."
                  />
                </div>
              )}

              <div>
                <label htmlFor="register-email" className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  Địa chỉ email
                </label>
                <input
                  id="register-email"
                  name="email"
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu.vn"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  Mật khẩu
                </label>
                <input
                  id="register-password"
                  name="password"
                  autoComplete="new-password"
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/20 text-[var(--color-destructive)] text-xs flex items-center gap-2">
                  <CircleHelp size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center mt-2 cursor-pointer"
                disabled={loading}
              >
                {loading
                  ? "Đang gửi mã xác thực..."
                  : "Gửi mã xác thực OTP"}{" "}
                <ArrowRight size={16} />
              </Button>

              <p className="text-[11px] text-[var(--color-muted-foreground)] text-center leading-normal">
                Chúng tôi sẽ gửi một mã OTP 6 số tới email của bạn để xác thực. Mã có hiệu lực trong 5 phút.
              </p>
            </form>
          </>
        ) : (
          <form className="space-y-4" onSubmit={verify}>
            <div>
              <label htmlFor="register-otp" className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5 text-center">
                Mã xác minh OTP (6 chữ số)
              </label>
              <input
                id="register-otp"
                name="otp"
                autoComplete="one-time-code"
                className="w-full bg-white border-2 border-[var(--color-primary)] rounded-lg px-3.5 py-3 text-center tracking-[0.5em] text-xl font-bold font-mono text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/20 text-[var(--color-destructive)] text-xs flex items-center gap-2">
                <CircleHelp size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center cursor-pointer"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Đang xác thực..." : "Xác thực & Tạo tài khoản"}{" "}
              <ArrowRight size={16} />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full justify-center cursor-pointer"
              disabled={loading}
              onClick={() => {
                setStep("details");
                setOtp("");
                setError("");
              }}
            >
              Quay lại thay đổi thông tin
            </Button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* Aside Brand Column (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-4 bg-[var(--color-primary)] text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Brand Header */}
        <Link to="/" className="inline-flex items-center gap-2.5 text-white group cursor-pointer z-10">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white border border-white/20 group-hover:bg-white/25 transition-colors duration-150">
            <GraduationCap size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            student<span className="text-blue-300">job</span>
          </span>
        </Link>

        {/* Aside Content / Value Prop */}
        <div className="my-auto py-8 z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-blue-200">
            <Sparkles size={13} /> Nền tảng việc làm sinh viên
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl xl:text-3xl font-extrabold leading-snug tracking-tight text-white">
              {sideTitle}
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              {sideText}
            </p>
          </div>

          {/* Testimonial Quote Card */}
          <div className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm space-y-3">
            <p className="text-xs text-white/90 italic leading-relaxed">
              “Nhờ StudentJob, mình đã tìm được vị trí thực tập lập trình viên part-time với mức trợ cấp tốt và giờ giấc linh hoạt theo lịch học đại học.”
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white border border-white/30">
                AM
              </div>
              <div>
                <b className="text-xs text-white block">Alex Morgan</b>
                <span className="text-[10px] text-white/70 block">Sinh viên Kỹ thuật phần mềm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aside Footer */}
        <div className="z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-300" /> Nền tảng an toàn, bảo mật
          </span>
          <span>© 2026 StudentJob</span>
        </div>

        {/* Decorative subtle ambient accents */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
      </aside>

      {/* Main Form Column */}
      <main className="lg:col-span-7 xl:col-span-8 bg-[var(--color-background)] flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Mobile Brand Link */}
          <div className="lg:hidden mb-6 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2 text-[var(--color-foreground)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <span className="font-extrabold text-lg tracking-tight">
                student<span className="text-[var(--color-primary)]">job</span>
              </span>
            </Link>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, setUser } = useContext(AuthContext);
  const [mobile, setMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
            ["Đăng tin mới", "/employer/jobs/new", Plus],
            ["Hồ sơ công ty", "/employer/profile", UserRound],
            ["Tin nhắn", "/employer/messages", Mail],
          ]
        : [
            ["Tổng quan", "/admin/dashboard", LayoutDashboard],
            ["Quản lý người dùng", "/admin/users", Users],
            ["Duyệt tin tuyển dụng", "/admin/jobs", ShieldCheck],
            ["Đơn ứng tuyển", "/admin/applications", ClipboardList],
          ];

  const notifications =
    role === "STUDENT"
      ? applicationService
          .all()
          .filter((a) => a.studentId === user?.id && a.status !== "PENDING")
          .slice(0, 4)
          .map((a) => ({
            id: a.id,
            text: `Đơn ứng tuyển "${a.jobTitle || "Công việc"}" đã được ${a.status === "ACCEPTED" ? "chấp nhận" : "từ chối"}.`,
            to: `/student/applications/${a.id}`,
          }))
      : role === "EMPLOYER"
        ? applicationService
            .all()
            .filter((a) => a.status === "PENDING")
            .slice(0, 4)
            .map((a) => ({
              id: a.id,
              text: `${a.studentName || "Ứng viên mới"} đã nộp hồ sơ vào vị trí "${a.jobTitle || "Tin tuyển dụng"}".`,
              to: `/employer/applications/${a.id}`,
            }))
        : jobService
            .adminAll()
            .filter((j) => j.moderation === "PENDING")
            .slice(0, 4)
            .map((j) => ({
              id: j.id,
              text: `Tin "${j.title}" (${j.company}) đang chờ kiểm duyệt.`,
              to: "/admin/jobs",
            }));
  const title =
    role === "STUDENT"
      ? "Không gian sinh viên"
      : role === "EMPLOYER"
        ? "Không gian tuyển dụng"
        : "Quản trị hệ thống";
  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-border)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <Link className="inline-flex items-center gap-2.5 text-[var(--color-foreground)] cursor-pointer" to="/">
            <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
              <GraduationCap size={18} />
            </span>
            <span className="font-extrabold text-lg tracking-tight">
              student<span className="text-[var(--color-primary)]">job</span>
            </span>
          </Link>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] cursor-pointer"
            aria-label="Đóng menu"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
            Không gian làm việc
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
            <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              {role === "STUDENT" ? (
                <GraduationCap size={16} />
              ) : role === "EMPLOYER" ? (
                <Building2 size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">{title}</b>
              <small className="text-[11px] text-[var(--color-muted-foreground)] block truncate">
                Tài khoản {roleLabel(role)}
              </small>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                `flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]"
                }`
              }
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon size={17} className="shrink-0" />
                <span className="truncate">{label as string}</span>
              </span>
              {label === "Đơn ứng tuyển" && role === "STUDENT" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 border border-current/20 shrink-0">
                  {applicationService.all().filter((a) => a.studentId === user?.id).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)] space-y-2.5 shrink-0">
          <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-foreground)]">
              <CircleHelp size={15} className="text-[var(--color-primary)]" />
              <span>Cần hỗ trợ?</span>
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)] leading-snug">
              Chúng tôi luôn sẵn sàng hỗ trợ bạn.
            </p>
            <a
              href="mailto:hello@studentjob.demo"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline"
            >
              Liên hệ hỗ trợ <ArrowRight size={12} />
            </a>
          </div>

          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150"
          >
            <Globe size={16} className="text-[var(--color-primary)]" />
            <span>Xem trang tuyển dụng</span>
          </Link>

          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
            onClick={() => {
              authService.logout();
              setUser(null);
              navigate("/");
              if (jobService.all().length === 0) jobService.load().catch(() => {});
            }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>

          <div className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--color-border)] bg-white">
            <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">
                {user?.name}
              </b>
              <small className="text-[10px] text-[var(--color-muted-foreground)] block truncate">
                {user?.email}
              </small>
            </div>
          </div>
        </div>
      </aside>

      {mobile && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden cursor-pointer"
          aria-label="Đóng menu"
          onClick={() => setMobile(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] cursor-pointer"
              onClick={() => setMobile(!mobile)}
              aria-label="Mở hoặc đóng thanh bên"
            >
              <Menu size={18} />
            </button>
            <div className="text-xs text-[var(--color-muted-foreground)] flex items-center gap-1.5">
              <span className="hidden sm:inline">Không gian làm việc</span>
              <span className="hidden sm:inline">/</span>
              <b className="text-[var(--color-foreground)] font-bold">{roleLabel(role)}</b>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-background)] border border-[var(--color-border)] px-2.5 py-1.5 rounded-lg">
              <CalendarDays size={14} className="text-[var(--color-primary)]" />
              {new Date().toLocaleDateString("vi-VN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div className="relative">
              <button
                type="button"
                className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer relative"
                aria-label="Thông báo"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[var(--color-border)] rounded-xl shadow-lg p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                    <b className="text-xs font-bold text-[var(--color-foreground)]">
                      Thông báo mới
                    </b>
                    <button
                      type="button"
                      className="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer"
                      onClick={() => setNotifOpen(false)}
                    >
                      Đóng
                    </button>
                  </div>
                  {notifications.length ? (
                    <div className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.to}
                          onClick={() => setNotifOpen(false)}
                          className="block py-2 text-xs text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors duration-150"
                        >
                          {n.text}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">
                      Hiện chưa có thông báo mới.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((p) => !p)}
                className="inline-flex items-center gap-2 px-2 py-1 rounded-xl border border-[var(--color-border)] bg-white hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                aria-label="Menu tài khoản"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="hidden sm:inline text-xs font-semibold text-[var(--color-foreground)]">
                  {user?.name.split(" ")[0]}
                </span>
                <ChevronDown size={13} className="text-[var(--color-muted-foreground)]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[var(--color-border)] rounded-xl shadow-lg py-2 z-50">
                  <div className="px-3.5 py-2 border-b border-[var(--color-border)] mb-1">
                    <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">
                      {user?.name}
                    </b>
                    <small className="text-[11px] text-[var(--color-muted-foreground)] block truncate">
                      {user?.email}
                    </small>
                  </div>
                  {role === "EMPLOYER" && (
                    <>
                      <Link
                        to="/employer/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                      >
                        <Building2 size={14} /> Hồ sơ công ty
                      </Link>
                      <Link
                        to="/employer/messages"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                      >
                        <Mail size={14} /> Tin nhắn
                      </Link>
                    </>
                  )}
                  {role === "ADMIN" && (
                    <>
                      <Link
                        to="/admin/users"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                      >
                        <Users size={14} /> Quản lý người dùng
                      </Link>
                      <Link
                        to="/admin/jobs"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                      >
                        <ShieldCheck size={14} /> Duyệt tin tuyển dụng
                      </Link>
                      <Link
                        to="/admin/applications"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                      >
                        <ClipboardList size={14} /> Đơn ứng tuyển
                      </Link>
                    </>
                  )}
                  <Link
                    to="/"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                  >
                    <Globe size={14} /> Trang tuyển dụng
                  </Link>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      authService.logout();
                      setUser(null);
                      navigate("/");
                      if (jobService.all().length === 0) jobService.load().catch(() => {});
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-[var(--color-border)] bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span>© 2026 StudentJob Marketplace</span>
          <span className="inline-flex items-center gap-1">
            Nền tảng việc làm sinh viên <Sparkles size={13} className="text-[var(--color-primary)]" />
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
  const iconColors: Record<string, string> = {
    blue: "bg-sky-50 text-[var(--color-primary)] border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const iconStyle = iconColors[variant] || iconColors.blue;

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between transition-colors duration-150">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
          {label}
        </span>
        <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconStyle}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] tracking-tight my-2">
        {value}
      </div>
      {trend && (
        <div className="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-1.5 font-medium">
          <ArrowRight size={12} className="text-[var(--color-primary)] shrink-0" />
          {trend}
        </div>
      )}
    </div>
  );
}


function Companies() {
  const [query, setQuery] = useState("");
  const jobs = jobService.all().filter((j) => j.status === "OPEN" && j.moderation === "APPROVED");
  const companies = Array.from(new Set(jobs.map((j) => j.company))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
  const visible = companies.filter((name) =>
    name.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <PublicNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-4">
          <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block">
            KHÁM PHÁ NHÀ TUYỂN DỤNG
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
            Công ty đang tuyển dụng
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-2xl">
            Tìm hiểu các doanh nghiệp đối tác và xem những vị trí thực tập, part-time đang mở tuyển.
          </p>
          <div className="relative max-w-md pt-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên công ty..."
              aria-label="Tìm công ty"
              className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((name) => {
              const openJobs = jobs.filter((j) => j.company === name);
              return (
                <article
                  key={name}
                  className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[var(--color-primary)]/50 transition-colors duration-150"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <CompanyMark name={name} />
                      <Badge variant="success">Đang tuyển</Badge>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--color-foreground)]">
                        {name}
                      </h2>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {openJobs.length} vị trí đang tuyển dụng
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(openJobs.map((j) => j.category)))
                        .slice(0, 3)
                        .map((cat) => (
                          <span
                            key={cat}
                            className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)]"
                          >
                            {cat}
                          </span>
                        ))}
                    </div>
                  </div>
                  <Link to={`/jobs?q=${encodeURIComponent(name)}`}>
                    <Button variant="primary" size="sm" fullWidth>
                      Xem việc làm <ArrowRight size={14} />
                    </Button>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Không tìm thấy công ty phù hợp với từ khóa "{query}".
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SavedJobs() {
  const { user } = useContext(AuthContext);
  const [ids, setIds] = useState<string[]>(() => readSaved(user?.id || ""));
  useEffect(() => {
    const refresh = () => setIds(readSaved(user?.id || ""));
    window.addEventListener("sj:saved-updated", refresh);
    return () => window.removeEventListener("sj:saved-updated", refresh);
  }, [user?.id]);
  const jobs = jobService.all().filter((j) => ids.includes(j.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DANH SÁCH QUAN TÂM"
        title="Việc làm đã lưu"
        subtitle="Những cơ hội bạn đánh dấu quan tâm để xem lại và ứng tuyển sau."
      />

      <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-3 text-xs text-[var(--color-foreground)]">
        <span className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <Bookmark size={18} />
        </span>
        <span>
          Bạn đang lưu <b className="text-[var(--color-primary)]">{jobs.length}</b> tin tuyển dụng trên trình duyệt này.
        </span>
      </div>

      {jobs.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-3">
            <Bookmark size={22} />
          </div>
          <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">
            Chưa có việc làm đã lưu
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mb-4">
            Nhấn biểu tượng đánh dấu trên tin tuyển dụng để lưu lại và xem sau.
          </p>
          <Link to="/jobs">
            <Button variant="primary" size="md">
              Khám phá việc làm <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
function CVAnalysis() {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [savingCv, setSavingCv] = useState(false);
  const [targetJob, setTargetJob] = useState("");
  const [result, setResult] = useState<CVAnalyzeResponse | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<CVHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await aiService.getCvHistory();
      setHistory(res.data || []);
    } catch {
      // Ignore silent load errors
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    setSelectedHistoryId(null);
    try {
      const res = await aiService.analyzeCv(file, targetJob);
      setResult(res);
      if (res.historyId) setSelectedHistoryId(res.historyId);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể phân tích CV.");
    } finally {
      setBusy(false);
    }
  };

  const regenerateFeedback = async () => {
    if (!result) return;
    setFeedbackBusy(true);
    try {
      const res = await aiService.feedbackCv(result.data, targetJob.trim() || undefined);
      setResult((prev) => (prev ? { ...prev, feedback: res.data } : prev));
      toast("AI đã tạo nhận xét & gợi ý mới cho CV!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không thể tạo nhận xét AI.", "error");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const viewHistoryItem = (item: CVHistoryItem) => {
    setSelectedHistoryId(item.id);
    setError("");
    setResult({
      historyId: item.id,
      message: "Đang xem lại từ lịch sử",
      aiUsed: item.aiUsed,
      model: item.model,
      data: item.data,
      feedback: item.feedback,
      warnings: item.warnings || [],
    });
  };

  const removeHistoryItem = async (id: number) => {
    try {
      await aiService.deleteCvHistory(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
        setResult(null);
      }
      toast("Đã xóa mục lịch sử");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không thể xóa mục lịch sử", "error");
    }
  };

  const saveToBuilder = async () => {
    if (!result) return;
    setSavingCv(true);
    try {
      await cvService.create(result.data);
      toast("Đã lưu CV phân tích vào danh sách CV của bạn!", "success");
      navigate("/student/cvs");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không thể lưu CV.", "error");
    } finally {
      setSavingCv(false);
    }
  };

  const areaLabels: Record<string, string> = {
    structure: "Bố cục",
    summary: "Giới thiệu",
    experience: "Kinh nghiệm",
    skills: "Kỹ năng",
    education: "Học vấn",
    formatting: "Trình bày",
    language: "Ngôn ngữ",
  };

  return (
    <>
      <PageHeader
        eyebrow="TRỢ LÝ NGHỀ NGHIỆP AI"
        title="Phân tích & Đánh giá CV bằng AI"
        subtitle="Tải file CV định dạng PDF hoặc DOCX để AI trích xuất cấu trúc, đánh giá chất lượng và gợi ý cải thiện."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Upload Panel */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Bot size={22} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Tải lên tài liệu CV
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Hệ thống AI trích xuất dữ liệu và chấm điểm theo tiêu chuẩn tuyển dụng.
              </p>
            </div>
          </div>

          <label className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-150 bg-[var(--color-background)]/50 group">
            <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-3 group-hover:bg-sky-100 transition-colors duration-150">
              <Upload size={22} />
            </div>
            <span className="text-sm font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors duration-150">
              {file ? file.name : "Kéo thả hoặc nhấn để chọn file CV"}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)] mt-1">
              Định dạng hỗ trợ: PDF hoặc DOCX (Tối đa 5 MB)
            </span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </label>

          <div>
            <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
              Vị trí muốn ứng tuyển (tùy chọn — giúp AI gợi ý sát hơn)
            </label>
            <input
              type="text"
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
              placeholder="VD: Thực tập sinh AI, Frontend ReactJS, Data Analyst..."
              className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!file || busy}
            onClick={run}
          >
            {busy ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                AI đang phân tích CV...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Bắt đầu phân tích bằng AI
              </>
            )}
          </Button>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-[var(--color-foreground)] pb-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <span>Kết quả phân tích CV</span>
            {result && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} /> {result.aiUsed ? "Phân tích AI hoàn tất" : "Trích xuất cơ bản"}
              </span>
            )}
          </h2>

          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[var(--color-muted)]/50 rounded-lg border border-[var(--color-border)]">
                  <span className="block text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase">
                    Họ và tên
                  </span>
                  <span className="block font-bold text-[var(--color-foreground)] mt-1 break-words">
                    {result.data.personal_info?.full_name || "Chưa nhận diện"}
                  </span>
                </div>
                <div className="p-3 bg-[var(--color-muted)]/50 rounded-lg border border-[var(--color-border)]">
                  <span className="block text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase">
                    Email
                  </span>
                  <span className="block font-bold text-[var(--color-foreground)] mt-1 break-words">
                    {result.data.personal_info?.email || "Chưa nhận diện"}
                  </span>
                </div>
                <div className="p-3 bg-[var(--color-muted)]/50 rounded-lg border border-[var(--color-border)]">
                  <span className="block text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase">
                    Số điện thoại
                  </span>
                  <span className="block font-bold text-[var(--color-foreground)] mt-1 break-words">
                    {result.data.personal_info?.phone || "Chưa nhận diện"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted-foreground)] font-medium">Học vấn:</span>
                  <span className="font-bold text-[var(--color-foreground)]">{result.data.education?.length || 0} mục</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted-foreground)] font-medium">Kinh nghiệm làm việc:</span>
                  <span className="font-bold text-[var(--color-foreground)]">{result.data.experience?.length || 0} mục</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted-foreground)] font-medium">Dự án cá nhân:</span>
                  <span className="font-bold text-[var(--color-foreground)]">{result.data.projects?.length || 0} mục</span>
                </div>
                {result.data.skills?.length ? (
                  <div className="pt-1">
                    <span className="text-[var(--color-muted-foreground)] font-medium block mb-1.5">
                      Kỹ năng trích xuất ({result.data.skills.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.data.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-[var(--color-border)] text-[var(--color-foreground)] text-xs px-2 py-0.5 rounded font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* AI Feedback Section */}
              {result.feedback ? (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-[var(--color-primary)] shrink-0" />
                      <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                        Nhận xét & Đề xuất từ AI
                      </h3>
                    </div>
                    <button
                      type="button"
                      disabled={feedbackBusy}
                      onClick={() => void regenerateFeedback()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={11} className={feedbackBusy ? "animate-spin" : ""} />
                      {feedbackBusy ? "Đang đánh giá..." : "Đánh giá lại"}
                    </button>
                  </div>
                  {/* Overall Assessment */}
                  <div className="p-3.5 bg-white border border-sky-100 rounded-lg space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
                      Đánh giá tổng quan
                    </span>
                    <p className="text-xs text-[var(--color-foreground)] leading-relaxed">
                      {result.feedback.overall}
                    </p>
                  </div>

                  {/* Grouped Feedback & Suggestions */}
                  {result.feedback.items?.length > 0 && (
                    <div className="space-y-3">
                      {(
                        [
                          {
                            severity: "high",
                            heading: "Cần ưu tiên cải thiện ngay",
                            borderCls: "border-l-4 border-l-rose-500",
                            badgeVariant: "danger" as const,
                          },
                          {
                            severity: "medium",
                            heading: "Nên điều chỉnh thêm",
                            borderCls: "border-l-4 border-l-amber-500",
                            badgeVariant: "warning" as const,
                          },
                          {
                            severity: "low",
                            heading: "Gợi ý tối ưu",
                            borderCls: "border-l-4 border-l-sky-500",
                            badgeVariant: "info" as const,
                          },
                        ] as const
                      ).map((group) => {
                        const groupItems = result.feedback!.items.filter(
                          (it) => it.severity === group.severity,
                        );
                        if (!groupItems.length) return null;
                        return (
                          <div key={group.severity} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                                {group.heading} ({groupItems.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {groupItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 bg-white border border-[var(--color-border)] ${group.borderCls} rounded-lg space-y-1.5 text-xs`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant={group.badgeVariant} className="whitespace-nowrap">
                                      {areaLabels[item.area] || item.area}
                                    </Badge>
                                  </div>
                                  <p className="text-[var(--color-foreground)] leading-relaxed">
                                    {item.tip}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[var(--color-foreground)]">
                    <b className="block font-bold">Chưa có nhận xét chi tiết từ AI</b>
                    <span className="text-[var(--color-muted-foreground)]">
                      Nhấn nút bên cạnh để AI chấm điểm và đưa ra gợi ý cải thiện CV này.
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={feedbackBusy}
                    onClick={() => void regenerateFeedback()}
                  >
                    <Sparkles size={13} />
                    {feedbackBusy ? "Đang phân tích..." : "AI Đánh giá & Gợi ý"}
                  </Button>
                </div>
              )}

              {result.warnings?.length ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <strong className="block font-bold">Lưu ý kiểm tra thông tin:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.warnings.map((w, i) => {
                      const m = w.match(/^dropped_ungrounded:(\d+)$/);
                      const text = m
                        ? `Đã tự động lọc bỏ ${m[1]} thông tin không tìm thấy trực tiếp trong văn bản CV gốc để đảm bảo độ chính xác.`
                        : w;
                      return <li key={i}>{text}</li>;
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={savingCv}
                  onClick={saveToBuilder}
                >
                  {savingCv ? "Đang lưu CV..." : "Lưu vào CV của tôi"}
                </Button>
                <Link to="/student/cvs" className="block">
                  <Button variant="outline" size="md" fullWidth>
                    Mở Trình tạo CV <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] flex items-center justify-center mb-3">
                <FileText size={22} />
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs leading-relaxed">
                Tải lên file CV ở khung bên trái và bấm <strong>Bắt đầu phân tích bằng AI</strong> hoặc chọn một mục trong <strong>Lịch sử nhận xét CV</strong> bên dưới.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      <section className="mt-6 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Clock3 size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Lịch sử phân tích & nhận xét CV
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Các lần đánh giá CV trước đây được lưu trong 90 ngày để bạn dễ dàng xem lại.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={historyLoading}>
            <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} /> Tải lại
          </Button>
        </div>

        {historyLoading ? (
          <p className="text-xs text-[var(--color-muted-foreground)] py-4">
            Đang tải lịch sử nhận xét...
          </p>
        ) : history.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)] py-6 text-center">
            Chưa có lịch sử phân tích nào. Hãy tải lên CV ở trên để bắt đầu!
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {history.map((item) => {
              const isSelected = selectedHistoryId === item.id;
              return (
                <div
                  key={item.id}
                  className={`py-3.5 px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-150 ${
                    isSelected ? "bg-sky-50/70" : "hover:bg-[var(--color-background)]/50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <FileText size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-xs font-bold text-[var(--color-foreground)] truncate">
                          {item.fileName}
                        </b>
                        <Badge variant={item.aiUsed ? "info" : "neutral"}>
                          {item.aiUsed ? "Phân tích AI" : "Cơ bản"}
                        </Badge>
                        {item.feedback && (
                          <Badge variant="success">Có nhận xét</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">
                        {item.feedback?.overall ||
                          `${item.data?.skills?.length || 0} kỹ năng · ${new Date(item.createdAt).toLocaleString("vi-VN")}`}
                      </p>
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant={isSelected ? "primary" : "outline"}
                      size="sm"
                      onClick={() => viewHistoryItem(item)}
                    >
                      <Eye size={13} /> {isSelected ? "Đang xem" : "Xem lại"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => void removeHistoryItem(item.id)}
                      className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                      title="Xóa khỏi lịch sử"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function StudentRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <PublicNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="dashboard" element={<Navigate to="/" replace />} />

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
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const apps = applicationService.all().filter((a) => a.studentId === user?.id);
  const allOpenJobs = jobService
    .all()
    .filter((j) => j.status === "OPEN" && j.moderation === "APPROVED");

  const [aiRecs, setAiRecs] = useState<RecommendedJobItem[]>([]);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    let active = true;
    aiService
      .recommendJobs()
      .then((res) => {
        if (!active) return;
        setAiRecs(res.data || []);
        setAiUsed(res.aiUsed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const recReasonById = new Map(aiRecs.map((r) => [String(r.jobId), r.reason]));
  const recommended = aiRecs.length
    ? aiRecs
        .map((r) => allOpenJobs.find((j) => String(j.id) === String(r.jobId)))
        .filter((j): j is Job => Boolean(j))
        .slice(0, 3)
    : allOpenJobs.slice(0, 3);

  const profileFields = [
    user?.phone,
    user?.university,
    user?.major,
    user?.skills?.length,
    user?.bio,
    user?.cvUrl,
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const progressPercent = Math.round((completedFields / profileFields.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="KHÔNG GIAN NGHỀ NGHIỆP SINH VIÊN"
        title={`Xin chào, ${user?.name.split(" ")[0] || "bạn"}`}
        subtitle="Cập nhật tiến độ ứng tuyển và các cơ hội việc làm mới nhất."
        action={
          <Link to="/jobs">
            <Button variant="primary" size="md">
              <Search size={16} /> Khám phá việc làm
            </Button>
          </Link>
        }
      />

      {/* 4 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Tổng đơn ứng tuyển"
          value={apps.length}
          icon={<FileText size={18} />}
          trend="Hành trình nghề nghiệp"
          variant="blue"
        />
        <Metric
          label="Đang chờ phản hồi"
          value={apps.filter((a) => a.status === "PENDING").length}
          icon={<Clock3 size={18} />}
          variant="amber"
          trend="Hồ sơ đang xét duyệt"
        />
        <Metric
          label="Đã chấp nhận"
          value={apps.filter((a) => a.status === "ACCEPTED").length}
          icon={<CheckCircle2 size={18} />}
          variant="green"
          trend="Chúc mừng kết quả!"
        />
        <Metric
          label="Chưa phù hợp"
          value={apps.filter((a) => a.status === "REJECTED").length}
          icon={<Activity size={18} />}
          variant="purple"
          trend="Mỗi lượt thử là trải nghiệm"
        />
      </div>

      {/* 2-Column: Recent applications + Profile completeness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Recent Applications (Col 2/3) */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Đơn ứng tuyển gần đây
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Các vị trí bạn đã nộp hồ sơ gần nhất
              </p>
            </div>
            <Link
              to="/student/applications"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              Xem tất cả ({apps.length}) <ArrowRight size={14} />
            </Link>
          </div>

          {apps.length ? (
            <div className="divide-y divide-[var(--color-border)]">
              {apps.slice(0, 4).map((a) => (
                <ApplicationRow key={a.id} app={a} showStudent={false} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-3">
                <FileText size={22} />
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mb-4">
                Bạn chưa nộp đơn cho vị trí nào. Hãy tìm kiếm việc làm và bắt đầu ngay!
              </p>
              <Link to="/jobs">
                <Button variant="primary" size="sm">
                  Tìm công việc đầu tiên
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Profile Completeness (Col 1/3) */}
        <div className="lg:col-span-1 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Hồ sơ sinh viên
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Mức độ hoàn thiện thông tin
              </p>
            </div>
            <span className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <UserRound size={17} />
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[var(--color-foreground)] mb-2">
              <span>Độ hoàn thiện</span>
              <span className="text-[var(--color-primary)]">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--color-muted)] rounded-full overflow-hidden border border-[var(--color-border)]">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Hồ sơ đầy đủ thông tin giúp bạn tăng cơ hội nhận được phản hồi sớm từ nhà tuyển dụng.
          </p>

          <Link to="/student/profile" className="block">
            <Button variant="outline" size="sm" fullWidth>
              Hoàn thiện hồ sơ <ArrowRight size={14} />
            </Button>
          </Link>

          <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-[var(--color-foreground)] flex items-start gap-2.5">
            <Sparkles size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mẹo:</strong> Đính kèm liên kết CV và cập nhật các kỹ năng đã học để hồ sơ nổi bật hơn.
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
              Cơ hội việc làm gợi ý
              {aiUsed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-[var(--color-primary)] border border-sky-200">
                  <Sparkles size={11} /> AI Xếp hạng
                </span>
              )}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              {aiUsed
                ? "Được AI ưu tiên theo kỹ năng và hồ sơ CV của bạn"
                : "Những vị trí linh hoạt phù hợp với bạn"}
            </p>
          </div>
          <Link
            to="/jobs"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            Xem tất cả việc làm <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommended.map((j) => {
            const reason = recReasonById.get(String(j.id));
            return (
              <div key={j.id} className="space-y-2">
                <JobCard job={j} />
                {reason && (
                  <p className="text-[11px] text-[var(--color-primary)] bg-sky-50 border border-sky-100 rounded-lg px-3 py-1.5 flex items-start gap-1.5">
                    <Sparkles size={12} className="shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
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

  const statusVariant =
    app.status === "ACCEPTED"
      ? "success"
      : app.status === "REJECTED"
        ? "danger"
        : app.status === "PENDING"
          ? "warning"
          : "info";

  const statusText =
    app.status === "PENDING"
      ? "Đang chờ duyệt"
      : app.status === "ACCEPTED"
        ? "Đã chấp nhận"
        : app.status === "REJECTED"
          ? "Đã từ chối"
          : app.status;

  return (
    <Link
      to={
        showStudent
          ? `/employer/applications/${app.id}`
          : `/student/applications/${app.id}`
      }
      className="py-3 flex items-center justify-between gap-4 hover:bg-[var(--color-background)]/60 px-2 rounded-lg transition-colors duration-150 group cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <CompanyMark name={job?.company || "SJ"} />
        <div className="min-w-0">
          <b className="text-xs font-bold text-[var(--color-foreground)] block truncate group-hover:text-[var(--color-primary)] transition-colors duration-150">
            {showStudent ? student?.name : job?.title || "Vị trí tuyển dụng"}
          </b>
          <span className="text-[11px] text-[var(--color-muted-foreground)] block truncate mt-0.5">
            {showStudent ? job?.title : job?.company} · {date(app.appliedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={statusVariant}>{statusText}</Badge>
        <ArrowRight
          size={16}
          className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors duration-150 shrink-0"
        />
      </div>
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

  const completenessItems: Array<[string, unknown]> = [
    ["Số điện thoại liên hệ", user?.phone],
    ["Trường học", user?.university],
    ["Chuyên ngành", user?.major],
    ["Kỹ năng", user?.skills?.length],
    ["Giới thiệu bản thân", user?.bio],
    ["Liên kết CV", user?.cvUrl],
  ];
  const completenessPercent = Math.round(
    (completenessItems.filter(([, v]) => Boolean(v)).length / completenessItems.length) * 100
  );

  const inputCls =
    "w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] disabled:bg-[var(--color-background)] disabled:text-[var(--color-muted-foreground)] transition-colors duration-150";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="THƯƠNG HIỆU CÁ NHÂN"
        title="Hồ sơ của tôi"
        subtitle="Cập nhật thông tin học vấn, kỹ năng và CV để nhà tuyển dụng hiểu rõ hơn về bạn."
        action={
          !editing ? (
            <Button variant="primary" size="md" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Chỉnh sửa hồ sơ
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
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
              Hủy bỏ
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center font-extrabold text-lg shrink-0">
                {form.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("") || "SV"}
              </span>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-foreground)]">
                  {form.name || "Chưa cập nhật tên"}
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  {form.major || "Chưa cập nhật chuyên ngành"}
                  {form.university ? ` · ${form.university}` : ""}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] mt-1">
                  <Mail size={13} className="text-[var(--color-primary)]" />
                  {user?.email}
                </span>
              </div>
            </div>
            <Badge variant="success">Hồ sơ sinh viên</Badge>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              Thông tin cá nhân
            </h3>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Cập nhật thông tin chính xác để nhà tuyển dụng có thể liên hệ nhanh chóng.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast("Vui lòng nhập họ và tên", "error");
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
              try {
                const saved = await userService.save(updated);
                setUser(saved);
                setEditing(false);
                toast("Đã lưu hồ sơ thành công!");
              } catch (err) {
                toast(err instanceof Error ? err.message : "Không thể lưu hồ sơ", "error");
              }
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Họ và tên">
                <input
                  className={inputCls}
                  value={form.name}
                  disabled={!editing}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Địa chỉ email">
                <input
                  className={inputCls}
                  value={user?.email || ""}
                  disabled
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  className={inputCls}
                  value={form.phone}
                  disabled={!editing}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+84..."
                />
              </Field>
              <Field label="Trường đại học / Cao đẳng">
                <input
                  className={inputCls}
                  value={form.university}
                  disabled={!editing}
                  onChange={(e) => update("university", e.target.value)}
                  placeholder="Trường đại học của bạn"
                />
              </Field>
              <Field label="Chuyên ngành">
                <input
                  className={inputCls}
                  value={form.major}
                  disabled={!editing}
                  onChange={(e) => update("major", e.target.value)}
                  placeholder="Ví dụ: Kỹ thuật phần mềm"
                />
              </Field>
              <Field label="Kỹ năng (ngăn cách bằng dấu phẩy)">
                <input
                  className={inputCls}
                  value={form.skills}
                  disabled={!editing}
                  onChange={(e) => update("skills", e.target.value)}
                  placeholder="React, SQL, Giao tiếp"
                />
              </Field>
              <Field label="Liên kết CV (URL)" wide>
                <input
                  className={inputCls}
                  type="url"
                  value={form.cvUrl}
                  disabled={!editing}
                  onChange={(e) => update("cvUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Giới thiệu bản thân" wide>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={form.bio}
                  disabled={!editing}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Chia sẻ sở thích, thế mạnh và mục tiêu nghề nghiệp của bạn..."
                />
              </Field>
            </div>

            {editing && (
              <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
                <Button variant="primary" size="md" type="submit">
                  <Check size={16} /> Lưu thay đổi
                </Button>
              </div>
            )}
          </form>

          <div className="pt-2">
            <ChangePasswordCard />
          </div>
        </section>

        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  Mức độ hoàn thiện hồ sơ
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Hồ sơ đầy đủ giúp tăng tỷ lệ được chọn
                </p>
              </div>
              <Sparkles size={18} className="text-[var(--color-primary)] shrink-0" />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-extrabold text-[var(--color-primary)]">
                  {completenessPercent}%
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">hoàn thành</span>
              </div>
              <div className="w-full h-2 bg-[var(--color-muted)] rounded-full overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-[var(--color-primary)] transition-all duration-300"
                  style={{ width: `${completenessPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {completenessItems.map(([label, val]) => (
                <div key={label} className="flex items-center gap-2.5 text-xs text-[var(--color-foreground)]">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                      val
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-[var(--color-background)] border-[var(--color-border)]"
                    }`}
                  >
                    {val ? <Check size={10} /> : null}
                  </span>
                  <span className={val ? "font-medium" : "text-[var(--color-muted-foreground)]"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
              <ShieldCheck size={17} />
              <span>Cung cấp thông tin chính xác</span>
            </div>
            <p className="text-xs text-[var(--color-foreground)] leading-relaxed">
              Hãy dùng thông tin chính xác và bản CV mới nhất để nhà tuyển dụng đánh giá đúng năng lực và kinh nghiệm của bạn.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function ChangePasswordCard() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (newPassword.length < 8) {
      toast("Mật khẩu mới phải có ít nhất 8 ký tự", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Xác nhận mật khẩu mới không khớp", "error");
      return;
    }

    setSaving(true);
    try {
      await api.profile.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Đổi mật khẩu thành công");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể đổi mật khẩu",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-base font-bold text-[var(--color-foreground)]">
            Đổi mật khẩu
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Cập nhật mật khẩu định kỳ để bảo vệ tài khoản của bạn.
          </p>
        </div>
        <ShieldCheck size={18} className="text-[var(--color-primary)] shrink-0" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Mật khẩu hiện tại *">
            <SharedInput
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu cũ"
            />
          </Field>
          <Field label="Mật khẩu mới *">
            <SharedInput
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
            />
          </Field>
          <Field label="Xác nhận mật khẩu mới *">
            <SharedInput
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </Field>
        </div>
        <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
          <Button variant="primary" size="md" type="submit" disabled={saving}>
            <ShieldCheck size={15} /> {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </Button>
        </div>
      </form>
    </section>
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
    <label className={`block space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-bold text-[var(--color-foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StudentApplications() {
  const { user } = useContext(AuthContext);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");

  const jobs = store.jobs();
  const allApps = applicationService
    .all()
    .filter((a) => a.studentId === user?.id);

  const findJob = (jobId: string) => {
    return (
      jobs.find((job) => String(job.id) === String(jobId)) ??
      jobService.byId(jobId)
    );
  };

  const apps = allApps.filter((a) => {
    const job = findJob(a.jobId);
    const jobTitle = a.jobTitle || job?.title || "";
    const jobCompany = a.jobCompany || job?.company || "";
    const matchesStatus = filter === "ALL" || a.status === filter;
    const searchText = `${jobTitle} ${jobCompany}`.toLowerCase();
    const matchesSearch = searchText.includes(q.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const total = allApps.length;
  const pending = allApps.filter((a) => a.status === "PENDING").length;
  const accepted = allApps.filter((a) => a.status === "ACCEPTED").length;
  const rejected = allApps.filter((a) => a.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QUẢN LÝ ỨNG TUYỂN"
        title="Đơn ứng tuyển của tôi"
        subtitle="Theo dõi chi tiết tiến độ và phản hồi từ nhà tuyển dụng."
        action={
          <Link to="/jobs">
            <Button variant="primary" size="md">
              <Plus size={16} /> Tìm thêm việc làm
            </Button>
          </Link>
        }
      />

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)] font-semibold">
            Tổng đơn ứng tuyển
          </span>
          <b className="text-2xl font-bold text-[var(--color-foreground)] mt-2">
            {total}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)] font-semibold">
            Đang chờ duyệt
          </span>
          <b className="text-2xl font-bold text-amber-600 mt-2">
            {pending}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)] font-semibold">
            Đã chấp nhận
          </span>
          <b className="text-2xl font-bold text-emerald-600 mt-2">
            {accepted}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)] font-semibold">
            Đã từ chối
          </span>
          <b className="text-2xl font-bold text-rose-600 mt-2">
            {rejected}
          </b>
        </div>
      </div>

      {/* Main Content: Search & Filters (ALWAYS VISIBLE) & Data Table */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
        {/* Toolbar: Search input + Always visible status pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo vị trí công việc hoặc công ty..."
              className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg pl-9 pr-3.5 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          {/* Status filter tabs (ALWAYS VISIBLE) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--color-muted)] rounded-lg border border-[var(--color-border)]">
            {[
              ["ALL", `Tất cả (${total})`],
              ["PENDING", `Đang chờ (${pending})`],
              ["ACCEPTED", `Chấp nhận (${accepted})`],
              ["REJECTED", `Từ chối (${rejected})`],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors duration-150 cursor-pointer ${
                  filter === val
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List Table */}
        {apps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/60">
                  <th className="py-3 px-4 font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[11px]">
                    Công việc & Công ty
                  </th>
                  <th className="py-3 px-4 font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[11px]">
                    Ngày ứng tuyển
                  </th>
                  <th className="py-3 px-4 font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[11px]">
                    Trạng thái
                  </th>
                  <th className="py-3 px-4 font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider text-[11px]">
                    CV đính kèm
                  </th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {apps.map((a) => {
                  const job = findJob(a.jobId);
                  const jobTitle = a.jobTitle || job?.title || "Chưa có thông tin công việc";
                  const jobCompany = a.jobCompany || job?.company || "";

                  const statusVariant =
                    a.status === "ACCEPTED"
                      ? "success"
                      : a.status === "REJECTED"
                        ? "danger"
                        : "warning";

                  const statusLabel =
                    a.status === "PENDING"
                      ? "Đang chờ duyệt"
                      : a.status === "ACCEPTED"
                        ? "Đã chấp nhận"
                        : a.status === "REJECTED"
                          ? "Đã từ chối"
                          : a.status;

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-[var(--color-background)]/40 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CompanyMark name={jobCompany || "SJ"} />
                          <div>
                            <span className="font-bold text-xs text-[var(--color-foreground)] block">
                              {jobTitle}
                            </span>
                            <span className="text-[11px] text-[var(--color-muted-foreground)]">
                              {jobCompany}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                        {date(a.appliedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {a.cvUrl ? (
                          <a
                            href={a.cvUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-[var(--color-primary)] hover:underline"
                          >
                            <FileText size={14} /> Xem CV <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-[var(--color-muted-foreground)] italic">
                            Chưa có link CV
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link to={`/student/applications/${a.id}`}>
                          <Button variant="outline" size="sm">
                            Xem chi tiết <ArrowRight size={13} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] flex items-center justify-center mb-3">
              <FileText size={22} />
            </div>
            <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-1">
              Không tìm thấy đơn ứng tuyển
            </h3>
            <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mb-4">
              {q || filter !== "ALL"
                ? "Không có đơn ứng tuyển nào khớp với bộ lọc hiện tại."
                : "Bạn chưa gửi đơn ứng tuyển nào."}
            </p>
            {q || filter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQ("");
                  setFilter("ALL");
                }}
              >
                Xóa bộ lọc
              </Button>
            ) : (
              <Link to="/jobs">
                <Button variant="primary" size="sm">
                  Khám phá việc làm ngay
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationDetails({ role }: { role: "STUDENT" | "EMPLOYER" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id = "" } = useParams();
  const { user } = useContext(AuthContext);
  const app = applicationService.all().find((a) => a.id === id);
  // Employer chỉ tra cứu trong tin tuyển dụng của mình; sinh viên dùng danh sách công khai
  const job = app
    ? role === "EMPLOYER"
      ? jobService.mineById(app.jobId)
      : jobService.byId(app.jobId)
    : undefined;
  const studentName = app?.studentName || "Ứng viên";

  if (role === "STUDENT" && app && app.studentId !== user?.id)
    return <Navigate to="/unauthorized" />;
  if (role === "EMPLOYER" && job && job.employerUserId !== user?.id)
    return <Navigate to="/unauthorized" />;

  if (!app)
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-8">
          <div className="w-12 h-12 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-3">
            <FileText size={22} />
          </div>
          <h2 className="text-base font-bold text-[var(--color-foreground)] mb-1">
            Không tìm thấy đơn ứng tuyển
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
            Đơn ứng tuyển không tồn tại hoặc bạn không có quyền truy cập.
          </p>
          <Link to={role === "STUDENT" ? "/student/applications" : "/employer/jobs"}>
            <Button variant="primary" size="sm">
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </div>
    );

  const statusVariant =
    app.status === "ACCEPTED"
      ? "success"
      : app.status === "REJECTED"
        ? "danger"
        : "warning";

  const statusText =
    app.status === "PENDING"
      ? "Đang chờ duyệt"
      : app.status === "ACCEPTED"
        ? "Đã chấp nhận"
        : app.status === "REJECTED"
          ? "Đã từ chối"
          : app.status;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CHI TIẾT ĐƠN ỨNG TUYỂN"
        title={role === "STUDENT" ? "Theo dõi tiến độ hồ sơ" : studentName}
        subtitle={job?.title || "Vị trí tuyển dụng"}
        action={
          <Link to={role === "STUDENT" ? "/student/applications" : "/employer/jobs"}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} /> Quay lại danh sách
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Application status, timeline, cover letter, submitted CV */}
        <div className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
            <div>
              <span className="text-xs font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
                Trạng thái hiện tại
              </span>
              <div className="mt-1">
                <Badge variant={statusVariant}>{statusText}</Badge>
              </div>
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Mã hồ sơ: #{app.id}
            </span>
          </div>

          {/* Timeline Tracker */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              Tiến trình xử lý hồ sơ
            </h3>
            <div className="space-y-4 pl-2 border-l-2 border-[var(--color-border)] ml-3">
              {/* Step 1: Sent */}
              <div className="relative pl-6">
                <span className="absolute -left-[19px] top-0 w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center">
                  <Check size={13} />
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Đã gửi đơn ứng tuyển
                  </b>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    {date(app.appliedAt)}
                  </span>
                </div>
              </div>

              {/* Step 2: Under Review / Decision */}
              <div className="relative pl-6">
                <span
                  className={`absolute -left-[19px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    app.status === "PENDING"
                      ? "bg-amber-100 border-amber-500 text-amber-700"
                      : app.status === "ACCEPTED"
                        ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                        : "bg-rose-100 border-rose-500 text-rose-700"
                  }`}
                >
                  {app.status === "PENDING" ? (
                    <Clock3 size={12} />
                  ) : app.status === "ACCEPTED" ? (
                    <Check size={12} />
                  ) : (
                    <X size={12} />
                  )}
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    {app.status === "PENDING"
                      ? "Nhà tuyển dụng đang xét duyệt"
                      : app.status === "ACCEPTED"
                        ? "Hồ sơ được chấp nhận"
                        : "Hồ sơ chưa phù hợp"}
                  </b>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    {app.status === "PENDING"
                      ? "Hồ sơ của bạn đã được chuyển đến bộ phận tuyển dụng và đang chờ phản hồi."
                      : "Trạng thái hồ sơ đã được cập nhật bởi nhà tuyển dụng."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-2">
              Thư giới thiệu bản thân
            </h3>
            <div className="p-4 bg-[var(--color-muted)]/40 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-foreground)] leading-relaxed whitespace-pre-line">
              {app.message || "Ứng viên không để lại lời nhắn."}
            </div>
          </div>

          {/* Submitted CV */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-2">
              Tài liệu CV đính kèm
            </h3>
            {app.cvUrl ? (
              <a
                href={app.cvUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 p-3 bg-white border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-muted)] transition-colors duration-150"
              >
                <FileText size={18} />
                <span>Xem và tải CV đã nộp</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)] italic">
                Chưa có tài liệu CV nào được đính kèm.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Job or Applicant Info */}
        <div className="lg:col-span-1 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
            {role === "STUDENT" ? "Thông tin công việc" : "Hồ sơ ứng viên"}
          </h3>

          {role === "STUDENT" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CompanyMark name={job?.company || "SJ"} />
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    {job?.title}
                  </b>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    {job?.company}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                <MapPin size={13} className="text-[var(--color-primary)] shrink-0" />
                <span>{job?.location}</span>
              </div>

              {job && (
                <Link to={`/jobs/${job.id}`} className="block">
                  <Button variant="outline" size="sm" fullWidth>
                    Xem chi tiết bài đăng <ArrowRight size={14} />
                  </Button>
                </Link>
              )}

              {app.status === "ACCEPTED" && (
                <div className="pt-2">
                  <Link to={`/student/applications/${app.id}/review`} className="block">
                    <Button variant="primary" size="md" fullWidth>
                      Viết đánh giá công ty <Star size={14} />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center font-bold text-xs uppercase">
                  {studentName.slice(0, 2)}
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    {studentName}
                  </b>
                  <span className="text-[11px] text-[var(--color-muted-foreground)]">
                    {app.studentMajor || "Sinh viên"}
                    {app.studentUniversity ? ` · ${app.studentUniversity}` : ""}
                  </span>
                </div>
              </div>

              {app.studentEmail && (
                <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                  <Mail size={13} className="text-[var(--color-primary)] shrink-0" />
                  <span>{app.studentEmail}</span>
                </div>
              )}

              {app.studentPhone && (
                <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                  <Phone size={13} className="text-[var(--color-primary)] shrink-0" />
                  <span>{app.studentPhone}</span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={async () => {
                    try {
                      const res = await chatApi.createWithStudent(Number(app.studentId));
                      navigate(`/employer/messages?conversation=${res.conversationId}`);
                    } catch (err) {
                      toast(
                        err instanceof Error ? err.message : "Không thể mở cuộc trò chuyện.",
                        "error",
                      );
                    }
                  }}
                >
                  <Mail size={14} /> Nhắn tin với ứng viên
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
      <div className="space-y-6">
        <PageHeader
          eyebrow="CHIA SẺ TRẢI NGHIỆM"
          title="Viết đánh giá công ty"
          subtitle="Đánh giá của bạn giúp các sinh viên khác có thêm góc nhìn thực tế."
        />
        <EmptyPage
          title={
            existing
              ? "Bạn đã đánh giá công việc này rồi"
              : "Chưa thể viết đánh giá"
          }
          text={
            existing
              ? "Mỗi vị trí việc làm chỉ được gửi đánh giá một lần."
              : "Chỉ những đơn ứng tuyển đã được chấp nhận mới có thể viết đánh giá."
          }
          action={
            <Link to="/student/applications">
              <Button variant="primary" size="md">
                Quay lại đơn ứng tuyển
              </Button>
            </Link>
          }
        />
      </div>
    );

  const ratingLabels = [
    "",
    "Chưa hài lòng",
    "Cần cải thiện thêm",
    "Tạm ổn",
    "Rất tốt",
    "Trải nghiệm tuyệt vời",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CHIA SẺ TRẢI NGHIỆM"
        title="Trải nghiệm làm việc thế nào?"
        subtitle={`Để lại đánh giá khách quan cho ${job.company}.`}
      />

      <section className="max-w-2xl bg-white border border-[var(--color-border)] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-[var(--color-border)]">
          <CompanyMark name={job.company} />
          <div>
            <b className="text-sm font-bold text-[var(--color-foreground)] block">
              {job.title}
            </b>
            <small className="text-xs text-[var(--color-muted-foreground)]">
              {job.company}
            </small>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await reviewService.create(job.id, user!, rating, comment);
              toast("Cảm ơn bạn đã chia sẻ đánh giá!");
              navigate(`/student/applications/${app.id}`);
            } catch (err) {
              toast(
                err instanceof Error ? err.message : "Không thể lưu đánh giá",
                "error",
              );
            }
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-[var(--color-foreground)]">
              Mức độ hài lòng của bạn
            </legend>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  aria-label={`${i + 1} sao`}
                  onClick={() => setRating(i + 1)}
                  className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors duration-150 cursor-pointer"
                >
                  <Star size={28} fill={i < rating ? "currentColor" : "none"} />
                </button>
              ))}
              <span className="ml-2 text-xs font-semibold text-[var(--color-foreground)]">
                {ratingLabels[rating]}
              </span>
            </div>
          </fieldset>

          <Field label="Nội dung đánh giá">
            <textarea
              className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
              required
              minLength={10}
              maxLength={600}
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bạn đã học được gì? Môi trường làm việc và sự hỗ trợ của đội ngũ thế nào?"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => navigate(-1)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" type="submit">
              <Star size={15} /> Gửi đánh giá
            </Button>
          </div>
        </form>

        <p className="text-[11px] text-[var(--color-muted-foreground)] pt-4 border-t border-[var(--color-border)]">
          Lưu ý: Chỉ các đơn ứng tuyển đã được chấp nhận mới có thể đánh giá, và mỗi sinh viên chỉ gửi đánh giá một lần cho mỗi công việc.
        </p>
      </section>
    </div>
  );
}
function EmployerRoutes() {
  return (
    <Shell role="EMPLOYER">
      <Routes>
        <Route path="dashboard" element={<EmployerDashboard />} />
        <Route path="jobs" element={<EmployerJobs />} />
        <Route path="profile" element={<EmployerProfile />} />
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
function EmployerProfile() {
  const { user, setUser } = useContext(AuthContext);
  const toast = useToast();
  const [form, setForm] = useState({
    company: user?.company || user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    description: user?.description || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userService
      .loadProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        setForm({
          company: profile.company || profile.name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          description: profile.description || "",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const inputCls =
    "w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HỒ SƠ DOANH NGHIỆP"
        title="Thông tin nhà tuyển dụng"
        subtitle="Cập nhật thông tin công ty để ứng viên sinh viên dễ dàng tìm hiểu và liên hệ."
      />

      <section className="max-w-3xl bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
          <CompanyMark name={form.company || "DN"} />
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              {form.company || "Chưa cập nhật tên công ty"}
            </h2>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {user?.email}
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.company.trim()) {
              toast("Vui lòng nhập tên công ty", "error");
              return;
            }
            setSaving(true);
            try {
              const saved = await userService.save({
                ...user!,
                name: form.company.trim(),
                company: form.company.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                description: form.description.trim(),
              });
              setUser(saved);
              toast("Đã cập nhật hồ sơ công ty thành công!");
            } catch (err) {
              toast(err instanceof Error ? err.message : "Không thể lưu hồ sơ", "error");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tên công ty / Doanh nghiệp *">
              <input
                className={inputCls}
                required
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </Field>
            <Field label="Số điện thoại liên hệ">
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09..."
              />
            </Field>
            <Field label="Địa chỉ văn phòng" wide>
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Quận 1, TP. Hồ Chí Minh"
              />
            </Field>
            <Field label="Giới thiệu về công ty" wide>
              <textarea
                className={inputCls}
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả lĩnh vực hoạt động, văn hóa và môi trường làm việc..."
              />
            </Field>
          </div>
          <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              <Check size={15} /> {saving ? "Đang lưu..." : "Lưu thông tin công ty"}
            </Button>
          </div>
        </form>
      </section>

      <ChangePasswordCard />
    </div>
  );
}
function EmployerDashboard() {
  const { user } = useContext(AuthContext);

  // API /jobs/mine đã trả về job của Employer hiện tại
  const jobs = jobService.mine();

  const apps = applicationService
    .all()
    .filter((a) => jobs.some((j) => j.id === a.jobId));

  const weekBars = useMemo(() => {
    const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const result: Array<{ d: string; n: number }> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - offset);
      const iso = dt.toISOString().slice(0, 10);
      const count = apps.filter((a) => String(a.appliedAt).slice(0, 10) === iso).length;
      result.push({ d: dayLabels[dt.getDay()], n: count });
    }
    return result;
  }, [apps]);

  const statusItems = [
    {
      label: "Đang chờ duyệt",
      n: apps.filter((a) => a.status === "PENDING").length,
      dot: "bg-amber-500",
      bar: "bg-amber-500",
    },
    {
      label: "Đã chấp nhận",
      n: apps.filter((a) => a.status === "ACCEPTED").length,
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
    },
    {
      label: "Đã từ chối",
      n: apps.filter((a) => a.status === "REJECTED").length,
      dot: "bg-rose-500",
      bar: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TỔNG QUAN TUYỂN DỤNG"
        title={`Xin chào, ${user?.name.split(" ")[0] || "Nhà tuyển dụng"}`}
        subtitle="Theo dõi hiệu quả tuyển dụng và danh sách ứng viên mới nhất của bạn."
        action={
          <Link to="/employer/jobs/new">
            <Button variant="primary" size="md">
              <Plus size={16} /> Đăng tin tuyển dụng
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Tổng tin tuyển dụng"
          value={jobs.length}
          icon={<BriefcaseBusiness size={18} />}
          variant="blue"
        />
        <Metric
          label="Vị trí đang mở"
          value={jobs.filter((j) => j.status === "OPEN").length}
          icon={<Globe size={18} />}
          variant="green"
        />
        <Metric
          label="Vị trí đã đóng"
          value={jobs.filter((j) => j.status === "CLOSED").length}
          icon={<Ban size={18} />}
          variant="purple"
        />
        <Metric
          label="Tổng ứng viên"
          value={apps.length}
          icon={<Users size={18} />}
          variant="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Hoạt động ứng tuyển
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Lượng hồ sơ tiếp nhận trong tuần
              </p>
            </div>
            <Badge variant="info">
              <ChartNoAxesCombined size={13} /> Tổng quan
            </Badge>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-7 gap-2 items-end h-36 px-2">
              {weekBars.map((v) => (
                <div className="flex flex-col items-center gap-1.5" key={v.d}>
                  <span className="text-[11px] font-bold text-[var(--color-muted-foreground)]">
                    {v.n}
                  </span>
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-[var(--color-primary)]/85 hover:bg-[var(--color-primary)] transition-colors duration-150"
                    style={{ height: `${v.n * 13 + 12}px` }}
                  />
                  <small className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
                    {v.d}
                  </small>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)] inline-block" />
                Đơn ứng tuyển đã nhận
              </span>
              <b className="text-[var(--color-foreground)]">Tổng {apps.length} hồ sơ</b>
            </div>
          </div>
        </section>

        <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Trạng thái ứng tuyển
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Phân bổ hồ sơ trên các tin tuyển dụng của bạn
            </p>
          </div>

          <div className="space-y-4">
            {statusItems.map((v) => (
              <div className="space-y-1.5" key={v.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-[var(--color-foreground)]">
                    <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                    {v.label}
                  </span>
                  <b className="font-bold text-[var(--color-foreground)]">{v.n}</b>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${v.bar}`}
                    style={{
                      width: `${apps.length ? (v.n / apps.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Link to="/employer/jobs" className="block pt-2">
            <Button variant="outline" size="md" fullWidth>
              Quản lý tin tuyển dụng <ArrowRight size={15} />
            </Button>
          </Link>
        </section>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Tin tuyển dụng của bạn
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Quản lý vị trí và theo dõi ứng viên
            </p>
          </div>
          <Link
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            to="/employer/jobs"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>

        {jobs.length ? (
          <div className="divide-y divide-[var(--color-border)]">
            {jobs.slice(0, 4).map((j) => (
              <div
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                key={j.id}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanyMark name={j.company} />
                  <div className="min-w-0">
                    <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">
                      {j.title}
                    </b>
                    <span className="text-[11px] text-[var(--color-muted-foreground)] block mt-0.5">
                      {j.applicants} ứng viên · Đăng ngày {date(j.postedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <Badge variant={j.status === "OPEN" ? "success" : "neutral"}>
                    {j.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                  </Badge>
                  <Link to={`/employer/jobs/${j.id}/applications`}>
                    <Button variant="outline" size="sm">
                      Xem ứng viên
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPage
            title="Chưa có tin tuyển dụng"
            text="Hãy đăng tin tuyển dụng đầu tiên để bắt đầu tiếp cận ứng viên sinh viên."
            action={
              <Link to="/employer/jobs/new">
                <Button variant="primary" size="md">
                  Tạo tin tuyển dụng
                </Button>
              </Link>
            }
          />
        )}
      </section>

      <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="pb-3 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">
            Đơn ứng tuyển gần đây
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Ứng viên mới nhất cho các vị trí của bạn
          </p>
        </div>
        {apps.length ? (
          <div className="divide-y divide-[var(--color-border)]">
            {apps.slice(0, 4).map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">
            Đơn ứng tuyển mới sẽ hiển thị tại đây.
          </p>
        )}
      </section>
    </div>
  );
}
function EmployerJobs() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [confirm, setConfirm] = useState<Job | null>(null);
  const allJobs = jobService.mine();
  const jobs = allJobs
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
  const totalApplicants = applicationService
    .all()
    .filter((a) => allJobs.some((j) => j.id === a.jobId)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QUẢN LÝ VỊ TRÍ"
        title="Tin tuyển dụng"
        subtitle="Tạo mới, chỉnh sửa và theo dõi trạng thái duyệt các tin tuyển dụng."
        action={
          <Link to="/employer/jobs/new">
            <Button variant="primary" size="md">
              <Plus size={16} /> Tạo tin tuyển dụng
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Tổng tin tuyển dụng
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1 block">
            {allJobs.length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đang mở
          </span>
          <b className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {allJobs.filter((j) => j.status === "OPEN").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã đóng
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-muted-foreground)] mt-1 block">
            {allJobs.filter((j) => j.status === "CLOSED").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Ứng viên
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-primary)] mt-1 block">
            {totalApplicants}
          </b>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-background)]/40">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm tin tuyển dụng..."
              className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-44">
              <SharedSelect
                icon={<ListFilter size={14} />}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="OPEN">Đang mở</option>
                <option value="CLOSED">Đã đóng</option>
              </SharedSelect>
            </div>

            <div className="w-44">
              <SharedSelect
                icon={<ArrowDownUp size={14} />}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Mới nhất trước</option>
                <option value="salary">Lương cao nhất</option>
              </SharedSelect>
            </div>
          </div>
        </div>

        {jobs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-background)]/60 border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4">Tin tuyển dụng</th>
                  <th className="py-3 px-4">Ngày đăng</th>
                  <th className="py-3 px-4">Ứng viên</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Kiểm duyệt</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[var(--color-background)]/40 transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <CompanyMark name={j.company} />
                        <div>
                          <b className="font-bold text-[var(--color-foreground)] block">
                            {j.title}
                          </b>
                          <small className="text-[11px] text-[var(--color-muted-foreground)]">
                            {j.category} · {jobTypeVi(j.type)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                      {date(j.postedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        className="inline-flex items-center gap-1 font-bold text-[var(--color-primary)] hover:underline"
                        to={`/employer/jobs/${j.id}/applications`}
                      >
                        {
                          applicationService
                            .all()
                            .filter((a) => a.jobId === j.id).length
                        }{" "}
                        ứng viên <ArrowRight size={12} />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={j.status === "OPEN" ? "success" : "neutral"}>
                        {j.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          j.moderation === "APPROVED"
                            ? "success"
                            : j.moderation === "REJECTED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {j.moderation === "APPROVED"
                          ? "Đã duyệt"
                          : j.moderation === "REJECTED"
                            ? "Bị từ chối"
                            : "Chờ duyệt"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                          title="Chỉnh sửa tin"
                          to={`/employer/jobs/${j.id}/edit`}
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                          title={j.status === "OPEN" ? "Đóng tin tuyển dụng" : "Mở lại tin"}
                          onClick={async () => {
                            try {
                              await jobService.save({
                                ...j,
                                status: j.status === "OPEN" ? "CLOSED" : "OPEN",
                              });
                              toast(
                                j.status === "OPEN"
                                  ? "Đã đóng tin tuyển dụng"
                                  : "Đã mở lại tin tuyển dụng",
                              );
                            } catch (err) {
                              toast(
                                err instanceof Error ? err.message : "Không thể cập nhật trạng thái",
                                "error",
                              );
                            }
                          }}
                        >
                          {j.status === "OPEN" ? <Ban size={14} /> : <RefreshCw size={14} />}
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                          title="Xóa tin tuyển dụng"
                          onClick={() => setConfirm(j)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyPage
              title="Không tìm thấy tin tuyển dụng"
              text={
                q
                  ? "Hãy thử tìm kiếm với từ khóa khác."
                  : "Hãy tạo tin tuyển dụng đầu tiên để bắt đầu tìm kiếm ứng viên."
              }
              action={
                <Link to="/employer/jobs/new">
                  <Button variant="primary" size="md">
                    <Plus size={16} /> Tạo tin tuyển dụng
                  </Button>
                </Link>
              }
            />
          </div>
        )}
      </section>

      {confirm && (
        <Modal title="Xóa tin tuyển dụng?" onClose={() => setConfirm(null)}>
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Bạn sắp xóa tin <b className="text-[var(--color-foreground)]">{confirm.title}</b>. Thao tác này sẽ gỡ tin khỏi danh sách hiển thị.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                try {
                  await jobService.remove(confirm.id);
                  setConfirm(null);
                  toast("Đã xóa tin tuyển dụng");
                } catch (err) {
                  toast(
                    err instanceof Error ? err.message : "Không thể xóa tin tuyển dụng",
                    "error",
                  );
                }
              }}
            >
              Xóa tin tuyển dụng
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function JobEditor() {
  const { id = "" } = useParams();
  const editing = !!id;
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();
  const existing = editing ? jobService.mineById(id) : undefined;
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
        title="Không tìm thấy tin tuyển dụng"
        text="Bạn chỉ có thể chỉnh sửa các tin tuyển dụng thuộc tài khoản của mình."
        action={
          <Link to="/employer/jobs">
            <Button variant="primary" size="md">
              Quay lại danh sách
            </Button>
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
      errs.push("Tiêu đề công việc phải có ít nhất 4 ký tự.");
    if (!form.description.trim()) errs.push("Vui lòng nhập mô tả công việc.");
    if (
      Number(form.salaryMin) < 0 ||
      Number(form.salaryMax) < Number(form.salaryMin)
    )
      errs.push("Khoảng mức lương không hợp lệ.");
    if (!form.deadline) errs.push("Vui lòng chọn hạn chót ứng tuyển.");
    if (errs.length) {
      setErrors(errs);
      return;
    }
    const job: Job = {
      id: existing?.id || `j-${Date.now()}`,
      title: form.title.trim(),
      company: user?.company || user?.name || "Công ty đối tác",
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
          ? "Cập nhật tin tuyển dụng thành công"
          : "Đã gửi tin tuyển dụng, đang chờ quản trị viên duyệt",
      );
      navigate("/employer/jobs");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Không thể lưu tin tuyển dụng",
        "error",
      );
    }
  };

  const fieldCls =
    "w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={editing ? "CẬP NHẬT VỊ TRÍ" : "MỞ RỘNG ĐỘI NGŨ"}
        title={editing ? "Chỉnh sửa tin tuyển dụng" : "Tạo tin tuyển dụng mới"}
        subtitle="Thông tin rõ ràng, minh bạch giúp thu hút đúng ứng viên sinh viên phù hợp."
        action={
          <Button variant="outline" size="md" onClick={() => navigate("/employer/jobs")}>
            <ArrowLeft size={15} /> Quay lại danh sách
          </Button>
        }
      />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
              <span className="w-9 h-9 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <BriefcaseBusiness size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  Thông tin cơ bản
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Nhập các thông tin quan trọng để ứng viên dễ dàng tìm kiếm.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tiêu đề công việc *" wide>
                <input
                  className={fieldCls}
                  required
                  minLength={4}
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Ví dụ: Thực tập sinh lập trình Frontend"
                />
              </Field>
              <Field label="Ngành nghề *">
                <SharedSelect
                  value={form.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {!jobCategories.includes(form.category) && <option value={form.category}>{form.category}</option>}
                  {jobCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SharedSelect>
              </Field>
              <Field label="Hình thức làm việc *">
                <SharedSelect
                  value={form.type}
                  onChange={(e) => change("type", e.target.value)}
                >
                  <option value="PART_TIME">Bán thời gian</option>
                  <option value="FULL_TIME">Toàn thời gian</option>
                  <option value="INTERNSHIP">Thực tập</option>
                  <option value="FREELANCE">Làm tự do</option>
                </SharedSelect>
              </Field>
              <Field label="Lương tối thiểu (VNĐ) *">
                <input
                  className={fieldCls}
                  type="number"
                  min="0"
                  required
                  value={form.salaryMin}
                  onChange={(e) => change("salaryMin", e.target.value)}
                />
              </Field>
              <Field label="Lương tối đa (VNĐ) *">
                <input
                  className={fieldCls}
                  type="number"
                  min="0"
                  required
                  value={form.salaryMax}
                  onChange={(e) => change("salaryMax", e.target.value)}
                />
              </Field>
              <Field label="Địa điểm làm việc *">
                <input
                  className={fieldCls}
                  required
                  value={form.location}
                  onChange={(e) => change("location", e.target.value)}
                  placeholder="TP. Hồ Chí Minh hoặc Làm từ xa"
                />
              </Field>
              <Field label="Phương thức làm việc">
                <SharedSelect
                  value={form.arrangement}
                  onChange={(e) => change("arrangement", e.target.value)}
                >
                  {!['On-site', 'Hybrid', 'Remote'].includes(form.arrangement) && <option value={form.arrangement}>{form.arrangement}</option>}
                  <option value="On-site">Tại văn phòng</option>
                  <option value="Hybrid">Kết hợp</option>
                  <option value="Remote">Làm từ xa</option>
                </SharedSelect>
              </Field>
              <Field label="Hạn chót ứng tuyển *">
                <input
                  className={fieldCls}
                  type="date"
                  required
                  value={form.deadline}
                  onChange={(e) => change("deadline", e.target.value)}
                />
              </Field>
              <Field label="Trạng thái tin">
                <SharedSelect
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="OPEN">Đang mở</option>
                  <option value="CLOSED">Đã đóng</option>
                </SharedSelect>
              </Field>
            </div>
          </section>

          <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
              <span className="w-9 h-9 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                  Mô tả chi tiết vị trí
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Giúp sinh viên hiểu rõ công việc và cách thức đóng góp cho đội ngũ.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Giới thiệu vị trí *" wide>
                <textarea
                  className={fieldCls}
                  rows={5}
                  required
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Mô tả công việc, môi trường làm việc và quyền lợi của vị trí..."
                />
              </Field>
              <Field label="Trách nhiệm công việc (mỗi dòng 1 ý)" wide>
                <textarea
                  className={fieldCls}
                  rows={4}
                  value={form.responsibilities}
                  onChange={(e) => change("responsibilities", e.target.value)}
                  placeholder={"Xây dựng và cải thiện giao diện sản phẩm\nPhối hợp với đội ngũ kỹ thuật và thiết kế"}
                />
              </Field>
              <Field label="Yêu cầu ứng viên (mỗi dòng 1 ý)" wide>
                <textarea
                  className={fieldCls}
                  rows={4}
                  value={form.requirements}
                  onChange={(e) => change("requirements", e.target.value)}
                  placeholder={"Đang là sinh viên năm 3, 4 ngành CNTT\nCó tinh thần học hỏi và giao tiếp tốt"}
                />
              </Field>
              <Field label="Kỹ năng yêu cầu (ngăn cách bằng dấu phẩy)" wide>
                <input
                  className={fieldCls}
                  value={form.skills}
                  onChange={(e) => change("skills", e.target.value)}
                  placeholder="React, TypeScript, CSS"
                />
              </Field>
            </div>
          </section>

          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <b className="block font-bold">Vui lòng kiểm tra lại thông tin:</b>
              {errors.map((err) => (
                <span className="block" key={err}>• {err}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate("/employer/jobs")}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md">
              <Check size={16} />
              {editing ? "Lưu thay đổi" : "Đăng tin tuyển dụng"}
            </Button>
          </div>
        </div>

        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
              <Sparkles size={17} />
              <span>Mẹo đăng tin hiệu quả</span>
            </div>
            <ul className="space-y-2 text-xs text-[var(--color-muted-foreground)] list-disc pl-4 leading-relaxed">
              <li>Đặt tiêu đề công việc rõ ràng, đúng trọng tâm vị trí.</li>
              <li>Minh bạch về mức lương và thời gian làm việc linh hoạt.</li>
              <li>Nêu rõ nhiệm vụ và kỹ năng cần thiết cho sinh viên.</li>
              <li>Đặt hạn nộp hồ sơ phù hợp.</li>
            </ul>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
              <ShieldCheck size={17} />
              <span>Quy trình kiểm duyệt</span>
            </div>
            <p className="text-xs text-[var(--color-foreground)] leading-relaxed">
              Tin tuyển dụng mới tạo sẽ ở trạng thái chờ duyệt và được quản trị viên xác nhận trước khi hiển thị công khai tới sinh viên.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
function EmployerApplicants() {
  const navigate = useNavigate();
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
          error instanceof Error ? error.message : "Không thể tải danh sách ứng viên",
          "error",
        ),
      );
  }, [id]);

  if (!job || job.employerUserId !== user?.id)
    return (
      <EmptyPage
        title="Không tìm thấy tin tuyển dụng"
        text="Bạn chỉ có thể xem danh sách ứng viên cho các tin tuyển dụng thuộc tài khoản của mình."
        action={
          <Link to="/employer/jobs">
            <Button variant="primary" size="md">
              Quay lại danh sách
            </Button>
          </Link>
        }
      />
    );

  const jobApps = applicationService.all().filter((a) => a.jobId === job.id);
  const apps = jobApps.filter((a) => filter === "ALL" || a.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HỒ SƠ ỨNG VIÊN"
        title="Danh sách ứng viên"
        subtitle={`${job.title} · ${job.company}`}
        action={
          <Link to="/employer/jobs">
            <Button variant="outline" size="md">
              <ArrowLeft size={15} /> Quay lại danh sách
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Tổng ứng viên
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1 block">
            {jobApps.length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Chờ xét duyệt
          </span>
          <b className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {jobApps.filter((a) => a.status === "PENDING").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã chấp nhận
          </span>
          <b className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {jobApps.filter((a) => a.status === "ACCEPTED").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã từ chối
          </span>
          <b className="text-2xl font-extrabold text-rose-700 mt-1 block">
            {jobApps.filter((a) => a.status === "REJECTED").length}
          </b>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-background)]/40">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">
              Đơn ứng tuyển của ứng viên
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Xem hồ sơ, tải CV và cập nhật trạng thái ứng tuyển.
            </p>
          </div>
          <div className="w-48 self-start sm:self-center">
            <SharedSelect
              icon={<ListFilter size={14} />}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ duyệt</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </SharedSelect>
          </div>
        </div>

        {apps.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-background)]/60 border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4">Ứng viên</th>
                  <th className="py-3 px-4">Ngày ứng tuyển</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">CV đính kèm</th>
                  <th className="py-3 px-4 text-right">Quyết định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {apps.map((a) => {
                  const studentName = a.studentName || "Ứng viên sinh viên";
                  const statusLabel =
                    a.status === "PENDING"
                      ? "Đang chờ duyệt"
                      : a.status === "ACCEPTED"
                        ? "Đã chấp nhận"
                        : "Đã từ chối";
                  const statusVariant =
                    a.status === "ACCEPTED"
                      ? "success"
                      : a.status === "REJECTED"
                        ? "danger"
                        : "warning";

                  return (
                    <tr key={a.id} className="hover:bg-[var(--color-background)]/40 transition-colors duration-150">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/employer/applications/${a.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-[11px] shrink-0">
                            {studentName
                              .split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <b className="font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors duration-150 block">
                              {studentName}
                            </b>
                            <small className="text-[11px] text-[var(--color-muted-foreground)]">
                              {a.studentMajor || a.studentUniversity || "Sinh viên"}
                            </small>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                        {date(a.appliedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {a.cvUrl?.startsWith("private-cv:") ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await api.applications.viewCv(a.id);
                                } catch (error) {
                                  toast(
                                    error instanceof Error ? error.message : "Không thể xem CV",
                                    "error",
                                  );
                                }
                              }}
                            >
                              <Eye size={13} /> Xem CV
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await api.applications.downloadCv(a.id);
                                } catch (error) {
                                  toast(
                                    error instanceof Error ? error.message : "Không thể tải CV",
                                    "error",
                                  );
                                }
                              }}
                            >
                              Tải CV
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[var(--color-muted-foreground)] italic">
                            Chưa có CV PDF
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {a.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="p-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors duration-150 cursor-pointer"
                              title="Chấp nhận ứng viên"
                              onClick={() => setConfirm({ app: a, status: "ACCEPTED" })}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                              title="Từ chối ứng viên"
                              onClick={() => setConfirm({ app: a, status: "REJECTED" })}
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-lg border border-sky-200 text-[var(--color-primary)] hover:bg-sky-50 transition-colors duration-150 cursor-pointer"
                              title="Nhắn tin với ứng viên"
                              onClick={async () => {
                                try {
                                  const res = await chatApi.createWithStudent(Number(a.studentId));
                                  navigate(`/employer/messages?conversation=${res.conversationId}`);
                                } catch (err) {
                                  toast(
                                    err instanceof Error ? err.message : "Không thể mở cuộc trò chuyện.",
                                    "error",
                                  );
                                }
                              }}
                            >
                              <Mail size={14} />
                            </button>
                            <Link
                              className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                              to={`/employer/applications/${a.id}`}
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="p-2 rounded-lg border border-sky-200 text-[var(--color-primary)] hover:bg-sky-50 transition-colors duration-150 cursor-pointer"
                              title="Nhắn tin với ứng viên"
                              onClick={async () => {
                                try {
                                  const res = await chatApi.createWithStudent(Number(a.studentId));
                                  navigate(`/employer/messages?conversation=${res.conversationId}`);
                                } catch (err) {
                                  toast(
                                    err instanceof Error ? err.message : "Không thể mở cuộc trò chuyện.",
                                    "error",
                                  );
                                }
                              }}
                            >
                              <Mail size={14} />
                            </button>
                            <Link
                              className="inline-flex items-center gap-1 font-bold text-[var(--color-primary)] hover:underline"
                              to={`/employer/applications/${a.id}`}
                            >
                              Chi tiết <ArrowRight size={13} />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyPage
              title="Chưa có ứng viên nào"
              text="Hãy chọn trạng thái lọc khác hoặc chờ sinh viên nộp hồ sơ vào vị trí này."
            />
          </div>
        )}
      </section>

      {confirm && (
        <Modal
          title={
            confirm.status === "ACCEPTED"
              ? "Chấp nhận ứng viên này?"
              : "Từ chối hồ sơ ứng tuyển?"
          }
          onClose={() => setConfirm(null)}
        >
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            {confirm.status === "ACCEPTED"
              ? "Ứng viên sẽ được chuyển sang trạng thái Đã chấp nhận và nhận thông báo kết quả."
              : "Ứng viên sẽ được chuyển sang trạng thái Đã từ chối."}
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant={confirm.status === "ACCEPTED" ? "primary" : "destructive"}
              size="sm"
              onClick={async () => {
                try {
                  await applicationService.updateStatus(confirm.app.id, confirm.status);
                  setConfirm(null);
                  toast(
                    confirm.status === "ACCEPTED"
                      ? "Đã chấp nhận ứng viên"
                      : "Đã từ chối hồ sơ",
                  );
                } catch (e) {
                  toast(
                    e instanceof Error ? e.message : "Không thể cập nhật trạng thái",
                    "error",
                  );
                }
              }}
            >
              {confirm.status === "ACCEPTED" ? "Chấp nhận" : "Từ chối"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
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
  useEffect(() => {
    store.loadUsers().catch(() => {});
    applicationService.loadAllAdmin().catch(() => {});
  }, []);

  const users = store.users(),
    jobs = jobService.adminAll(),
    apps = applicationService.all();

  const statsBreakdown = [
    {
      label: "Tài khoản đang hoạt động",
      n: users.filter((u) => u.status === "ACTIVE").length,
      total: users.length,
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
    },
    {
      label: "Tin đã được duyệt",
      n: jobs.filter((j) => j.moderation === "APPROVED").length,
      total: jobs.length,
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
    },
    {
      label: "Tin đang chờ duyệt",
      n: jobs.filter((j) => j.moderation === "PENDING").length,
      total: jobs.length,
      dot: "bg-amber-500",
      bar: "bg-amber-500",
    },
    {
      label: "Tin đã đóng",
      n: jobs.filter((j) => j.status === "CLOSED").length,
      total: jobs.length,
      dot: "bg-rose-500",
      bar: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TỔNG QUAN HỆ THỐNG"
        title="Bảng điều khiển quản trị"
        subtitle="Theo dõi hoạt động người dùng, tin tuyển dụng và đơn ứng tuyển trên toàn nền tảng."
        action={
          <Badge variant="info">
            <ShieldCheck size={13} /> Quyền quản trị viên
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Tổng tài khoản"
          value={users.length}
          icon={<Users size={18} />}
          trend="Tất cả vai trò"
          variant="blue"
        />
        <Metric
          label="Sinh viên"
          value={users.filter((u) => u.role === "STUDENT").length}
          icon={<GraduationCap size={18} />}
          variant="green"
        />
        <Metric
          label="Nhà tuyển dụng"
          value={users.filter((u) => u.role === "EMPLOYER").length}
          icon={<Building2 size={18} />}
          variant="purple"
        />
        <Metric
          label="Tin tuyển dụng"
          value={jobs.length}
          icon={<BriefcaseBusiness size={18} />}
          variant="amber"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Tin đang mở"
          value={jobs.filter((j) => j.status === "OPEN").length}
          icon={<Globe size={18} />}
          variant="blue"
        />
        <Metric
          label="Tin đã đóng"
          value={jobs.filter((j) => j.status === "CLOSED").length}
          icon={<Ban size={18} />}
          variant="purple"
        />
        <Metric
          label="Chờ kiểm duyệt"
          value={jobs.filter((j) => j.moderation === "PENDING").length}
          icon={<Clock3 size={18} />}
          variant="amber"
        />
        <Metric
          label="Đơn ứng tuyển"
          value={apps.length}
          icon={<FileText size={18} />}
          variant="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                Hoạt động hệ thống
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Tỷ lệ các chỉ số vận hành chính
              </p>
            </div>
            <Activity size={18} className="text-[var(--color-primary)]" />
          </div>
          <div className="space-y-4">
            {statsBreakdown.map((v) => (
              <div className="space-y-1.5" key={v.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-[var(--color-foreground)]">
                    <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                    {v.label}
                  </span>
                  <b className="font-bold text-[var(--color-foreground)]">{v.n}</b>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${v.bar}`}
                    style={{ width: `${v.total ? (v.n / v.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Cần xử lý
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Các tác vụ đang chờ quản trị viên kiểm tra
            </p>
          </div>
          <div className="space-y-2.5">
            <Link
              to="/admin/jobs"
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]/50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock3 size={17} />
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Tin đang chờ duyệt
                  </b>
                  <small className="text-[11px] text-[var(--color-muted-foreground)]">
                    {jobs.filter((j) => j.moderation === "PENDING").length} tin cần xem xét
                  </small>
                </div>
              </div>
              <ArrowRight size={15} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]" />
            </Link>

            <Link
              to="/admin/users"
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]/50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <Users size={17} />
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Quản lý tài khoản
                  </b>
                  <small className="text-[11px] text-[var(--color-muted-foreground)]">
                    {users.filter((u) => u.status === "BLOCKED").length} tài khoản đang bị khóa
                  </small>
                </div>
              </div>
              <ArrowRight size={15} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]" />
            </Link>

            <Link
              to="/admin/applications"
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-background)]/50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <ClipboardList size={17} />
                </span>
                <div>
                  <b className="text-xs font-bold text-[var(--color-foreground)] block">
                    Tổng quan ứng tuyển
                  </b>
                  <small className="text-[11px] text-[var(--color-muted-foreground)]">
                    {apps.length} hồ sơ đang được theo dõi
                  </small>
                </div>
              </div>
              <ArrowRight size={15} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]" />
            </Link>
          </div>
        </section>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Tin tuyển dụng gần đây
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Các bài đăng mới nhất trên hệ thống
            </p>
          </div>
          <Link
            to="/admin/jobs"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
          >
            Duyệt tin tuyển dụng <ArrowRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {[...jobs]
            .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
            .slice(0, 4)
            .map((j) => (
              <div
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                key={j.id}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanyMark name={j.company} />
                  <div className="min-w-0">
                    <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">
                      {j.title}
                    </b>
                    <span className="text-[11px] text-[var(--color-muted-foreground)] block mt-0.5">
                      {j.company} · {date(j.postedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <Badge
                    variant={
                      j.moderation === "APPROVED"
                        ? "success"
                        : j.moderation === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {j.moderation === "APPROVED"
                      ? "Đã duyệt"
                      : j.moderation === "REJECTED"
                        ? "Bị từ chối"
                        : "Chờ duyệt"}
                  </Badge>
                  <Link to="/admin/jobs">
                    <Button variant="outline" size="sm">
                      Xem xét
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function AdminUsers() {
  const toast = useToast();
  const { user: currentUser } = useContext(AuthContext);

  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [confirm, setConfirm] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<Role>("STUDENT");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "BLOCKED">("ACTIVE");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formUniversity, setFormUniversity] = useState("");
  const [formMajor, setFormMajor] = useState("");
  const [formAddress, setFormAddress] = useState("");

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
              : "Không thể tải danh sách người dùng",
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

  const openCreateModal = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormPassword("");
    setFormRole("STUDENT");
    setFormStatus("ACTIVE");
    setFormName("");
    setFormPhone("");
    setFormUniversity("");
    setFormMajor("");
    setFormAddress("");
    setFormOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormName(u.role === "EMPLOYER" ? u.company || u.name : u.name);
    setFormPhone(u.phone || "");
    setFormUniversity(u.university || "");
    setFormMajor(u.major || "");
    setFormAddress(u.address || "");
    setFormOpen(true);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!formEmail.trim()) {
      toast("Vui lòng nhập địa chỉ email", "error");
      return;
    }

    if (!editingUser && formPassword.length < 6) {
      toast("Mật khẩu phải có ít nhất 6 ký tự", "error");
      return;
    }

    if (editingUser && formPassword && formPassword.length < 6) {
      toast("Mật khẩu mới phải có ít nhất 6 ký tự", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updated = await userService.update(editingUser.id, {
          email: formEmail.trim(),
          ...(formPassword ? { password: formPassword } : {}),
          role: formRole,
          status: formStatus,
          name: formName.trim(),
          ...(formRole === "EMPLOYER" ? { company_name: formName.trim() } : {}),
          phone: formPhone.trim(),
          university: formUniversity.trim(),
          major: formMajor.trim(),
          address: formAddress.trim(),
        });
        setUsers((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        toast("Đã cập nhật tài khoản thành công");
      } else {
        const created = await userService.create({
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          status: formStatus,
          name: formName.trim(),
          ...(formRole === "EMPLOYER" ? { company_name: formName.trim() } : {}),
          phone: formPhone.trim(),
          university: formUniversity.trim(),
          major: formMajor.trim(),
          address: formAddress.trim(),
        });
        setUsers((current) => [created, ...current]);
        toast("Đã tạo tài khoản mới thành công");
      }
      setFormOpen(false);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể lưu thông tin tài khoản",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      await userService.remove(deleteTarget.id);
      setUsers((current) => current.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast("Đã xóa tài khoản thành công");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Không thể xóa tài khoản",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (role === "ALL" || u.role === role) &&
      (status === "ALL" || u.status === status) &&
      `${u.name} ${u.email} ${u.company || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  const handleChangeStatus = async () => {
    if (!confirm || saving) return;

    setSaving(true);

    try {
      const updated = await userService.toggleStatus(confirm.id);

      setUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u)),
      );

      setConfirm(null);

      toast(
        updated.status === "BLOCKED"
          ? "Đã khóa tài khoản thành công"
          : "Đã mở khóa tài khoản thành công",
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái tài khoản",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QUẢN LÝ CỘNG ĐỒNG"
        title="Quản lý người dùng"
        subtitle="Thêm mới, chỉnh sửa, khóa hoặc xóa tài khoản sinh viên và nhà tuyển dụng."
        action={
          <Button variant="primary" size="md" onClick={openCreateModal}>
            <Plus size={15} /> Thêm tài khoản
          </Button>
        }
      />

      {loading && (
        <div className="p-3.5 rounded-lg bg-white border border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
          Đang tải danh sách người dùng...
        </div>
      )}

      {loadError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Tổng tài khoản
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1 block">
            {users.length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Sinh viên
          </span>
          <b className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {users.filter((u) => u.role === "STUDENT").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Nhà tuyển dụng
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-primary)] mt-1 block">
            {users.filter((u) => u.role === "EMPLOYER").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã khóa
          </span>
          <b className="text-2xl font-extrabold text-rose-700 mt-1 block">
            {users.filter((u) => u.status === "BLOCKED").length}
          </b>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-background)]/40">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, email hoặc công ty..."
              className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-44">
              <SharedSelect
                icon={<Users size={14} />}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="STUDENT">Sinh viên</option>
                <option value="EMPLOYER">Nhà tuyển dụng</option>
                <option value="ADMIN">Quản trị viên</option>
              </SharedSelect>
            </div>

            <div className="w-44">
              <SharedSelect
                icon={<ListFilter size={14} />}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="BLOCKED">Đã khóa</option>
              </SharedSelect>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-background)]/60 border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Ngày tham gia</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-background)]/40 transition-colors duration-150">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-[11px] shrink-0">
                        {u.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <b className="font-bold text-[var(--color-foreground)] block">
                          {u.name}
                        </b>
                        <small className="text-[11px] text-[var(--color-muted-foreground)]">
                          {u.email}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="neutral">{roleLabel(u.role)}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                    {date(u.joinedAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>
                      {u.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-sky-200 text-[var(--color-primary)] hover:bg-sky-50 transition-colors duration-150 cursor-pointer"
                        title="Chỉnh sửa tài khoản"
                        onClick={() => openEditModal(u)}
                      >
                        <Pencil size={14} />
                      </button>
                      {u.role !== "ADMIN" && u.id !== currentUser?.id && (
                        <>
                          <button
                            type="button"
                            className={`p-2 rounded-lg border transition-colors duration-150 cursor-pointer ${
                              u.status === "ACTIVE"
                                ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={
                              u.status === "ACTIVE"
                                ? "Khóa tài khoản"
                                : "Mở khóa tài khoản"
                            }
                            onClick={() => setConfirm(u)}
                          >
                            {u.status === "ACTIVE" ? (
                              <Ban size={14} />
                            ) : (
                              <CircleCheck size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                            title="Xóa tài khoản"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={14} />
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

        {!filteredUsers.length && (
          <div className="p-8">
            <EmptyPage
              title="Không tìm thấy người dùng"
              text="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
            />
          </div>
        )}
      </section>

      {formOpen && (
        <Modal
          title={editingUser ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
          onClose={() => setFormOpen(false)}
        >
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                  Vai trò
                </label>
                <SharedSelect
                  value={formRole}
                  disabled={Boolean(editingUser && editingUser.id === currentUser?.id)}
                  onChange={(e) => setFormRole(e.target.value as Role)}
                >
                  <option value="STUDENT">Sinh viên</option>
                  <option value="EMPLOYER">Nhà tuyển dụng</option>
                  <option value="ADMIN">Quản trị viên</option>
                </SharedSelect>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                  Trạng thái
                </label>
                <SharedSelect
                  value={formStatus}
                  disabled={formRole === "ADMIN"}
                  onChange={(e) =>
                    setFormStatus(e.target.value as "ACTIVE" | "BLOCKED")
                  }
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="BLOCKED">Đã khóa</option>
                </SharedSelect>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <SharedInput
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="example@studentjob.vn"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                {editingUser ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu *"}
              </label>
              <SharedInput
                type="password"
                required={!editingUser}
                minLength={6}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            {formRole !== "ADMIN" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                      {formRole === "EMPLOYER" ? "Tên công ty" : "Họ và tên"}
                    </label>
                    <SharedInput
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={
                        formRole === "EMPLOYER" ? "Công ty TNHH ABC" : "Nguyễn Văn A"
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                      Số điện thoại
                    </label>
                    <SharedInput
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                    />
                  </div>
                </div>

                {formRole === "STUDENT" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                        Trường học
                      </label>
                      <SharedInput
                        value={formUniversity}
                        onChange={(e) => setFormUniversity(e.target.value)}
                        placeholder="ĐH Bách Khoa..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                        Chuyên ngành
                      </label>
                      <SharedInput
                        value={formMajor}
                        onChange={(e) => setFormMajor(e.target.value)}
                        placeholder="Công nghệ thông tin"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                      Địa chỉ công ty
                    </label>
                    <SharedInput
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Quận 1, TP.HCM"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving
                  ? "Đang lưu..."
                  : editingUser
                    ? "Lưu thay đổi"
                    : "Tạo tài khoản"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal
          title={
            confirm.status === "ACTIVE"
              ? "Khóa tài khoản này?"
              : "Mở khóa tài khoản này?"
          }
          onClose={() => setConfirm(null)}
        >
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Bạn có chắc chắn muốn{" "}
            <b className="text-[var(--color-foreground)]">
              {confirm.status === "ACTIVE" ? "khóa" : "mở khóa"}
            </b>{" "}
            tài khoản <b className="text-[var(--color-foreground)]">{confirm.name}</b> ({confirm.email}) không?
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant={confirm.status === "ACTIVE" ? "destructive" : "primary"}
              size="sm"
              onClick={handleChangeStatus}
              disabled={saving}
            >
              {saving ? "Đang xử lý..." : "Xác nhận thay đổi"}
            </Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Xóa tài khoản vĩnh viễn?"
          onClose={() => setDeleteTarget(null)}
        >
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Bạn có chắc chắn muốn xóa tài khoản{" "}
            <b className="text-[var(--color-foreground)]">{deleteTarget.name}</b> (
            {deleteTarget.email})? Thao tác này không thể hoàn tác.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function AdminUserDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [u, setU] = useState<User | undefined>(() =>
    store.users().find((x) => x.id === id),
  );
  const [loading, setLoading] = useState(!u);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (u) return;
    let cancelled = false;
    store
      .loadUsers()
      .then((list) => {
        if (!cancelled) setU(list.find((x) => x.id === id));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, u]);

  if (loading)
    return (
      <div className="p-6 text-xs text-[var(--color-muted-foreground)]">
        Đang tải thông tin tài khoản...
      </div>
    );

  if (!u)
    return (
      <EmptyPage
        title="Không tìm thấy người dùng"
        text="Tài khoản này không tồn tại trong dữ liệu hệ thống."
        action={
          <Link to="/admin/users">
            <Button variant="primary" size="md">
              Quay lại danh sách
            </Button>
          </Link>
        }
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CHI TIẾT TÀI KHOẢN"
        title={u.name}
        subtitle="Xem thông tin chi tiết và trạng thái hoạt động của tài khoản."
        action={
          <Link to="/admin/users">
            <Button variant="outline" size="md">
              <ArrowLeft size={15} /> Quay lại danh sách
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-[var(--color-border)]">
            <span className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center font-extrabold text-lg shrink-0">
              {u.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--color-foreground)]">
                {u.name}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{roleLabel(u.role)}</Badge>
                <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>
                  {u.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                </Badge>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-[var(--color-foreground)]">
            Thông tin tài khoản
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SideInfo icon={<Mail size={16} />} label="Địa chỉ email" value={u.email} />
            <SideInfo
              icon={<CalendarDays size={16} />}
              label="Ngày tham gia"
              value={date(u.joinedAt)}
            />
            <SideInfo
              icon={<ShieldCheck size={16} />}
              label="Vai trò"
              value={roleLabel(u.role)}
            />
            {u.phone && (
              <SideInfo icon={<Phone size={16} />} label="Số điện thoại" value={u.phone} />
            )}
            {u.company && (
              <SideInfo
                icon={<Building2 size={16} />}
                label="Công ty"
                value={u.company}
              />
            )}
            {u.university && (
              <SideInfo
                icon={<GraduationCap size={16} />}
                label="Trường học"
                value={u.university}
              />
            )}
            {u.major && (
              <SideInfo icon={<BookIcon />} label="Chuyên ngành" value={u.major} />
            )}
          </div>
        </section>

        <aside className="lg:col-span-1 bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
            Thao tác quản trị
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Quản trị viên có thể tạm khóa hoặc mở khóa quyền truy cập của tài khoản này.
          </p>
          {u.role !== "ADMIN" && (
            <>
              <Button
                variant={u.status === "ACTIVE" ? "destructive" : "primary"}
                size="md"
                fullWidth
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const updated = await userService.toggleStatus(u.id);
                    setU(updated);
                    toast("Đã cập nhật trạng thái tài khoản");
                  } catch (err) {
                    toast(
                      err instanceof Error ? err.message : "Không thể cập nhật trạng thái",
                      "error",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {u.status === "ACTIVE" ? <Ban size={15} /> : <Check size={15} />}
                {u.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={15} className="text-rose-600" />
                <span className="text-rose-600">Xóa tài khoản</span>
              </Button>
            </>
          )}
          <Link to="/admin/users" className="block">
            <Button variant="outline" size="md" fullWidth>
              Quay lại danh sách người dùng
            </Button>
          </Link>
        </aside>
      </div>

      {deleteOpen && (
        <Modal
          title="Xóa tài khoản vĩnh viễn?"
          onClose={() => setDeleteOpen(false)}
        >
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Bạn có chắc chắn muốn xóa tài khoản{" "}
            <b className="text-[var(--color-foreground)]">{u.name}</b> ({u.email})?
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await userService.remove(u.id);
                  toast("Đã xóa tài khoản thành công");
                  navigate("/admin/users", { replace: true });
                } catch (err) {
                  toast(
                    err instanceof Error ? err.message : "Không thể xóa tài khoản",
                    "error",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
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
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<Job | null>(null);

  const allJobs = jobService.adminAll();
  const jobs = allJobs.filter(
    (j) =>
      (moderation === "ALL" || j.moderation === moderation) &&
      `${j.title} ${j.company} ${j.category}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="KIỂM DUYỆT NỘI DUNG"
        title="Duyệt tin tuyển dụng"
        subtitle="Xem xét và phê duyệt các tin tuyển dụng trước khi hiển thị công khai tới sinh viên."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Tổng tin tuyển dụng
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1 block">
            {allJobs.length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Chờ xét duyệt
          </span>
          <b className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {allJobs.filter((j) => j.moderation === "PENDING").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã duyệt
          </span>
          <b className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {allJobs.filter((j) => j.moderation === "APPROVED").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã từ chối
          </span>
          <b className="text-2xl font-extrabold text-rose-700 mt-1 block">
            {allJobs.filter((j) => j.moderation === "REJECTED").length}
          </b>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-background)]/40">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo chức danh hoặc công ty..."
              className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          <div className="w-52 self-start sm:self-center">
            <SharedSelect
              icon={<ShieldCheck size={14} />}
              value={moderation}
              onChange={(e) => setModeration(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái duyệt</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </SharedSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-background)]/60 border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Tin tuyển dụng</th>
                <th className="py-3 px-4">Nhà tuyển dụng</th>
                <th className="py-3 px-4">Ngày gửi</th>
                <th className="py-3 px-4">Trạng thái tin</th>
                <th className="py-3 px-4">Kiểm duyệt</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-[var(--color-background)]/40 transition-colors duration-150">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <CompanyMark name={j.company} />
                      <div>
                        <b className="font-bold text-[var(--color-foreground)] block">
                          {j.title}
                        </b>
                        <small className="text-[11px] text-[var(--color-muted-foreground)]">
                          {j.category} · {jobTypeVi(j.type)}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[var(--color-foreground)] font-medium">
                    {j.company}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                    {date(j.postedAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={j.status === "OPEN" ? "success" : "neutral"}>
                      {j.status === "OPEN" ? "Đang mở" : "Đã đóng"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        j.moderation === "APPROVED"
                          ? "success"
                          : j.moderation === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {j.moderation === "APPROVED"
                        ? "Đã duyệt"
                        : j.moderation === "REJECTED"
                          ? "Đã từ chối"
                          : "Chờ duyệt"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                        title="Xem trước tin"
                        onClick={() => setPreview(j)}
                      >
                        <Eye size={14} />
                      </button>
                      {j.moderation === "PENDING" && (
                        <>
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors duration-150 cursor-pointer"
                            title="Duyệt tin"
                            onClick={() => {
                              setRejectReason("");
                              setConfirm({ job: j, status: "APPROVED" });
                            }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                            title="Từ chối tin"
                            onClick={() => {
                              setRejectReason("");
                              setConfirm({ job: j, status: "REJECTED" });
                            }}
                          >
                            <X size={14} />
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
          <div className="p-8">
            <EmptyPage
              title="Không tìm thấy tin tuyển dụng"
              text="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc kiểm duyệt."
            />
          </div>
        )}
      </section>

      {confirm && (
        <Modal
          title={
            confirm.status === "APPROVED"
              ? "Phê duyệt tin tuyển dụng này?"
              : "Từ chối tin tuyển dụng này?"
          }
          onClose={() => setConfirm(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Tin tuyển dụng <b className="text-[var(--color-foreground)]">{confirm.job.title}</b> của{" "}
              <b className="text-[var(--color-foreground)]">{confirm.job.company}</b> sẽ chuyển sang trạng thái{" "}
              <b className="text-[var(--color-foreground)]">
                {confirm.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
              </b>.
            </p>

            {confirm.status === "REJECTED" && (
              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  Lý do từ chối *
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do để nhà tuyển dụng chỉnh sửa lại..."
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
                Hủy
              </Button>
              <Button
                variant={confirm.status === "APPROVED" ? "primary" : "destructive"}
                size="sm"
                onClick={async () => {
                  if (confirm.status === "REJECTED" && !rejectReason.trim()) {
                    toast("Vui lòng nhập lý do từ chối", "error");
                    return;
                  }
                  try {
                    await api.admin.moderate(
                      confirm.job.id,
                      confirm.status,
                      confirm.status === "REJECTED" ? rejectReason.trim() : "",
                    );
                    await jobService.load();
                    setConfirm(null);
                    toast(
                      confirm.status === "APPROVED"
                        ? "Đã duyệt tin tuyển dụng"
                        : "Đã từ chối tin tuyển dụng",
                    );
                  } catch (e) {
                    toast(
                      e instanceof Error ? e.message : "Không thể kiểm duyệt tin",
                      "error",
                    );
                  }
                }}
              >
                Xác nhận quyết định
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {preview && (
        <Modal title="Xem trước tin tuyển dụng" onClose={() => setPreview(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <CompanyMark name={preview.company} />
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  {preview.title}
                </h2>
                <p className="text-[var(--color-muted-foreground)] mt-0.5">
                  {preview.company} · {preview.location}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  preview.moderation === "APPROVED"
                    ? "success"
                    : preview.moderation === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              >
                {preview.moderation === "APPROVED"
                  ? "Đã duyệt"
                  : preview.moderation === "REJECTED"
                    ? "Đã từ chối"
                    : "Chờ duyệt"}
              </Badge>
              <Badge variant="info">
                <Wallet size={12} /> {money(preview.salaryMin)} – {money(preview.salaryMax)}
              </Badge>
              <Badge variant="neutral">
                <Clock3 size={12} /> {jobTypeVi(preview.type)}
              </Badge>
            </div>

            <div>
              <h3 className="font-bold text-[var(--color-foreground)] mb-1">
                Giới thiệu vị trí
              </h3>
              <p className="text-[var(--color-muted-foreground)] leading-relaxed">
                {preview.description}
              </p>
            </div>

            {preview.responsibilities.length > 0 && (
              <div>
                <h3 className="font-bold text-[var(--color-foreground)] mb-1">
                  Trách nhiệm công việc
                </h3>
                <ul className="space-y-1 text-[var(--color-muted-foreground)]">
                  {preview.responsibilities.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                Đóng xem trước
              </Button>
              {preview.moderation === "PENDING" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPreview(null);
                    setRejectReason("");
                    setConfirm({ job: preview, status: "APPROVED" });
                  }}
                >
                  Duyệt tin
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdminApplications() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await applicationService.loadAllAdmin();

        if (!cancelled && result) {
          setApplications(result.applications);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách đơn ứng tuyển",
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
        .includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HOẠT ĐỘNG NỀN TẢNG"
        title="Tổng quan đơn ứng tuyển"
        subtitle="Theo dõi toàn bộ hồ sơ ứng tuyển của sinh viên trên hệ thống."
      />

      {loading && (
        <div className="p-3.5 rounded-lg bg-white border border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
          Đang tải danh sách đơn ứng tuyển...
        </div>
      )}

      {loadError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Tổng đơn ứng tuyển
          </span>
          <b className="text-2xl font-extrabold text-[var(--color-foreground)] mt-1 block">
            {applications.length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đang chờ duyệt
          </span>
          <b className="text-2xl font-extrabold text-amber-700 mt-1 block">
            {applications.filter((a) => a.status === "PENDING").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã chấp nhận
          </span>
          <b className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {applications.filter((a) => a.status === "ACCEPTED").length}
          </b>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)] block">
            Đã từ chối
          </span>
          <b className="text-2xl font-extrabold text-rose-700 mt-1 block">
            {applications.filter((a) => a.status === "REJECTED").length}
          </b>
        </div>
      </div>

      <section className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-background)]/40">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo sinh viên, công việc hoặc công ty..."
              className="w-full bg-white border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)] transition-colors duration-150"
            />
          </div>

          <div className="w-48 self-start sm:self-center">
            <SharedSelect
              icon={<ListFilter size={14} />}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ duyệt</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </SharedSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-background)]/60 border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Sinh viên</th>
                <th className="py-3 px-4">Công việc & nhà tuyển dụng</th>
                <th className="py-3 px-4">Ngày ứng tuyển</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {apps.map((a) => {
                const u = store.users().find((x) => x.id === a.studentId);
                const j = jobService.byId(a.jobId);
                const studentName = a.studentName || u?.name || "Sinh viên";
                const studentEmail = a.studentEmail || u?.email || "";
                const jobTitle = a.jobTitle || j?.title || "Vị trí tuyển dụng";
                const jobCompany = a.jobCompany || j?.company || "";

                return (
                  <tr key={a.id} className="hover:bg-[var(--color-background)]/40 transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-[11px] shrink-0">
                          {studentName
                            .split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <b className="font-bold text-[var(--color-foreground)] block">
                            {studentName}
                          </b>
                          <small className="text-[11px] text-[var(--color-muted-foreground)]">
                            {studentEmail}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <b className="font-bold text-[var(--color-foreground)] block">
                          {jobTitle}
                        </b>
                        <small className="text-[11px] text-[var(--color-muted-foreground)]">
                          {jobCompany}
                        </small>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--color-muted-foreground)]">
                      {date(a.appliedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          a.status === "ACCEPTED"
                            ? "success"
                            : a.status === "REJECTED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {a.status === "ACCEPTED"
                          ? "Đã chấp nhận"
                          : a.status === "REJECTED"
                            ? "Đã từ chối"
                            : "Đang chờ duyệt"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                        onClick={() => setSelectedApp(a)}
                        aria-label="Xem tóm tắt đơn ứng tuyển"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!apps.length && (
          <div className="p-8">
            <EmptyPage
              title="Không tìm thấy đơn ứng tuyển"
              text="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."
            />
          </div>
        )}
      </section>

      {selectedApp && (
        <Modal
          title="Chi tiết đơn ứng tuyển"
          onClose={() => setSelectedApp(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">
                  Ứng viên
                </span>
                <b className="text-[var(--color-foreground)]">
                  {selectedApp.studentName || "Sinh viên"}
                </b>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)] block">
                  Vị trí & Công ty
                </span>
                <b className="text-[var(--color-foreground)]">
                  {selectedApp.jobTitle || "Vị trí tuyển dụng"}
                  {selectedApp.jobCompany ? ` · ${selectedApp.jobCompany}` : ""}
                </b>
              </div>
            </div>
            <div>
              <span className="font-bold text-[var(--color-foreground)] block mb-1">
                Thư giới thiệu bản thân:
              </span>
              <p className="p-3 rounded-lg bg-white border border-[var(--color-border)] text-[var(--color-muted-foreground)] whitespace-pre-line leading-relaxed">
                {selectedApp.message || "Ứng viên không để lại lời nhắn."}
              </p>
            </div>
            <div>
              <span className="font-bold text-[var(--color-foreground)] block mb-1">
                Liên kết CV:
              </span>
              <p className="text-[var(--color-muted-foreground)] break-all">
                {selectedApp.cvUrl || "Chưa cung cấp"}
              </p>
            </div>
            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
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
  return (
    <SharedModal title={title} onClose={onClose}>
      {children}
    </SharedModal>
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
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
      <span className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-3">
        <Compass size={22} />
      </span>
      <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[var(--color-muted-foreground)] max-w-sm mb-4">
        {text}
      </p>
      {action}
    </div>
  );
}
function Unauthorized() {
  const { user } = useContext(AuthContext);
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <span className="text-5xl font-extrabold text-[var(--color-primary)]/20 mb-2">
          403
        </span>
        <span className="w-14 h-14 rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-4">
          <ShieldCheck size={28} />
        </span>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Bạn không có quyền truy cập
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-md mb-6">
          {user
            ? `Tài khoản ${roleLabel(user.role).toLowerCase()} của bạn không có quyền xem trang này.`
            : "Vui lòng đăng nhập đúng tài khoản để tiếp tục."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={
              user
                ? user.role === "STUDENT"
                  ? "/"
                  : `/${user.role.toLowerCase()}/dashboard`
                : "/login"
            }
          >
            <Button variant="primary" size="md">
              {user ? (user.role === "STUDENT" ? "Về trang chủ" : "Về trang tổng quan") : "Đăng nhập"}{" "}
              <ArrowRight size={15} />
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="outline" size="md">
              Tìm việc làm
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <span className="text-5xl font-extrabold text-[var(--color-primary)]/20 mb-2">
          404
        </span>
        <span className="w-14 h-14 rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-4">
          <Search size={28} />
        </span>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Không tìm thấy trang
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-md mb-6">
          Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md">
              Về trang chủ <ArrowRight size={15} />
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="outline" size="md">
              Tìm việc làm
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
export default App;

