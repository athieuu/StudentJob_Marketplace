import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  GraduationCap,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  UserRound,
  ClipboardList,
  FileText,
  Mail,
  Bookmark,
  Bot,
  LogOut,
} from "lucide-react";
import type { User } from "../../types";
import { Button } from "./Button";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const studentPersonalLinks = [
  { label: "Hồ sơ cá nhân", to: "/student/profile", icon: UserRound },
  { label: "Đơn ứng tuyển", to: "/student/applications", icon: ClipboardList },
  { label: "CV của tôi", to: "/student/cvs", icon: FileText },
  { label: "Tin nhắn", to: "/student/messages", icon: Mail },
];

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isStudent = user?.role === "STUDENT";

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors duration-150 hover:text-[var(--color-primary)] ${
      isActive ? "text-[var(--color-primary)] font-semibold" : ""
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 font-bold text-lg tracking-tight text-[var(--color-foreground)] select-none shrink-0"
        >
          <span className="w-9 h-9 rounded-lg bg-[var(--color-primary)] text-white inline-flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </span>
          <span>
            student<span className="text-[var(--color-primary)]">job</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-muted-foreground)]">
          <NavLink to="/jobs" className={navLinkClass}>
            Tìm việc làm
          </NavLink>
          <NavLink to="/companies" className={navLinkClass}>
            Khám phá công ty
          </NavLink>
          {isStudent && (
            <>
              <NavLink to="/student/ai-cv" className={navLinkClass}>
                Phân tích CV
              </NavLink>
              <NavLink to="/student/saved" className={navLinkClass}>
                Việc làm đã lưu
              </NavLink>
            </>
          )}
          {user && !isStudent && (
            <Link
              to={`/${user.role.toLowerCase()}/dashboard`}
              className="text-[var(--color-primary)] font-semibold hover:underline"
            >
              Tổng quan
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            isStudent ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-white hover:bg-[var(--color-background)] transition-colors duration-150 cursor-pointer"
                  aria-expanded={profileMenuOpen}
                  aria-label="Menu cá nhân"
                >
                  <span className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] inline-flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-[var(--color-muted-foreground)] transition-transform duration-150 ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-[var(--color-border)] rounded-xl shadow-lg py-2 z-50">
                    <div className="px-3.5 py-2 border-b border-[var(--color-border)] mb-1">
                      <b className="text-xs font-bold text-[var(--color-foreground)] block truncate">
                        {user.name}
                      </b>
                      <small className="text-[11px] text-[var(--color-muted-foreground)] block truncate">
                        {user.email}
                      </small>
                    </div>

                    {studentPersonalLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)] transition-colors duration-150"
                        >
                          <Icon size={15} className="text-[var(--color-muted-foreground)] shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    <div className="my-1 border-t border-[var(--color-border)]" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut size={15} className="shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                  <span className="w-8 h-8 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] inline-flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.slice(0, 1)}
                  </span>
                  {user.name.split(" ")[0]}
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Đăng xuất
                </Button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Bắt đầu ngay <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors duration-150 cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white px-4 py-5 space-y-4">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[var(--color-muted-foreground)]">
            <Link
              to="/jobs"
              className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)]"
              onClick={() => setMobileOpen(false)}
            >
              Tìm việc làm
            </Link>
            <Link
              to="/companies"
              className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)]"
              onClick={() => setMobileOpen(false)}
            >
              Khám phá công ty
            </Link>

            {isStudent && (
              <>
                <Link
                  to="/student/ai-cv"
                  className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] inline-flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Bot size={15} /> Phân tích CV
                </Link>
                <Link
                  to="/student/saved"
                  className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] inline-flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Bookmark size={15} /> Việc làm đã lưu
                </Link>
                <div className="pt-2 mt-1 border-t border-[var(--color-border)] space-y-1">
                  <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
                    Cá nhân
                  </span>
                  {studentPersonalLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] flex items-center gap-2 text-[var(--color-foreground)]"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={15} /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {user && !isStudent && (
              <Link
                to={`/${user.role.toLowerCase()}/dashboard`}
                className="px-2 py-1.5 rounded text-[var(--color-primary)] font-semibold hover:bg-[var(--color-muted)]"
                onClick={() => setMobileOpen(false)}
              >
                Tổng quan {user.role === "EMPLOYER" ? "Nhà tuyển dụng" : "Quản trị"}
              </Link>
            )}
          </nav>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-col gap-2.5">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  {user.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                >
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="md" fullWidth>
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="md" fullWidth>
                    Bắt đầu ngay <ArrowRight size={14} />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
