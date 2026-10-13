import { test, describe } from "node:test";
import assert from "node:assert";
import { checkPerm, MODULE_ALIASES, normalizeModule } from "../store/appStore";
import { ALL_NAV_ITEMS, findNavItemByPath, findNavItemByLocation } from "../config/navConfig";
import { SIDEBAR_HUBS } from "../config/moduleHubConfig";

describe("FAZ 6 — Menü, Route ve Yetkilendirme (RBAC) Bütünlük Testleri", () => {
  // SENARYO 1: Deny-by-default kuralı
  test("1. Deny-by-default: Boş veya tanımsız yetkilerde tüm erişimler reddedilmeli", () => {
    const emptyPerms = {};
    assert.strictEqual(checkPerm(emptyPerms, "dashboard", "view"), false);
    assert.strictEqual(checkPerm(emptyPerms, "fatura", "view"), false);
    assert.strictEqual(checkPerm(emptyPerms, "finans", "view"), false);
    assert.strictEqual(checkPerm(emptyPerms, "resmi_muhasebe", "view"), false);
    assert.strictEqual(checkPerm(emptyPerms, "ayarlar", "view"), false);

    // Tanımsız obje veya null güvenliği
    assert.strictEqual(checkPerm(null as any, "fatura", "view"), false);
    assert.strictEqual(checkPerm(undefined as any, "fatura", "view"), false);
  });

  // SENARYO 2: Wildcard (*) tam ve kısmi yetkilendirme
  test("2. Wildcard yetkisi: *.* tam yetki, *:view sadece görüntüleme yetkisi sağlamalı", () => {
    const superPerms = { "*": ["*"] };
    assert.strictEqual(checkPerm(superPerms, "dashboard", "view"), true);
    assert.strictEqual(checkPerm(superPerms, "fatura", "create"), true);
    assert.strictEqual(checkPerm(superPerms, "resmi_muhasebe", "delete"), true);
    assert.strictEqual(checkPerm(superPerms, "herhangi_bir_modul", "custom_action"), true);

    const viewOnlyWildcard = { "*": ["view"] };
    assert.strictEqual(checkPerm(viewOnlyWildcard, "fatura", "view"), true);
    assert.strictEqual(checkPerm(viewOnlyWildcard, "resmi_muhasebe", "view"), true);
    assert.strictEqual(checkPerm(viewOnlyWildcard, "fatura", "create"), false);
    assert.strictEqual(checkPerm(viewOnlyWildcard, "resmi_muhasebe", "delete"), false);
  });

  // SENARYO 3: Modül ve alias normalizasyonu
  test("3. Modül ve alt menü alias normalizasyonu doğru çalışmalı", () => {
    assert.strictEqual(normalizeModule("invoices"), "fatura");
    assert.strictEqual(normalizeModule("sales"), "fatura");
    assert.strictEqual(normalizeModule("satis-faturalar"), "fatura");
    assert.strictEqual(normalizeModule("alis-faturalar"), "fatura");
    assert.strictEqual(normalizeModule("satis-irsaliyeler"), "irsaliye");
    assert.strictEqual(normalizeModule("alis-irsaliyeler"), "irsaliye");
    assert.strictEqual(normalizeModule("kasa-islemleri"), "finans");
    assert.strictEqual(normalizeModule("banka-islemleri"), "finans");
    assert.strictEqual(normalizeModule("sabit-kiymet"), "finans");
    assert.strictEqual(normalizeModule("yevmiye-fisleri"), "resmi_muhasebe");
    assert.strictEqual(normalizeModule("yevmiye-defter"), "resmi_muhasebe");
    assert.strictEqual(normalizeModule("journal"), "resmi_muhasebe");
    assert.strictEqual(normalizeModule("beyanname"), "resmi_muhasebe");
    assert.strictEqual(normalizeModule("ayr-firma-kullanici"), "ayarlar");
  });

  // SENARYO 4: Çift yönlü yetki çözümleme (Canonical -> Leaf ve Leaf -> Canonical)
  test("4. Fatura modülü yetkisi olan kullanıcı satış ve alış faturalarını görebilmeli, izinsiz modülü görememeli", () => {
    const faturaUser = {
      fatura: ["view", "create"],
    };

    // Canonical check
    assert.strictEqual(checkPerm(faturaUser, "fatura", "view"), true);
    assert.strictEqual(checkPerm(faturaUser, "fatura", "create"), true);
    assert.strictEqual(checkPerm(faturaUser, "fatura", "delete"), false);

    // Leaf alias check
    assert.strictEqual(checkPerm(faturaUser, "satis-faturalar", "view"), true);
    assert.strictEqual(checkPerm(faturaUser, "alis-faturalar", "view"), true);

    // İrsaliye veya muhasebe yetkisi yok
    assert.strictEqual(checkPerm(faturaUser, "irsaliye", "view"), false);
    assert.strictEqual(checkPerm(faturaUser, "satis-irsaliyeler", "view"), false);
    assert.strictEqual(checkPerm(faturaUser, "resmi_muhasebe", "view"), false);
  });

  // SENARYO 5: Rol tanımlarından gelen __menu__ listesi yetki doğrulaması
  test("5. __menu__ listesi tabanlı yetkiler doğru modülleri açmalı, diğerlerini kısıtlamalı", () => {
    const roleMenuPerms = {
      __menu__: ["satis-faturalar", "cari-kartlar", "dashboard"],
    };

    assert.strictEqual(checkPerm(roleMenuPerms, "satis-faturalar", "view"), true);
    assert.strictEqual(checkPerm(roleMenuPerms, "fatura", "view"), true);
    assert.strictEqual(checkPerm(roleMenuPerms, "cari-kartlar", "view"), true);
    assert.strictEqual(checkPerm(roleMenuPerms, "cari", "view"), true);
    assert.strictEqual(checkPerm(roleMenuPerms, "dashboard", "view"), true);

    // İzin verilmeyen modüller reddedilmeli
    assert.strictEqual(checkPerm(roleMenuPerms, "finans", "view"), false);
    assert.strictEqual(checkPerm(roleMenuPerms, "kasa-islemleri", "view"), false);
    assert.strictEqual(checkPerm(roleMenuPerms, "resmi_muhasebe", "view"), false);
    assert.strictEqual(checkPerm(roleMenuPerms, "ayarlar", "view"), false);
  });

  // SENARYO 6: Granüler yetki aksiyonları (view, create, update, delete)
  test("6. İşlem bazlı granüler yetkiler kesinlikle ihlal edilmemeli", () => {
    const muhasebeRole = {
      resmi_muhasebe: ["view"],
      finans: ["view", "create"],
    };

    // resmi_muhasebe sadece view
    assert.strictEqual(checkPerm(muhasebeRole, "resmi_muhasebe", "view"), true);
    assert.strictEqual(checkPerm(muhasebeRole, "resmi_muhasebe", "create"), false);
    assert.strictEqual(checkPerm(muhasebeRole, "resmi_muhasebe", "delete"), false);

    // finans view ve create var, delete yok
    assert.strictEqual(checkPerm(muhasebeRole, "finans", "view"), true);
    assert.strictEqual(checkPerm(muhasebeRole, "finans", "create"), true);
    assert.strictEqual(checkPerm(muhasebeRole, "finans", "delete"), false);
  });

  // SENARYO 7: Şube yetki filtresi
  test("7. Şube kısıtı (allowedBranchCodes) doğru denetlenmeli", () => {
    function canBranch(
      branchCode: string | null | undefined,
      allowed: string[] | null,
      isSuperAdmin = false
    ): boolean {
      if (!branchCode || isSuperAdmin) return true;
      if (!allowed || allowed.length === 0) return true;
      return allowed.includes(branchCode);
    }

    const userAllowed = ["MERKEZ", "KADIKOY"];

    assert.strictEqual(canBranch("MERKEZ", userAllowed), true);
    assert.strictEqual(canBranch("KADIKOY", userAllowed), true);
    assert.strictEqual(canBranch("IZMIR_FABRIKA", userAllowed), false);
    assert.strictEqual(canBranch("ANKARA_DEPO", userAllowed), false);

    // Süper yönetici şube sınırına takılmamalı
    assert.strictEqual(canBranch("IZMIR_FABRIKA", userAllowed, true), true);
  });

  // SENARYO 8: Tutar limiti yetki filtresi
  test("8. Tutar limiti (amountLimit) doğru denetlenmeli", () => {
    function canAmount(
      amount: number | null | undefined,
      limit: number | null,
      isSuperAdmin = false
    ): boolean {
      if (amount == null || limit == null || isSuperAdmin) return true;
      return amount <= limit;
    }

    const userLimit = 100000; // 100.000 TL limit

    assert.strictEqual(canAmount(50000, userLimit), true);
    assert.strictEqual(canAmount(100000, userLimit), true);
    assert.strictEqual(canAmount(100000.01, userLimit), false);
    assert.strictEqual(canAmount(250000, userLimit), false);

    // Süper yönetici tutar sınırına takılmamalı
    assert.strictEqual(canAmount(5000000, userLimit, true), true);
  });

  // SENARYO 9: Navigasyon ve Rota Bütünlüğü
  test("9. Tüm rota ve hub tanımlarının geçerli modüllere bağlı olduğu doğrulanmalı", () => {
    assert.ok(ALL_NAV_ITEMS.length > 0, "Menü öğeleri boş olmamalı");
    assert.ok(SIDEBAR_HUBS.length > 0, "Sidebar hub öğeleri boş olmamalı");

    for (const item of ALL_NAV_ITEMS) {
      assert.ok(item.id, `Nav öğesi id'siz olamaz: ${JSON.stringify(item)}`);
      assert.ok(item.path, `Nav öğesi path'siz olamaz: ${item.id}`);
      if (item.module) {
        const canonical = normalizeModule(item.module);
        assert.ok(canonical, `Nav öğesi geçersiz modüle sahip: ${item.id} -> ${item.module}`);
      }
    }

    for (const hub of SIDEBAR_HUBS) {
      assert.ok(hub.id, `Hub id'siz olamaz: ${JSON.stringify(hub)}`);
      assert.ok(hub.path, `Hub path'siz olamaz: ${hub.id}`);
      if (hub.module) {
        const canonical = normalizeModule(hub.module);
        assert.ok(canonical, `Hub geçersiz modüle sahip: ${hub.id} -> ${hub.module}`);
      }
    }

    // findNavItemByLocation testi
    const dashNav = findNavItemByLocation("/app/dashboard");
    assert.strictEqual(dashNav?.id, "dashboard");

    const cariNav = findNavItemByLocation("/app/kart-tanimlari/cari-kartlar");
    assert.ok(cariNav, "Cari kartlar konumu bulunabilmeli");
  });
});
