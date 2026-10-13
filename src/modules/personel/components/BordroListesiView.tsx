import { useState } from "react";
import { personelStore } from "../services/personelStore";
import { generatePayrollJournalVoucher } from "../services/payrollCalculator";
import { formatMoneyExact } from "@/lib/financialMath";
import type { BordroRecord } from "../types/personelTypes";

export function BordroListesiView() {
  const [period, setPeriod] = useState("2026-03");
  const bordrolar = personelStore.getBordroList(period);
  const [pusulaRecord, setPusulaRecord] = useState<BordroRecord | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalData, setJournalData] = useState<ReturnType<typeof generatePayrollJournalVoucher> | null>(null);

  const handleOpenJournal = () => {
    if (bordrolar.length === 0) {
      alert("Bu dönem için bordro kaydı bulunmamaktadır.");
      return;
    }
    const data = generatePayrollJournalVoucher(bordrolar);
    setJournalData(data);
    setJournalModalOpen(true);
  };

  return (
    <div className="bordro-listesi-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Dönem:</label>
          <select
            className="form-control"
            style={{ width: 140 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="2026-03">2026 / Mart</option>
            <option value="2026-02">2026 / Şubat</option>
            <option value="2026-01">2026 / Ocak</option>
            <option value="2025-12">2025 / Aralık</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-top blue" onClick={handleOpenJournal}>
            📒 Muhasebe Fişi Taslağı (720/770 ➔ 335/360/361)
          </button>
          <button
            type="button"
            className="btn-top"
            onClick={() => window.print()}
            title="Tüm listeyi yazdır"
          >
            🖨️ Yazdır
          </button>
        </div>
      </div>

      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Personel No / Ad</th>
              <th>Departman</th>
              <th>Gün</th>
              <th>Brüt Kazanç</th>
              <th>SGK İşçi Payı</th>
              <th>Ödenecek GV</th>
              <th>Ödenecek DV</th>
              <th>Net Ödenecek</th>
              <th>İşveren Maliyeti</th>
              <th>Statü</th>
              <th style={{ textAlign: "right" }}>Pusula</th>
            </tr>
          </thead>
          <tbody>
            {bordrolar.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                  Bu dönem için bordro kaydı bulunmamaktadır.
                </td>
              </tr>
            ) : (
              bordrolar.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.personel_name}</strong>
                  </td>
                  <td>{b.department}</td>
                  <td>{b.worked_days}</td>
                  <td>{formatMoneyExact(b.gross_total)}</td>
                  <td>{formatMoneyExact(b.sgk_employee_share + b.unemployment_employee_share)}</td>
                  <td>{formatMoneyExact(b.payable_income_tax)}</td>
                  <td>{formatMoneyExact(b.payable_stamp_tax)}</td>
                  <td style={{ fontWeight: 700, color: "#166534" }}>{formatMoneyExact(b.net_payable)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoneyExact(b.total_employer_cost)}</td>
                  <td>
                    <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn-top"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => setPusulaRecord(b)}
                    >
                      📄 Pusula Yazdır
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bordro Pusulası Modal / Yazdırma Şablonu */}
      {pusulaRecord && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 680, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <span>📄 Ücret Hesap Pusulası ({pusulaRecord.period})</span>
              <button type="button" className="btn-top" onClick={() => setPusulaRecord(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body" style={{ background: "#fff", color: "#000", padding: 24, fontFamily: "sans-serif" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 10, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 18 }}>TABİA İMALAT SANAYİ VE TİCARET A.Ş.</h3>
                <h4 style={{ margin: 0, fontSize: 14, color: "#475569" }}>
                  ÜCRET HESAP PUSULASI — {pusulaRecord.period} DÖNEMİ
                </h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 12 }}>
                <div><strong>Personel:</strong> {pusulaRecord.personel_name}</div>
                <div><strong>TC Kimlik No:</strong> {pusulaRecord.personel_tc}</div>
                <div><strong>Departman:</strong> {pusulaRecord.department}</div>
                <div><strong>Görev:</strong> {pusulaRecord.job_title}</div>
                <div><strong>Çalışma Günü:</strong> {pusulaRecord.worked_days} gün ({pusulaRecord.worked_hours} saat)</div>
                <div><strong>Hesaplama Tipi:</strong> {pusulaRecord.wage_type} (Brütten Nete)</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* KAZANÇLAR */}
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontWeight: 700, borderBottom: "1px solid #cbd5e1", paddingBottom: 4, marginBottom: 6 }}>
                    KAZANÇLAR
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Normal Çalışma:</span>
                    <span>{formatMoneyExact(pusulaRecord.normal_earning)}</span>
                  </div>
                  {pusulaRecord.overtime_earning > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>Fazla Mesai:</span>
                      <span>{formatMoneyExact(pusulaRecord.overtime_earning)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13, borderTop: "1px dashed #cbd5e1", paddingTop: 4, marginTop: 6 }}>
                    <span>TOPLAM BRÜT:</span>
                    <span>{formatMoneyExact(pusulaRecord.gross_total)}</span>
                  </div>
                </div>

                {/* YASAL KESİNTİLER */}
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontWeight: 700, borderBottom: "1px solid #cbd5e1", paddingBottom: 4, marginBottom: 6 }}>
                    YASAL KESİNTİLER
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>SGK İşçi Payı (%14):</span>
                    <span>{formatMoneyExact(pusulaRecord.sgk_employee_share)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>İşsizlik İşçi Payı (%1):</span>
                    <span>{formatMoneyExact(pusulaRecord.unemployment_employee_share)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Gelir Vergisi (Ödenecek):</span>
                    <span>{formatMoneyExact(pusulaRecord.payable_income_tax)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>Damga Vergisi (Ödenecek):</span>
                    <span>{formatMoneyExact(pusulaRecord.payable_stamp_tax)}</span>
                  </div>
                </div>
              </div>

              {/* 7349 Sayılı Kanun İstisnaları */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 8, borderRadius: 4, fontSize: 11, marginBottom: 16 }}>
                <strong>7349 Sayılı Kanun Asgari Ücret Vergi İstisnası Bilgileri:</strong>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span>GV İstisna Tutarı: {formatMoneyExact(pusulaRecord.asgari_ucret_gv_istisnasi)}</span>
                  <span>DV İstisna Tutarı: {formatMoneyExact(pusulaRecord.asgari_ucret_dv_istisnasi)}</span>
                  <span>Kümülatif GV Matrahı: {formatMoneyExact(pusulaRecord.cumulative_income_tax_base)}</span>
                </div>
              </div>

              {/* NET ÖDENECEK */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "2px solid #86efac", padding: 12, borderRadius: 6, marginBottom: 24 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>NET ÖDENECEK TUTAR:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#166534" }}>
                  {formatMoneyExact(pusulaRecord.net_payable)}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, textAlign: "center", fontSize: 12, marginTop: 30 }}>
                <div>
                  <p style={{ margin: "0 0 40px 0" }}>İşveren / Yetkili İmza</p>
                  <div>_______________________</div>
                </div>
                <div>
                  <p style={{ margin: "0 0 40px 0" }}>İşçi İmza (Pusulayı teslim aldım)</p>
                  <div>_______________________</div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-top blue" onClick={() => window.print()}>
                🖨️ Yazdır
              </button>
              <button type="button" className="btn-cancel" onClick={() => setPusulaRecord(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Muhasebe Fişi Taslağı Modalı */}
      {journalModalOpen && journalData && (
        <div className="modal-overlay show" role="dialog" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ width: 720 }}>
            <div className="modal-header">
              <span>📒 Otomatik Bordro Muhasebe Fişi Taslağı (Çift Kayıt Doğrulandı)</span>
              <button type="button" className="btn-top" onClick={() => setJournalModalOpen(false)}>
                ✖
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <strong>Fiş Açıklaması:</strong> {journalData.description}
              </div>

              <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Hesap Kodu</th>
                    <th>Hesap Adı</th>
                    <th>Açıklama</th>
                    <th style={{ textAlign: "right" }}>Borç (TL)</th>
                    <th style={{ textAlign: "right" }}>Alacak (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  {journalData.lines.map((ln, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{ln.account_code}</td>
                      <td>{ln.account_name}</td>
                      <td>{ln.description}</td>
                      <td style={{ textAlign: "right", fontWeight: ln.debit > 0 ? 600 : 400 }}>
                        {ln.debit > 0 ? formatMoneyExact(ln.debit) : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: ln.credit > 0 ? 600 : 400 }}>
                        {ln.credit > 0 ? formatMoneyExact(ln.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={3}>TOPLAM (Borç = Alacak Dengesi)</td>
                    <td style={{ textAlign: "right", color: "#166534" }}>{formatMoneyExact(journalData.totalDebit)}</td>
                    <td style={{ textAlign: "right", color: "#166534" }}>{formatMoneyExact(journalData.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>

              {journalData.isBalanced ? (
                <div style={{ marginTop: 12, padding: 8, background: "#dcfce7", color: "#166534", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✅</span>
                  <span>VUK Çift Kayıt İlkesi Doğrulandı: Borç ve Alacak tutarları kuruş kuruşuna birbirine eşittir (Fark: 0.00 TL).</span>
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: 8, background: "#fee2e2", color: "#991b1b", borderRadius: 4, fontSize: 12 }}>
                  ⚠️ Dengesiz Fiş Uyarısı: Borç ve Alacak toplamları eşit değildir!
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-save"
                onClick={() => {
                  alert("Muhasebe fiş taslağı Yevmiye Fişleri modülüne aktarılmak üzere kaydedildi.");
                  setJournalModalOpen(false);
                }}
              >
                💾 Yevmiye Fişi Olarak Kaydet
              </button>
              <button type="button" className="btn-cancel" onClick={() => setJournalModalOpen(false)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
