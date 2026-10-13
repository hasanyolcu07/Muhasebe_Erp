export function moduleForPath(path: string): string | null {
  const prefix = path.split("?")[0].split("/").filter(Boolean)[0] || "";
  const map: Record<string, string> = {
    cari: "cari",
    "cari-islemleri": "finans",
    "kasa-islemleri": "finans",
    "banka-islemleri": "finans",
    "cek-senet": "finans",
    "kasa-banka": "finans",
    demirbas: "resmi_muhasebe",
    doviz: "resmi_muhasebe",
    maliyet: "resmi_muhasebe",
    stok: "stok",
    yevmiye: "resmi_muhasebe",
    edefter: "resmi_muhasebe",
    fatura: "fatura",
    siparis: "fatura",
    irsaliye: "irsaliye",
    belge: "fatura",
    personel: "personel",
    bordro: "personel",
    sistem: "ayarlar",
    tanim: "ayarlar",
    dashboard: "dashboard",
    companies: "ayarlar",
    tenant: "dashboard",
    workspace: "dashboard",
    myasistan: "dashboard",
    kobi: "kobi",
  };
  return map[prefix] || null;
}

export function actionForMethod(method: string): "view" | "create" | "edit" | "delete" {
  const verb = method.toUpperCase();
  if (verb === "DELETE") return "delete";
  if (verb === "PUT" || verb === "PATCH") return "edit";
  if (verb === "POST") return "create";
  return "view";
}

export function roleAllows(perms: Record<string, string[]>, module: string, action: string): boolean {
  const star = perms["*"] || [];
  if (star.includes("*") || star.includes(action)) return true;
  const list = perms[module] || [];
  return list.includes("*") || list.includes(action);
}
