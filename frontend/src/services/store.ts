import type { User, Role, Job, Application, Review } from '../types';
import { api, tokenStore } from './api';
let userCache: User[] = [];
// Job caches are split by scope: public listing (every role), the employer's
// own jobs (/jobs/mine), and admin pending moderation (/admin/jobs/pending).
let publicJobCache: Job[] = [];
let employerJobCache: Job[] = [];
let adminPendingJobCache: Job[] = [];
let applicationCache: Application[] = [];
let reviewCache: Review[] = [];
let jobLoadVersion = 0;
let publicJobLoadVersion = 0;
let employerJobLoadVersion = 0;
let adminJobLoadVersion = 0;
let sessionEpoch = 0;
let applicationListVersion = 0;
const jobApplicationVersions = new Map<string, number>();
const notifyData = () => window.dispatchEvent(new Event('sj:data-updated'));
const textList = (value: unknown, separator: RegExp): string[] =>
  Array.isArray(value) ? value : typeof value === 'string' ? value.split(separator).map(s => s.trim()).filter(Boolean) : [];
const arrangement = (value: unknown): Job['arrangement'] =>
  value === 'Từ xa' || value === 'Remote' ? 'Remote' : value === 'Kết hợp' || value === 'Hybrid' ? 'Hybrid' : value === 'Trực tiếp' || !value ? 'On-site' : String(value);

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
  arrangement: arrangement(row.work_mode || row.arrangement),
  description: row.description || '',
  responsibilities: textList(row.responsibilities, /\r?\n/),
  requirements: textList(row.requirements, /\r?\n/),
  skills: textList(row.skills, /,/),
  deadline: row.deadline ? String(row.deadline).slice(0, 10) : '',
  postedAt: row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
  status: row.status,
  moderation: row.moderation_status || 'APPROVED',
  applicants: Number(row.applicant_count || 0),
});

const mapApplication = (row: any, studentIdFallback?: string): Application => ({
  id: String(row.id),
  jobId: String(row.job_id),
  jobTitle: row.job_title || '',
  jobCompany: row.company_name || '',
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
const sessionKey = (user: User | null) => user ? `${user.id}:${user.role}` : '';
function saveSession(user: User | null) {
  if (sessionKey(readSession()) !== sessionKey(user)) {
    // Private caches belong to the outgoing session; public jobs are the same
    // for every role and survive the switch.
    employerJobCache = [];
    adminPendingJobCache = [];
    applicationCache = [];
    if (user?.role !== 'ADMIN') userCache = [];
    sessionEpoch++;
    jobLoadVersion++;
    employerJobLoadVersion++;
    adminJobLoadVersion++;
    applicationListVersion++;
    jobApplicationVersions.clear();
  }
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
    userCache = [];
    tokenStore.clear();
    employerJobCache = [];
    adminPendingJobCache = [];
    applicationCache = [];
    notifyData();
  },


users: () => userCache,

async loadUsers(): Promise<User[]> {
  const result = await api.admin.users();

  userCache = result.data.map((row: any): User => ({
    id: String(row.id),
    name: row.name || row.full_name || row.company_name || row.email,
    email: row.email,
    role: row.role,
    status: row.status === "BLOCKED" ? "BLOCKED" : "ACTIVE",
    company: row.company_name || "",
    phone: row.phone || "",
    university: row.university || "",
    major: row.major || "",
    address: row.address || "",
    joinedAt: row.created_at
      ? String(row.created_at).slice(0, 10)
      : "",
  }));

  notifyData();
  return userCache;
},


  jobs: () => publicJobCache,
  applications: () => applicationCache,
  reviews: () => reviewCache,
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
    userCache = [];
    employerJobCache = [];
    adminPendingJobCache = [];
    applicationCache = [];
    notifyData();
  },
};

