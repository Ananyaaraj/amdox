"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, AlertTriangle, ShoppingCart, Truck, Trash2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, StatCard, Table, Spinner, Modal, Input, Select } from "@/components/ui";
import toast from "react-hot-toast";

interface POLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

const EMPTY_LINE = (): POLine => ({ productId: "", quantity: 1, unitPrice: 0 });

export default function SupplyChainPage() {
  const [tab, setTab] = useState<"inventory" | "vendors" | "orders" | "forecast">("inventory");
  const [showAddModal, setShowAddModal] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([EMPTY_LINE()]);

  const qc = useQueryClient();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => apiGet<any[]>("/supply-chain/inventory"),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => apiGet<any[]>("/supply-chain/vendors"),
  });

  const { data: orders } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => apiGet<any[]>("/supply-chain/purchase-orders"),
  });

  const createPoMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/supply-chain/purchase-orders", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Purchase Order created successfully!");
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create Purchase Order");
    },
  });

  function handleCloseModal() {
    setShowAddModal(false);
    setVendorId("");
    setExpectedAt("");
    setNotes("");
    setLines([EMPTY_LINE()]);
  }

  function updateLineProduct(i: number, prodId: string) {
    const prod = inventory?.find((p: any) => p.id === prodId);
    const price = prod ? Number(prod.unitPrice) : 0;
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, productId: prodId, unitPrice: price } : l));
  }

  function updateLine(i: number, field: keyof POLine, value: string | number) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addLine() { setLines((prev) => [...prev, EMPTY_LINE()]); }
  function removeLine(i: number) { if (lines.length > 1) setLines((prev) => prev.filter((_, idx) => idx !== i)); }

  function handleCreatePO() {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    const filledLines = lines.filter((l) => l.productId && l.quantity > 0 && l.unitPrice >= 0);
    if (filledLines.length === 0) { toast.error("At least 1 valid line item is required"); return; }

    createPoMutation.mutate({
      vendorId,
      expectedAt: expectedAt || undefined,
      notes: notes || undefined,
      lines: filledLines.map(l => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice)
      })),
      currency: "USD",
    });
  }

  if (isLoading) return <Spinner />;

  const lowStock = inventory?.filter((i: any) => i.isLowStock) || [];
  const totalValue = inventory?.reduce((s: number, i: any) => {
    const qty = i.inventory?.reduce((sq: number, inv: any) => sq + Number(inv.quantity), 0) || 0;
    return s + qty * Number(i.unitPrice);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Supply Chain</h1>
          <p className="text-sm text-muted-foreground">Inventory, vendors, and purchase orders</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><ShoppingCart className="w-4 h-4" /> New PO</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Products" value={inventory?.length || 0} icon={<Package className="w-4 h-4" />} />
        <StatCard title="Low Stock Alerts" value={lowStock.length} icon={<AlertTriangle className="w-4 h-4" />}
          className={lowStock.length > 0 ? "border-orange-200" : ""} />
        <StatCard title="Inventory Value" value={formatCurrency(totalValue)} icon={<Package className="w-4 h-4" />} />
        <StatCard title="Open Orders" value={orders?.filter((o: any) => ["DRAFT","SENT","ACKNOWLEDGED"].includes(o.status)).length || 0} icon={<Truck className="w-4 h-4" />} />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-800">{lowStock.length} product(s) below reorder point</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p: any) => (
              <span key={p.id} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg">{p.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b">
        {(["inventory", "vendors", "orders", "forecast"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Reorder Point</th><th>Unit Price</th><th>Status</th></tr>
              </thead>
              <tbody>
                {inventory?.map((p: any) => {
                  const qty = p.inventory?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0;
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.sku}</td>
                      <td className="font-medium">{p.name}</td>
                      <td>{p.category || "—"}</td>
                      <td className={qty <= Number(p.reorderPoint) ? "text-orange-600 font-semibold" : ""}>{qty} {p.unit}</td>
                      <td>{Number(p.reorderPoint)} {p.unit}</td>
                      <td>{formatCurrency(p.unitPrice)}</td>
                      <td><Badge status={qty <= Number(p.reorderPoint) ? "WARNING" : "ACTIVE"} label={qty <= Number(p.reorderPoint) ? "Low Stock" : "OK"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "vendors" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>Code</th><th>Vendor</th><th>Email</th><th>Currency</th><th>Payment Terms</th><th>Status</th></tr>
              </thead>
              <tbody>
                {vendors?.map((v: any) => (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">{v.code}</td>
                    <td className="font-medium">{v.name}</td>
                    <td className="text-muted-foreground">{v.email || "—"}</td>
                    <td>{v.currency}</td>
                    <td>Net {v.paymentTerms}</td>
                    <td><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "orders" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Expected</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders?.map((po: any) => (
                  <tr key={po.id}>
                    <td className="font-mono text-xs">{po.poNumber}</td>
                    <td>{po.vendor?.name}</td>
                    <td className="font-semibold">{formatCurrency(po.totalAmount, po.currency)}</td>
                    <td>{po.expectedAt ? formatDate(po.expectedAt) : "—"}</td>
                    <td><Badge status={po.status} /></td>
                  </tr>
                ))}
                {!orders?.length && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "forecast" && (
        <Card>
          <CardHeader><CardTitle>AI Demand Forecasting</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">ML-powered demand forecasts will appear here once the Python ML service is running and models have been trained.</p>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm">
              <p className="font-medium mb-1">How it works:</p>
              <p className="text-muted-foreground">The ML service (Prophet + LSTM) is available at <code className="bg-muted px-1 rounded">http://localhost:8000</code>. Run <code className="bg-muted px-1 rounded">cd apps/ml-service && python main.py</code> to start it, then trigger training via the API.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={showAddModal} onClose={handleCloseModal} title="New Purchase Order">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Vendor *" 
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              options={[
                { value: "", label: "Select Vendor..." },
                ...(vendors?.map((v: any) => ({ value: v.id, label: `${v.code} — ${v.name}` })) || [])
              ]} 
            />
            <Input label="Expected Date" type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
          </div>
          <Input label="Notes" placeholder="Delivery instructions, comments..." value={notes} onChange={(e) => setNotes(e.target.value)} />

          {/* PO lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Line Items *</label>
              <button onClick={addLine} className="text-xs text-primary hover:underline">+ Add line</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
                <span className="col-span-5">Product</span>
                <span className="col-span-3 text-right">Quantity</span>
                <span className="col-span-3 text-right">Unit Price</span>
                <span className="col-span-1" />
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLineProduct(i, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <option value="">Select product...</option>
                      {inventory?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="1" step="1"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(i, "quantity", parseInt(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="0" step="0.01"
                      value={line.unitPrice || ""}
                      onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 text-right"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right text-sm font-semibold mt-3 pt-2 border-t px-1">
              Total PO Amount: {formatCurrency(lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleCreatePO} loading={createPoMutation.isPending}>Create PO</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
