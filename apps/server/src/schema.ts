import { z } from "zod";

export const statuses = ["Planning", "In Progress", "On Hold", "Completed"] as const;
export const priorities = ["Low", "Medium", "High"] as const;

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format");

export const projectSchema = z
  .object({
    clientName: z.string().trim().min(1, "Client name is required").max(120),
    projectName: z.string().trim().min(1, "Project name is required").max(160),
    description: z.string().trim().max(2000).default(""),
    status: z.enum(statuses),
    priority: z.enum(priorities),
    startDate: dateField,
    dueDate: dateField,
  })
  .refine((project) => project.dueDate >= project.startDate, {
    message: "Due date cannot be earlier than start date",
    path: ["dueDate"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export interface Project extends ProjectInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}
