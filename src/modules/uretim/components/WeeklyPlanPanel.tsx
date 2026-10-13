import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { mockStore, type MockBomItem, type MockMachine, type MockWorkPlanItem } from "@/services/mockDataStore";

type PlanViewMode = "weekly" | "monthly";

function mondayOfWeek(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEK_DAYS = [
  { dayIdx: 0, label: "Pazartesi", short: "Pzt" },
  { dayIdx: 1, label: "Salı", short: "Sal" },
  { dayIdx: 2, label: "Çarşamba", short: "Çar" },
  { dayIdx: 3, label: "Perşembe", short: "Per" },
  { dayIdx: 4, label: "Cuma", short: "Cum" },
  { dayIdx: 5, label: "Cumartesi", short: "Cmt" },
  { dayIdx: 6, label: "Pazar", short: "Paz" },
];

const SHIFT_OPTIONS = [
  "1. Vardiya (08:00 - 16:00)",
  "2. Vardiya (16:00 - 24:00)",
  "3. Vardiya (00:00 - 08:00)",
  "Gündüz Normal (08:30 - 17:30)",
  "Esnek / Fazla Mesai",
];

const OPERATION_PRESETS = [
  "Op-10 Fiber Lazer Kesim",
  "Op-20 CNC 5 Eksen Talaşlı İşleme",
  "Op-25 CNC Torna Hassas İşleme",
  "Op-30 CNC Abkant Radyus Büküm",
  "Op-40 Robotik Gazaltı Kaynak",
  "Op-50 Elektrostatik Toz Boya",
  "Op-60 Mekanik Montaj Hattı",
  "Op-70 CMM Boyutsal & Kalite Testi",
  "Op-80 Ambalaj & Sevk Hazırlığı",
];

export function WeeklyPlanPanel() {
  const branchId = useAppStore((s) => s.branchId) ?? 1;

  // Görünüm ve Filtreler
  const [viewMode, setViewMode] = useState<PlanViewMode>("weekly");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<number | "ALL">("ALL");

  // Veri depolarından çekilen kayıtlar
  const [plans, setPlans] = useState<MockWorkPlanItem[]>([]);
  const [machines, setMachines] = useState<MockMachine[]>([]);
  const [boms, setBoms] = useState<MockBomItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formMachineId, setFormMachineId] = useState<number>(0);
  const [formBomId, setFormBomId] = useState<number>(0);
  const [formQty, setFormQty] = useState<number>(50);
  const [formUnit, setFormUnit] = useState<string>("Adet");
  const [formShift, setFormShift] = useState<string>(SHIFT_OPTIONS[0]);
  const [formStartTime, setFormStartTime] = useState<string>("08:00");
  const [formEndTime, setFormEndTime] = useState<string>("16:00");
  const [formOperation, setFormOperation] = useState<string>(OPERATION_PRESETS[0]);
  const [formStatus, setFormStatus] = useState<MockWorkPlanItem["status"]>("PLANNED");
  const [formNotes, setFormNotes] = useState<string>("");

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Verileri yükle
  const loadData = useCallback(() => {
    setPlans(mockStore.getWorkPlans());
    setMachines(mockStore.getMachines());
    setBoms(mockStore.getBoms());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hafta günlerinin tarih listesi (Pzt - Paz)
  const weekDates = useMemo(() => {
    return WEEK_DAYS.map((w) => {
      const dateStr = addDays(currentWeekStart, w.dayIdx);
      return {
        ...w,
        dateStr,
      };
    });
  }, [currentWeekStart]);

  // Ayın tüm günleri
  const monthDays = useMemo(() => {
    if (!currentMonth) return [];
    const [yearStr, monthStr] = currentMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const lastDay = new Date(year, month, 0).getDate();
    const days: Array<{ dayNum: number; dateStr: string; dayName: string }> = [];
    for (let i = 1; i <= lastDay; i++) {
      const dayNumStr = String(i).padStart(2, "0");
      const d = new Date(year, month - 1, i);
      const dateStr = `${currentMonth}-${dayNumStr}`;
      const dayName = d.toLocaleDateString("tr-TR", { weekday: "short" });
      days.push({ dayNum: i, dateStr, dayName });
    }
    return days;
  }, [currentMonth]);

  // Filtrelenmiş planlar
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedMachineFilter !== "ALL" && p.machine_id !== selectedMachineFilter) return false;
      return true;
    });
  }, [plans, selectedMachineFilter]);

  // Yeni Plan Modalını Aç
  function openAddModal(defaultDate?: string) {
    setEditingId(null);
    const initialMachine = machines[0];
    const initialBom = boms[0];

    setFormDate(defaultDate || new Date().toISOString().slice(0, 10));
    setFormMachineId(initialMachine?.id || 1);
    setFormBomId(initialBom?.id || 1);
    setFormQty(50);
    setFormUnit(initialBom?.unit_name || "Adet");
    setFormShift(SHIFT_OPTIONS[0]);
    setFormStartTime("08:00");
    setFormEndTime("16:00");
    setFormOperation(OPERATION_PRESETS[0]);
    setFormStatus("PLANNED");
    setFormNotes("");
    setModalOpen(true);
  }

  // Düzenleme Modalını Aç
  function openEditModal(item: MockWorkPlanItem) {
    setEditingId(item.id);
    setFormDate(item.plan_date);
    setFormMachineId(item.machine_id);
    setFormBomId(item.bom_id);
    setFormQty(item.qty_planned);
    setFormUnit(item.unit_name || "Adet");
    setFormShift(item.shift_name || SHIFT_OPTIONS[0]);
    setFormStartTime(item.start_time || "08:00");
    setFormEndTime(item.end_time || "16:00");
    setFormOperation(item.operation_name || OPERATION_PRESETS[0]);
    setFormStatus(item.status);
    setFormNotes(item.notes || "");
    setModalOpen(true);
  }

  // Reçete seçimi değiştiğinde ürün adını ve birimini aktar
  function handleBomSelect(bomId: number) {
    setFormBomId(bomId);
    const bom = boms.find((b) => b.id === bomId);
    if (bom) {
      if (bom.unit_name) setFormUnit(bom.unit_name);
    }
  }

  // Makine seçimi değiştiğinde operasyonu öner
  function handleMachineSelect(machId: number) {
    setFormMachineId(machId);
    const m = machines.find((x) => x.id === machId);
    if (m) {
      if (m.machine_type === "LAZER") setFormOperation("Op-10 Fiber Lazer Kesim");
      else if (m.machine_type === "CNC") setFormOperation("Op-20 CNC 5 Eksen Talaşlı İşleme");
      else if (m.machine_type === "PRESLER") setFormOperation("Op-30 CNC Abkant Radyus Büküm");
      else if (m.machine_type === "KAYNAK") setFormOperation("Op-40 Robotik Gazaltı Kaynak");
      else if (m.machine_type === "MONTAJ") setFormOperation("Op-60 Mekanik Montaj Hattı");
    }
  }

  // Plana Aktar / Kaydet
  function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!formMachineId || !formBomId || formQty <= 0) {
      alert("Lütfen makine, reçete ve geçerli bir üretim miktarı girin.");
      return;
    }

    const mach = machines.find((m) => m.id === formMachineId) || machines[0];
    const bom = boms.find((b) => b.id === formBomId) || boms[0];

    const payload: Partial<MockWorkPlanItem> = {
      ...(editingId ? { id: editingId } : {}),
      branch_id: branchId,
      plan_date: formDate,
      machine_id: mach.id,
      machine_code: mach.code,
      machine_name: mach.name,
      bom_id: bom.id,
      bom_code: bom.stock_code || `BOM-${bom.id}`,
      bom_name: bom.name || bom.stock_name || "Ürün",
      stock_id: bom.stock_id,
      stock_code: bom.stock_code || "STK-001",
      stock_name: bom.stock_name || bom.name,
      unit_name: formUnit,
      qty_planned: Number(formQty),
      operation_name: formOperation,
      shift_name: formShift,
      start_time: formStartTime,
      end_time: formEndTime,
      status: formStatus,
      notes: formNotes,
    };

    mockStore.saveWorkPlan(payload);
    loadData();
    setModalOpen(false);
    showToast(editingId ? "✔ İş planı güncellendi." : "✔ İş planı ve makine üretim programına aktarıldı.");
  }

  // Plan Sil
  function handleDeletePlan(id: number) {
    if (window.confirm("Bu üretim planı kaydı silinsin mi?")) {
      mockStore.deleteWorkPlan(id);
      loadData();
      showToast("İş planı silindi.");
    }
  }

  // Hızlı Durum Değiştir
  function handleStatusChange(item: MockWorkPlanItem, newStatus: MockWorkPlanItem["status"]) {
    mockStore.saveWorkPlan({ id: item.id, status: newStatus });
    loadData();
  }

  // Önceki / Sonraki Hafta
  function changeWeek(deltaWeeks: number) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + deltaWeeks * 7);
    setCurrentWeekStart(mondayOfWeek(d));
  }

  // Excel (.csv) İndir
  function handleExportExcel() {
    const headers = [
      "ID",
      "Plan Tarihi",
      "Makine Kodu",
      "Makine Adı",
      "Reçete Kodu",
      "Mamul/Ürün Adı",
      "Hedef Miktar",
      "Birim",
      "Operasyon",
      "Vardiya",
      "Saat Aralığı",
      "Durum",
      "Notlar",
    ];

    const rows = filteredPlans.map((p) => [
      String(p.id),
      p.plan_date,
      p.machine_code,
      `"${p.machine_name.replace(/"/g, '""')}"`,
      p.bom_code,
      `"${p.stock_name.replace(/"/g, '""')}"`,
      String(p.qty_planned),
      p.unit_name,
      `"${p.operation_name.replace(/"/g, '""')}"`,
      `"${p.shift_name.replace(/"/g, '""')}"`,
      `${p.start_time} - ${p.end_time}`,
      p.status === "COMPLETED"
        ? "Tamamlandı"
        : p.status === "IN_PROGRESS"
        ? "Üretimde"
        : p.status === "DELAYED"
        ? "Gecikmede"
        : "Planlandı",
      `"${(p.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Is_Plani_Cizelgesi_${viewMode === "weekly" ? currentWeekStart : currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📥 Excel (CSV) dosyası indirildi.");
  }

  // PDF / Yazdır Çıktısı
  function handlePrintPdf() {
    const periodTitle =
      viewMode === "weekly"
        ? `Haftalık İş Planı (${currentWeekStart} - ${addDays(currentWeekStart, 6)})`
        : `Aylık Üretim & Çizelgeleme Planı (${currentMonth})`;

    const printWin = window.open("", "_blank", "width=1000,height=750");
    if (!printWin) return;

    const tableRows = filteredPlans
      .map(
        (p) => `
        <tr>
          <td><strong>${p.plan_date}</strong></td>
          <td>${p.machine_code} - ${p.machine_name}</td>
          <td><strong>${p.stock_name}</strong> (${p.bom_code})</td>
          <td style="text-align: right; font-weight: 700; color: #1e3a8a;">${p.qty_planned} ${p.unit_name}</td>
          <td>${p.operation_name}</td>
          <td>${p.shift_name} (${p.start_time} - ${p.end_time})</td>
          <td><span class="badge ${p.status.toLowerCase()}">${
            p.status === "COMPLETED" ? "Tamamlandı" : p.status === "IN_PROGRESS" ? "Üretimde" : "Planlandı"
          }</span></td>
        </tr>
      `
      )
      .join("");

    const totalQty = filteredPlans.reduce((sum, p) => sum + (p.qty_planned || 0), 0);

    printWin.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>TabiaERP — ${periodTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 24px; margin: 0; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .meta { font-size: 12px; color: #475569; text-align: right; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; color: #334155; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-box { margin-top: 16px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
          .badge.completed { background: #d1fae5; color: #065f46; }
          .badge.in_progress { background: #dbeafe; color: #1e40af; }
          .badge.planned { background: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TabiaERP — Üretim & Makina İş Planı Çizelgesi</h1>
            <div class="subtitle">${periodTitle}</div>
          </div>
          <div class="meta">
            <div>Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}</div>
            <div>Toplam İş Kaydı: ${filteredPlans.length} Adet</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Plan Tarihi</th>
              <th>Makina Parkuru</th>
              <th>Ürün / Reçete (Mamul)</th>
              <th style="text-align: right;">Hedef Üretim</th>
              <th>Operasyon Adı</th>
              <th>Vardiya & Zaman</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="7" style="text-align:center;">Planlanan iş kaydı bulunamadı.</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          <span>Toplam Çizelgelenen Operasyon: ${filteredPlans.length} Kayıt</span>
          <span>Toplam Hedef Üretim: ${totalQty.toLocaleString("tr-TR")} Adet</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      {toastMsg && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "9px 14px",
            borderRadius: 6,
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Üst Bar: Başlık, Görünüm Değiştirici ve Çıktı Butonları */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 14,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span> Serbest İş Planı ve Makina Çizelgeleme
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#64748b" }}>
            Reçetelerden ürün seçerek makina parkurundaki makinaların günlük üretim hedeflerini serbestçe planlayın
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Görünüm Seçimi (Haftalık / Aylık) */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 3, borderRadius: 6 }}>
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              style={{
                border: "none",
                background: viewMode === "weekly" ? "#ffffff" : "transparent",
                color: viewMode === "weekly" ? "#1e40af" : "#64748b",
                fontWeight: viewMode === "weekly" ? 700 : 500,
                padding: "5px 12px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 12.5,
                boxShadow: viewMode === "weekly" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Haftalık Plan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              style={{
                border: "none",
                background: viewMode === "monthly" ? "#ffffff" : "transparent",
                color: viewMode === "monthly" ? "#1e40af" : "#64748b",
                fontWeight: viewMode === "monthly" ? 700 : 500,
                padding: "5px 12px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 12.5,
                boxShadow: viewMode === "monthly" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Aylık Plan
            </button>
          </div>

          {/* Çıktı Butonları (Excel ve PDF) */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportExcel}
            title="İş planını Excel (CSV) olarak indir"
            style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span>📥</span> Excel İndir
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrintPdf}
            title="PDF formatında çıktı al veya yazdır"
            style={{ fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span>📄</span> PDF / Yazdır
          </button>

          {/* Yeni İş Planı Ekle Butonu */}
          <button
            type="button"
            className="btn-save"
            onClick={() => openAddModal()}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              padding: "7px 14px",
              background: "#2563eb",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>➕</span> Yeni İş Planı Ekle
          </button>
        </div>
      </div>

      {/* Kontrol Şeridi: Tarih Gezgini ve Makina Filtresi */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
          background: "#f8fafc",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {viewMode === "weekly" ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => changeWeek(-1)}
              >
                ◀ Önceki Hafta
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => setCurrentWeekStart(mondayOfWeek(new Date()))}
              >
                Bu Hafta
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => changeWeek(1)}
              >
                Sonraki Hafta ▶
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginLeft: 6 }}>
                Hafta: {currentWeekStart} ~ {addDays(currentWeekStart, 6)}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Planlama Ayı:</span>
              <input
                type="month"
                className="form-control"
                style={{ width: 150, padding: "4px 8px", fontSize: 13 }}
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Makina Filtresi */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>Makina Filtresi:</span>
          <select
            className="form-control"
            style={{ width: 220, padding: "4px 8px", fontSize: 12.5 }}
            value={selectedMachineFilter}
            onChange={(e) =>
              setSelectedMachineFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
            }
          >
            <option value="ALL">Tüm Makinalar ({machines.length})</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HAFTALIK GÖRÜNÜM */}
      {viewMode === "weekly" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {weekDates.map((day) => {
            const dayItems = filteredPlans.filter((p) => p.plan_date === day.dateStr);
            const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
            const totalDayQty = dayItems.reduce((acc, p) => acc + (p.qty_planned || 0), 0);

            return (
              <div
                key={day.dateStr}
                style={{
                  background: isToday ? "#f0f9ff" : "#f8fafc",
                  border: isToday ? "2px solid #38bdf8" : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                  minHeight: 380,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Gün Başlığı */}
                <div
                  style={{
                    paddingBottom: 8,
                    marginBottom: 8,
                    borderBottom: "2px solid",
                    borderColor: isToday ? "#38bdf8" : "#e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isToday ? "#0284c7" : "#0f172a" }}>
                      {day.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{day.dateStr}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#2563eb", background: "#dbeafe", padding: "1px 5px", borderRadius: 4 }}>
                      {dayItems.length} İş
                    </span>
                    {totalDayQty > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>
                        Σ {totalDayQty}
                      </div>
                    )}
                  </div>
                </div>

                {/* Günün Kartları */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {dayItems.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 8px",
                        textAlign: "center",
                        fontSize: 11.5,
                        color: "#94a3b8",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 6,
                        marginTop: 10,
                      }}
                    >
                      Planlanan iş yok
                      <button
                        type="button"
                        onClick={() => openAddModal(day.dateStr)}
                        style={{
                          display: "block",
                          margin: "8px auto 0",
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          fontSize: 11,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        + Bu Güne Ekle
                      </button>
                    </div>
                  ) : (
                    dayItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderLeft:
                            item.status === "COMPLETED"
                              ? "4px solid #16a34a"
                              : item.status === "IN_PROGRESS"
                              ? "4px solid #2563eb"
                              : item.status === "DELAYED"
                              ? "4px solid #dc2626"
                              : "4px solid #f59e0b",
                          borderRadius: 6,
                          padding: "8px 9px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background:
                                item.status === "COMPLETED"
                                  ? "#d1fae5"
                                  : item.status === "IN_PROGRESS"
                                  ? "#dbeafe"
                                  : item.status === "DELAYED"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                item.status === "COMPLETED"
                                  ? "#065f46"
                                  : item.status === "IN_PROGRESS"
                                  ? "#1e40af"
                                  : item.status === "DELAYED"
                                  ? "#991b1b"
                                  : "#92400e",
                            }}
                          >
                            {item.status === "COMPLETED"
                              ? "Tamamlandı"
                              : item.status === "IN_PROGRESS"
                              ? "Üretimde"
                              : item.status === "DELAYED"
                              ? "Gecikmede"
                              : "Planlandı"}
                          </span>
                          <span style={{ fontSize: 10, color: "#64748b" }}>
                            {item.start_time}-{item.end_time}
                          </span>
                        </div>

                        {/* Makina & Ürün Başlıkları */}
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>
                          ⚙️ {item.machine_code}
                          <span style={{ fontWeight: 500, color: "#64748b", fontSize: 10.5, marginLeft: 4 }}>
                            ({item.machine_name})
                          </span>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", marginTop: 3 }}>
                          📦 {item.stock_name}
                        </div>

                        <div style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>
                          {item.operation_name}
                        </div>

                        {/* Üretim Miktarı Vurgusu */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 5,
                            paddingTop: 4,
                            borderTop: "1px dashed #e2e8f0",
                          }}
                        >
                          <span style={{ fontSize: 10, color: "#64748b" }}>Hedef:</span>
                          <strong style={{ fontSize: 12, color: "#0f172a" }}>
                            {item.qty_planned} {item.unit_name}
                          </strong>
                        </div>

                        {/* Kart Aksiyonları */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 4,
                            marginTop: 6,
                            paddingTop: 4,
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          {item.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item, "COMPLETED")}
                              title="Tamamlandı olarak işaretle"
                              style={{
                                border: "none",
                                background: "#d1fae5",
                                color: "#065f46",
                                fontSize: 9.5,
                                padding: "2px 5px",
                                borderRadius: 3,
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              ✔ Bitir
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Düzenle"
                            style={{
                              border: "none",
                              background: "#f1f5f9",
                              color: "#334155",
                              fontSize: 9.5,
                              padding: "2px 5px",
                              borderRadius: 3,
                              cursor: "pointer",
                            }}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(item.id)}
                            title="Sil"
                            style={{
                              border: "none",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: 9.5,
                              padding: "2px 5px",
                              borderRadius: 3,
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Gün Altı Ekle Butonu */}
                <button
                  type="button"
                  onClick={() => openAddModal(day.dateStr)}
                  style={{
                    marginTop: 8,
                    padding: "5px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  + İş Ekle
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* AYLIK GÖRÜNÜM */
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {monthDays.map((day) => {
              const dayItems = filteredPlans.filter((p) => p.plan_date === day.dateStr);
              const totalDayQty = dayItems.reduce((acc, p) => acc + (p.qty_planned || 0), 0);
              const isToday = day.dateStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={day.dateStr}
                  style={{
                    background: isToday ? "#eff6ff" : "#ffffff",
                    border: isToday ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 10,
                    minHeight: 140,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: isToday ? "#1d4ed8" : "#0f172a" }}>
                        {day.dayNum} {day.dayName}
                      </span>
                      {dayItems.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#dbeafe", color: "#1e40af", padding: "1px 5px", borderRadius: 4 }}>
                          {dayItems.length} Operasyon
                        </span>
                      )}
                    </div>

                    {dayItems.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 10 }}>
                        Planlanan iş yok
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            style={{
                              fontSize: 10.5,
                              padding: "3px 6px",
                              background: "#f8fafc",
                              borderLeft:
                                item.status === "COMPLETED"
                                  ? "3px solid #16a34a"
                                  : item.status === "IN_PROGRESS"
                                  ? "3px solid #2563eb"
                                  : "3px solid #f59e0b",
                              borderRadius: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`${item.machine_code}: ${item.stock_name} - ${item.qty_planned} ${item.unit_name}`}
                          >
                            <strong>{item.machine_code}:</strong> {item.qty_planned} {item.unit_name} · {item.stock_name}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 700 }}>
                            +{dayItems.length - 3} iş daha...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>
                      {totalDayQty > 0 ? `Σ ${totalDayQty} adet` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddModal(day.dateStr)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#2563eb",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      + Ekle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: SERBEST İŞ PLANI EKLE / DÜZENLE */}
      {modalOpen && (
        <div className="modal-overlay show" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 600, width: "95%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                {editingId ? "İş Planı Kaydını Düzenle" : "➕ Serbest İş Planı Oluştur & Makina Parkuruna Aktar"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* 1. Reçetelerden Ürün Seçimi */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 4, color: "#1e3a8a" }}>
                    Üst Ürün / Reçete (Mamul - Yarı Mamul):
                  </label>
                  <select
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px", fontSize: 13 }}
                    value={formBomId}
                    onChange={(e) => handleBomSelect(Number(e.target.value))}
                    required
                  >
                    <option value={0}>Reçete Seçin...</option>
                    {boms.map((b) => (
                      <option key={b.id} value={b.id}>
                        {(b.stock_code || b.code)} — {b.name || b.stock_name}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                    * Ürün ve mamul tanımları doğrudan Reçeteler & BOM modülünden çekilmektedir.
                  </span>
                </div>

                {/* 2. Makina Parkurundan Makina Seçimi */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 4, color: "#1e3a8a" }}>
                    Makina Parkurundan Makina Seçimi:
                  </label>
                  <select
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px", fontSize: 13 }}
                    value={formMachineId}
                    onChange={(e) => handleMachineSelect(Number(e.target.value))}
                    required
                  >
                    <option value={0}>Makina Seçin...</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} — {m.name} [{m.brand || ""} {m.model || ""}] ({m.power_kw} kW · {m.daily_hours} sa/gün)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                    * Seçilen makina parkuru kartının güç ve kapasite bilgileri iş planına entegre edilir.
                  </span>
                </div>

                {/* 3. Tarih ve Hedef Üretim Miktarı */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Planlama Tarihi:
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px" }}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Hedef Üretim Miktarı:
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      style={{ flex: 1, padding: "6px 10px", fontWeight: 700 }}
                      value={formQty ?? 1}
                      onChange={(e) => setFormQty(Number(e.target.value))}
                      required
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: 70, padding: "6px 8px", textAlign: "center" }}
                      value={formUnit ?? ""}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder="Birim"
                    />
                  </div>
                </div>

                {/* 4. Vardiya ve Zaman */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Çalışma Vardiyası:
                  </label>
                  <select
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px" }}
                    value={formShift ?? "1. Vardiya (08:00 - 16:00)"}
                    onChange={(e) => setFormShift(e.target.value)}
                  >
                    {SHIFT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Saat Aralığı:
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="time"
                      className="form-control"
                      style={{ flex: 1, padding: "6px 6px" }}
                      value={formStartTime ?? ""}
                      onChange={(e) => setFormStartTime(e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="time"
                      className="form-control"
                      style={{ flex: 1, padding: "6px 6px" }}
                      value={formEndTime ?? ""}
                      onChange={(e) => setFormEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* 5. Operasyon ve Durum */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Yapılacak Operasyon:
                  </label>
                  <input
                    type="text"
                    list="operationPresets"
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px" }}
                    value={formOperation ?? ""}
                    onChange={(e) => setFormOperation(e.target.value)}
                    placeholder="Örn: Lazer Kesim, 5 Eksen Talaşlı İşleme"
                    required
                  />
                  <datalist id="operationPresets">
                    {OPERATION_PRESETS.map((op) => (
                      <option key={op} value={op} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Plan Durumu:
                  </label>
                  <select
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px" }}
                    value={formStatus ?? "PLANNED"}
                    onChange={(e) => setFormStatus(e.target.value as MockWorkPlanItem["status"])}
                  >
                    <option value="PLANNED">Planlandı (Sırada)</option>
                    <option value="IN_PROGRESS">Üretimde (Tezgahta)</option>
                    <option value="COMPLETED">Tamamlandı</option>
                    <option value="DELAYED">Gecikmede</option>
                  </select>
                </div>

                {/* 6. Ek Notlar */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Plan / Operatör Notları:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: "100%", padding: "6px 10px" }}
                    value={formNotes ?? ""}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Özel fikstür, tolerans veya montaj direktifleri..."
                  />
                </div>
              </div>

              {/* Form Butonları */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  style={{ background: "#2563eb", padding: "8px 20px", fontWeight: 700 }}
                >
                  {editingId ? "Güncellemeyi Kaydet" : "✔ Plana Aktar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