export const jobService = {
  all: () => publicJobCache,
  mine: () => (readSession()?.role === 'EMPLOYER' ? employerJobCache : []),
  mineById: (id: string): Job | undefined => jobService.mine().find(job => job.id === id),
  adminAll: () => {
    const pending = readSession()?.role === 'ADMIN' ? adminPendingJobCache : [];
    const seen = new Set<string>();
    return [...publicJobCache, ...pending].filter(job => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  },
  byId: (id: string): Job | undefined => {
    const session = readSession();
    return publicJobCache.find(job => job.id === id)
      ?? (session?.role === 'EMPLOYER' ? employerJobCache.find(job => job.id === id) : undefined)
      ?? (session?.role === 'ADMIN' ? adminPendingJobCache.find(job => job.id === id) : undefined);
  },
  async load() {
    const session = readSession();
    const identity = sessionKey(session);
    const epoch = sessionEpoch;
    // Bumping jobLoadVersion invalidates application-detail responses issued by older loads.
    ++jobLoadVersion;
    const publicVersion = ++publicJobLoadVersion;
    const employerVersion = session?.role === 'EMPLOYER' ? ++employerJobLoadVersion : 0;
    const adminVersion = session?.role === 'ADMIN' ? ++adminJobLoadVersion : 0;
    const sessionStale = () => identity !== sessionKey(readSession()) || epoch !== sessionEpoch;

    // Public jobs are visible to every role, so load them first regardless of session.
    let publicError: unknown = null;
    try {
      const result = await api.jobs.all();
      if (!sessionStale() && publicVersion === publicJobLoadVersion) {
        publicJobCache = result.data.map(mapJob);
      }
    } catch (error) {
      publicError = error;
    }

    if (session?.role === 'EMPLOYER') {
      try {
        const result = await api.jobs.mine();
        if (!sessionStale() && employerVersion === employerJobLoadVersion) {
          employerJobCache = result.data.map(mapJob);
          // Fetch details only for jobs with applications; counts arrive with the list.
          const populatedIds = new Set(employerJobCache.filter(job => job.applicants > 0).map(job => job.id));
          applicationCache = applicationCache.filter(app => populatedIds.has(app.jobId));
          await Promise.all(employerJobCache.filter(job => job.applicants > 0).map(job => applicationService.loadByJob(job.id).catch(error => {
            console.error(`Could not load applications for job ${job.id}`, error);
          })));
        }
      } catch (error) {
        // Only the employer's own data is suspect; public jobs stay intact.
        if (!sessionStale() && employerVersion === employerJobLoadVersion) {
          employerJobCache = [];
          applicationCache = [];
          notifyData();
        }
        throw error;
      }
    }

    if (session?.role === 'ADMIN') {
      try {
        const pending = await api.admin.pendingJobs();
        if (!sessionStale() && adminVersion === adminJobLoadVersion) {
          adminPendingJobCache = pending.data.map(mapJob);
        }
      } catch (error) {
        console.error('Could not load pending jobs', error);
        if (!sessionStale() && adminVersion === adminJobLoadVersion) {
          adminPendingJobCache = [];
        }
      }
    }

    notifyData();
    if (publicError) throw publicError;
    return publicJobCache;
  },
  async save(job: Job) {
    const existing = this.mineById(job.id) ?? this.byId(job.id);
    const extras = {
      category: job.category,
      work_mode: ({ 'On-site': 'Trực tiếp', Hybrid: 'Kết hợp', Remote: 'Từ xa' } as Record<string, string>)[job.arrangement] || job.arrangement,
      responsibilities: job.responsibilities.join('\n'),
      requirements: job.requirements.join('\n'),
      skills: job.skills.join(', '),
    };
    if (existing) {
      if (existing.category === job.category) delete (extras as Partial<typeof extras>).category;
      if (existing.arrangement === job.arrangement) delete (extras as Partial<typeof extras>).work_mode;
      for (const key of ['responsibilities', 'requirements', 'skills'] as const) {
        if (JSON.stringify(existing[key]) === JSON.stringify(job[key])) delete (extras as Partial<typeof extras>)[key];
      }
    }
    const payload = {
      title: job.title,
      description: job.description,
      location: job.location,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      job_type: job.type,
      deadline: job.deadline || null,
      status: job.status,
      ...extras,
    };
    if (/^\d+$/.test(job.id)) await api.jobs.update(job.id, payload);
    else await api.jobs.create(payload);
    await this.load();
  },
  async remove(id: string) {
    if (/^\d+$/.test(id)) {
      await api.jobs.remove(id);
    }
    await this.load();
  },
};

export const applicationService = {

async loadAllAdmin() {
  const identity = sessionKey(readSession());
  const epoch = sessionEpoch;
  const version = ++applicationListVersion;
  const current = () => identity === sessionKey(readSession()) && epoch === sessionEpoch && version === applicationListVersion;
  let result: Awaited<ReturnType<typeof api.admin.allApplications>>;
  try { result = await api.admin.allApplications(); }
  catch (error) { if (!current()) return null; throw error; }
  if (!current()) return null;
  const loaded = result.data.map((row: any) =>
    mapApplication(row)
  );
  applicationCache = loaded;
  notifyData();

  return {
    applications: loaded,
    statistics: result.statistics
  };
},

  all: () => applicationCache,
  async loadMine() {
    const current = readSession();
    const identity = sessionKey(current);
    const epoch = sessionEpoch;
    const version = ++applicationListVersion;
    const isCurrent = () => identity === sessionKey(readSession()) && epoch === sessionEpoch && version === applicationListVersion;
    let result: Awaited<ReturnType<typeof api.applications.mine>>;
    try { result = await api.applications.mine(); }
    catch (error) { if (!isCurrent()) return null; throw error; }
    if (!isCurrent()) return null;
    const loaded = result.data.map((row: any) => mapApplication(row, current?.id));
    applicationCache = loaded;
    notifyData();
    return loaded;
  },
  async loadByJob(jobId: string) {
    const identity = sessionKey(readSession());
    const version = jobLoadVersion;
    const epoch = sessionEpoch;
    const request = (jobApplicationVersions.get(jobId) || 0) + 1;
    jobApplicationVersions.set(jobId, request);
    try {
      const result = await api.applications.byJob(jobId);
      const loaded = result.data.map((row: any) => mapApplication(row));
      if (identity !== sessionKey(readSession()) || epoch !== sessionEpoch || version !== jobLoadVersion || jobApplicationVersions.get(jobId) !== request) return null;
      const others = applicationCache.filter(app => app.jobId !== String(jobId));
      applicationCache = [...others, ...loaded];
      notifyData();
      return loaded;
    } catch (error) {
      if (identity !== sessionKey(readSession()) || epoch !== sessionEpoch || version !== jobLoadVersion || jobApplicationVersions.get(jobId) !== request) return null;
      applicationCache = applicationCache.filter(app => app.jobId !== String(jobId));
      notifyData();
      throw error;
    }
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


const mapProfileToUser = (
  row: Record<string, any>,
  previous?: User | null
): User => ({
  id: String(row.id),
  email: row.email,
  role: row.role,
  name: row.full_name || row.company_name || previous?.name || row.email.split('@')[0],
  status: previous?.status || 'ACTIVE',
  joinedAt: previous?.joinedAt || new Date().toISOString().slice(0, 10),
  phone: row.phone || '',
  university: row.university || '',
  major: row.major || '',
  bio: row.bio || '',
  company: row.company_name || previous?.company,
  address: row.address || previous?.address || '',
  description: row.description || previous?.description || '',
  skills: Array.isArray(row.skills) ? row.skills : (previous?.skills || []),
  cvUrl: row.cv_url ?? previous?.cvUrl ?? '',
});



export const userService = {
  async loadProfile(): Promise<User> {
    const result = await api.profile.get();
    const user = mapProfileToUser(result.user, readSession());

    saveSession(user);
    notifyData();

    return user;
  },

  async save(user: User): Promise<User> {
    const payload = user.role === 'STUDENT'
      ? {
          full_name: user.name,
          phone: user.phone || '',
          university: user.university || '',
          major: user.major || '',
          bio: user.bio || '',
          cv_url: user.cvUrl || '',
          skills: user.skills || [],
        }
      : {
          company_name: user.company || user.name,
          phone: user.phone || '',
          address: user.address || '',
          description: user.description || '',
        };

    const result = await api.profile.update(payload);

    const updated = mapProfileToUser(result.user, user);

    saveSession(updated);
    notifyData();

    return updated;
  },

  
async toggleStatus(id: string): Promise<User> {
  const current = userCache.find(user => user.id === id);

  if (!current) {
    throw new Error('Không tìm thấy người dùng');
  }

  if (current.role === 'ADMIN') {
    throw new Error('Không thể thay đổi trạng thái ADMIN');
  }

  const newStatus = current.status === 'ACTIVE'
    ? 'BLOCKED'
    : 'ACTIVE';

  await api.admin.updateUserStatus(id, newStatus);

  const updated: User = {
    ...current,
    status: newStatus
  };

  userCache = userCache.map(user =>
    user.id === id ? updated : user
  );

  notifyData();
  return updated;
},

async create(payload: {
  email: string;
  password: string;
  role: 'STUDENT' | 'EMPLOYER' | 'ADMIN';
  status?: 'ACTIVE' | 'BLOCKED';
  name?: string;
  company_name?: string;
  phone?: string;
  university?: string;
  major?: string;
  address?: string;
}): Promise<User> {
  const res = await api.admin.createUser(payload);
  const row = res.data;
  const created: User = {
    id: String(row.id),
    name: row.name || row.full_name || row.company_name || row.email,
    email: row.email,
    role: row.role,
    status: row.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE',
    company: row.company_name || '',
    phone: row.phone || '',
    university: row.university || '',
    major: row.major || '',
    address: row.address || '',
    joinedAt: row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
  userCache = [created, ...userCache];
  notifyData();
  return created;
},

async update(
  id: string,
  payload: {
    email?: string;
    password?: string;
    role?: 'STUDENT' | 'EMPLOYER' | 'ADMIN';
    status?: 'ACTIVE' | 'BLOCKED';
    name?: string;
    company_name?: string;
    phone?: string;
    university?: string;
    major?: string;
    address?: string;
  }
): Promise<User> {
  const res = await api.admin.updateUser(id, payload);
  const row = res.data;
  const updated: User = {
    id: String(row.id),
    name: row.name || row.full_name || row.company_name || row.email,
    email: row.email,
    role: row.role,
    status: row.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE',
    company: row.company_name || '',
    phone: row.phone || '',
    university: row.university || '',
    major: row.major || '',
    address: row.address || '',
    joinedAt: row.created_at ? String(row.created_at).slice(0, 10) : '',
  };
  userCache = userCache.map((u) => (u.id === id ? updated : u));
  notifyData();
  return updated;
},

async remove(id: string): Promise<void> {
  await api.admin.deleteUser(id);
  userCache = userCache.filter((u) => u.id !== id);
  notifyData();
},

};

export const reviewService = {
  all: () => reviewCache,
  async load(jobId?: string) {
    const res = await api.reviews.list(jobId);
    const mapped: Review[] = (res.data || []).map((r: any) => ({
      id: String(r.id),
      jobId: String(r.job_id),
      studentId: String(r.user_id),
      rating: Number(r.rating),
      comment: r.comment || '',
      createdAt: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    }));
    if (jobId) {
      reviewCache = [...reviewCache.filter((x) => x.jobId !== String(jobId)), ...mapped];
    } else {
      reviewCache = mapped;
    }
    notifyData();
    return mapped;
  },
  async create(jobId: string, user: User, rating: number, comment: string) {
    const res = await api.reviews.create({
      job_id: Number(jobId),
      rating,
      comment,
    });
    const r = res.data;
    const item: Review = {
      id: String(r.id),
      jobId: String(r.job_id),
      studentId: String(r.user_id || user.id),
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
    reviewCache = [item, ...reviewCache];
    notifyData();
    return item;
  },
};
