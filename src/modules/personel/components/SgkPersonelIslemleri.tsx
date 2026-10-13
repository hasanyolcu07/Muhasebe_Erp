import { useState } from "react";
import { personelStore } from "../services/personelStore";
import { attemptSgkSubmission } from "../services/sgkService";
import type { SgkNotificationRecord } from "../types/personelTypes";

function latest(list: SgkNotificationRecord[], personelId: number, type: SgkNotificationRecord["type"]) {
  return list.find((row) => row.personel_id === personelId && row.type === type);
}

function gonderimEtiketi(row?: SgkNotificationRecord): string {
  if (!row) return "Hazırlanmadı";
  if (row.submission_status === "GONDERIM_BEKLIYOR") return "Gönderim denendi, SGK onayı yok";
  if (row.submission_status === "GONDERILDI") return "Gönderildi";
  return "Hazır, gönderilmedi";
}

export function SgkPersonelIslemleri() {
  const [notifications, setNotifications] = useState(() => personelStore.getSgkNotifications());
  const [notice, setNotice] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const people = personelStore.getPersonelList();

  function refresh() {
    setNotifications(personelStore.getSgkNotifications());
  }

  function prepare(personelId: number, type: "ISE_GIRIS" | "ISTEN_AYRILIS") {
    const person = personelStore.getPersonelById(personelId);
    if (!person) return;
    const date = type === "ISE_GIRIS" ? person.start_date : person.end_date;
    if (!date) {
      setNotice(type === "ISE_GIRIS" ? "Kartta işe giriş tarihi yok." : "Kartta işten ayrılış tarihi yok. Çıkış bildirgesi hazırlanmadı.");
      return;
    }
    try {
      personelStore.createSgkNotification(type, personelId, date, person.exit_reason_code || "03");
      refresh();
      setNotice(`${person.full_name} için ${type === "ISE_GIRIS" ? "işe giriş" : "işten ayrılış"} bildirgesi kart bilgileriyle hazırlandı. Canlı SGK'ya gönderilmiş sayılmaz.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Bildirge hazırlanamadı.");
    }
  }

  function send(row: SgkNotificationRecord) {
    const result = attemptSgkSubmission(row.id);
    personelStore.markSgkAttempt(row.id);
    refresh();
    setNotice(`${result.message} ${result.recommendedAction}`);
  }

  function ilisik(row: SgkNotificationRecord) {
    try {
      const updated = personelStore.prepareIlisikBelgesi(row.id);
      refresh();
      setPreview(updated.ilisik_metin || "");
      setNotice("İlişik kesme belgesi kart bilgileriyle hazırlandı. SGK kabulü değildir.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Belge hazırlanamadı.");
    }
  }

  function download(row: SgkNotificationRecord) {
    const blob = new Blob([row.xml_payload], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SGK_4A_${row.type}_${row.tc_no}_${row.event_date}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <p style={{ fontSize: 13, marginTop: 0 }}>
        Bildirgeler personel kartındaki TCKN, meslek, kanun numarası, işyeri sicili ve tarihlerle hazırlanır. Gönder düğmesi canlı SGK onayı yazmaz.
      </p>
      {notice ? <p style={{ fontSize: 13, color: "#92400e" }}>{notice}</p> : null}
      <div className="table-responsive" style={{ maxWidth: "100%", overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Personel</th>
              <th>İşe giriş</th>
              <th>Giriş bildirgesi</th>
              <th>Ayrılış</th>
              <th>Çıkış bildirgesi</th>
              <th>İlişik kesme</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const giris = latest(notifications, person.id, "ISE_GIRIS");
              const cikis = latest(notifications, person.id, "ISTEN_AYRILIS");
              return (
                <tr key={person.id}>
                  <td>
                    <strong>{person.full_name}</strong>
                    <div style={{ fontSize: 11 }}>{person.sgk_workplace_no || "İşyeri sicil yok"} · Kanun {person.sgk_law_code || "-"}</div>
                  </td>
                  <td>{person.start_date}</td>
                  <td>
                    <div>{gonderimEtiketi(giris)}</div>
                    {!giris ? (
                      <button type="button" className="btn-top" onClick={() => prepare(person.id, "ISE_GIRIS")}>Bildirge hazırla</button>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        <button type="button" className="btn-top" onClick={() => download(giris)}>XML</button>
                        <button type="button" className="btn-top" onClick={() => send(giris)}>Gönder</button>
                      </div>
                    )}
                  </td>
                  <td>{person.end_date || "—"}</td>
                  <td>
                    <div>{person.end_date ? gonderimEtiketi(cikis) : "Ayrılış tarihi yok"}</div>
                    {person.end_date && !cikis ? (
                      <button type="button" className="btn-top" onClick={() => prepare(person.id, "ISTEN_AYRILIS")}>Bildirge hazırla</button>
                    ) : null}
                    {cikis ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        <button type="button" className="btn-top" onClick={() => download(cikis)}>XML</button>
                        <button type="button" className="btn-top" onClick={() => send(cikis)}>Gönder</button>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {!cikis ? "Çıkış bildirgesi yok" : cikis.ilisik_durumu === "HAZIR" ? "Hazırlandı" : "Hazırlanmadı"}
                    {cikis ? (
                      <div style={{ marginTop: 4 }}>
                        <button type="button" className="btn-top" onClick={() => ilisik(cikis)}>İlişik kesme belgesi</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {preview ? (
        <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, marginTop: 12 }}>{preview}</pre>
      ) : null}
    </div>
  );
}
