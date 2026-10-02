import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "./api";
import { priorities, statuses, type Project, type ProjectInput, type Status } from "./types";

const emptyProject: ProjectInput = {
  clientName: "",
  projectName: "",
  description: "",
  status: "Planning",
  priority: "Medium",
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
};

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState<Project | null | "new">(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [toast, setToast] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProjects(await api.list({ search, status, priority, sort }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, sort]);

  useEffect(() => {
    const timeout = window.setTimeout(loadProjects, search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadProjects, search]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.status === "In Progress").length,
    dueSoon: projects.filter((project) => {
      const days = (new Date(`${project.dueDate}T00:00:00`).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 14 && project.status !== "Completed";
    }).length,
  }), [projects]);

  async function removeProject() {
    if (!deleting) return;
    try {
      await api.delete(deleting.id);
      setDeleting(null);
      setToast("Project deleted");
      await loadProjects();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete project.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Folio home">
          <span className="brand-mark"><span /></span>
          <span>folio</span>
        </a>
        <div className="topbar-meta">
          <span className="eyebrow">Agency workspace</span>
          <span className="avatar" aria-hidden="true">PM</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="section-label">PROJECT OVERVIEW</p>
            <h1>Keep good work<br /><em>moving forward.</em></h1>
            <p className="hero-copy">A clear view of every client engagement, from first brief to final handoff.</p>
          </div>
          <button className="primary-button hero-action" onClick={() => setEditing("new")}>
            <Plus size={18} /> New project
          </button>
        </section>

        <section className="stat-strip" aria-label="Project summary">
          <Stat icon={<LayoutGrid />} value={stats.total} label="Projects shown" />
          <Stat icon={<Clock3 />} value={stats.active} label="In progress" />
          <Stat icon={<CalendarDays />} value={stats.dueSoon} label="Due in 14 days" />
          <div className="stat-callout">
            <span>Last updated</span>
            <strong>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date())}</strong>
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <p className="section-label">THE WORK</p>
              <h2>Client projects</h2>
            </div>
            <span className="result-count">{projects.length} {projects.length === 1 ? "result" : "results"}</span>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <Search size={18} />
              <span className="sr-only">Search projects</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or clients…" />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
            </label>
            <Select value={status} onChange={setStatus} label="All statuses" options={statuses} />
            <Select value={priority} onChange={setPriority} label="All priorities" options={priorities} />
            <Select
              value={sort}
              onChange={setSort}
              label="Sort projects"
              options={["newest", "dueSoon", "dueLatest", "name", "priority"]}
              display={{ newest: "Newest", dueSoon: "Due soon", dueLatest: "Due latest", name: "Project name", priority: "Priority" }}
            />
          </div>

          {error && <div className="error-banner"><CircleAlert size={18} /> {error}<button onClick={() => setError("")}><X size={16} /></button></div>}

          {loading ? (
            <div className="state-panel"><LoaderCircle className="spin" /><p>Gathering your projects…</p></div>
          ) : projects.length === 0 ? (
            <div className="state-panel empty-state">
              <span className="empty-icon"><ListFilter /></span>
              <h3>No projects found</h3>
              <p>Try clearing a filter, or create a new project to get started.</p>
              <button className="text-button" onClick={() => { setSearch(""); setStatus(""); setPriority(""); }}>Clear filters</button>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} onEdit={() => setEditing(project)} onDelete={() => setDeleting(project)} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer><span>Folio project tracker</span><span>Built for focused teams.</span></footer>

      {editing && (
        <ProjectDialog
          project={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async (message) => { setEditing(null); setToast(message); await loadProjects(); }}
        />
      )}

      {deleting && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleting(null)}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <span className="danger-icon"><Trash2 /></span>
            <p className="section-label">DELETE PROJECT</p>
            <h2 id="delete-title">Remove “{deleting.projectName}”?</h2>
            <p>This action is permanent. The project and its details will be removed from the workspace.</p>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setDeleting(null)}>Keep project</button>
              <button className="danger-button" onClick={removeProject}>Delete project</button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={17} /> {toast}</div>}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="stat"><span className="stat-icon">{icon}</span><strong>{value.toString().padStart(2, "0")}</strong><span>{label}</span></div>;
}

