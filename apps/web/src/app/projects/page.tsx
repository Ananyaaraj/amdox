"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, Badge, Button, StatCard, Spinner, Modal, Input, Select } from "@/components/ui";
import toast from "react-hot-toast";

export default function ProjectsPage() {
  const [selected, setSelected] = useState<any>(null);
  
  // Add Project states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Edit Project states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editActualCost, setEditActualCost] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("PLANNING");

  // Add Task states
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstimatedHrs, setTaskEstimatedHrs] = useState("");

  const qc = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<any[]>("/projects"),
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["project", selected?.id],
    queryFn: () => apiGet<any>(`/projects/${selected.id}`),
    enabled: !!selected?.id,
  });

  const createProjectMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/projects", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully!");
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create project");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPut(`/projects/${id}`, payload),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", selected?.id] });
      toast.success("Project updated successfully!");
      setShowEditModal(false);
      setSelected(data);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update project");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => apiPost(`/projects/${selected?.id}/tasks`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", selected?.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Task added successfully!");
      handleCloseAddTaskModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) => apiPut(`/projects/tasks/${taskId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", selected?.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["bi-kpis"] });
      qc.invalidateQueries({ queryKey: ["project-health"] });
      toast.success("Task status updated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update task status");
    },
  });

  function handleCloseModal() {
    setShowAddModal(false);
    setName("");
    setCode("");
    setDescription("");
    setBudget("");
    setActualCost("");
    setStartDate("");
    setEndDate("");
  }

  function handleCreateProject() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!code.trim()) { toast.error("Code is required"); return; }
    if (!budget.trim() || isNaN(Number(budget))) { toast.error("Valid Budget is required"); return; }
    if (!startDate) { toast.error("Start Date is required"); return; }
    if (!endDate) { toast.error("End Date is required"); return; }

    createProjectMutation.mutate({
      name,
      code,
      description: description || undefined,
      budget: Number(budget),
      actualCost: actualCost ? Number(actualCost) : 0,
      startDate,
      endDate,
      status: "ACTIVE",
    });
  }

  function handleOpenEditModal(p: any) {
    setEditName(p.name || "");
    setEditCode(p.code || "");
    setEditDescription(p.description || "");
    setEditBudget(String(p.budget) || "");
    setEditActualCost(String(p.actualCost || ""));
    setEditStartDate(p.startDate ? p.startDate.split("T")[0] : "");
    setEditEndDate(p.endDate ? p.endDate.split("T")[0] : "");
    setEditStatus(p.status || "PLANNING");
    setShowEditModal(true);
  }

  function handleUpdateProject() {
    if (!selected) return;
    if (!editName.trim()) { toast.error("Name is required"); return; }
    if (!editCode.trim()) { toast.error("Code is required"); return; }
    if (!editBudget.trim() || isNaN(Number(editBudget))) { toast.error("Valid Budget is required"); return; }
    if (!editStartDate) { toast.error("Start Date is required"); return; }
    if (!editEndDate) { toast.error("End Date is required"); return; }

    updateProjectMutation.mutate({
      id: selected.id,
      payload: {
        name: editName,
        code: editCode,
        description: editDescription || undefined,
        budget: Number(editBudget),
        actualCost: editActualCost ? Number(editActualCost) : 0,
        startDate: editStartDate,
        endDate: editEndDate,
        status: editStatus,
      },
    });
  }

  function handleCloseAddTaskModal() {
    setShowAddTaskModal(false);
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("MEDIUM");
    setTaskDueDate("");
    setTaskEstimatedHrs("");
  }

  function handleAddTask() {
    if (!selected) return;
    if (!taskTitle.trim()) { toast.error("Task title is required"); return; }

    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDescription || undefined,
      priority: taskPriority,
      dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      estimatedHrs: taskEstimatedHrs ? Number(taskEstimatedHrs) : undefined,
      status: "TODO",
    });
  }

  function handleUpdateTaskStatus(taskId: string, newStatus: string) {
    updateTaskMutation.mutate({
      taskId,
      payload: { status: newStatus },
    });
  }

  if (isLoading) return <Spinner />;

  const active = projects?.filter((p: any) => p.status === "ACTIVE").length || 0;
  const completed = projects?.filter((p: any) => p.status === "COMPLETED").length || 0;
  const overBudget = projects?.filter((p: any) => Number(p.actualCost) > Number(p.budget)).length || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-sm text-muted-foreground">Track milestones, tasks, and budgets</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" /> New Project</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Projects" value={projects?.length || 0} icon={<FolderKanban className="w-4 h-4" />} />
        <StatCard title="Active" value={active} icon={<Clock className="w-4 h-4" />} />
        <StatCard title="Completed" value={completed} icon={<CheckCircle className="w-4 h-4" />} />
        <StatCard title="Over Budget" value={overBudget} icon={<AlertCircle className="w-4 h-4" />} className={overBudget > 0 ? "border-red-200" : ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project List */}
        <div className="lg:col-span-1 space-y-2">
          {projects?.map((p: any) => {
            const budgetPct = (Number(p.actualCost) / Number(p.budget)) * 100;
            return (
              <div key={p.id}
                onClick={() => setSelected(p)}
                className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-sm ${selected?.id === p.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                  </div>
                  <Badge status={p.status} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Budget ({formatCurrency(p.actualCost)} / {formatCurrency(p.budget)})</span>
                    <span className={budgetPct > 100 ? "text-destructive font-semibold" : ""}>{budgetPct.toFixed(0)}% used</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${budgetPct > 100 ? "bg-destructive" : budgetPct > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                  </div>
                  {/* Task Progress Bar */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Task Progress</span>
                    <span>{Number(p.progress || 0).toFixed(0)}% done</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(p.progress || 0, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>{formatDate(p.startDate)}</span>
                    <span>{formatDate(p.endDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Project Detail */}
        <div className="lg:col-span-2">
          {projectDetail ? (
            <Card>
              <div className="p-5 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{projectDetail.name}</h2>
                    <p className="text-sm text-muted-foreground">{projectDetail.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge status={projectDetail.status} />
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(projectDetail)}>Edit Project</Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-semibold">{formatCurrency(projectDetail.budget)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className={`font-semibold ${projectDetail.budgetVariance > 0 ? "text-destructive" : ""}`}>{formatCurrency(projectDetail.actualCost)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Days Left</p>
                    <p className="font-semibold">{Math.max(0, Math.ceil((new Date(projectDetail.endDate).getTime() - Date.now()) / 86400000))}</p>
                  </div>
                </div>

                {/* Quick Budget spent update widget */}
                <div key={projectDetail.id} className="mt-4 p-4 border rounded-xl bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-medium">Update Spent Budget</h4>
                    <p className="text-xs text-muted-foreground">Directly log or adjust the actual cost spent on this project</p>
                  </div>
                  <div className="flex items-center gap-2 max-w-xs w-full sm:w-auto">
                    <Input
                      type="number"
                      placeholder="Actual spent cost..."
                      defaultValue={projectDetail.actualCost}
                      id="quick-actual-cost"
                      className="h-9 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const val = (document.getElementById("quick-actual-cost") as HTMLInputElement)?.value;
                        if (val !== undefined && val !== "" && !isNaN(Number(val))) {
                          updateProjectMutation.mutate({
                            id: projectDetail.id,
                            payload: {
                              ...projectDetail,
                              actualCost: Number(val)
                            }
                          });
                        } else {
                          toast.error("Please enter a valid spent amount");
                        }
                      }}
                      loading={updateProjectMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Tasks ({projectDetail.tasks?.length || 0})</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTaskModal(true)}>+ Add Task</Button>
                  </div>
                  <div className="space-y-2">
                    {projectDetail.tasks && projectDetail.tasks.length > 0 ? (
                      projectDetail.tasks.slice(0, 8).map((t: any) => (
                        <div key={t.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-b-0 last:pb-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "DONE" ? "bg-green-500" : t.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-muted-foreground"}`} />
                          <span className={t.status === "DONE" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                          <Badge status={t.priority} label={t.priority} className="text-xs" />
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                            className="ml-auto px-2 py-1 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="DONE">Done</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground py-4 text-center">No tasks yet. Click "+ Add Task" to create one.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                Select a project to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showAddModal} onClose={handleCloseModal} title="New Project">
        <div className="space-y-4">
          <Input label="Project Name *" placeholder="ERP Phase 3" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Project Code *" placeholder="PRJ002" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input label="Budget (USD) *" type="number" placeholder="100000" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <Input label="Actual Cost (USD)" type="number" placeholder="0" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
          </div>
          <Input label="Description" placeholder="Project details..." value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date *" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleCreateProject} loading={createProjectMutation.isPending}>Create Project</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project">
        <div className="space-y-4">
          <Input label="Project Name *" placeholder="ERP Phase 3" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Project Code *" placeholder="PRJ002" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            <Input label="Budget (USD) *" type="number" placeholder="100000" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
            <Input label="Actual Cost (USD) *" type="number" placeholder="0" value={editActualCost} onChange={(e) => setEditActualCost(e.target.value)} />
          </div>
          <Input label="Description" placeholder="Project details..." value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date *" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
            <Input label="End Date *" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
          </div>
          <Select 
            label="Status" 
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            options={[
              { value: "PLANNING", label: "Planning" },
              { value: "ACTIVE", label: "Active" },
              { value: "ON_HOLD", label: "On Hold" },
              { value: "COMPLETED", label: "Completed" },
              { value: "CANCELLED", label: "Cancelled" }
            ]} 
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject} loading={updateProjectMutation.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal open={showAddTaskModal} onClose={handleCloseAddTaskModal} title="Add Task">
        <div className="space-y-4">
          <Input label="Task Title *" placeholder="Implement OAuth Flow" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <Input label="Description" placeholder="Task description..." value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Priority" 
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "CRITICAL", label: "Critical" }
              ]} 
            />
            <Input label="Due Date" type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
          </div>
          <Input label="Estimated Hours" type="number" placeholder="8" value={taskEstimatedHrs} onChange={(e) => setTaskEstimatedHrs(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseAddTaskModal}>Cancel</Button>
            <Button onClick={handleAddTask} loading={createTaskMutation.isPending}>Add Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
