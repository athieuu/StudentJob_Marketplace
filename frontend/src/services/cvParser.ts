import { tokenStore } from './api';
import type { CVPayload } from './cv';

type ParseResponse = {
  message?: string;
  data: Partial<CVPayload>;
  warnings?: string[];
};

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export const cvParserService = {
  async parse(file: File): Promise<ParseResponse> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      throw new Error('Chỉ hỗ trợ CV dạng PDF hoặc DOCX.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Dung lượng CV không được vượt quá 5 MB.');
    }
    if (file.size === 0) throw new Error('File CV đang trống.');
    const token = tokenStore.get();
    if (!token) throw new Error('Vui lòng đăng nhập tài khoản sinh viên.');
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${apiBase}/cvs/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    // Browser must set multipart/form-data boundary itself.
    const json: unknown = await response.json().catch(() => ({}));
    const body = json && typeof json === 'object' ? json as Partial<ParseResponse> & { error?: string } : {};
    if (!response.ok) {
      throw new Error(body.message || body.error || `Không thể phân tích CV (${response.status}).`);
    }
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new Error('Dữ liệu CV trả về không hợp lệ.');
    }
    return { data: body.data, warnings: Array.isArray(body.warnings) ? body.warnings : [], message: body.message };
  },
};
