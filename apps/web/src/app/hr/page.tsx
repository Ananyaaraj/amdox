"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Clock, Calendar, DollarSign } from "lucide-react";
import { apiGet, apiPost, apiPut, apiPatch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, StatCard, Table, Spinner, Modal, Input, Select } from "@/components/ui";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

export default function HrPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"employees" | "leaves" | "payroll" | "attendance">("employees");

  useEffect(() => {
    if (user?.role === "VIEWER" && tab === "employees") {
      setTab("leaves");
    }
  }, [user, tab]);
  
  // Add Employee states
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");

  // Edit Employee states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmployeeNumber, setEditEmployeeNumber] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editBaseSalary, setEditBaseSalary] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("FULL_TIME");

  // Leave Application states
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Attendance states
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockType, setClockType] = useState<"IN" | "OUT">("IN");
  const [clockEmployeeId, setClockEmployeeId] = useState("");

  const qc = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiGet<any[]>("/hr/employees"),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiGet<any[]>("/hr/departments"),
  });

  const { data: payrollRuns } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: () => apiGet<any[]>("/hr/payroll/runs"),
  });

  const { data: leaves } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => apiGet<any[]>("/hr/leaves"),
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => apiGet<any[]>("/hr/attendance"),
  });

  const myEmployee = employees?.find((e: any) => e.email === user?.email);

  const visibleLeaves = user?.role === "VIEWER"
    ? leaves?.filter((l: any) => l.employeeId === myEmployee?.id)
    : leaves;

  const visibleAttendance = user?.role === "VIEWER"
    ? attendance?.filter((att: any) => att.employeeId === myEmployee?.id)
    : attendance;

  const runPayrollMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      return apiPost("/hr/payroll/run", {
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        startDate: start,
        endDate: end,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll-runs"] }); toast.success("Payroll run started!"); },
    onError: () => toast.error("Failed to start payroll"),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/hr/employees", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added successfully!");
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to add employee");
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPut(`/hr/employees/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully!");
      handleCloseEditModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update employee");
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: string; payload: any }) =>
      apiPost(`/hr/employees/${employeeId}/leaves`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave application submitted!");
      handleCloseLeaveModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit leave application");
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      apiPatch(`/hr/leaves/${id}/approve`, { approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave request status updated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update leave status");
    },
  });

  const clockInMutation = useMutation({
    mutationFn: (employeeId: string) => apiPost("/hr/attendance/clock-in", { employeeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Clocked in successfully!");
      setShowClockModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to clock in");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (employeeId: string) => apiPost("/hr/attendance/clock-out", { employeeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Clocked out successfully!");
      setShowClockModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to clock out");
    },
  });

  function handleCloseModal() {
    setShowAddModal(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setEmployeeNumber("");
    setJobTitle("");
    setDepartmentId("");
    setBaseSalary("");
    setEmploymentType("FULL_TIME");
  }

  function handleAddEmployee() {
    if (!firstName.trim() || !lastName.trim()) { toast.error("First Name and Last Name are required"); return; }
    if (!email.trim()) { toast.error("Email is required"); return; }
    if (!employeeNumber.trim()) { toast.error("Employee ID is required"); return; }
    if (!jobTitle.trim()) { toast.error("Job Title is required"); return; }
    if (!baseSalary.trim() || isNaN(Number(baseSalary))) { toast.error("Valid Base Salary is required"); return; }

    createEmployeeMutation.mutate({
      firstName,
      lastName,
      email,
      employeeNumber,
      jobTitle,
      departmentId: departmentId || undefined,
      baseSalary: Number(baseSalary),
      employmentType,
      startDate: new Date().toISOString().split("T")[0],
    });
  }

  function handleOpenEditModal(emp: any) {
    setEditingEmployee(emp);
    setEditFirstName(emp.firstName || "");
    setEditLastName(emp.lastName || "");
    setEditEmail(emp.email || "");
    setEditEmployeeNumber(emp.employeeNumber || "");
    setEditJobTitle(emp.jobTitle || "");
    setEditDepartmentId(emp.departmentId || "");
    setEditBaseSalary(String(emp.baseSalary) || "");
    setEditEmploymentType(emp.employmentType || "FULL_TIME");
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setShowEditModal(false);
    setEditingEmployee(null);
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setEditEmployeeNumber("");
    setEditJobTitle("");
    setEditDepartmentId("");
    setEditBaseSalary("");
    setEditEmploymentType("FULL_TIME");
  }

  function handleCloseLeaveModal() {
    setShowApplyLeaveModal(false);
    setLeaveEmployeeId("");
    setLeaveType("ANNUAL");
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveReason("");
  }

  function handleApplyLeave() {
    if (!leaveEmployeeId) { toast.error("Employee is required"); return; }
    if (!leaveStartDate) { toast.error("Start Date is required"); return; }
    if (!leaveEndDate) { toast.error("End Date is required"); return; }

    applyLeaveMutation.mutate({
      employeeId: leaveEmployeeId,
      payload: {
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason || undefined,
      },
    });
  }

  function handleClockAction() {
    if (!clockEmployeeId) { toast.error("Employee is required"); return; }
    if (clockType === "IN") {
      clockInMutation.mutate(clockEmployeeId);
    } else {
      clockOutMutation.mutate(clockEmployeeId);
    }
  }

  function handleUpdateEmployee() {
    if (!editingEmployee) return;
    if (!editFirstName.trim() || !editLastName.trim()) { toast.error("First Name and Last Name are required"); return; }
    if (!editEmail.trim()) { toast.error("Email is required"); return; }
    if (!editEmployeeNumber.trim()) { toast.error("Employee ID is required"); return; }
    if (!editJobTitle.trim()) { toast.error("Job Title is required"); return; }
    if (!editBaseSalary.trim() || isNaN(Number(editBaseSalary))) { toast.error("Valid Base Salary is required"); return; }

    updateEmployeeMutation.mutate({
      id: editingEmployee.id,
      payload: {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        employeeNumber: editEmployeeNumber,
        jobTitle: editJobTitle,
        departmentId: editDepartmentId || undefined,
        baseSalary: Number(editBaseSalary),
        employmentType: editEmploymentType,
      },
    });
  }

  function openApplyLeaveModal() {
    if (user?.role === "VIEWER" && myEmployee) {
      setLeaveEmployeeId(myEmployee.id);
    }
    setShowApplyLeaveModal(true);
  }

  function openClockModal(type: "IN" | "OUT") {
    setClockType(type);
    if (user?.role === "VIEWER" && myEmployee) {
      setClockEmployeeId(myEmployee.id);
    }
    setShowClockModal(true);
  }

  if (isLoading) return <Spinner />;

  const activeCount = employees?.filter((e: any) => e.status === "ACTIVE").length || 0;
  const deptCount = departments?.length || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Payroll</h1>
          <p className="text-sm text-muted-foreground">Employee lifecycle, attendance, and payroll</p>
        </div>
        {user?.role !== "VIEWER" && (
          <div className="flex gap-2">
            {tab === "payroll" && (
              <Button variant="secondary" onClick={() => runPayrollMutation.mutate()} loading={runPayrollMutation.isPending}>
                <DollarSign className="w-4 h-4" /> Run Payroll
              </Button>
            )}
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" /> Add Employee
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Employees" value={activeCount} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Departments" value={deptCount} icon={<Clock className="w-4 h-4" />} />
        <StatCard title="Payroll Runs" value={payrollRuns?.length || 0} icon={<DollarSign className="w-4 h-4" />} />
        <StatCard title="This Month" value={formatCurrency(
          payrollRuns?.[0]?.totalNet || 0
        )} icon={<Calendar className="w-4 h-4" />} />
      </div>

      <div className="flex gap-1 border-b">
        {(["employees", "leaves", "payroll", "attendance"] as const)
          .filter((t) => !(user?.role === "VIEWER" && (t === "employees" || t === "payroll")))
          .map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
      </div>

      {tab === "employees" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Employee</th><th>ID</th><th>Department</th><th>Title</th><th>Salary</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {employees?.map((emp: any) => (
                  <tr key={emp.id}>
                    <td>
                      <div>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{emp.employeeNumber}</td>
                    <td>{emp.department?.name || "—"}</td>
                    <td>{emp.jobTitle}</td>
                    <td className="font-semibold">{formatCurrency(emp.baseSalary, emp.currency)}</td>
                    <td><Badge status={emp.status} /></td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(emp)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "leaves" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leave Requests</CardTitle>
            <Button size="sm" onClick={openApplyLeaveModal}>
              <Plus className="w-3 h-3" /> Apply Leave
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeaves?.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-medium">
                      {l.employee?.firstName} {l.employee?.lastName}
                    </td>
                    <td><Badge status={l.leaveType} label={l.leaveType} /></td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td className="font-semibold">{Number(l.days)}</td>
                    <td className="max-w-xs truncate">{l.reason || "—"}</td>
                    <td><Badge status={l.status} /></td>
                    <td>
                      {user?.role !== "VIEWER" && l.status === "PENDING" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => approveLeaveMutation.mutate({ id: l.id, approved: true })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => approveLeaveMutation.mutate({ id: l.id, approved: false })}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!visibleLeaves?.length && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-8">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendance Log</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => openClockModal("IN")}>
                Clock In
              </Button>
              <Button size="sm" onClick={() => openClockModal("OUT")}>
                Clock Out
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Hours Worked</th>
                  <th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {visibleAttendance?.map((att: any) => (
                  <tr key={att.id}>
                    <td className="font-medium">
                      {att.employee?.firstName} {att.employee?.lastName}
                    </td>
                    <td>{formatDate(att.date)}</td>
                    <td className="font-mono text-xs">{att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : "—"}</td>
                    <td className="font-mono text-xs">{att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : "—"}</td>
                    <td className="font-semibold">{att.hoursWorked !== null ? `${Number(att.hoursWorked).toFixed(2)} hrs` : "—"}</td>
                    <td>{att.overtime !== null && Number(att.overtime) > 0 ? (
                      <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs font-semibold">
                        +{Number(att.overtime).toFixed(2)} hrs
                      </span>
                    ) : "—"}</td>
                  </tr>
                ))}
                {!visibleAttendance?.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      No attendance logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "payroll" && (
        <Card>
          <CardHeader><CardTitle>Payroll History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Period</th><th>Employees</th><th>Gross Total</th><th>Net Total</th><th>Status</th><th>Processed</th></tr>
              </thead>
              <tbody>
                {payrollRuns?.map((run: any) => (
                  <tr key={run.id}>
                    <td className="font-medium">{run.period}</td>
                    <td>{run.employees?.length || 0}</td>
                    <td>{formatCurrency(run.totalGross)}</td>
                    <td className="font-semibold">{formatCurrency(run.totalNet)}</td>
                    <td><Badge status={run.status} /></td>
                    <td>{run.processedAt ? formatDate(run.processedAt) : "—"}</td>
                  </tr>
                ))}
                {!payrollRuns?.length && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No payroll runs yet. Click "Run Payroll" to start.</td></tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={showAddModal} onClose={handleCloseModal} title="Add Employee">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" placeholder="Rajesh" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last Name *" placeholder="Kumar" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label="Email *" type="email" placeholder="rajesh@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID *" placeholder="EMP004" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
            <Input label="Job Title *" placeholder="Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Department" 
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[
                { value: "", label: "Select Department..." },
                ...(departments?.map((d: any) => ({ value: d.id, label: d.name })) || [])
              ]} 
            />
            <Select 
              label="Employment Type" 
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              options={[
                { value: "FULL_TIME", label: "Full Time" },
                { value: "PART_TIME", label: "Part Time" },
                { value: "CONTRACT", label: "Contract" },
                { value: "INTERN", label: "Intern" }
              ]} 
            />
          </div>
          <Input label="Base Salary (USD) *" type="number" placeholder="75000" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleAddEmployee} loading={createEmployeeMutation.isPending}>Add Employee</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={handleCloseEditModal} title="Edit Employee">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name *" placeholder="Rajesh" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            <Input label="Last Name *" placeholder="Kumar" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
          </div>
          <Input label="Email *" type="email" placeholder="rajesh@company.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID *" placeholder="EMP004" value={editEmployeeNumber} onChange={(e) => setEditEmployeeNumber(e.target.value)} />
            <Input label="Job Title *" placeholder="Software Engineer" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Department" 
              value={editDepartmentId}
              onChange={(e) => setEditDepartmentId(e.target.value)}
              options={[
                { value: "", label: "Select Department..." },
                ...(departments?.map((d: any) => ({ value: d.id, label: d.name })) || [])
              ]} 
            />
            <Select 
              label="Employment Type" 
              value={editEmploymentType}
              onChange={(e) => setEditEmploymentType(e.target.value)}
              options={[
                { value: "FULL_TIME", label: "Full Time" },
                { value: "PART_TIME", label: "Part Time" },
                { value: "CONTRACT", label: "Contract" },
                { value: "INTERN", label: "Intern" }
              ]} 
            />
          </div>
          <Input label="Base Salary (USD) *" type="number" placeholder="75000" value={editBaseSalary} onChange={(e) => setEditBaseSalary(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseEditModal}>Cancel</Button>
            <Button onClick={handleUpdateEmployee} loading={updateEmployeeMutation.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Apply Leave Modal */}
      <Modal open={showApplyLeaveModal} onClose={handleCloseLeaveModal} title="Apply for Leave">
        <div className="space-y-4">
          <Select 
            label="Employee *" 
            value={leaveEmployeeId}
            onChange={(e) => setLeaveEmployeeId(e.target.value)}
            disabled={user?.role === "VIEWER"}
            options={[
              { value: "", label: "Select Employee..." },
              ...(employees?.map((emp: any) => ({ value: emp.id, label: `${emp.firstName} ${emp.lastName}` })) || [])
            ]} 
          />
          <Select 
            label="Leave Type *" 
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            options={[
              { value: "ANNUAL", label: "Annual Leave" },
              { value: "SICK", label: "Sick Leave" },
              { value: "MATERNITY", label: "Maternity Leave" },
              { value: "PATERNITY", label: "Paternity Leave" },
              { value: "UNPAID", label: "Unpaid Leave" },
              { value: "BEREAVEMENT", label: "Bereavement Leave" }
            ]} 
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date *" type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} />
            <Input label="End Date *" type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} />
          </div>
          <Input label="Reason" placeholder="Brief explanation..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseLeaveModal}>Cancel</Button>
            <Button onClick={handleApplyLeave} loading={applyLeaveMutation.isPending}>Submit Application</Button>
          </div>
        </div>
      </Modal>

      {/* Clock In / Out Modal */}
      <Modal open={showClockModal} onClose={() => setShowClockModal(false)} title={clockType === "IN" ? "Employee Clock In" : "Employee Clock Out"}>
        <div className="space-y-4">
          <Select 
            label="Employee *" 
            value={clockEmployeeId}
            onChange={(e) => setClockEmployeeId(e.target.value)}
            disabled={user?.role === "VIEWER"}
            options={[
              { value: "", label: "Select Employee..." },
              ...(employees?.map((emp: any) => ({ value: emp.id, label: `${emp.firstName} ${emp.lastName}` })) || [])
            ]} 
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowClockModal(false)}>Cancel</Button>
            <Button onClick={handleClockAction} loading={clockInMutation.isPending || clockOutMutation.isPending}>
              {clockType === "IN" ? "Clock In" : "Clock Out"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
