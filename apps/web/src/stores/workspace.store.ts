import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings?: Record<string, unknown>;
}

interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  
  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      currentWorkspace: null,
      projects: [],
      currentProject: null,
      isLoading: false,
      
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),
      updateWorkspace: (id, data) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...data } : w
          ),
          currentWorkspace:
            state.currentWorkspace?.id === id
              ? { ...state.currentWorkspace, ...data }
              : state.currentWorkspace,
        })),
      removeWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          currentWorkspace:
            state.currentWorkspace?.id === id ? null : state.currentWorkspace,
        })),
      
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...data }
              : state.currentProject,
        })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'soothsayer-workspace',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        currentProject: state.currentProject,
      }),
    }
  )
);
