import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { ProjectRepository } from "./database.js";

describe("projects API", () => {
  let repository: ProjectRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new ProjectRepository(":memory:");
    app = createApp(repository);
  });
  afterEach(() => repository.close());

  it("lists seeded projects and filters them", async () => {
    const allProjects = await request(app).get("/api/projects");
    expect(allProjects.body.data).toHaveLength(12);

    const response = await request(app).get("/api/projects?status=Planning&search=GreenLeaf");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].projectName).toBe("Online Ordering System");
  });

  it("creates, reads, updates, and deletes a project", async () => {
    const input = {
      clientName: "Koda Labs",
      projectName: "Launch Campaign",
      description: "Launch assets and measurement plan.",
      status: "Planning",
      priority: "High",
      startDate: "2026-10-05",
      dueDate: "2026-11-01",
    };
    const created = await request(app).post("/api/projects").send(input);
    expect(created.status).toBe(201);

    const id = created.body.data.id;
    expect((await request(app).get(`/api/projects/${id}`)).status).toBe(200);
    const updated = await request(app).put(`/api/projects/${id}`).send({ ...input, status: "In Progress" });
    expect(updated.body.data.status).toBe("In Progress");
    expect((await request(app).delete(`/api/projects/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/projects/${id}`)).status).toBe(404);
  });

  it("returns field-level validation errors", async () => {
    const response = await request(app).post("/api/projects").send({
      clientName: "",
      projectName: "Invalid dates",
      description: "",
      status: "Unknown",
      priority: "High",
      startDate: "2026-11-01",
      dueDate: "2026-10-01",
    });
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation failed");
    expect(response.body.details.length).toBeGreaterThanOrEqual(2);
  });

  it("manages project subtasks and reports progress", async () => {
    const created = await request(app).post("/api/projects/1/subtasks").send({
      title: "Review responsive layouts",
      completed: false,
      dueDate: "2026-07-01",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.projectId).toBe(1);

    const subtaskId = created.body.data.id;
    const updated = await request(app).put(`/api/subtasks/${subtaskId}`).send({
      title: "Review responsive layouts",
      completed: true,
      dueDate: "2026-07-01",
    });
    expect(updated.body.data.completed).toBe(true);

    const project = await request(app).get("/api/projects/1");
    expect(project.body.data.subtaskCount).toBe(1);
    expect(project.body.data.completedSubtaskCount).toBe(1);

    expect((await request(app).delete(`/api/subtasks/${subtaskId}`)).status).toBe(204);
    expect((await request(app).get("/api/projects/1/subtasks")).body.data).toHaveLength(0);
  });
});
