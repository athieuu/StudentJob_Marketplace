import type { Role } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'sj_access_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function apiRequest<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (authenticated) {
    const token = tokenStore.get();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Không thể kết nối máy chủ. Hãy kiểm tra backend và VITE_API_BASE_URL.', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new Event('sj:auth-expired'));
    }
    throw new ApiError(payload?.message || `Yêu cầu thất bại (${response.status})`, response.status);
  }
  return payload as T;
}

export interface ApiUser { id: number; email: string; role: Role }
export interface AuthResponse { token: string; user: ApiUser; message: string }


export async function cvRequest(
  id: string | number,
  action: 'view' | 'download'
): Promise<void> {
  const token = tokenStore.get();

  if (!token) {
    throw new Error('Vui lòng đăng nhập lại');
  }

  const response = await fetch(
    `${API_BASE_URL}/applications/${id}/cv/${action}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể lấy CV');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  if (action === 'view') {
    const tab = window.open(url, '_blank');

    if (!tab) {
      URL.revokeObjectURL(url);
      throw new Error('Trình duyệt chặn cửa sổ xem CV');
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${id}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

 
export const api = {

  profile: {
    get: () =>
      apiRequest<{ user: Record<string, any> }>(
        '/profile',
        {},
        true
      ),

    update: (data: Record<string, unknown>) =>
      apiRequest<{
        message: string;
        user: Record<string, any>;
      }>(
        '/profile',
        {
          method: 'PUT',
          body: JSON.stringify(data)
        },
        true
      ),
  },

  
  auth: {
    requestOtp: (data: Record<string, unknown>) => apiRequest<{ message: string }>('/auth/register/request-otp', { method: 'POST', body: JSON.stringify(data) }),
    verifyOtp: (email: string, otp: string) => apiRequest<{ message: string; user: ApiUser }>('/auth/register/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
    login: (email: string, password: string) => apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => apiRequest<{ message: string; user: ApiUser }>('/auth/me', {}, true),
  },
  jobs: {
    all: () => apiRequest<{ data: Record<string, any>[] }>('/jobs'),
    mine: () => apiRequest<{ data: Record<string, any>[] }>('/jobs/mine', {}, true),
    byId: (id: string | number) => apiRequest<{ data: Record<string, any> }>(`/jobs/${id}`),
    create: (data: Record<string, unknown>) => apiRequest<{ message: string; jobId: number; moderation_status: string }>('/jobs', { method: 'POST', body: JSON.stringify(data) }, true),
    update: (id: string | number, data: Record<string, unknown>) => apiRequest<{ message: string }>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true),
  },
  
applications: {
  create: (data: Record<string, unknown>) =>
    apiRequest<{ message: string; applicationId: number }>(
      '/applications',
      { method: 'POST', body: JSON.stringify(data) },
      true
    ),

  mine: () =>
    apiRequest<{ data: Record<string, any>[] }>(
      '/applications/my', {}, true
    ),

  byJob: (jobId: string | number) =>
    apiRequest<{ data: Record<string, any>[] }>(
      `/applications/job/${jobId}`, {}, true
    ),

  updateStatus: (
    id: string | number,
    status: 'ACCEPTED' | 'REJECTED'
  ) =>
    apiRequest<{ message: string }>(
      `/applications/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      },
      true
    ),

  // Upload CV PDF
  uploadCv: (id: string | number, file: File) => {
    const formData = new FormData();
    formData.append('cv', file);

    return apiRequest<{ message: string; cv_url: string }>(
      `/applications/${id}/cv`,
      {
        method: 'POST',
        body: formData
      },
      true
    );
  },

  // Xem CV
  viewCv: (id: string | number) =>
    cvRequest(id, 'view'),

  // Tải CV
  downloadCv: (id: string | number) =>
    cvRequest(id, 'download'),
},

  admin: {

allApplications: () =>
  apiRequest<{
    message: string;
    statistics: {
      total: number;
      pending: number;
      accepted: number;
      rejected: number;
    };
    data: Record<string, any>[];
  }>('/admin/applications', {}, true),


users: () =>
  apiRequest<{ data: Record<string, any>[] }>(
    '/admin/users',
    {},
    true
  ),

updateUserStatus: (
  id: string,
  status: 'ACTIVE' | 'BLOCKED'
) =>
  apiRequest<{
    message: string;
    data: { id: number; status: 'ACTIVE' | 'BLOCKED' };
  }>(
    `/admin/users/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    },
    true
  ),

    pendingJobs: () => apiRequest<{ data: Record<string, any>[] }>('/admin/jobs/pending', {}, true),
    moderate: (id: string | number, moderation_status: 'APPROVED' | 'REJECTED', rejection_reason?: string) => apiRequest<{ message: string; jobId: number; moderation_status: string }>(`/admin/jobs/${id}/moderation`, { method: 'PATCH', body: JSON.stringify({ moderation_status, ...(rejection_reason ? { rejection_reason } : {}) }) }, true),
  },
};

export const apiBaseUrl = API_BASE_URL;
