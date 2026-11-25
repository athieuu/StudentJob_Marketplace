import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[var(--color-border)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 font-bold text-lg tracking-tight text-[var(--color-foreground)] mb-3"
            >
              <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white inline-flex items-center justify-center shrink-0">
                <GraduationCap size={18} />
              </span>
              <span>
                student<span className="text-[var(--color-primary)]">job</span>
              </span>
            </Link>
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Nền tảng việc làm linh hoạt và thực tập chất lượng dành riêng cho sinh viên Việt Nam.
              Xây dựng kinh nghiệm thực tế ngay hôm nay.
            </p>
          </div>

          {/* Nav Col 1 */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-foreground)] mb-3.5">
              Khám phá
            </h4>
            <ul className="space-y-2 text-xs text-[var(--color-muted-foreground)]">
              <li>
                <Link
                  to="/jobs"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Tìm việc làm
                </Link>
              </li>
              <li>
                <Link
                  to="/companies"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Khám phá công ty
                </Link>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Cách thức hoạt động
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-foreground)] mb-3.5">
              Nhà tuyển dụng
            </h4>
            <ul className="space-y-2 text-xs text-[var(--color-muted-foreground)]">
              <li>
                <Link
                  to="/register"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Đăng tin tuyển dụng
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Đăng nhập doanh nghiệp
                </Link>
              </li>
              <li>
                <Link
                  to="/employer/dashboard"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Bảng tin tuyển dụng
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Col 3 */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-foreground)] mb-3.5">
              Hỗ trợ
            </h4>
            <ul className="space-y-2 text-xs text-[var(--color-muted-foreground)]">
              <li>
                <a
                  href="mailto:support@studentjob.vn"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Liên hệ hỗ trợ
                </a>
              </li>
              <li>
                <Link
                  to="/unauthorized"
                  className="hover:text-[var(--color-primary)] transition-colors duration-150"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <span className="text-[11px] text-[var(--color-muted-foreground)]">
                  Hotline: 1900 6868 (8:00 - 18:00)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span>© 2026 StudentJob Marketplace. Tất cả các quyền được bảo lưu.</span>
          <span>Đồng hành cùng tương lai nghề nghiệp của sinh viên Việt Nam.</span>
        </div>
      </div>
    </footer>
  );
};
