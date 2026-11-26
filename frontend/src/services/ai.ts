import { tokenStore } from './api';
import type { CVPayload } from './cv';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export type CVFeedbackItem = {
  area: 'structure' | 'summary' | 'experience' | 'skills' | 'education' | 'formatting' | 'language';
  severity: 'high' | 'medium' | 'low';
  tip: string;
};

export type CVFeedbackResult = {
  overall: string;
  items: CVFeedbackItem[];
};

export type CVAnalyzeResponse = {
  historyId?: number | null;
  message: string;
  aiUsed: boolean;
  model?: string;
  data: CVPayload;
  feedback: CVFeedbackResult | null;
  warnings: string[];
};

export type CVHistoryItem = {
  id: number;
  fileName: string;
  fileType: 'pdf' | 'docx';
  aiUsed: boolean;
  model?: string;
  status: string;
  data: CVPayload;
  feedback: CVFeedbackResult | null;
  warnings: string[];
  createdAt: string;
};

export type JobFitResult = {
  jobId: number | string;
  score: number | null;
  band: 'low' | 'fair' | 'good' | null;
  method: string;
  flags: string[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  advice: string[];
  evidenceThin: boolean;
};

export type RecommendedJobItem = {
  jobId: number;
  score: number;
  reason: string;
};

async function aiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  if (!token) throw new Error('Vui lòng đăng nhập tài khoản sinh viên.');

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/ai${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `Yêu cầu AI thất bại (${response.status})`);
  }
  return body as T;
}

export const aiService = {
  async analyzeCv(file: File, targetJob?: string): Promise<CVAnalyzeResponse> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      throw new Error('Chỉ hỗ trợ CV dạng PDF hoặc DOCX.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Dung lượng CV không được vượt quá 5 MB.');
    }
    if (file.size === 0) throw new Error('File CV đang trống.');

    const form = new FormData();
    form.append('file', file);
    if (targetJob && targetJob.trim()) {
      form.append('targetJob', targetJob.trim());
    }
    return aiRequest<CVAnalyzeResponse>('/cv/analyze', { method: 'POST', body: form });
  },

  async feedbackCv(cv: CVPayload, targetJob?: string) {
    return aiRequest<{ data: CVFeedbackResult; model?: string }>('/cv/feedback', {
      method: 'POST',
      body: JSON.stringify({ cv, targetJob }),
    });
  },

  async assistSummary(cv: CVPayload, targetJob?: string) {
    return aiRequest<{ data: { summary: string }; warning?: string | null }>('/cv/assist', {
      method: 'POST',
      body: JSON.stringify({ type: 'summary', cv, targetJob }),
    });
  },

  async assistBullets(
    experience: { company?: string; position?: string; bullets: string[] },
    targetJob?: string
  ) {
    return aiRequest<{
      data: { bullets: Array<{ original: string; improved: string; notes: string }> };
    }>('/cv/assist', {
      method: 'POST',
      body: JSON.stringify({ type: 'bullets', experience, targetJob }),
    });
  },

  async assistSkills(cv: CVPayload, targetJob: string) {
    return aiRequest<{
      data: {
        suggestions: Array<{
          name: string;
          reason: string;
          inCv: boolean;
          isRequired: boolean;
        }>;
      };
    }>('/cv/assist', {
      method: 'POST',
      body: JSON.stringify({ type: 'skills', cv, targetJob }),
    });
  },

  async assessJobFit(jobId: string | number, cv?: CVPayload) {
    return aiRequest<{ data: JobFitResult }>(`/jobs/${jobId}/fit`, {
      method: 'POST',
      body: JSON.stringify(cv ? { cv } : {}),
    });
  },

  async recommendJobs() {
    return aiRequest<{ aiUsed: boolean; data: RecommendedJobItem[] }>('/jobs/recommended');
  },

  async getCvHistory() {
    return aiRequest<{ data: CVHistoryItem[] }>('/cv/history');
  },

  async deleteCvHistory(id: number) {
    return aiRequest<{ message: string }>(`/cv/history/${id}`, {
      method: 'DELETE',
    });
  },
};
