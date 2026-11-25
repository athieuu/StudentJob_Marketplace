import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Clock3, MapPin, ArrowRight } from "lucide-react";
import type { Job, User } from "../../types";
import { Badge } from "./Badge";

interface JobCardProps {
  job: Job;
  user?: User | null;
  compact?: boolean;
}

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

const jobTypeVi = (type: string) =>
  ({
    PART_TIME: "Bán thời gian",
    FULL_TIME: "Toàn thời gian",
    FREELANCE: "Làm tự do",
    INTERNSHIP: "Thực tập",
  }[type] || type);

const savedKey = (userId: string) => `studentjob:saved:${userId}`;

function readSaved(userId: string): string[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(savedKey(userId)) || "[]"
    );
    return Array.isArray(data)
      ? data.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function toggleSaved(userId: string, jobId: string): boolean {
  const current = readSaved(userId);
  const next = current.includes(jobId)
    ? current.filter((id) => id !== jobId)
    : [...current, jobId];
  localStorage.setItem(savedKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event("sj:saved-updated"));
  return next.includes(jobId);
}

export function CompanyMark({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const colorVariants = [
    "bg-sky-100 text-sky-800 border-sky-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-amber-100 text-amber-800 border-amber-200",
  ];
  const colorClass = colorVariants[name.length % colorVariants.length];

  return (
    <span
      className={`w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg border font-bold text-xs select-none ${colorClass}`}
      aria-label={`Logo của ${name}`}
    >
      {initials}
    </span>
  );
}

export const JobCard: React.FC<JobCardProps> = ({ job, user, compact = false }) => {
  const [saved, setSaved] = useState(() =>
    user?.role === "STUDENT" ? readSaved(user.id).includes(job.id) : false
  );

  useEffect(() => {
    const refresh = () =>
      setSaved(user?.role === "STUDENT" ? readSaved(user.id).includes(job.id) : false);
    window.addEventListener("sj:saved-updated", refresh);
    return () => window.removeEventListener("sj:saved-updated", refresh);
  }, [user?.id, user?.role, job.id]);

  return (
    <article
      className={`bg-white text-[var(--color-foreground)] border border-[var(--color-border)] rounded-xl flex flex-col justify-between transition-colors duration-150 ease-in-out hover:border-[var(--color-primary)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <CompanyMark name={job.company} />
          <div className="flex items-center gap-2">
            <Badge variant={job.status === "OPEN" ? "success" : "danger"}>
              {job.status === "OPEN" ? "Đang tuyển" : "Đã đóng"}
            </Badge>
            {user?.role === "STUDENT" && (
              <button
                type="button"
                className={`p-1.5 rounded-lg border border-[var(--color-border)] transition-colors duration-150 cursor-pointer ${
                  saved
                    ? "bg-[var(--color-background)] text-[var(--color-primary)] border-[var(--color-primary)]"
                    : "bg-white text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                }`}
                title={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
                aria-label={saved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
                onClick={() => setSaved(toggleSaved(user.id, job.id))}
              >
                <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>

        <Link
          to={`/jobs/${job.id}`}
          className="block font-bold text-base text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors duration-150 leading-snug mb-1"
        >
          {job.title}
        </Link>
        <div className="text-xs font-semibold text-[var(--color-muted-foreground)] mb-3">
          {job.company}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-muted-foreground)] mb-3.5">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} className="text-[var(--color-primary)] shrink-0" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={13} className="text-[var(--color-primary)] shrink-0" />
            {jobTypeVi(job.type)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] rounded text-xs px-2 py-0.5 font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-xs text-[var(--color-foreground)]">
            {money(job.salaryMin)} – {money(job.salaryMax)}
          </div>
          <div className="text-[11px] text-[var(--color-muted-foreground)]">
            / tháng · {date(job.postedAt)}
          </div>
        </div>
        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-background)] text-[var(--color-primary)] border border-[var(--color-border)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 shrink-0 cursor-pointer"
          aria-label={`Xem chi tiết ${job.title}`}
        >
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
};
