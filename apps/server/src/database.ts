import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Project, ProjectInput } from "./schema.js";

const seedProjects: ProjectInput[] = [
  {
    clientName: "Acme Corporation",
    projectName: "Corporate Website Redesign",
    description: "Redesign and modernize the company's corporate website.",
    status: "In Progress",
    priority: "High",
    startDate: "2026-06-01",
    dueDate: "2026-07-15",
  },
  {
    clientName: "GreenLeaf Cafe",
    projectName: "Online Ordering System",
    description: "Develop an online ordering platform for customers.",
    status: "Planning",
    priority: "Medium",
    startDate: "2026-06-10",
    dueDate: "2026-08-01",
  },
  {
    clientName: "Northstar Studio",
    projectName: "Brand Identity Refresh",
    description: "Refresh the visual identity and prepare a reusable brand toolkit.",
    status: "On Hold",
    priority: "Low",
    startDate: "2026-05-12",
    dueDate: "2026-07-30",
  },
  {
    clientName: "Solace Health",
    projectName: "Patient Portal MVP",
    description: "Deliver an accessible portal for appointment and profile management.",
    status: "Completed",
    priority: "High",
    startDate: "2026-03-03",
    dueDate: "2026-05-28",
  },
];

export class ProjectRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath = process.env.DATABASE_PATH ?? "./data/projects.db") {
    if (databasePath !== ":memory:") {
      const absolutePath = resolve(databasePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      databasePath = absolutePath;
    }
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        project_name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK (status IN ('Planning', 'In Progress', 'On Hold', 'Completed')),
        priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
        start_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (due_date >= start_date)
      );
    `);

    const row = this.db.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number };
    if (row.count === 0) seedProjects.forEach((project) => this.create(project));
  }

  list(filters: { search?: string; status?: string; priority?: string; sort?: string }) {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.search) {
      conditions.push("(client_name LIKE :search OR project_name LIKE :search OR description LIKE :search)");
      params.search = `%${filters.search}%`;
    }
    if (filters.status) {
      conditions.push("status = :status");
      params.status = filters.status;
    }
    if (filters.priority) {
      conditions.push("priority = :priority");
      params.priority = filters.priority;
    }

    const sortColumns: Record<string, string> = {
      newest: "created_at DESC",
      dueSoon: "due_date ASC",
      dueLatest: "due_date DESC",
      name: "project_name COLLATE NOCASE ASC",
      priority: "CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END ASC",
    };
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const order = sortColumns[filters.sort ?? "newest"] ?? sortColumns.newest;
    return this.db.prepare(`SELECT * FROM projects ${where} ORDER BY ${order}`).all(params).map(mapProject);
  }

  find(id: number) {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    return row ? mapProject(row) : undefined;
  }

  create(project: ProjectInput) {
    const result = this.db.prepare(`
      INSERT INTO projects (client_name, project_name, description, status, priority, start_date, due_date)
      VALUES (:clientName, :projectName, :description, :status, :priority, :startDate, :dueDate)
    `).run(project);
    return this.find(Number(result.lastInsertRowid))!;
  }

  update(id: number, project: ProjectInput) {
    const result = this.db.prepare(`
      UPDATE projects SET client_name = :clientName, project_name = :projectName,
        description = :description, status = :status, priority = :priority,
        start_date = :startDate, due_date = :dueDate, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `).run({ ...project, id });
    return result.changes ? this.find(id) : undefined;
  }

  delete(id: number) {
    return this.db.prepare("DELETE FROM projects WHERE id = ?").run(id).changes > 0;
  }

  close() {
    this.db.close();
  }
}

function mapProject(row: unknown): Project {
  const value = row as Record<string, unknown>;
  return {
    id: Number(value.id),
    clientName: String(value.client_name),
    projectName: String(value.project_name),
    description: String(value.description),
    status: value.status as Project["status"],
    priority: value.priority as Project["priority"],
    startDate: String(value.start_date),
    dueDate: String(value.due_date),
    createdAt: String(value.created_at),
    updatedAt: String(value.updated_at),
  };
}
