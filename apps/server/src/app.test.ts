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
});
