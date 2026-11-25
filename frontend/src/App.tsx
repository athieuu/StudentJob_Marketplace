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
import type { CVAnalyzeResponse, JobFitResult, RecommendedJobItem } from "./services/ai";
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

  const categories = [
    {
      name: "Technology",
      label: "Công nghệ thông tin",
      sub: "Lập trình web, mobile, tester",
      icon: <Laptop size={22} className="text-[var(--color-primary)]" />,
    },
    {
      name: "Marketing",
      label: "Marketing & Truyền thông",
      sub: "Content, SEO, mạng xã hội",
      icon: <Megaphone size={22} className="text-[var(--color-primary)]" />,
    },
    {
      name: "Design",
      label: "Thiết kế & Sáng tạo",
      sub: "UI/UX, đồ họa, dựng video",
      icon: <Palette size={22} className="text-[var(--color-primary)]" />,
    },
    {
      name: "Data & Analytics",
      label: "Dữ liệu & Phân tích",
      sub: "Data analyst, nhập liệu, SQL",
      icon: <BarChart3 size={22} className="text-[var(--color-primary)]" />,
    },
    {
      name: "Education",
      label: "Giáo dục & Đào tạo",
      sub: "Gia sư, trợ giảng tiếng Anh",
      icon: <BookOpen size={22} className="text-[var(--color-primary)]" />,
    },
    {
      name: "Operations",
      label: "Vận hành & Hỗ trợ",
      sub: "Chăm sóc khách hàng, admin",
      icon: <Building2 size={22} className="text-[var(--color-primary)]" />,
    },
  ];

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-[var(--color-background)]">
        {/* Search-First Hero Section */}
        <section className="bg-white border-b border-[var(--color-border)] py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-[var(--color-primary)] border border-sky-200 mb-4">
                <Sparkles size={14} /> NỀN TẢNG VIỆC LÀM SINH VIÊN VIỆT NAM
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-foreground)] tracking-tight leading-tight mb-4">
                Tìm việc làm phù hợp cho tương lai của bạn.
              </h1>
              <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-8">
                Hàng trăm cơ hội việc làm bán thời gian, thực tập có lương và dự án thực chiến dành riêng cho sinh viên các trường đại học, cao đẳng.
              </p>

              {/* Instant Search Box */}
              <div className="mb-6">
                <JobSearchBox />
              </div>

              {/* Popular quick keyword pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                <span className="font-semibold text-[var(--color-foreground)]">
                  Gợi ý tìm kiếm:
                </span>
                <Link
                  to="/jobs?category=Technology"
                  className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-medium transition-colors duration-150"
                >
                  Công nghệ IT
                </Link>
                <Link
                  to="/jobs?category=Marketing"
                  className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-medium transition-colors duration-150"
                >
                  Marketing
                </Link>
                <Link
                  to="/jobs?category=Design"
                  className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-medium transition-colors duration-150"
                >
                  Thiết kế UI/UX
                </Link>
                <Link
                  to="/jobs?type=PART_TIME"
                  className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-medium transition-colors duration-150"
                >
                  Part-time
                </Link>
                <Link
                  to="/jobs?location=Remote"
                  className="px-2.5 py-1 rounded-md bg-[var(--color-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] font-medium transition-colors duration-150"
                >
                  Làm từ xa (Remote)
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Flat Stats Bar */}
        <section className="bg-white border-b border-[var(--color-border)] py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="border-r border-[var(--color-border)] last:border-r-0">
                <div className="text-2xl lg:text-3xl font-bold text-[var(--color-primary)] tracking-tight">
                  1,200+
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
                  Cơ hội đang mở tuyển
                </div>
              </div>
              <div className="border-r border-[var(--color-border)] md:border-r last:border-r-0">
                <div className="text-2xl lg:text-3xl font-bold text-[var(--color-primary)] tracking-tight">
                  850+
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
                  Doanh nghiệp liên kết
                </div>
              </div>
              <div className="border-r border-[var(--color-border)] last:border-r-0">
                <div className="text-2xl lg:text-3xl font-bold text-[var(--color-primary)] tracking-tight">
                  12,000+
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
                  Cộng đồng sinh viên
                </div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-[var(--color-primary)] tracking-tight">
                  98%
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">
                  Đánh giá hài lòng
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Opportunities Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
                  Cơ hội việc làm mới nhất
                </span>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
                  Việc làm nổi bật dành cho sinh viên
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
                  Được chọn lọc từ các nhà tuyển dụng hàng đầu với thời gian linh hoạt.
                </p>
              </div>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                Xem tất cả vị trí <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.slice(0, 6).map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </div>
        </section>

        {/* Category Explorer Section */}
        <section className="py-12 bg-white border-y border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
                  Khám phá ngành nghề
                </span>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
                  Lĩnh vực nghề nghiệp phổ biến
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1">
                  Dù học chuyên ngành nào, bạn cũng có thể bắt đầu từ một cơ hội phù hợp.
                </p>
              </div>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                Xem tất cả lĩnh vực <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <Link
                  key={c.name}
                  to={`/jobs?category=${encodeURIComponent(c.name)}`}
                  className="bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-xl p-5 flex items-start gap-4 transition-colors duration-150 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors duration-150">
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors duration-150 mb-1">
                      {c.label}
                    </h3>
                    <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                      {c.sub}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-[var(--color-border)] group-hover:text-[var(--color-primary)] transition-colors duration-150 shrink-0 mt-1"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
                Quy trình ứng tuyển
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
                Ba bước đơn giản để có việc làm
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-2">
                Hỗ trợ sinh viên từ bước tìm việc, chỉnh sửa CV chuyên nghiệp đến khi nhận thư mời làm việc.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] font-bold text-lg inline-flex items-center justify-center mb-4">
                  01
                </div>
                <h3 className="font-bold text-base text-[var(--color-foreground)] mb-2">
                  Tìm kiếm vị trí phù hợp
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  Lọc công việc theo thời gian rảnh, địa điểm gần trường hoặc việc làm từ xa (remote) không gò bó.
                </p>
              </div>

              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] font-bold text-lg inline-flex items-center justify-center mb-4">
                  02
                </div>
                <h3 className="font-bold text-base text-[var(--color-foreground)] mb-2">
                  Ứng tuyển nhanh với CV
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  Tải lên hoặc sử dụng công cụ tạo CV trực tuyến để gửi hồ sơ trực tiếp đến nhà tuyển dụng chỉ trong vài giây.
                </p>
              </div>

              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] font-bold text-lg inline-flex items-center justify-center mb-4">
                  03
                </div>
                <h3 className="font-bold text-base text-[var(--color-foreground)] mb-2">
                  Phát triển kinh nghiệm
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                  Làm việc thực tế cùng các chuyên gia, nâng cao kỹ năng nghề nghiệp và nhận mức thu nhập xứng đáng.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Employer Partner CTA */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border-2 border-[var(--color-primary)] rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider block mb-1">
                  Dành cho nhà tuyển dụng
                </span>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
                  Tiếp cận nguồn nhân lực sinh viên trẻ và năng động
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                  Đăng tin tuyển dụng thực tập sinh, nhân viên bán thời gian và quản lý hồ sơ ứng viên nhanh chóng, thuận tiện.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button variant="accent" size="md" fullWidth>
                    Đăng tin tuyển dụng ngay <ArrowRight size={15} />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="md" fullWidth>
                    Đăng nhập doanh nghiệp
                  </Button>
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
                  <select
                    className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150 cursor-pointer"
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
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter 3: Salary Range (Select) */}
                <div className="py-3 border-b border-[var(--color-border)]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)] mb-2.5">
                    Mức lương
                  </label>
                  <select
                    className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150 cursor-pointer"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  >
                    <option value="ALL">Mọi mức lương</option>
                    <option value="under5">Dưới 5 triệu</option>
                    <option value="5to8">5 – 8 triệu</option>
                    <option value="over8">Trên 8 triệu</option>
                  </select>
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
                  <span className="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
                    <ArrowDownUp size={14} /> Sắp xếp:
                  </span>
                  <select
                    aria-label="Sắp xếp công việc"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="bg-white text-xs font-medium text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="salary">Lương cao nhất</option>
                    <option value="relevance">Tên công việc A–Z</option>
                  </select>
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
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;

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

        {/* Demo Fast Fill Buttons */}
        <div className="mb-5 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
          <div className="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
            Đăng nhập nhanh (Tài khoản mẫu)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("student@studentjob.vn");
                setPassword("password123");
              }}
              className="text-left p-2 rounded-md bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors duration-150 cursor-pointer"
            >
              <div className="text-xs font-bold text-[var(--color-foreground)]">Sinh viên</div>
              <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">student@studentjob.vn</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("employer@studentjob.vn");
                setPassword("password123");
              }}
              className="text-left p-2 rounded-md bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors duration-150 cursor-pointer"
            >
              <div className="text-xs font-bold text-[var(--color-foreground)]">Nhà tuyển dụng</div>
              <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">employer@studentjob.vn</div>
            </button>
          </div>
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

              if (u.role === "EMPLOYER" || u.role === "ADMIN") {
                jobService.load().catch(console.error);
              }
              toast(`Chào mừng trở lại, ${u.name.split(" ")[0]}!`);
              const from = (location.state as { from?: string } | null)?.from;
              navigate(from || `/${u.role.toLowerCase()}/dashboard`, {
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
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  {role === "STUDENT" ? "Họ và tên" : "Tên người đại diện"}
                </label>
                <input
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
                  <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                    Tên công ty / Doanh nghiệp
                  </label>
                  <input
                    className="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)] transition-colors duration-150"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Công ty TNHH Công Nghệ..."
                  />
                </div>
              )}

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
                  placeholder="you@university.edu.vn"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                  Mật khẩu
                </label>
                <input
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
              <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5 text-center">
                Mã xác minh OTP (6 chữ số)
              </label>
              <input
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
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingCv, setSavingCv] = useState(false);
  const [result, setResult] = useState<CVAnalyzeResponse | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await aiService.analyzeCv(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể phân tích CV.");
    } finally {
      setBusy(false);
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
              {result.feedback && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[var(--color-primary)] shrink-0" />
                    <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
                      Nhận xét & Đề xuất từ AI
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-foreground)] leading-relaxed font-medium">
                    {result.feedback.overall}
                  </p>
                  {result.feedback.items?.length > 0 && (
                    <div className="space-y-2">
                      {result.feedback.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-[var(--color-border)] rounded-lg flex items-start gap-2.5 text-xs"
                        >
                          <Badge
                            variant={
                              item.severity === "high"
                                ? "danger"
                                : item.severity === "medium"
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {areaLabels[item.area] || item.area}
                          </Badge>
                          <span className="text-[var(--color-foreground)] leading-relaxed">
                            {item.tip}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.warnings?.length ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <strong className="block font-bold">Lưu ý kiểm tra thông tin:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
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
                Tải lên file CV ở khung bên trái và bấm <strong>Bắt đầu phân tích bằng AI</strong> để xem cấu trúc và nhận xét chi tiết tại đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
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
  const { id = "" } = useParams();
  const { user } = useContext(AuthContext);
  const app = applicationService.all().find((a) => a.id === id);
  const job = app ? jobService.byId(app.jobId) : undefined;
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

