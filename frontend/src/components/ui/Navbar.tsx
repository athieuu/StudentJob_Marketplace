import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { GraduationCap, Menu, X, ArrowRight } from "lucide-react";
import type { User } from "../../types";
import { Button } from "./Button";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 font-bold text-lg tracking-tight text-[var(--color-foreground)] select-none"
        >
          <span className="w-9 h-9 rounded-lg bg-[var(--color-primary)] text-white inline-flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </span>
          <span>
            student<span className="text-[var(--color-primary)]">job</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--color-muted-foreground)]">
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `transition-colors duration-150 hover:text-[var(--color-primary)] ${
                isActive ? "text-[var(--color-primary)] font-semibold" : ""
              }`
            }
          >
            Tìm việc làm
          </NavLink>
          <NavLink
            to="/companies"
            className={({ isActive }) =>
              `transition-colors duration-150 hover:text-[var(--color-primary)] ${
                isActive ? "text-[var(--color-primary)] font-semibold" : ""
              }`
            }
          >
            Khám phá công ty
          </NavLink>
          <a
            href="/#how-it-works"
            className="transition-colors duration-150 hover:text-[var(--color-primary)]"
          >
            Cách hoạt động
          </a>
          {user && (
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
          <nav className="flex flex-col space-y-3 text-sm font-medium text-[var(--color-muted-foreground)]">
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
            <a
              href="/#how-it-works"
              className="px-2 py-1.5 rounded hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)]"
              onClick={() => setMobileOpen(false)}
            >
              Cách hoạt động
            </a>
            {user && (
              <Link
                to={`/${user.role.toLowerCase()}/dashboard`}
                className="px-2 py-1.5 rounded text-[var(--color-primary)] font-semibold hover:bg-[var(--color-muted)]"
                onClick={() => setMobileOpen(false)}
              >
                Tổng quan {user.role === "STUDENT" ? "Sinh viên" : "Nhà tuyển dụng"}
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
                <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button variant="outline" size="md" fullWidth>
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button variant="primary" size="md" fullWidth>
                    Bắt đầu ngay <ArrowRight size={15} />
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
