"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, DollarSign, TrendingDown, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, StatCard, Table, Spinner, Modal, Input, Select } from "@/components/ui";
import toast from "react-hot-toast";

interface JournalLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

const EMPTY_LINE = (): JournalLine => ({ accountId: "", description: "", debit: 0, credit: 0 });

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const EMPTY_INV_LINE = (): InvoiceLine => ({ description: "", quantity: 1, unitPrice: 0, taxRate: 0.1 });

export default function FinancePage() {
  const [tab, setTab] = useState<"accounts" | "journal" | "invoices" | "reports">("accounts");
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [lines, setLines] = useState<JournalLine[]>([EMPTY_LINE(), EMPTY_LINE()]);

  // Invoice states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invType, setInvType] = useState<"AP" | "AR">("AR");
  const [invVendorId, setInvVendorId] = useState("");
  const [invCustomerId, setInvCustomerId] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invCurrency, setInvCurrency] = useState("USD");
  const [invLines, setInvLines] = useState<InvoiceLine[]>([EMPTY_INV_LINE()]);

  const qc = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiGet<any[]>("/finance/accounts"),
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: () => apiGet<any[]>("/finance/journal-entries"),
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiGet<any[]>("/finance/invoices"),
  });

  const { data: trialBalance } = useQuery({
    queryKey: ["trial-balance"],
    queryFn: () => apiGet<any>("/finance/reports/trial-balance"),
  });

  const { data: aging } = useQuery({
    queryKey: ["aging"],
    queryFn: () => apiGet<any>("/finance/reports/aging"),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => apiGet<any[]>("/supply-chain/vendors"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/finance/invoices/${id}/approve`),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["invoices"] }); 
      qc.invalidateQueries({ queryKey: ["trial-balance"] }); 
      qc.invalidateQueries({ queryKey: ["aging"] }); 
      qc.invalidateQueries({ queryKey: ["bi-kpis"] });
      qc.invalidateQueries({ queryKey: ["revenue-trend"] });
      toast.success("Invoice approved"); 
    },
  });

  const createJournalMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/finance/journal-entries", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Journal entry saved as draft");
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save journal entry");
    },
  });

  const postJournalMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/finance/journal-entries/${id}/post`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      toast.success("Journal entry posted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to post entry");
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/finance/invoices", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["aging"] });
      qc.invalidateQueries({ queryKey: ["bi-kpis"] });
      qc.invalidateQueries({ queryKey: ["revenue-trend"] });
      toast.success("Invoice created successfully!");
      handleCloseInvoiceModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create invoice");
    },
  });

  function handleCloseModal() {
    setShowJournalModal(false);
    setRef(""); setDesc(""); setCurrency("USD");
    setLines([EMPTY_LINE(), EMPTY_LINE()]);
  }

  function handleCloseInvoiceModal() {
    setShowInvoiceModal(false);
    setInvType("AR");
    setInvVendorId("");
    setInvCustomerId("");
    setInvDueDate("");
    setInvCurrency("USD");
    setInvLines([EMPTY_INV_LINE()]);
  }

  function addInvLine() { setInvLines((prev) => [...prev, EMPTY_INV_LINE()]); }
  function removeInvLine(i: number) { if (invLines.length > 1) setInvLines((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateInvLine(i: number, field: keyof InvoiceLine, value: string | number) {
    setInvLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function handleCreateInvoice() {
    if (invType === "AP" && !invVendorId) { toast.error("Vendor is required for Accounts Payable"); return; }
    if (invType === "AR" && !invCustomerId.trim()) { toast.error("Customer name is required for Accounts Receivable"); return; }
    if (!invDueDate) { toast.error("Due Date is required"); return; }
    const filledLines = invLines.filter((l) => l.description.trim() && l.quantity > 0 && l.unitPrice >= 0);
    if (filledLines.length === 0) { toast.error("At least 1 line item is required"); return; }

    createInvoiceMutation.mutate({
      type: invType,
      vendorId: invType === "AP" ? invVendorId : undefined,
      customerId: invType === "AR" ? invCustomerId : undefined,
      dueDate: invDueDate,
      currency: invCurrency,
      lines: filledLines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
      })),
    });
  }

  function updateLine(i: number, field: keyof JournalLine, value: string | number) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addLine() { setLines((prev) => [...prev, EMPTY_LINE()]); }
  function removeLine(i: number) { if (lines.length > 2) setLines((prev) => prev.filter((_, idx) => idx !== i)); }

  const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  function handleSaveDraft() {
    if (!ref.trim()) { toast.error("Reference is required"); return; }
    if (!desc.trim()) { toast.error("Description is required"); return; }
    const filledLines = lines.filter((l) => l.accountId);
    if (filledLines.length < 2) { toast.error("At least 2 lines with accounts are required"); return; }
    if (!isBalanced) { toast.error(`Not balanced: debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}`); return; }
    createJournalMutation.mutate({ reference: ref, description: desc, currency, lines: filledLines });
  }

  if (isLoading) return <Spinner />;

  const accountOptions = [
    { value: "", label: "Select account…" },
    ...(accounts?.map((a: any) => ({ value: a.id, label: `${a.code} — ${a.name}` })) || []),
  ];

  const totalAR = invoices?.filter((i: any) => i.type === "AR").reduce((s: number, i: any) => s + Number(i.totalAmount), 0) || 0;
  const totalAP = invoices?.filter((i: any) => i.type === "AP").reduce((s: number, i: any) => s + Number(i.totalAmount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="text-sm text-muted-foreground">General Ledger, AP/AR, and Reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInvoiceModal(true)} variant="secondary">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
          <Button onClick={() => setShowJournalModal(true)}>
            <Plus className="w-4 h-4" /> New Journal Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Accounts Receivable" value={formatCurrency(totalAR)} icon={<DollarSign className="w-4 h-4" />} />
        <StatCard title="Accounts Payable" value={formatCurrency(totalAP)} icon={<TrendingDown className="w-4 h-4" />} />
        <StatCard title="Total Accounts" value={accounts?.length || 0} icon={<FileText className="w-4 h-4" />} />
        <StatCard title="Trial Balance" value={trialBalance?.isBalanced ? "✓ Balanced" : "⚠ Unbalanced"} className={trialBalance?.isBalanced ? "border-green-200" : "border-red-200"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["accounts", "journal", "invoices", "reports"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "journal" ? "Journal Entries" : t}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <Card>
          <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Type</th><th>Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {accounts?.map((acc: any) => (
                  <tr key={acc.id}>
                    <td className="font-mono text-xs">{acc.code}</td>
                    <td className="font-medium">{acc.name}</td>
                    <td><Badge status={acc.type} label={acc.type} /></td>
                    <td className={`font-mono ${Number(acc.balance) < 0 ? "text-destructive" : ""}`}>{formatCurrency(acc.balance)}</td>
                    <td><Badge status={acc.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "journal" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Journal Entries</CardTitle>
              <Button size="sm" onClick={() => setShowJournalModal(true)}><Plus className="w-3 h-3" /> New</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Reference</th><th>Description</th><th>Currency</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {journalEntries?.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No journal entries yet. Click "New Journal Entry" to create one.</td></tr>
                )}
                {journalEntries?.map((je: any) => (
                  <tr key={je.id}>
                    <td className="font-mono text-xs">{je.reference}</td>
                    <td>{je.description}</td>
                    <td>{je.currency}</td>
                    <td><Badge status={je.status} /></td>
                    <td>{formatDate(je.createdAt)}</td>
                    <td>
                      {je.status === "DRAFT" && (
                        <Button size="sm" variant="outline" onClick={() => postJournalMutation.mutate(je.id)}>Post</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Invoice #</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {invoices?.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs">{inv.invoiceNumber}</td>
                    <td><Badge status={inv.type} label={inv.type} /></td>
                    <td>{inv.vendor?.name || "—"}</td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td><Badge status={inv.status} /></td>
                    <td>
                      {(inv.status === "PENDING_APPROVAL" || inv.status === "DRAFT") && (
                        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(inv.id)}>Approve</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "reports" && aging && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>AR Aging Report</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(aging).map(([bucket, amount]) => (
                <div key={bucket} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{bucket} days</span>
                  <span className="font-semibold">{formatCurrency(amount as number)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Trial Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Debits</span>
                <span className="font-semibold">{formatCurrency(trialBalance?.totalDebits || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Credits</span>
                <span className="font-semibold">{formatCurrency(trialBalance?.totalCredits || 0)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-medium">Status</span>
                <Badge status={trialBalance?.isBalanced ? "ACTIVE" : "FAILED"} label={trialBalance?.isBalanced ? "Balanced" : "Unbalanced"} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journal Entry Modal — fully wired to API */}
      <Modal open={showJournalModal} onClose={handleCloseModal} title="New Journal Entry">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Reference *" placeholder="JE-001" value={ref} onChange={(e) => setRef(e.target.value)} />
            <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
              options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "INR", label: "INR" }]} />
          </div>
          <Input label="Description *" placeholder="e.g. Monthly depreciation entry" value={desc} onChange={(e) => setDesc(e.target.value)} />

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Line Items</label>
              <button onClick={addLine} className="text-xs text-primary hover:underline">+ Add line</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium px-1">
                <span className="col-span-4">Account</span>
                <span className="col-span-3">Memo</span>
                <span className="col-span-2 text-right">Debit</span>
                <span className="col-span-2 text-right">Credit</span>
                <span className="col-span-1" />
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <div className="col-span-4">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(i, "accountId", e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {accountOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(i, "description", e.target.value)}
                      placeholder="Memo"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={line.debit || ""}
                      onChange={(e) => updateLine(i, "debit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={line.credit || ""}
                      onChange={(e) => updateLine(i, "credit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 2 && (
                      <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-12 gap-1 mt-2 pt-2 border-t text-xs font-semibold px-1">
              <span className="col-span-7 text-right text-muted-foreground">Totals:</span>
              <span className={`col-span-2 text-right ${!isBalanced && totalDebit > 0 ? "text-destructive" : "text-green-600"}`}>
                {totalDebit.toFixed(2)}
              </span>
              <span className={`col-span-2 text-right ${!isBalanced && totalCredit > 0 ? "text-destructive" : "text-green-600"}`}>
                {totalCredit.toFixed(2)}
              </span>
              <span className="col-span-1" />
            </div>
            {!isBalanced && totalDebit > 0 && (
              <p className="text-xs text-destructive mt-1">Debits and credits must be equal to save.</p>
            )}
            {isBalanced && <p className="text-xs text-green-600 mt-1">✓ Entry is balanced</p>}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveDraft} loading={createJournalMutation.isPending} disabled={!isBalanced}>
              Save Draft
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Invoice Modal */}
      <Modal open={showInvoiceModal} onClose={handleCloseInvoiceModal} title="New Invoice">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Type *" 
              value={invType}
              onChange={(e) => setInvType(e.target.value as "AP" | "AR")}
              options={[{ value: "AR", label: "Accounts Receivable (AR)" }, { value: "AP", label: "Accounts Payable (AP)" }]} 
            />
            <Select 
              label="Currency" 
              value={invCurrency} 
              onChange={(e) => setInvCurrency(e.target.value)}
              options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "INR", label: "INR" }]} 
            />
          </div>

          {invType === "AP" ? (
            <Select 
              label="Vendor *" 
              value={invVendorId}
              onChange={(e) => setInvVendorId(e.target.value)}
              options={[
                { value: "", label: "Select Vendor..." },
                ...(vendors?.map((v: any) => ({ value: v.id, label: `${v.code} — ${v.name}` })) || [])
              ]} 
            />
          ) : (
            <Input label="Customer Name *" placeholder="Acme Corporation" value={invCustomerId} onChange={(e) => setInvCustomerId(e.target.value)} />
          )}

          <Input label="Due Date *" type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} />

          {/* Invoice lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Line Items *</label>
              <button onClick={addInvLine} className="text-xs text-primary hover:underline">+ Add line</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-2 text-right">Tax Rate</span>
                <span className="col-span-1" />
              </div>
              {invLines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      placeholder="Consulting Services"
                      value={line.description}
                      onChange={(e) => updateInvLine(i, "description", e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="1" step="1"
                      value={line.quantity || ""}
                      onChange={(e) => updateInvLine(i, "quantity", parseInt(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={line.unitPrice || ""}
                      onChange={(e) => updateInvLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={line.taxRate}
                      onChange={(e) => updateInvLine(i, "taxRate", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="0">0%</option>
                      <option value="0.05">5%</option>
                      <option value="0.1">10%</option>
                      <option value="0.18">18%</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {invLines.length > 1 && (
                      <button onClick={() => removeInvLine(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right text-sm font-semibold mt-3 pt-2 border-t px-1">
              Total Amount (with tax): {formatCurrency(invLines.reduce((s, l) => s + (l.quantity * l.unitPrice * (1 + l.taxRate)), 0))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseInvoiceModal}>Cancel</Button>
            <Button onClick={handleCreateInvoice} loading={createInvoiceMutation.isPending}>Create Invoice</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
