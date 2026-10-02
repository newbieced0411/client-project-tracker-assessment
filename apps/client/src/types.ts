export const statuses = ["Planning", "In Progress", "On Hold", "Completed"] as const;
export const priorities = ["Low", "Medium", "High"] as const;
export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];

export interface ProjectInput {
  clientName: string;
  projectName: string;
  description: string;
  status: Status;
  priority: Priority;
  startDate: string;
  dueDate: string;
}

export interface Project extends ProjectInput {
  id: number;
  createdAt: string;
  updatedAt: string;
  subtaskCount: number;
  completedSubtaskCount: number;
}

export interface SubtaskInput {
  title: string;
  completed: boolean;
  dueDate: string | null;
}

export interface Subtask extends SubtaskInput {
  id: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}
