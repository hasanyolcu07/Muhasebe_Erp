import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { stokApi, type LookupItem, type UserLookup } from "../api/stokApi";
import { PRICE_LIST_TYPES } from "../constants";
import type { PriceListFormValues } from "../schemas/stokSchema";

type Props = {
  activeTab: string;
  branchId: number;
};

export function FiyatTabPanels({ activeTab, branchId }: Props) {
  const { register, watch, setValue, control } = useFormContext<PriceListFormValues>();
  const { fields: matrixFields, append: appendMatrix, remove: removeMatrix } = useFieldArray({
    control,
    name: "matrix",
  });
  const { fields: permFields, append: appendPerm, remove: removePerm } = useFieldArray({
    control,
    name: "permissions",
  });
  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });

  const [accounts, setAccounts] = useState<LookupItem[]>([]);
  const [groups, setGroups] = useState<LookupItem[]>([]);
  const [stocks, setStocks] = useState<LookupItem[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const loadLookups = useCallback(async () => {
    const [acc, grp, stk, usr] = await Promise.all([
      stokApi.lookupAccounts(),
      stokApi.lookupGroups(branchId),
      stokApi.lookupStocks(branchId),
      stokApi.lookupUsers(),
    ]);
    setAccounts(acc.items);
    setGroups(grp.items);
    setStocks(stk.items);
    setUsers(usr.items);
  }, [branchId]);

  useEffect(() => {
    loadLookups().catch(() => undefined);
  }, [loadLookups]);

  async function searchUsers() {
    try {
      const res = await stokApi.lookupUsers(userSearch || undefined);
      setUsers(res.items);
    } catch {
      /* ignore */
    }
  }

  function addMatrixRow() {
    appendMatrix({
      link_type: "FIRMA",
      account_id: accounts[0]?.id ?? null,
      account_group_id: null,
      discount_text: "",
      discount_rate: 0,
      multiplier: 1,
      moq_text: "",
      moq_qty: 0,
      is_active: true,
    });
  }

  function addPermissionRow() {
    const u = users[0];
    if (!u) return;
    appendPerm({
      user_id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      can_edit_unit_price: false,
      can_sell_below_min: false,
    });
  }

  function addPriceItem() {
    const s = stocks[0];
    if (!s) return;
    appendItem({ stock_id: s.id, stock_code: s.code, stock_name: s.name, unit_price: 0 });
  }

  return (
    <>
      <div className={`stok-subscreen${activeTab === "fl-bilgiler" ? " active" : ""}`}>
        <div className="stok-grid-2col">
          <div>
            <div className="form-row">
              <label>Liste Kodu</label>
              <input type="text" className="form-control required" {...register("code")} />
            </div>
            <div className="form-row">
              <label>Liste Adı</label>
              <input type="text" className="form-control required" {...register("name")} />
            </div>
            <div className="form-row">
              <label>Liste Tipi</label>
              <select className="form-control" {...register("list_type")}>
                {PRICE_LIST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Geçerlilik Başlangıç</label>
              <input type="date" className="form-control" {...register("valid_from")} />
            </div>
            <div className="form-row">
              <label>Geçerlilik Bitiş</label>
              <input type="date" className="form-control" {...register("valid_to")} />
            </div>
            <div className="form-row">
              <label>Pasif</label>
              <input type="checkbox" {...register("is_passive")} />
            </div>
          </div>
        </div>

        <div className="smart-link-header" style={{ marginTop: 20 }}>
          <div className="smart-link-title">
            <span>📦 Stok Fiyat Satırları</span>
          </div>
          <button type="button" className="btn-add-link" onClick={addPriceItem}>
            + Stok Fiyat Satırı Ekle
          </button>
        </div>
        <div className="smart-table-wrapper">
          <table className="smart-table">
            <thead>
              <tr>
                <th>Stok</th>
                <th>Birim Fiyat</th>
                <th style={{ width: 80 }}>Sil</th>
              </tr>
            </thead>
            <tbody>
              {itemFields.map((field, idx) => (
                <tr key={field.id}>
                  <td>
                    <select
                      className="form-control"
                      {...register(`items.${idx}.stock_id`, { valueAsNumber: true })}
                    >
                      {stocks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register(`items.${idx}.unit_price`)}
                    />
                  </td>
                  <td>
                    <button type="button" className="pill-btn delete" onClick={() => removeItem(idx)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`stok-subscreen${activeTab === "fl-coklu" ? " active" : ""}`}>
        <div className="smart-link-header">
          <div className="smart-link-title">
            <span>🏢 Çoklu Müşteri/Tedarikçi ve Grup İlişkileri (Grid Matrisi)</span>
          </div>
          <button type="button" className="btn-add-link" onClick={addMatrixRow}>
            + ÇOKLU TEDARİKÇİ / GRUP EKLE
          </button>
        </div>
        <div className="smart-table-wrapper">
          <table className="smart-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>İşlemler</th>
                <th>Bağlantı Tipi</th>
                <th>Ünvan veya Grup Adı</th>
                <th>İskonto / Çarpan</th>
                <th>Minimum Sipariş (MOQ)</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {matrixFields.map((field, idx) => {
                const linkType = watch(`matrix.${idx}.link_type`);
                return (
                  <tr key={field.id}>
                    <td>
                      <button type="button" className="pill-btn delete" onClick={() => removeMatrix(idx)}>
                        🗑️
                      </button>
                    </td>
                    <td>
                      <select className="form-control" {...register(`matrix.${idx}.link_type`)}>
                        <option value="FIRMA">🏢 Birebir Firma</option>
                        <option value="GRUP">👥 Grup</option>
                      </select>
                    </td>
                    <td>
                      {linkType === "GRUP" ? (
                        <select
                          className="form-control"
                          {...register(`matrix.${idx}.account_group_id`, { valueAsNumber: true })}
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="form-control"
                          {...register(`matrix.${idx}.account_id`, { valueAsNumber: true })}
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="%15 İskonto"
                        {...register(`matrix.${idx}.discount_text`)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Min 50 Adet"
                        {...register(`matrix.${idx}.moq_text`)}
                      />
                    </td>
                    <td>
                      <span className="badge badge-green">Aktif</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`stok-subscreen${activeTab === "fl-yetkiler" ? " active" : ""}`}>
        <div className="user-auth-header">
          <div className="search-auth-box">
            <label>Kullanıcı Adı Soyadı, E-Posta</label>
            <input
              type="text"
              className="search-auth-input"
              placeholder="Kullanıcı ara..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <button type="button" className="btn-filtrele" onClick={searchUsers}>
              FİLTRELE
            </button>
          </div>
          <button type="button" className="btn-top blue" onClick={addPermissionRow}>
            + Yeni Kullanıcı Yetkisi Ekle
          </button>
        </div>
        <div className="smart-table-wrapper">
          <table className="auth-table">
            <thead>
              <tr>
                <th style={{ width: 340 }}>Kullanıcı Bilgileri</th>
                <th style={{ width: 280 }}>Birim Fiyata Müdahale Edebilir</th>
                <th>Minimum Birim Fiyat Altında İşlem Yapabilir</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {permFields.map((field, idx) => (
                <tr key={field.id}>
                  <td>
                    <select
                      className="form-control"
                      {...register(`permissions.${idx}.user_id`, { valueAsNumber: true })}
                      onChange={(e) => {
                        const uid = Number(e.target.value);
                        const u = users.find((x) => x.id === uid);
                        if (u) {
                          setValue(`permissions.${idx}.username`, u.username);
                          setValue(`permissions.${idx}.full_name`, u.full_name ?? "");
                          setValue(`permissions.${idx}.email`, u.email ?? "");
                        }
                      }}
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name ?? u.username} — {u.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" {...register(`permissions.${idx}.can_edit_unit_price`)} />
                  </td>
                  <td>
                    <input type="checkbox" {...register(`permissions.${idx}.can_sell_below_min`)} />
                  </td>
                  <td>
                    <button type="button" className="pill-btn delete" onClick={() => removePerm(idx)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
