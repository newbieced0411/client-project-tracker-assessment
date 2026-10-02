import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ProjectRepository } from "./database.js";
import { priorities, projectSchema, statuses } from "./schema.js";

export function createApp(repository = new ProjectRepository()) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

  app.get("/api/projects", (request, response) => {
    const search = typeof request.query.search === "string" ? request.query.search.trim() : undefined;
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    const priority = typeof request.query.priority === "string" ? request.query.priority : undefined;
    const sort = typeof request.query.sort === "string" ? request.query.sort : undefined;

    if (status && !statuses.includes(status as (typeof statuses)[number])) {
      return response.status(400).json({ error: "Invalid status filter" });
    }
    if (priority && !priorities.includes(priority as (typeof priorities)[number])) {
      return response.status(400).json({ error: "Invalid priority filter" });
    }
    response.json({ data: repository.list({ search, status, priority, sort }) });
  });

  app.get("/api/projects/:id", (request, response) => {
    const project = repository.find(parseId(request.params.id));
    if (!project) return response.status(404).json({ error: "Project not found" });
    response.json({ data: project });
  });

  app.post("/api/projects", (request, response) => {
    const project = repository.create(projectSchema.parse(request.body));
    response.status(201).json({ data: project });
  });

  app.put("/api/projects/:id", (request, response) => {
    const project = repository.update(parseId(request.params.id), projectSchema.parse(request.body));
    if (!project) return response.status(404).json({ error: "Project not found" });
    response.json({ data: project });
  });

  app.delete("/api/projects/:id", (request, response) => {
    if (!repository.delete(parseId(request.params.id))) {
      return response.status(404).json({ error: "Project not found" });
    }
    response.status(204).send();
  });

  const clientDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  if (existsSync(clientDirectory)) {
    app.use(express.static(clientDirectory));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/")) return next();
      response.sendFile(join(clientDirectory, "index.html"));
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      return response.status(422).json({
        error: "Validation failed",
        details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      });
    }
    if (error instanceof SyntaxError) return response.status(400).json({ error: "Invalid JSON body" });
    console.error(error);
    response.status(500).json({ error: "An unexpected error occurred" });
  });

  return app;
}

function parseId(value: string | string[] | undefined) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : -1;
}
