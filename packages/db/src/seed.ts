import { PrismaClient, Role, AccountType, LeaveStatus, LeaveType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function serializeLog(obj: any): string {
  const keys = Object.keys(obj).sort();
  const sortedObj: any = {};
  for (const key of keys) {
    const val = obj[key];
    if (val === undefined || val === null) {
      sortedObj[key] = null;
    } else if (typeof val === "object" && !(val instanceof Date)) {
      sortedObj[key] = JSON.stringify(val);
    } else if (val instanceof Date) {
      sortedObj[key] = val.getTime();
    } else {
      sortedObj[key] = val;
    }
  }
  return JSON.stringify(sortedObj);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Amdox Demo Corp",
      slug: "demo",
      domain: "demo.amdox.com",
      settings: {
        currency: "USD",
        timezone: "Asia/Kolkata",
        fiscalYearStart: "04-01",
      },
    },
  });

  // Create admin user with hashed password
  // FIX: seed was creating user without a password — login always failed silently
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@amdox.com" },
    update: { password: hashedPassword },   // also update if user already exists without password
    create: {
      email: "admin@amdox.com",
      name: "System Admin",
      password: hashedPassword,
    },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: Role.TENANT_ADMIN,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@amdox.com" },
    update: { password: hashedPassword },
    create: {
      email: "manager@amdox.com",
      name: "Priya Sharma",
      password: hashedPassword,
    },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: managerUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: managerUser.id,
      role: Role.MANAGER,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@amdox.com" },
    update: { password: hashedPassword },
    create: {
      email: "employee@amdox.com",
      name: "Rajesh Kumar",
      password: hashedPassword,
    },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: employeeUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: employeeUser.id,
      role: Role.VIEWER,
    },
  });

  // Seed chart of accounts
  const accounts = [
    { code: "1000", name: "Cash and Bank", type: AccountType.ASSET },
    { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET },
    { code: "1200", name: "Inventory", type: AccountType.ASSET },
    { code: "2000", name: "Accounts Payable", type: AccountType.LIABILITY },
    { code: "2100", name: "Accrued Liabilities", type: AccountType.LIABILITY },
    { code: "3000", name: "Share Capital", type: AccountType.EQUITY },
    { code: "4000", name: "Revenue", type: AccountType.REVENUE },
    { code: "5000", name: "Cost of Goods Sold", type: AccountType.EXPENSE },
    { code: "6000", name: "Operating Expenses", type: AccountType.EXPENSE },
    { code: "6100", name: "Salaries & Wages", type: AccountType.EXPENSE },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
      update: {},
      create: { ...acc, tenantId: tenant.id },
    });
  }

  // Seed departments
  const departments = [
    { name: "Engineering", code: "ENG" },
    { name: "Finance", code: "FIN" },
    { name: "Human Resources", code: "HR" },
    { name: "Sales", code: "SAL" },
    { name: "Operations", code: "OPS" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: {
        id: `dept_${dept.code.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `dept_${dept.code.toLowerCase()}`,
        tenantId: tenant.id,
        name: dept.name,
        code: dept.code,
      },
    });
  }

  // Seed sample employees
  const employees = [
    {
      employeeNumber: "EMP001",
      firstName: "Rajesh",
      lastName: "Kumar",
      email: "employee@amdox.com",
      jobTitle: "Senior Engineer",
      departmentId: "dept_eng",
      baseSalary: 85000,
      userId: employeeUser.id,
    },
    {
      employeeNumber: "EMP002",
      firstName: "Priya",
      lastName: "Sharma",
      email: "manager@amdox.com",
      jobTitle: "Finance Manager",
      departmentId: "dept_fin",
      baseSalary: 90000,
      userId: managerUser.id,
    },
    {
      employeeNumber: "EMP003",
      firstName: "Arun",
      lastName: "Patel",
      email: "arun.patel@demo.amdox.com",
      jobTitle: "HR Specialist",
      departmentId: "dept_hr",
      baseSalary: 65000,
      userId: null,
    },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: {
        tenantId_employeeNumber: {
          tenantId: tenant.id,
          employeeNumber: emp.employeeNumber,
        },
      },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        departmentId: emp.departmentId,
        baseSalary: emp.baseSalary,
        userId: emp.userId,
      },
      create: {
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        departmentId: emp.departmentId,
        baseSalary: emp.baseSalary,
        userId: emp.userId,
        tenantId: tenant.id,
        currency: "USD",
        startDate: new Date("2023-01-01"),
      },
    });
  }

  // Find employee records for linking in projects/tasks and leaves
  const emp1 = await prisma.employee.findFirst({ where: { employeeNumber: "EMP001", tenantId: tenant.id } });
  const emp2 = await prisma.employee.findFirst({ where: { employeeNumber: "EMP002", tenantId: tenant.id } });

  // Seed vendors
  const vendors = [
    {
      code: "VND001",
      name: "TechSupply Co",
      email: "sales@techsupply.com",
      currency: "USD",
      paymentTerms: 30,
    },
    {
      code: "VND002",
      name: "Global Parts Ltd",
      email: "orders@globalparts.com",
      currency: "USD",
      paymentTerms: 45,
    },
    {
      code: "VND003",
      name: "Prime Materials Inc",
      email: "procurement@primemats.com",
      currency: "USD",
      paymentTerms: 60,
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: vendor.code } },
      update: {},
      create: { ...vendor, tenantId: tenant.id },
    });
  }

  // Seed sample products
  const products = [
    {
      sku: "PRD001",
      name: "Industrial Sensor A",
      category: "Electronics",
      unitPrice: 249.99,
      reorderPoint: 50,
      reorderQty: 200,
    },
    {
      sku: "PRD002",
      name: "Control Module B",
      category: "Electronics",
      unitPrice: 599.99,
      reorderPoint: 20,
      reorderQty: 100,
    },
    {
      sku: "PRD003",
      name: "Steel Rod 10mm",
      category: "Raw Material",
      unitPrice: 12.5,
      unit: "meter",
      reorderPoint: 500,
      reorderQty: 2000,
    },
  ];

  for (const product of products) {
    const p = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: product.sku } },
      update: {},
      create: {
        ...product,
        tenantId: tenant.id,
        unitPrice: product.unitPrice,
      },
    });

    // Add inventory
    await prisma.inventoryItem.upsert({
      where: { productId_warehouse: { productId: p.id, warehouse: "DEFAULT" } },
      update: {},
      create: {
        productId: p.id,
        warehouse: "DEFAULT",
        quantity: Math.floor(Math.random() * 500) + 100,
        costPrice: product.unitPrice * 0.7,
      },
    });
  }

  // Seed a demo project
  const project = await prisma.project.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "PRJ001" } },
    update: {
      budget: 100000,
      actualCost: 25000,
    },
    create: {
      tenantId: tenant.id,
      code: "PRJ001",
      name: "ERP Phase 2 Rollout",
      description: "Full ERP system deployment across all departments",
      budget: 100000,
      actualCost: 25000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "ACTIVE",
    },
  });

  if (project) {
    // Clear existing tasks if any to avoid duplication
    await prisma.task.deleteMany({ where: { projectId: project.id } });

    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Design database schema",
          description: "Define all relations and models in Prisma schema",
          status: "DONE",
          priority: "HIGH",
          assigneeId: emp1?.id || null,
          estimatedHrs: 16,
          actualHrs: 14,
          startDate: new Date("2026-01-05"),
          dueDate: new Date("2026-01-15"),
        },
        {
          projectId: project.id,
          title: "Implement NestJS auth middleware",
          description: "Setup Passport JWT strategy and RolesGuard",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          assigneeId: emp1?.id || null,
          estimatedHrs: 24,
          actualHrs: 10,
          startDate: new Date("2026-01-16"),
          dueDate: new Date("2026-02-05"),
        },
        {
          projectId: project.id,
          title: "Configure Keycloak roles",
          description: "Synchronize client roles with RBAC system",
          status: "TODO",
          priority: "CRITICAL",
          assigneeId: emp2?.id || null,
          estimatedHrs: 12,
          startDate: new Date("2026-02-06"),
          dueDate: new Date("2026-02-20"),
        },
        {
          projectId: project.id,
          title: "Setup CI/CD pipelines",
          description: "Configure GitHub Actions workflow for automated builds",
          status: "TODO",
          priority: "LOW",
          assigneeId: emp1?.id || null,
          estimatedHrs: 8,
          startDate: new Date("2026-02-21"),
          dueDate: new Date("2026-03-05"),
        }
      ]
    });
  }

  // Seed invoices
  console.log("🌱 Seeding invoices...");
  await prisma.invoiceLine.deleteMany({ where: { invoice: { tenantId: tenant.id } } });
  await prisma.invoice.deleteMany({ where: { tenantId: tenant.id } });
  
  const vendor = await prisma.vendor.findFirst({ where: { tenantId: tenant.id } });

  const invoiceDates = [
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  ];

  await prisma.invoice.createMany({
    data: [
      {
        tenantId: tenant.id,
        invoiceNumber: "INV-2026-001",
        type: "AR",
        currency: "USD",
        subtotal: 15000,
        taxAmount: 0,
        totalAmount: 15000,
        dueDate: new Date("2026-07-15"),
        status: "PAID",
        createdAt: invoiceDates[0],
      },
      {
        tenantId: tenant.id,
        invoiceNumber: "INV-2026-002",
        type: "AR",
        currency: "USD",
        subtotal: 22000,
        taxAmount: 0,
        totalAmount: 22000,
        dueDate: new Date("2026-06-15"),
        status: "PAID",
        createdAt: invoiceDates[1],
      },
      {
        tenantId: tenant.id,
        invoiceNumber: "INV-2026-003",
        type: "AR",
        currency: "USD",
        subtotal: 18000,
        taxAmount: 0,
        totalAmount: 18000,
        dueDate: new Date("2026-05-15"),
        status: "PAID",
        createdAt: invoiceDates[2],
      },
      {
        tenantId: tenant.id,
        invoiceNumber: "INV-2026-004",
        type: "AR",
        currency: "USD",
        subtotal: 25000,
        taxAmount: 0,
        totalAmount: 25000,
        dueDate: new Date("2026-04-15"),
        status: "APPROVED",
        createdAt: invoiceDates[3],
      },
      {
        tenantId: tenant.id,
        invoiceNumber: "BILL-2026-001",
        type: "AP",
        vendorId: vendor?.id || null,
        currency: "USD",
        subtotal: 9500,
        taxAmount: 0,
        totalAmount: 9500,
        dueDate: new Date("2026-07-01"),
        status: "APPROVED",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      }
    ]
  });

  // Seed journal entries
  console.log("🌱 Seeding journal entries...");
  await prisma.journalLine.deleteMany({ where: { journalEntry: { tenantId: tenant.id } } });
  await prisma.journalEntry.deleteMany({ where: { tenantId: tenant.id } });

  const cashAccount = await prisma.account.findFirst({ where: { code: "1000", tenantId: tenant.id } });
  const arAccount = await prisma.account.findFirst({ where: { code: "1100", tenantId: tenant.id } });
  const invAccount = await prisma.account.findFirst({ where: { code: "1200", tenantId: tenant.id } });
  const apAccount = await prisma.account.findFirst({ where: { code: "2000", tenantId: tenant.id } });
  const capitalAccount = await prisma.account.findFirst({ where: { code: "3000", tenantId: tenant.id } });
  const revenueAccount = await prisma.account.findFirst({ where: { code: "4000", tenantId: tenant.id } });
  const salariesAccount = await prisma.account.findFirst({ where: { code: "6100", tenantId: tenant.id } });

  // Reset balances first
  await prisma.account.updateMany({ where: { tenantId: tenant.id }, data: { balance: 0 } });

  if (cashAccount && capitalAccount) {
    await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        reference: "JE-2026-001",
        description: "Initial Capital Investment",
        status: "POSTED",
        postedAt: new Date(),
        createdBy: adminUser.id,
        lines: {
          create: [
            { accountId: cashAccount.id, debit: 150000, credit: 0, description: "Capital introduction" },
            { accountId: capitalAccount.id, debit: 0, credit: 150000, description: "Capital introduction" }
          ]
        }
      }
    });
    await prisma.account.update({ where: { id: cashAccount.id }, data: { balance: { increment: 150000 } } });
    await prisma.account.update({ where: { id: capitalAccount.id }, data: { balance: { decrement: 150000 } } });
  }

  if (arAccount && revenueAccount) {
    await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        reference: "JE-2026-002",
        description: "Initial Sales Recognition",
        status: "POSTED",
        postedAt: new Date(),
        createdBy: adminUser.id,
        lines: {
          create: [
            { accountId: arAccount.id, debit: 37000, credit: 0, description: "Invoiced services" },
            { accountId: revenueAccount.id, debit: 0, credit: 37000, description: "Invoiced services" }
          ]
        }
      }
    });
    await prisma.account.update({ where: { id: arAccount.id }, data: { balance: { increment: 37000 } } });
    await prisma.account.update({ where: { id: revenueAccount.id }, data: { balance: { decrement: 37000 } } });
  }

  if (invAccount && apAccount) {
    await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        reference: "JE-2026-003",
        description: "Office Supplies Purchase",
        status: "POSTED",
        postedAt: new Date(),
        createdBy: adminUser.id,
        lines: {
          create: [
            { accountId: invAccount.id, debit: 25000, credit: 0, description: "Bulk inventory acquisition" },
            { accountId: apAccount.id, debit: 0, credit: 25000, description: "Bulk inventory acquisition" }
          ]
        }
      }
    });
    await prisma.account.update({ where: { id: invAccount.id }, data: { balance: { increment: 25000 } } });
    await prisma.account.update({ where: { id: apAccount.id }, data: { balance: { decrement: 25000 } } });
  }

  if (salariesAccount && cashAccount) {
    await prisma.journalEntry.create({
      data: {
        tenantId: tenant.id,
        reference: "JE-2026-004",
        description: "Monthly Payroll Disbursement",
        status: "POSTED",
        postedAt: new Date(),
        createdBy: adminUser.id,
        lines: {
          create: [
            { accountId: salariesAccount.id, debit: 12000, credit: 0, description: "May Salaries" },
            { accountId: cashAccount.id, debit: 0, credit: 12000, description: "May Salaries" }
          ]
        }
      }
    });
    await prisma.account.update({ where: { id: salariesAccount.id }, data: { balance: { increment: 12000 } } });
    await prisma.account.update({ where: { id: cashAccount.id }, data: { balance: { decrement: 12000 } } });
  }

  // Create default dashboard
  await prisma.dashboard.create({
    data: {
      tenantId: tenant.id,
      name: "Executive Overview",
      isDefault: true,
      createdBy: adminUser.id,
      config: {
        widgets: [
          { id: "w1", type: "kpi", title: "Total Revenue", metric: "revenue", position: { x: 0, y: 0, w: 3, h: 2 } },
          { id: "w2", type: "kpi", title: "Active Employees", metric: "employees", position: { x: 3, y: 0, w: 3, h: 2 } },
          { id: "w3", type: "kpi", title: "Open POs", metric: "open_pos", position: { x: 6, y: 0, w: 3, h: 2 } },
          { id: "w4", type: "chart", chartType: "line", title: "Revenue Trend", metric: "revenue_trend", position: { x: 0, y: 2, w: 8, h: 4 } },
          { id: "w5", type: "chart", chartType: "pie", title: "Expense by Category", metric: "expense_breakdown", position: { x: 8, y: 2, w: 4, h: 4 } },
        ],
      },
    },
  });

  // Seed sample leaves
  console.log("🌱 Seeding leaves...");

  if (emp1) {
    // Clear existing leaves/attendance if any to avoid duplication
    await prisma.leave.deleteMany({ where: { employeeId: emp1.id } });
    await prisma.attendance.deleteMany({ where: { employeeId: emp1.id } });

    await prisma.leave.createMany({
      data: [
        {
          employeeId: emp1.id,
          leaveType: LeaveType.ANNUAL,
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-05"),
          days: 5.0,
          reason: "Annual family vacation",
          status: LeaveStatus.APPROVED,
          approvedBy: adminUser.id,
          approvedAt: new Date("2026-05-15"),
        },
        {
          employeeId: emp1.id,
          leaveType: LeaveType.SICK,
          startDate: new Date("2026-06-15"),
          endDate: new Date("2026-06-16"),
          days: 2.0,
          reason: "Flu and high fever",
          status: LeaveStatus.PENDING,
        }
      ]
    });

    // Seed attendance for emp1
    await prisma.attendance.createMany({
      data: [
        {
          employeeId: emp1.id,
          date: new Date("2026-06-15"),
          clockIn: new Date("2026-06-15T09:00:00Z"),
          clockOut: new Date("2026-06-15T18:00:00Z"),
          hoursWorked: 9.00,
          overtime: 1.00,
          notes: "Regular clock in/out"
        },
        {
          employeeId: emp1.id,
          date: new Date("2026-06-16"),
          clockIn: new Date("2026-06-16T09:15:00Z"),
          clockOut: new Date("2026-06-16T17:45:00Z"),
          hoursWorked: 8.50,
          overtime: 0.50,
          notes: "Slightly late check in"
        },
        {
          employeeId: emp1.id,
          date: new Date("2026-06-17"),
          clockIn: new Date("2026-06-17T08:50:00Z"),
          clockOut: new Date("2026-06-17T18:10:00Z"),
          hoursWorked: 9.33,
          overtime: 1.33,
          notes: "Early check in, late check out"
        }
      ]
    });
  }

  if (emp2) {
    // Clear existing leaves/attendance if any to avoid duplication
    await prisma.leave.deleteMany({ where: { employeeId: emp2.id } });
    await prisma.attendance.deleteMany({ where: { employeeId: emp2.id } });

    await prisma.leave.createMany({
      data: [
        {
          employeeId: emp2.id,
          leaveType: LeaveType.UNPAID,
          startDate: new Date("2026-06-20"),
          endDate: new Date("2026-06-22"),
          days: 3.0,
          reason: "Urgent personal matter",
          status: LeaveStatus.REJECTED,
          approvedBy: adminUser.id,
          approvedAt: new Date("2026-06-18"),
        }
      ]
    });

    // Seed attendance for emp2
    await prisma.attendance.createMany({
      data: [
        {
          employeeId: emp2.id,
          date: new Date("2026-06-15"),
          clockIn: new Date("2026-06-15T09:30:00Z"),
          clockOut: new Date("2026-06-15T18:30:00Z"),
          hoursWorked: 9.00,
          overtime: 1.00,
          notes: "Clocked in with approval"
        },
        {
          employeeId: emp2.id,
          date: new Date("2026-06-16"),
          clockIn: new Date("2026-06-16T09:00:00Z"),
          clockOut: new Date("2026-06-16T18:00:00Z"),
          hoursWorked: 9.00,
          overtime: 1.00,
          notes: "Standard operational day"
        }
      ]
    });
  }

  // Seed audit logs with correct cryptographic hashing chain
  console.log("🌱 Seeding audit logs...");
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });

  const logsToCreate = [
    {
      action: "POST",
      resource: "auth/register",
      resourceId: "system",
      userId: adminUser.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      action: "POST",
      resource: "hr/employees",
      resourceId: "EMP001",
      userId: adminUser.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      action: "POST",
      resource: "projects",
      resourceId: "PRJ001",
      userId: adminUser.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  let prevHash: string | null = null;
  for (const logData of logsToCreate) {
    const serialized = serializeLog({
      tenantId: tenant.id,
      userId: logData.userId,
      action: logData.action,
      resource: logData.resource,
      resourceId: logData.resourceId,
      before: null,
      after: null,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
      prevHash,
      createdAtTime: logData.createdAt.getTime(),
    });
    const hash = createHash("sha256").update(serialized).digest("hex");
    prevHash = hash;

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: logData.userId,
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        hash,
        createdAt: logData.createdAt,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   Admin: admin@amdox.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
