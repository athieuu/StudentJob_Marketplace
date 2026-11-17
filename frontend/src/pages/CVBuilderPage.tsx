import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Eye, FileDown, FileText, Pencil, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { cvService } from '../services/cv';
import { cvParserService } from '../services/cvParser';
import type { CVPayload, CVRecord } from '../services/cv';
import './cv-builder.css';

type Section = 'education' | 'experience' | 'projects' | 'certifications';
const blank = (): CVPayload => ({ title: '', template: 'modern', personal_info: { full_name: '', email: '', phone: '', address: '', summary: '' }, education: [], experience: [], skills: [], projects: [], certifications: [] });
const fieldSets: Record<Section, Array<[string, string]>> = {
  education: [['school', 'Trường học'], ['major', 'Chuyên ngành'], ['start_year', 'Từ năm'], ['end_year', 'Đến năm']],
  experience: [['company', 'Công ty'], ['position', 'Vị trí'], ['start_date', 'Bắt đầu'], ['end_date', 'Kết thúc'], ['description', 'Mô tả công việc']],
  projects: [['name', 'Tên dự án'], ['technologies', 'Công nghệ'], ['description', 'Mô tả dự án']],
  certifications: [['name', 'Chứng chỉ'], ['issuer', 'Đơn vị cấp'], ['year', 'Năm cấp']],
};
const sectionNames: Record<Section, string> = { education: 'Học vấn', experience: 'Kinh nghiệm làm việc', projects: 'Dự án', certifications: 'Chứng chỉ' };
const stringify = (v: unknown) => Array.isArray(v) ? v.join(', ') : String(v ?? '');

