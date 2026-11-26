import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  Eye,
  FileDown,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { cvService } from '../services/cv';
import { cvParserService } from '../services/cvParser';
import { aiService } from '../services/ai';
import type { CVPayload, CVRecord } from '../services/cv';
import './cv-builder.css';

type Section = 'education' | 'experience' | 'projects' | 'certifications';

const blank = (): CVPayload => ({
  title: '',
  template: 'modern',
  personal_info: { full_name: '', email: '', phone: '', address: '', summary: '' },
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
});

const fieldSets: Record<Section, Array<[string, string]>> = {
  education: [
    ['school', 'Trường học'],
    ['major', 'Chuyên ngành'],
    ['start_year', 'Từ năm'],
    ['end_year', 'Đến năm'],
  ],
  experience: [
    ['company', 'Công ty'],
    ['position', 'Vị trí'],
    ['start_date', 'Bắt đầu'],
    ['end_date', 'Kết thúc'],
    ['description', 'Mô tả công việc'],
  ],
  projects: [
    ['name', 'Tên dự án'],
    ['technologies', 'Công nghệ'],
    ['description', 'Mô tả dự án'],
  ],
  certifications: [
    ['name', 'Chứng chỉ'],
    ['issuer', 'Đơn vị cấp'],
    ['year', 'Năm cấp'],
  ],
};

const sectionNames: Record<Section, string> = {
  education: 'Học vấn',
  experience: 'Kinh nghiệm làm việc',
  projects: 'Dự án',
  certifications: 'Chứng chỉ',
};

const stringify = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

