import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Project, ProjectInput, Subtask, SubtaskInput } from "./schema.js";

const seedProjects: Array<ProjectInput & { id: number }> = [
  {
    id: 1,
    clientName: "Acme Corporation",
    projectName: "Corporate Website Redesign",
    description: "Redesign and modernize the company's corporate website.",
    status: "In Progress",
    priority: "High",
    startDate: "2026-06-01",
    dueDate: "2026-07-15",
  },
  {
    id: 2,
    clientName: "GreenLeaf Cafe",
    projectName: "Online Ordering System",
    description: "Develop an online ordering platform for customers.",
    status: "Planning",
    priority: "Medium",
    startDate: "2026-06-10",
    dueDate: "2026-08-01",
  },
  {
    id: 3,
    clientName: "Bright Realty",
    projectName: "Property Listing Portal",
    description: "Build a portal for managing property listings.",
    status: "On Hold",
    priority: "Medium",
    startDate: "2026-05-15",
    dueDate: "2026-07-30",
  },
  {
    id: 4,
    clientName: "Nova Fitness",
    projectName: "Mobile App MVP",
    description: "Develop the first version of the fitness tracking app.",
    status: "In Progress",
    priority: "High",
    startDate: "2026-06-05",
    dueDate: "2026-08-20",
  },
  {
    id: 5, clientName: "Blue Ocean Travel", projectName: "Booking Platform Enhancement",
    description: "Improve search and booking functionalities.", status: "Completed", priority: "Medium",
    startDate: "2026-04-01", dueDate: "2026-05-30",
  },
  {
    id: 6, clientName: "TechVision Solutions", projectName: "CRM Dashboard",
    description: "Develop an internal CRM dashboard.", status: "Planning", priority: "High",
    startDate: "2026-06-15", dueDate: "2026-08-15",
  },
  {
    id: 7, clientName: "Urban Living", projectName: "Property Management System",
    description: "Create a platform for managing rental properties.", status: "In Progress", priority: "Medium",
    startDate: "2026-05-20", dueDate: "2026-08-10",
  },
  {
    id: 8, clientName: "Elite Events", projectName: "Event Registration Portal",
    description: "Develop a registration and ticketing portal.", status: "Planning", priority: "Low",
    startDate: "2026-06-20", dueDate: "2026-09-01",
  },
  {
    id: 9, clientName: "HealthFirst Clinic", projectName: "Patient Appointment System",
    description: "Build an appointment scheduling application.", status: "Completed", priority: "High",
    startDate: "2026-03-01", dueDate: "2026-05-01",
  },
  {
    id: 10, clientName: "MarketPro", projectName: "Marketing Campaign Dashboard",
    description: "Track and manage digital marketing campaigns.", status: "In Progress", priority: "Medium",
    startDate: "2026-06-01", dueDate: "2026-07-31",
  },
  {
    id: 11, clientName: "Sunrise Education", projectName: "Learning Management Portal",
    description: "Develop a portal for students and instructors.", status: "Planning", priority: "High",
    startDate: "2026-07-01", dueDate: "2026-09-30",
  },
  {
    id: 12, clientName: "FreshFarm", projectName: "Inventory Management System",
    description: "Track inventory across multiple locations.", status: "On Hold", priority: "Low",
    startDate: "2026-05-01", dueDate: "2026-08-01",
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
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        due_date TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_subtasks_project_id ON subtasks(project_id);
    `);

    this.seedAssessmentProjects();
  }

  private seedAssessmentProjects() {
    const insert = this.db.prepare(`
      INSERT INTO projects (id, client_name, project_name, description, status, priority, start_date, due_date)
      VALUES (:id, :clientName, :projectName, :description, :status, :priority, :startDate, :dueDate)
    `);
    const replaceLegacy = this.db.prepare(`
      UPDATE projects SET client_name = :clientName, project_name = :projectName,
        description = :description, status = :status, priority = :priority,
        start_date = :startDate, due_date = :dueDate, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `);
    const legacyClients: Record<number, string> = { 3: "Northstar Studio", 4: "Solace Health" };

    this.db.exec("BEGIN");
    try {
      for (const project of seedProjects) {
        const existing = this.db.prepare("SELECT client_name FROM projects WHERE id = ?").get(project.id) as { client_name: string } | undefined;
        if (!existing) insert.run(project);
        else if (legacyClients[project.id] === existing.client_name) replaceLegacy.run(project);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
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
      newest: "projects.created_at DESC",
      dueSoon: "projects.due_date ASC",
      dueLatest: "projects.due_date DESC",
      name: "projects.project_name COLLATE NOCASE ASC",
      priority: "CASE projects.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END ASC",
    };
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const order = sortColumns[filters.sort ?? "newest"] ?? sortColumns.newest;
    return this.db.prepare(`
      SELECT projects.*,
        COUNT(subtasks.id) AS subtask_count,
        COALESCE(SUM(CASE WHEN subtasks.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_subtask_count
      FROM projects LEFT JOIN subtasks ON subtasks.project_id = projects.id
      ${where} GROUP BY projects.id ORDER BY ${order}
    `).all(params).map(mapProject);
  }

  find(id: number) {
    const row = this.db.prepare(`
      SELECT projects.*,
        COUNT(subtasks.id) AS subtask_count,
        COALESCE(SUM(CASE WHEN subtasks.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_subtask_count
      FROM projects LEFT JOIN subtasks ON subtasks.project_id = projects.id
      WHERE projects.id = ? GROUP BY projects.id
    `).get(id);
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

  listSubtasks(projectId: number) {
    return this.db.prepare("SELECT * FROM subtasks WHERE project_id = ? ORDER BY completed ASC, due_date IS NULL, due_date ASC, created_at ASC")
      .all(projectId).map(mapSubtask);
  }

  createSubtask(projectId: number, subtask: SubtaskInput) {
    const result = this.db.prepare(`
      INSERT INTO subtasks (project_id, title, completed, due_date)
      VALUES (:projectId, :title, :completed, :dueDate)
    `).run({ ...subtask, projectId, completed: subtask.completed ? 1 : 0 });
    return this.findSubtask(Number(result.lastInsertRowid))!;
  }

  findSubtask(id: number) {
    const row = this.db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id);
    return row ? mapSubtask(row) : undefined;
  }

  updateSubtask(id: number, subtask: SubtaskInput) {
    const result = this.db.prepare(`
      UPDATE subtasks SET title = :title, completed = :completed,
        due_date = :dueDate, updated_at = CURRENT_TIMESTAMP WHERE id = :id
    `).run({ ...subtask, id, completed: subtask.completed ? 1 : 0 });
    return result.changes ? this.findSubtask(id) : undefined;
  }

  deleteSubtask(id: number) {
    return this.db.prepare("DELETE FROM subtasks WHERE id = ?").run(id).changes > 0;
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
    subtaskCount: Number(value.subtask_count ?? 0),
    completedSubtaskCount: Number(value.completed_subtask_count ?? 0),
  };
}

function mapSubtask(row: unknown): Subtask {
  const value = row as Record<string, unknown>;
  return {
    id: Number(value.id),
    projectId: Number(value.project_id),
    title: String(value.title),
    completed: Boolean(value.completed),
    dueDate: value.due_date ? String(value.due_date) : null,
    createdAt: String(value.created_at),
    updatedAt: String(value.updated_at),
  };
}