function Preview({ cv }: { cv: CVPayload }) {
  const p = cv.personal_info;
  return <article className={`cv-paper cv-paper-${cv.template}`} id="studentjob-cv-print">
    <header className="cv-paper-head"><h1>{p.full_name || 'HỌ VÀ TÊN'}</h1>
      <div className="cv-contact-grid">
        {p.email && <div className="cv-contact-item"><span>✉</span><span>{p.email}</span></div>}
        {p.phone && <div className="cv-contact-item"><span>☎</span><span>{p.phone}</span></div>}
        {p.address && <div className="cv-contact-item"><span>⌖</span><span>{p.address}</span></div>}
      </div>
    </header>
    {p.summary && <section><h2>Giới thiệu</h2><p>{p.summary}</p></section>}
    {!!cv.education.length && <section><h2>Học vấn</h2>{cv.education.map((x, i) => <div className="cv-paper-entry" key={i}><strong>{x.school}</strong><span>{[x.start_year, x.end_year].filter(Boolean).join(' – ')}</span><p>{x.major}</p></div>)}</section>}
    {!!cv.experience.length && <section><h2>Kinh nghiệm làm việc</h2>{cv.experience.map((x, i) => <div className="cv-paper-entry" key={i}><strong>{x.position || x.company}</strong><span>{[x.start_date, x.end_date].filter(Boolean).join(' – ')}</span><p>{[x.company, x.description].filter(Boolean).join(' · ')}</p></div>)}</section>}
    {!!cv.skills.length && <section><h2>Kỹ năng</h2><div className="cv-paper-skills">{cv.skills.map((x, i) => <span key={i}>{x}</span>)}</div></section>}
    {!!cv.projects.length && <section><h2>Dự án</h2>{cv.projects.map((x, i) => <div className="cv-paper-entry" key={i}><strong>{x.name}</strong><p>{x.description}</p>{x.technologies && <p><em>Công nghệ: {stringify(x.technologies)}</em></p>}</div>)}</section>}
    {!!cv.certifications?.length && <section><h2>Chứng chỉ</h2>{cv.certifications.map((x, i) => <div className="cv-paper-entry" key={i}><strong>{x.name}</strong><span>{x.year}</span><p>{x.issuer}</p></div>)}</section>}
    {!p.summary && !cv.education.length && !cv.experience.length && !cv.skills.length && !cv.projects.length && !cv.certifications?.length && <p className="cv-paper-placeholder">Nhập thông tin bên trái để xem trước CV tại đây.</p>}
  </article>;
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
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = async () => { setBusy(true); setError(''); try { setItems(await cvService.list()); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải danh sách CV'); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);
  const newCV = () => { setId(null); setForm(blank()); setSkillsText(''); setError(''); setNotice(''); setParseWarnings([]); setMode('editor'); };
  const openCV = async (cvId: number, nextMode: 'editor' | 'view') => { setBusy(true); setError(''); try { const cv = await cvService.get(cvId); setId(cvId); setForm({ title: cv.title, template: cv.template, personal_info: cv.personal_info || {}, education: cv.education, experience: cv.experience, skills: cv.skills, projects: cv.projects, certifications: cv.certifications || [] }); setSkillsText(cv.skills.join(', ')); setMode(nextMode); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể mở CV'); } finally { setBusy(false); } };
  const setPersonal = (key: keyof CVPayload['personal_info'], value: string) => setForm(f => ({ ...f, personal_info: { ...f.personal_info, [key]: value } }));
  const updateRow = (section: Section, index: number, key: string, value: string) => setForm(f => ({ ...f, [section]: (f[section] || []).map((row, i) => i === index ? { ...row, [key]: value } : row) }));
  const addRow = (section: Section) => setForm(f => ({ ...f, [section]: [...(f[section] || []), Object.fromEntries(fieldSets[section].map(([key]) => [key, '']))] } as CVPayload));
  const deleteRow = (section: Section, index: number) => setForm(f => ({ ...f, [section]: (f[section] || []).filter((_, i) => i !== index) }));
  const liveCV: CVPayload = { ...form, skills: skillsText.split(',').map(s => s.trim()).filter(Boolean) };
  const save = async (e: FormEvent) => { e.preventDefault(); if (!form.title.trim()) { setError('Vui lòng nhập tên CV'); return; } setBusy(true); setError(''); try { const payload = { ...liveCV, title: form.title.trim() }; if (id === null) await cvService.create(payload); else await cvService.update(id, payload); setNotice(id === null ? 'Tạo CV thành công.' : 'Cập nhật CV thành công.'); setMode('list'); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu CV'); } finally { setBusy(false); } };
  const remove = async (cvId: number) => { if (!window.confirm('Bạn có chắc muốn xóa CV này?')) return; setBusy(true); setError(''); try { await cvService.remove(cvId); setNotice('Đã xóa CV.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xóa CV'); } finally { setBusy(false); } };
  const importCV = async (file?: File) => {
    if (!file) return;
    if (uploadRef.current) uploadRef.current.value = '';
    // Do not overwrite an existing CV: imports always open an unsaved draft.
    if (mode === 'editor' && (form.title.trim() || form.personal_info.full_name || skillsText.trim()) &&
        !window.confirm('Nhập CV mới sẽ thay thế nội dung đang nhập (chưa lưu). Tiếp tục?')) return;
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
        template: ['modern', 'classic', 'minimal'].includes(parsed.template || '') ? parsed.template! : 'modern',
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

  return <div className="cv-builder-page">
    <input ref={uploadRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{display:'none'}} aria-label="Chọn CV PDF hoặc DOCX" onChange={e => void importCV(e.target.files?.[0])}/>
    <div className="page-header"><div><span className="eyebrow blue-eyebrow">HỒ SƠ NGHỀ NGHIỆP</span><h1>{mode === 'list' ? 'CV của tôi' : mode === 'view' ? 'Xem CV' : id === null ? 'Tạo CV mới' : 'Chỉnh sửa CV'}</h1><p>{mode === 'list' ? 'Tạo và quản lý CV trực tiếp trên StudentJob.' : 'Thiết kế CV tiếng Việt và xem trước trên khổ giấy A4.'}</p></div><div className="page-header-action"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => uploadRef.current?.click()}><Upload size={16}/>{busy ? 'Đang đọc CV...' : 'Tải CV có sẵn'}</button>{mode === 'list' ? <button className="btn btn-primary" onClick={newCV}><Plus size={16}/> Tạo CV</button> : <button className="btn btn-outline" onClick={() => setMode('list')}><ArrowLeft size={16}/> Danh sách CV</button>}</div></div>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <p role="status" className="cv-notice">{notice}</p>}{parseWarnings.length > 0 && <div className="cv-import-warnings" role="status"><strong>Thông tin cần kiểm tra:</strong><ul>{parseWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    {mode === 'list' ? <section className="panel"><div className="panel-heading"><h2>Danh sách CV ({items.length})</h2><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => void load()}><RefreshCw size={15}/> Tải lại</button></div>{!items.length ? <p className="muted">{busy ? 'Đang tải CV...' : 'Bạn chưa có CV nào. Hãy chọn “Tạo CV”.'}</p> : <div className="employer-job-list">{items.map(cv => <div className="employer-job-row cv-list-row" key={cv.id}><FileText size={23}/><div className="employer-job-main"><b>{cv.title}</b><span>Mẫu: {cv.template} · #{cv.id}</span></div><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => void openCV(cv.id, 'view')}><Eye size={15}/> Xem</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => void openCV(cv.id, 'editor')}><Pencil size={15}/> Sửa</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => void remove(cv.id)}><Trash2 size={15}/> Xóa</button></div>)}</div>}</section> : <div className="cv-builder-layout">
      {mode === 'editor' && <form id="cv-edit-form" onSubmit={save} className="cv-builder-fields"><section className="panel editor-panel"><h2>Thông tin CV</h2><div className="form-grid"><label className="field-label">Tên CV *<input className="form-control" required maxLength={255} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CV thực tập lập trình viên"/></label><label className="field-label">Mẫu CV<select className="form-control" value={form.template} onChange={e => setForm(f => ({ ...f, template: e.target.value }))}><option value="modern">Hiện đại</option><option value="classic">Cổ điển</option><option value="minimal">Tối giản</option></select></label></div></section>
      <section className="panel editor-panel"><h2>Thông tin cá nhân</h2><div className="form-grid">{([['full_name', 'Họ và tên'], ['email', 'Email'], ['phone', 'Số điện thoại'], ['address', 'Địa chỉ'], ['summary', 'Giới thiệu bản thân']] as const).map(([key, label]) => <label className={`field-label ${key === 'summary' ? 'field-wide' : ''}`} key={key}>{label}{key === 'summary' ? <textarea className="form-control" rows={4} value={form.personal_info[key] || ''} onChange={e => setPersonal(key, e.target.value)}/> : <input className="form-control" type={key === 'email' ? 'email' : 'text'} value={form.personal_info[key] || ''} onChange={e => setPersonal(key, e.target.value)}/>}</label>)}</div></section>
      {(['education', 'experience', 'projects', 'certifications'] as const).map(section => <section className="panel editor-panel" key={section}><div className="panel-heading"><h2>{sectionNames[section]}</h2><button type="button" className="btn btn-outline btn-sm" onClick={() => addRow(section)}><Plus size={15}/> Thêm</button></div>{(form[section] || []).map((row, index) => <div className="cv-row-fields" key={index}><div className="form-grid">{fieldSets[section].map(([key, label]) => <label className="field-label" key={key}>{label}<input className="form-control" value={stringify((row as unknown as Record<string, unknown>)[key])} onChange={e => updateRow(section, index, key, e.target.value)}/></label>)}</div><button type="button" className="btn btn-outline btn-sm" onClick={() => deleteRow(section, index)}><Trash2 size={14}/> Xóa mục</button></div>)}</section>)}
      <section className="panel editor-panel"><h2>Kỹ năng</h2><label className="field-label">Các kỹ năng (ngăn cách bằng dấu phẩy)<input className="form-control" value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="React, TypeScript, MySQL"/></label></section>
      <div className="editor-actions"><button type="button" className="btn btn-outline" onClick={() => setMode('list')}>Hủy</button><button className="btn btn-primary" type="submit" disabled={busy}><Save size={16}/>{busy ? 'Đang lưu...' : 'Lưu CV'}</button></div></form>}
      <div className="cv-preview-side"><div className="cv-preview-toolbar"><strong>Xem trước CV · A4</strong><button type="button" className="btn btn-primary btn-sm" onClick={exportPDF}><FileDown size={16}/> Xuất PDF</button>{mode === 'view' && id !== null && <button className="btn btn-outline btn-sm" onClick={() => setMode('editor')}><Pencil size={15}/> Chỉnh sửa</button>}</div><Preview cv={liveCV}/><p className="muted cv-print-tip">Chọn “Xuất PDF” → trong hộp thoại in, chọn “Save as PDF” hoặc “Microsoft Print to PDF”.</p></div>
    </div>}
  </div>;
}