function Preview({ cv }: { cv: CVPayload }) {
  const p = cv.personal_info;
  return (
    <article className={`cv-paper cv-paper-${cv.template}`} id="studentjob-cv-print">
      <header className="cv-paper-head">
        <h1>{p.full_name || 'HỌ VÀ TÊN'}</h1>
        <div className="cv-contact-grid">
          {p.email && (
            <div className="cv-contact-item">
              <Mail size={13} className="shrink-0 text-[var(--color-primary)]" />
              <span>{p.email}</span>
            </div>
          )}
          {p.phone && (
            <div className="cv-contact-item">
              <Phone size={13} className="shrink-0 text-[var(--color-primary)]" />
              <span>{p.phone}</span>
            </div>
          )}
          {p.address && (
            <div className="cv-contact-item">
              <MapPin size={13} className="shrink-0 text-[var(--color-primary)]" />
              <span>{p.address}</span>
            </div>
          )}
        </div>
      </header>

      {p.summary && (
        <section>
          <h2>Giới thiệu</h2>
          <p>{p.summary}</p>
        </section>
      )}

      {!!cv.education.length && (
        <section>
          <h2>Học vấn</h2>
          {cv.education.map((x, i) => (
            <div className="cv-paper-entry" key={i}>
              <strong>{x.school}</strong>
              <span>{[x.start_year, x.end_year].filter(Boolean).join(' – ')}</span>
              <p>{x.major}</p>
            </div>
          ))}
        </section>
      )}

      {!!cv.experience.length && (
        <section>
          <h2>Kinh nghiệm làm việc</h2>
          {cv.experience.map((x, i) => (
            <div className="cv-paper-entry" key={i}>
              <strong>{x.position || x.company}</strong>
              <span>{[x.start_date, x.end_date].filter(Boolean).join(' – ')}</span>
              <p>{[x.company, x.description].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
        </section>
      )}

      {!!cv.skills.length && (
        <section>
          <h2>Kỹ năng</h2>
          <div className="cv-paper-skills">
            {cv.skills.map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
        </section>
      )}

      {!!cv.projects.length && (
        <section>
          <h2>Dự án</h2>
          {cv.projects.map((x, i) => (
            <div className="cv-paper-entry" key={i}>
              <strong>{x.name}</strong>
              <p>{x.description}</p>
              {x.technologies && <p><em>Công nghệ: {stringify(x.technologies)}</em></p>}
            </div>
          ))}
        </section>
      )}

      {!!cv.certifications?.length && (
        <section>
          <h2>Chứng chỉ</h2>
          {cv.certifications.map((x, i) => (
            <div className="cv-paper-entry" key={i}>
              <strong>{x.name}</strong>
              <span>{x.year}</span>
              <p>{x.issuer}</p>
            </div>
          ))}
        </section>
      )}

      {!p.summary &&
        !cv.education.length &&
        !cv.experience.length &&
        !cv.skills.length &&
        !cv.projects.length &&
        !cv.certifications?.length && (
          <p className="cv-paper-placeholder">
            Nhập thông tin bên trái để xem trước CV trực tiếp tại đây.
          </p>
        )}
    </article>
  );
}

export default function CVBuilderPage() {
  const [items, setItems] = useState<CVRecord[]>([]);
  const [mode, setMode] = useState<'list' | 'editor' | 'view'>('list');
  const [id, setId] = useState<number | null>(null);
  const [form, setForm] = useState<CVPayload>(blank());
  const [skillsText, setSkillsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState<'summary' | 'skills' | number | null>(null);
  const [targetJobText, setTargetJobText] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<
    Array<{ name: string; reason: string; inCv: boolean; isRequired: boolean }>
  >([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  const suggestSkills = async () => {
    if (!targetJobText.trim()) {
      setError('Vui lòng nhập hoặc dán mô tả công việc mục tiêu để AI gợi ý kỹ năng.');
      return;
    }
    setAiBusy('skills');
    setError('');
    try {
      const res = await aiService.assistSkills(liveCV, targetJobText.trim());
      setSkillSuggestions(res.data.suggestions || []);
      setNotice('AI đã gợi ý các kỹ năng phù hợp theo công việc mục tiêu.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gọi AI gợi ý kỹ năng.');
    } finally {
      setAiBusy(null);
    }
  };

  const addSuggestedSkill = (name: string) => {
    const current = skillsText.split(',').map((s) => s.trim()).filter(Boolean);
    if (!current.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setSkillsText([...current, name].join(', '));
    }
  };

  const suggestSummary = async () => {
    setAiBusy('summary');
    setError('');
    try {
      const res = await aiService.assistSummary(liveCV);
      setPersonal('summary', res.data.summary);
      setNotice(res.warning || 'AI đã gợi ý phần giới thiệu bản thân dựa trên hồ sơ của bạn.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gọi AI gợi ý tóm tắt.');
    } finally {
      setAiBusy(null);
    }
  };

  const optimizeExperienceBullets = async (index: number) => {
    const exp = form.experience[index];
    if (!exp) return;
    const bullets = String(exp.description || '')
      .split(/\r?\n/)
      .map((s) => s.replace(/^[•*\-]\s*/, '').trim())
      .filter(Boolean);
    if (!bullets.length) {
      setError('Vui lòng nhập ít nhất 1 dòng mô tả kinh nghiệm để AI tối ưu.');
      return;
    }
    setAiBusy(index);
    setError('');
    try {
      const res = await aiService.assistBullets({
        company: exp.company,
        position: exp.position,
        bullets,
      });
      const improvedText = res.data.bullets.map((b) => `• ${b.improved}`).join('\n');
      updateRow('experience', index, 'description', improvedText);
      setNotice('AI đã tối ưu hóa các gạch đầu dòng kinh nghiệm.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tối ưu mô tả kinh nghiệm.');
    } finally {
      setAiBusy(null);
    }
  };

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setItems(await cvService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách CV');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const newCV = () => {
    setId(null);
    setForm(blank());
    setSkillsText('');
    setError('');
    setNotice('');
    setParseWarnings([]);
    setMode('editor');
  };

  const openCV = async (cvId: number, nextMode: 'editor' | 'view') => {
    setBusy(true);
    setError('');
    try {
      const cv = await cvService.get(cvId);
      setId(cvId);
      setForm({
        title: cv.title,
        template: cv.template,
        personal_info: cv.personal_info || {},
        education: cv.education,
        experience: cv.experience,
        skills: cv.skills,
        projects: cv.projects,
        certifications: cv.certifications || [],
      });
      setSkillsText(cv.skills.join(', '));
      setMode(nextMode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể mở CV');
    } finally {
      setBusy(false);
    }
  };

  const setPersonal = (key: keyof CVPayload['personal_info'], value: string) =>
    setForm((f) => ({
      ...f,
      personal_info: { ...f.personal_info, [key]: value },
    }));

  const updateRow = (section: Section, index: number, key: string, value: string) =>
    setForm((f) => ({
      ...f,
      [section]: (f[section] || []).map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      ),
    }));

  const addRow = (section: Section) =>
    setForm(
      (f) =>
        ({
          ...f,
          [section]: [
            ...(f[section] || []),
            Object.fromEntries(fieldSets[section].map(([key]) => [key, ''])),
          ],
        }) as CVPayload
    );

  const deleteRow = (section: Section, index: number) =>
    setForm((f) => ({
      ...f,
      [section]: (f[section] || []).filter((_, i) => i !== index),
    }));

  const liveCV: CVPayload = {
    ...form,
    skills: skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Vui lòng nhập tên CV');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = { ...liveCV, title: form.title.trim() };
      if (id === null) await cvService.create(payload);
      else await cvService.update(id, payload);
      setNotice(id === null ? 'Tạo CV thành công.' : 'Cập nhật CV thành công.');
      setMode('list');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu CV');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cvId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa CV này?')) return;
    setBusy(true);
    setError('');
    try {
      await cvService.remove(cvId);
      setNotice('Đã xóa CV.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể xóa CV');
    } finally {
      setBusy(false);
    }
  };

  const importCV = async (file?: File) => {
    if (!file) return;
    if (uploadRef.current) uploadRef.current.value = '';
    if (
      mode === 'editor' &&
      (form.title.trim() || form.personal_info.full_name || skillsText.trim()) &&
      !window.confirm('Nhập CV mới sẽ thay thế nội dung đang nhập (chưa lưu). Tiếp tục?')
    )
      return;
    setBusy(true);
    setError('');
    setNotice('');
    setParseWarnings([]);
    try {
      const result = await cvParserService.parse(file);
      const parsed = result.data;
      const next: CVPayload = {
        ...blank(),
        title: parsed.title?.trim() || `CV nhập từ ${file.name}`,
        template: ['modern', 'classic', 'minimal'].includes(parsed.template || '')
          ? parsed.template!
          : 'modern',
        personal_info: { ...blank().personal_info, ...(parsed.personal_info || {}) },
        education: Array.isArray(parsed.education) ? parsed.education : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      };
      setId(null);
      setForm(next);
      setSkillsText(next.skills.join(', '));
      setParseWarnings(result.warnings || []);
      setMode('editor');
      setNotice('Đã đọc CV. Hãy kiểm tra và chỉnh sửa thông tin trước khi nhấn Lưu CV.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đọc CV');
    } finally {
      setBusy(false);
    }
  };

  const exportPDF = () => window.print();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <input
        ref={uploadRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        aria-label="Chọn CV PDF hoặc DOCX"
        onChange={(e) => void importCV(e.target.files?.[0])}
      />

      {/* Header bar */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-1">
            HỒ SƠ NGHỀ NGHIỆP
          </span>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            {mode === 'list'
              ? 'CV của tôi'
              : mode === 'view'
              ? 'Xem CV'
              : id === null
              ? 'Tạo CV mới'
              : 'Chỉnh sửa CV'}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            {mode === 'list'
              ? 'Quản lý, tạo và chỉnh sửa các bản CV chuyên nghiệp trực tiếp trên hệ thống.'
              : 'Thiết kế hồ sơ chuẩn format A4 và xem trước trực tiếp.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            disabled={busy}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload size={16} />
            {busy ? 'Đang đọc...' : 'Nhập từ file CV'}
          </Button>

          {mode === 'list' ? (
            <Button variant="primary" size="md" onClick={newCV}>
              <Plus size={16} /> Tạo CV mới
            </Button>
          ) : (
            <Button variant="outline" size="md" onClick={() => setMode('list')}>
              <ArrowLeft size={16} /> Danh sách CV
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2" role="status">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {parseWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5" role="status">
          <strong className="block font-bold">Thông tin cần kiểm tra từ file:</strong>
          <ul className="list-disc pl-4 space-y-1">
            {parseWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mode = List */}
      {mode === 'list' ? (
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Danh sách bản CV ({items.length})
            </h2>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Tải lại
            </Button>
          </div>

          {!items.length ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center mb-3">
                <FileText size={22} />
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs mb-4">
                {busy ? 'Đang tải danh sách...' : 'Bạn chưa có bản CV nào. Hãy bắt đầu tạo ngay!'}
              </p>
              <Button variant="primary" size="md" onClick={newCV}>
                <Plus size={16} /> Bắt đầu tạo CV
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((cv) => (
                <div
                  key={cv.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-10 h-10 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--color-foreground)]">
                        {cv.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        <span className="capitalize">Mẫu: {cv.template}</span>
                        <span>·</span>
                        <span>Mã CV #{cv.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void openCV(cv.id, 'view')}
                    >
                      <Eye size={14} /> Xem
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void openCV(cv.id, 'editor')}
                    >
                      <Pencil size={14} /> Sửa
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(cv.id)}
                    >
                      <Trash2 size={14} /> Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mode = Editor or View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {mode === 'editor' && (
            <form id="cv-edit-form" onSubmit={save} className="space-y-6">
              {/* Section 1: Template and Title */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
                  Cấu hình CV
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                      Tên gọi bản CV *
                    </label>
                    <input
                      className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
                      required
                      maxLength={255}
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="VD: CV Thực tập sinh Frontend"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                      Giao diện mẫu
                    </label>
                    <Select
                      value={form.template}
                      onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                    >
                      <option value="modern">Hiện đại (Modern)</option>
                      <option value="classic">Cổ điển (Classic)</option>
                      <option value="minimal">Tối giản (Minimal)</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Info */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
                  Thông tin cá nhân
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      ['full_name', 'Họ và tên'],
                      ['email', 'Email'],
                      ['phone', 'Số điện thoại'],
                      ['address', 'Địa chỉ'],
                      ['summary', 'Giới thiệu bản thân'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className={key === 'summary' ? 'sm:col-span-2' : ''}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-[var(--color-foreground)]">
                          {label}
                        </label>
                        {key === 'summary' && (
                          <button
                            type="button"
                            disabled={aiBusy !== null}
                            onClick={suggestSummary}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles size={12} />
                            {aiBusy === 'summary' ? 'Đang viết...' : 'AI Gợi ý tóm tắt'}
                          </button>
                        )}
                      </div>
                      {key === 'summary' ? (
                        <textarea
                          className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
                          rows={4}
                          value={form.personal_info[key] || ''}
                          onChange={(e) => setPersonal(key, e.target.value)}
                          placeholder="Mô tả ngắn gọn về mục tiêu nghề nghiệp và thế mạnh của bạn..."
                        />
                      ) : (
                        <input
                          className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
                          type={key === 'email' ? 'email' : 'text'}
                          value={form.personal_info[key] || ''}
                          onChange={(e) => setPersonal(key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic sections: Education, Experience, Projects, Certifications */}
              {(['education', 'experience', 'projects', 'certifications'] as const).map(
                (section) => (
                  <div
                    className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4"
                    key={section}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                      <h2 className="text-base font-bold text-[var(--color-foreground)]">
                        {sectionNames[section]}
                      </h2>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRow(section)}
                      >
                        <Plus size={14} /> Thêm mục
                      </Button>
                    </div>

                    {!(form[section] || []).length ? (
                      <p className="text-xs text-[var(--color-muted-foreground)] italic">
                        Chưa có mục nào được thêm. Bấm "Thêm mục" để bắt đầu.
                      </p>
                    ) : (
                      (form[section] || []).map((row, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[var(--color-muted)]/40 rounded-lg border border-[var(--color-border)] space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {fieldSets[section].map(([key, label]) => (
                              <div
                                key={key}
                                className={key === 'description' ? 'sm:col-span-2' : ''}
                              >
                                <label className="block text-[11px] font-bold text-[var(--color-foreground)] mb-1">
                                  {label}
                                </label>
                                <input
                                  className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary)] transition-colors duration-150"
                                  value={stringify(
                                    (row as unknown as Record<string, unknown>)[key]
                                  )}
                                  onChange={(e) =>
                                    updateRow(section, index, key, e.target.value)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            {section === 'experience' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={aiBusy !== null}
                                onClick={() => void optimizeExperienceBullets(index)}
                              >
                                <Sparkles size={13} />
                                {aiBusy === index ? 'Đang tối ưu...' : 'AI Tối ưu mô tả'}
                              </Button>
                            ) : (
                              <span />
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteRow(section, index)}
                            >
                              <Trash2 size={13} /> Xóa mục này
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              )}

              {/* Skills section */}
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[var(--color-foreground)] pb-2 border-b border-[var(--color-border)]">
                  Kỹ năng chuyên môn
                </h2>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1">
                    Danh sách kỹ năng (ngăn cách bằng dấu phẩy)
                  </label>
                  <input
                    className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-ring)] transition-colors duration-150"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="VD: React, TypeScript, Tailwind CSS, Git, Figma"
                  />
                </div>

                {/* AI Skills Suggestion */}
                <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[var(--color-primary)]" />
                      AI Gợi ý kỹ năng theo vị trí ứng tuyển
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={aiBusy !== null}
                      onClick={() => void suggestSkills()}
                    >
                      {aiBusy === 'skills' ? 'Đang phân tích...' : 'Gợi ý kỹ năng'}
                    </Button>
                  </div>
                  <input
                    className="w-full bg-white text-xs text-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary)]"
                    value={targetJobText}
                    onChange={(e) => setTargetJobText(e.target.value)}
                    placeholder="Dán tên vị trí hoặc mô tả công việc mục tiêu (VD: Thực tập sinh ReactJS, cần Git, SQL...)"
                  />
                  {skillSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillSuggestions.map((sg) => (
                        <button
                          key={sg.name}
                          type="button"
                          onClick={() => addSuggestedSkill(sg.name)}
                          title={sg.reason}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors duration-150 cursor-pointer ${
                            sg.inCv
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-white text-[var(--color-primary)] border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/10'
                          }`}
                        >
                          {!sg.inCv && <Plus size={11} />}
                          {sg.name}
                          {sg.isRequired && <span className="text-rose-600">*</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="md" onClick={() => setMode('list')}>
                  Hủy
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={busy}>
                  <Save size={16} />
                  {busy ? 'Đang lưu...' : 'Lưu lại bản CV'}
                </Button>
              </div>
            </form>
          )}

          {/* Right Column: Live A4 Preview */}
          <div className="sticky top-20 space-y-3">
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-3">
              <strong className="text-xs uppercase tracking-wider text-[var(--color-foreground)]">
                Xem trước khổ A4 trực tiếp
              </strong>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={exportPDF}>
                  <FileDown size={14} /> Xuất PDF
                </Button>
                {mode === 'view' && id !== null && (
                  <Button variant="outline" size="sm" onClick={() => setMode('editor')}>
                    <Pencil size={14} /> Chỉnh sửa
                  </Button>
                )}
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
              <Preview cv={liveCV} />
            </div>

            <p className="text-xs text-[var(--color-muted-foreground)] text-center">
              Mẹo: Nhấn <strong>Xuất PDF</strong> → Trong hộp thoại in của trình duyệt, chọn máy in là <strong>Save as PDF</strong> (Lưu dưới dạng PDF).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
