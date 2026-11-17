import { tokenStore } from './api';

export type CVRecord = {
  id: number;
  user_id?: number;
  title: string;
  template: string;
  personal_info: { full_name?: string; email?: string; phone?: string; address?: string; summary?: string };
  education: Array<{ school: string; major: string; start_year: number | string; end_year: number | string }>;
  experience: Array<{ company: string; position: string; start_date: string; end_date: string; description: string }>;
  skills: string[];
  projects: Array<{ name: string; description: string; technologies: string | string[] }>;
  certifications?: Array<{ name: string; issuer?: string; year?: string }>;
};
export type CVPayload = Omit<CVRecord, 'id' | 'user_id'>;
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '').replace(/\/api$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new Error('Bạn cần đăng nhập để quản lý CV.');
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Yêu cầu thất bại (${response.status})`);
  return body as T;
}
const unwrap = <T,>(response: { data?: T } | T): T =>
  response && typeof response === 'object' && 'data' in response && response.data !== undefined ? response.data : response as T;
const normalize = (raw: Partial<CVRecord>): CVRecord => ({
  id: Number(raw.id), title: raw.title || '', template: raw.template || 'modern',
  personal_info: raw.personal_info || {}, education: Array.isArray(raw.education) ? raw.education : [],
  experience: Array.isArray(raw.experience) ? raw.experience : [],
  skills: Array.isArray(raw.skills) ? raw.skills : [],
  projects: Array.isArray(raw.projects) ? raw.projects : [],
  certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
});
export const cvService = {
  async list() { const raw = unwrap<Partial<CVRecord>[]>(await request('/api/cvs')); return (Array.isArray(raw) ? raw : []).map(normalize); },
  async get(id: number) { return normalize(unwrap<Partial<CVRecord>>(await request(`/api/cvs/${id}`))); },
  async create(payload: CVPayload) { return request('/api/cvs', { method: 'POST', body: JSON.stringify(payload) }); },
  async update(id: number, payload: CVPayload) { return request(`/api/cvs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); },
  async remove(id: number) { return request(`/api/cvs/${id}`, { method: 'DELETE' }); },
};