function Select({ value, onChange, label, options, display = {} }: { value: string; onChange: (value: string) => void; label: string; options: readonly string[]; display?: Record<string, string> }) {
  return (
    <label className="select-field">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {!value && <option value="">{label}</option>}
        {options.map((option) => <option key={option} value={option}>{display[option] ?? option}</option>)}
      </select>
      <ChevronDown size={15} />
    </label>
  );
}

function ProjectCard({ project, index, onEdit, onDelete }: { project: Project; index: number; onEdit: () => void; onDelete: () => void }) {
  const overdue = project.status !== "Completed" && new Date(`${project.dueDate}T23:59:59`) < new Date();
  return (
    <article className="project-card" style={{ animationDelay: `${index * 45}ms` }}>
      <div className="card-accent" data-priority={project.priority} />
      <div className="card-topline">
        <span className={`status status-${slug(project.status)}`}><i />{project.status}</span>
        <span className={`priority priority-${project.priority.toLowerCase()}`}>{project.priority}</span>
      </div>
      <div className="card-main">
        <span className="client-name">{project.clientName}</span>
        <h3>{project.projectName}</h3>
        <p>{project.description || "No project description provided."}</p>
      </div>
      <div className="card-footer">
        <div className={overdue ? "date-block overdue" : "date-block"}>
          <span>{overdue ? "Overdue" : "Due date"}</span>
          <strong>{formatDate(project.dueDate)}</strong>
        </div>
        <div className="card-actions">
          <button onClick={onEdit} aria-label={`Edit ${project.projectName}`}><Pencil size={16} /></button>
          <button className="delete-action" onClick={onDelete} aria-label={`Delete ${project.projectName}`}><Trash2 size={16} /></button>
        </div>
      </div>
    </article>
  );
}

function ProjectDialog({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState<ProjectInput>(project ?? emptyProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof ProjectInput>(field: K, value: ProjectInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.dueDate < form.startDate) {
      setError("Due date cannot be earlier than start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (project) await api.update(project.id, form);
      else await api.create(form);
      await onSaved(project ? "Project updated" : "Project created");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save project.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="dialog-header">
          <div><p className="section-label">{project ? "EDIT PROJECT" : "NEW PROJECT"}</p><h2 id="form-title">{project ? "Refine the details." : "Set the work in motion."}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <form onSubmit={submit}>
          {error && <div className="form-error"><CircleAlert size={17} />{error}</div>}
          <div className="form-grid">
            <Field label="Client name" required><input autoFocus value={form.clientName} onChange={(e) => update("clientName", e.target.value)} maxLength={120} required placeholder="e.g. Acme Corporation" /></Field>
            <Field label="Project name" required><input value={form.projectName} onChange={(e) => update("projectName", e.target.value)} maxLength={160} required placeholder="e.g. Website redesign" /></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => update("status", e.target.value as Status)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => update("priority", e.target.value as ProjectInput["priority"])}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Start date" required><input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} required /></Field>
            <Field label="Due date" required><input type="date" value={form.dueDate} min={form.startDate} onChange={(e) => update("dueDate", e.target.value)} required /></Field>
            <Field label="Description" wide><textarea value={form.description} onChange={(e) => update("description", e.target.value)} maxLength={2000} rows={4} placeholder="A concise note about the scope and outcome…" /></Field>
          </div>
          <div className="dialog-actions form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}{saving ? "Saving…" : project ? "Save changes" : "Create project"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "field field-wide" : "field"}><span>{label}{required && <b>*</b>}</span>{children}</label>;
}

function slug(value: string) { return value.toLowerCase().replaceAll(" ", "-"); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
