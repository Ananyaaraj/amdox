import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateJournalEntryDto } from "./dto/journal-entry.dto";
import { CreateInvoiceDto } from "./dto/invoice.dto";
import { JournalStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // =================== CHART OF ACCOUNTS ===================
  async getAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: { children: true },
      orderBy: { code: "asc" },
    });
  }

  // =================== JOURNAL ENTRIES ===================
  async createJournalEntry(tenantId: string, userId: string, dto: CreateJournalEntryDto) {
    // Validate double-entry: total debits must equal total credits
    const totalDebits = dto.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredits = dto.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException(
        `Journal entry not balanced: debits (${totalDebits}) ≠ credits (${totalCredits})`
      );
    }

    // Verify accounts exist and belong to tenant
    for (const line of dto.lines) {
      const account = await this.prisma.account.findFirst({
        where: { id: line.accountId, tenantId },
      });
      if (!account) throw new BadRequestException(`Account ${line.accountId} not found`);
    }

    const entry = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        reference: dto.reference,
        description: dto.description,
        currency: dto.currency || "USD",
        exchangeRate: dto.exchangeRate || 1,
        createdBy: userId,
        status: JournalStatus.DRAFT,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            description: l.description,
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    return entry;
  }

  async postJournalEntry(tenantId: string, entryId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, tenantId },
      include: { lines: true },
    });

    if (!entry) throw new NotFoundException("Journal entry not found");
    if (entry.status !== JournalStatus.DRAFT) {
      throw new BadRequestException("Only draft entries can be posted");
    }

    // Update account balances
    for (const line of entry.lines) {
      const netChange = Number(line.debit) - Number(line.credit);
      await this.prisma.account.update({
        where: { id: line.accountId },
        data: { balance: { increment: netChange } },
      });
    }

    return this.prisma.journalEntry.update({
      where: { id: entryId },
      data: { status: JournalStatus.POSTED, postedAt: new Date() },
    });
  }

  async getJournalEntries(tenantId: string, filters: { status?: string; from?: Date; to?: Date }) {
    return this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        ...(filters.status && { status: filters.status as JournalStatus }),
        ...(filters.from && { createdAt: { gte: filters.from } }),
        ...(filters.to && { createdAt: { lte: filters.to } }),
      },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // =================== INVOICES ===================
  async createInvoice(tenantId: string, dto: CreateInvoiceDto) {
    const subtotal = dto.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const taxAmount = dto.lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice * (l.taxRate || 0),
      0
    );

    return this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: `INV-${Date.now()}`,
        type: dto.type,
        vendorId: dto.vendorId,
        customerId: dto.customerId,
        currency: dto.currency || "USD",
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        dueDate: new Date(dto.dueDate),
        lines: {
          create: dto.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate || 0,
            total: l.quantity * l.unitPrice * (1 + (l.taxRate || 0)),
          })),
        },
      },
      include: { lines: true, vendor: true },
    });
  }

  async getInvoices(tenantId: string, type?: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
      },
      include: { lines: true, vendor: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async approveInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "APPROVED" },
    });
  }

  // =================== AGING REPORT ===================
  async getAgingReport(tenantId: string) {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["APPROVED", "OVERDUE"] },
        type: "AR",
      },
      include: { payments: true },
    });

    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = Number(inv.totalAmount) - paid;
      if (outstanding <= 0) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) buckets["current"] += outstanding;
      else if (daysOverdue <= 30) buckets["1-30"] += outstanding;
      else if (daysOverdue <= 60) buckets["31-60"] += outstanding;
      else if (daysOverdue <= 90) buckets["61-90"] += outstanding;
      else buckets["90+"] += outstanding;
    }

    return buckets;
  }

  // =================== TRIAL BALANCE ===================
  async getTrialBalance(tenantId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: "asc" },
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const rows = accounts.map((acc) => {
      const balance = Number(acc.balance);
      const debit = balance > 0 ? balance : 0;
      const credit = balance < 0 ? Math.abs(balance) : 0;
      totalDebits += debit;
      totalCredits += credit;
      return { ...acc, debit, credit };
    });

    return { rows, totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 };
  }
}
