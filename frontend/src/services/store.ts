import type { User, Role, Job, Application, Review } from '../types';
import { api, tokenStore } from './api';

let jobCache: Job[] = [];
let applicationCache: Application[] = [];
const notifyData = () => window.dispatchEvent(new Event('sj:data-updated'));

const mapJob = (row: any): Job => ({
  id: String(row.id),
  title: row.title,
  company: row.company_name || 'Employer',
  employerId: String(row.employer_id),
  employerUserId: row.employer_user_id != null ? String(row.employer_user_id) : undefined,
  category: row.category || 'Other',
  type: row.job_type,
  salaryMin: Number(row.salary_min || 0),
  salaryMax: Number(row.salary_max || 0),
  location: row.location || 'Not specified',
  arrangement: row.arrangement || 'On-site',
  description: row.description || '',
  responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
  requirements: Array.isArray(row.requirements) ? row.requirements : [],
  skills: Array.isArray(row.skills) ? row.skills : [],
  deadline: row.deadline ? String(row.deadline).slice(0, 10) : '',
  postedAt: row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
  status: row.status,
  moderation: row.moderation_status || 'APPROVED',
  applicants: Number(row.applicant_count || 0),
});

const mapApplication = (row: any, studentIdFallback?: string): Application => ({
  id: String(row.id),
  jobId: String(row.job_id),
  studentId: String(row.student_user_id ?? studentIdFallback ?? row.student_id),
  appliedAt: row.applied_at ? String(row.applied_at).slice(0, 10) : '',
  status: row.status,
  message: row.cover_letter || '',
  cvUrl: row.cv_url || '',
  studentName: row.full_name || '',
  studentMajor: row.major || '',
  studentEmail: row.student_email || '',
  studentPhone: row.phone || '',
  studentUniversity: row.university || '',
});

const SESSION_KEY = 'sj_session';
function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}
function saveSession(user: User | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}
function toUser(data: { id: number; email: string; role: Role }): User {
  return {
    id: String(data.id),
    name: data.email.split('@')[0],
    email: data.email,
    role: data.role,
    status: 'ACTIVE',
    joinedAt: new Date().toISOString().slice(0, 10),
  };
}

export const store = {
  session: readSession,
  setSession: saveSession,
  reset: () => {
    saveSession(null);
    tokenStore.clear();
    jobCache = [];
    applicationCache = [];
    notifyData();
  },
  users: () => [] as User[],
  jobs: () => jobCache,
  applications: () => applicationCache,
  reviews: () => [] as Review[],
  saveUsers: (_: User[]) => undefined,
  saveJobs: (_: any[]) => undefined,
  saveApplications: (_: any[]) => undefined,
  saveReviews: (_: any[]) => undefined,
};

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const result = await api.auth.login(email.trim().toLowerCase(), password);
    tokenStore.set(result.token);
    const user = toUser(result.user);
    saveSession(user);
    return user;
  },
  async requestRegistrationOtp(input: { name: string; email: string; password: string; role: 'STUDENT' | 'EMPLOYER'; company?: string }) {
    const profile = input.role === 'STUDENT'
      ? { full_name: input.name.trim() }
      : { company_name: (input.company || '').trim() };
    return api.auth.requestOtp({ email: input.email.trim().toLowerCase(), password: input.password, role: input.role, ...profile });
  },
  async verifyRegistrationOtp(email: string, otp: string) {
    const result = await api.auth.verifyOtp(email.trim().toLowerCase(), otp.trim());
    return toUser(result.user);
  },
  logout() {
    tokenStore.clear();
    saveSession(null);
    jobCache = [];
    applicationCache = [];
    notifyData();
  },
};

export const jobService = {
  all: () => jobCache,
  byId: (id: string): Job | undefined => jobCache.find(job => job.id === id),
  async load() {
    const session = readSession();
    let rows: Record<string, any>[];
    if (session?.role === 'EMPLOYER') {
      const result = await api.jobs.mine();
      rows = result.data;
    } else {
      const result = await api.jobs.all();
      rows = result.data;
      if (session?.role === 'ADMIN') {
        try {
          const pending = await api.admin.pendingJobs();
          rows = [...rows, ...pending.data];
        } catch (error) {
          console.error('Could not load pending jobs', error);
        }
      }
    }
    const uniqueRows = [...new Map(rows.map(row => [String(row.id), row])).values()];
    jobCache = uniqueRows.map(mapJob);

    // Load each employer-owned job's applications so dashboard/listing totals are accurate.
    if (session?.role === 'EMPLOYER') {
      await Promise.all(jobCache.map(job => applicationService.loadByJob(job.id).catch(error => {
        console.error(`Could not load applications for job ${job.id}`, error);
      })));
    }

    notifyData();
    return jobCache;
  },
  async save(job: Job) {
    const payload = {
      title: job.title,
      description: job.description,
      location: job.location,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      job_type: job.type,
      deadline: job.deadline || null,
      status: job.status,
    };
    if (/^\d+$/.test(job.id)) await api.jobs.update(job.id, payload);
    else await api.jobs.create(payload);
    await this.load();
  },
  remove: (_id: string) => {
    throw new Error('The backend does not expose a job deletion endpoint.');
  },
};

export const applicationService = {
  all: () => applicationCache,
  async loadMine() {
    const result = await api.applications.mine();
    const current = readSession();
    applicationCache = result.data.map((row: any) => mapApplication(row, current?.id));
    notifyData();
    return applicationCache;
  },
  async loadByJob(jobId: string) {
    const result = await api.applications.byJob(jobId);
    const loaded = result.data.map((row: any) => mapApplication(row));
    const others = applicationCache.filter(app => app.jobId !== String(jobId));
    applicationCache = [...others, ...loaded];
    notifyData();
    return loaded;
  },
  async apply(jobId: string, user: User, message: string) {
    return api.applications.create({ job_id: Number(jobId), cv_url: user.cvUrl || null, cover_letter: message || null });
  },
  async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
    await api.applications.updateStatus(id, status);
    const app = applicationCache.find(item => item.id === id);
    if (app) app.status = status;
    notifyData();
  },
};

export const userService = {
  save: (_user: User) => { throw new Error('The backend does not expose a profile update endpoint.'); },
  toggleStatus: (_id: string) => { throw new Error('The backend does not expose user activation management.'); },
};
export const reviewService = {
  create: (_jobId: string, _user: User, _rating: number, _comment: string) => { throw new Error('Review API is not available in the backend.'); },
};
