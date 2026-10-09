import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { setupApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LICENSE = `TABIAERP YAZILIM LİSANS SÖZLEŞMESİ

Bu yazılım TabiaERP ürünüdür. Kurulum ve kullanım, lisans şartlarına tabidir.
Verileriniz yerel PostgreSQL sunucunuzda saklanır. Üçüncü kişilere izinsiz aktarım yapılamaz.
Üretim ortamında JWT secret ve veritabanı şifrelerini mutlaka değiştirin.

Kurulum sihirbazı: şirket veritabanını tabiadb şablonundan kopyalar; hesap planı, birimler,
vergi oranları, kayıt türleri ve para birimlerini otomatik oluşturur.`;

const dirSchema = z.object({
  install_dir: z.string().min(3, "Kurulum dizini zorunludur"),
});

const pgSchema = z.object({
  host: z.string().min(1, "Host zorunludur"),
  port: z.number().int().min(1, "Geçerli port girin").max(65535),
  user: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
});

const companySchema = z.object({
  name: z.string().min(2, "Ticari unvan zorunludur"),
  tax_number: z
    .string()
    .min(10, "Vergi no en az 10 karakter olmalıdır")
    .max(11, "Vergi no en fazla 11 karakter olabilir"),
  db_name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{2,62}$/, "Örn: sirket2026 (küçük harf, rakam, alt çizgi)"),
  admin_first_name: z.string().min(2, "Ad zorunludur"),
  admin_last_name: z.string().min(2, "Soyad zorunludur"),
  admin_email: z.string().email("Geçerli bir e-posta girin"),
  admin_username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
  admin_password: z
    .string()
    .min(6, "Şifre en az 6 karakter olmalıdır")
    .regex(/[A-Z]/, "Şifrede en az bir büyük harf olmalı")
    .regex(/[0-9]/, "Şifrede en az bir rakam olmalı"),
});

type DirForm = z.infer<typeof dirSchema>;
type PgForm = z.infer<typeof pgSchema>;
type CompanyForm = z.infer<typeof companySchema>;

const STEP_LABELS = [
  "Lisans",
  "Dizin",
  "PostgreSQL",
  "Şirket",
  "Veritabanı",
  "Tamam",
] as const;

export function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [accept, setAccept] = useState(false);
  const [pgOk, setPgOk] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [seedInfo, setSeedInfo] = useState<Record<string, unknown> | null>(null);

  const [installDir, setInstallDir] = useState(
    "D:\\SanalSRV\\__PROJELER\\Tabia_Muhasebe_Erp"
  );
  const [pg, setPg] = useState<PgForm>({
    host: "127.0.0.1",
    port: 5433,
    user: "tabia",
    password: "tabia2026",
  });
  const [company, setCompany] = useState<CompanyForm>({
    name: "Tabia Demo Limited Şirketi",
    tax_number: "1234567890",
    db_name: "sirket2026",
    admin_first_name: "Sistem",
    admin_last_name: "Yöneticisi",
    admin_email: "admin@tabia.local",
    admin_username: "admin",
    admin_password: "Admin123!",
  });

  const dirForm = useForm<DirForm>({
    resolver: zodResolver(dirSchema),
    defaultValues: { install_dir: installDir },
  });
  const pgForm = useForm<PgForm>({
    resolver: zodResolver(pgSchema),
    defaultValues: pg,
  });
  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: company,
  });

  const dots = useMemo(() => [1, 2, 3, 4, 5, 6], []);

  function clearFeedback() {
    setErr("");
    setMsg("");
  }

  async function onDirSubmit(values: DirForm) {
    clearFeedback();
    setBusy(true);
    try {
      const r = await setupApi.directory(values.install_dir);
      setInstallDir(r.install_dir || values.install_dir);
      setMsg(r.message);
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dizin doğrulanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function onTestPg() {
    clearFeedback();
    setPgOk(false);
    const valid = await pgForm.trigger();
    if (!valid) return;
    const values = pgForm.getValues();
    setBusy(true);
    try {
      const r = await setupApi.testPg(values);
      setPg(values);
      setPgOk(true);
      setMsg(
        r.message + (r.version ? ` · ${String(r.version).slice(0, 48)}…` : "")
      );
    } catch (e) {
      setPgOk(false);
      setErr(e instanceof Error ? e.message : "Bağlantı testi başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function goCompanyStep() {
    clearFeedback();
    const valid = await pgForm.trigger();
    if (!valid) return;
    if (!pgOk) {
      setErr("Devam etmeden önce «Bağlantıyı Test Et» ile başarılı bağlantı alın.");
      return;
    }
    setPg(pgForm.getValues());
    setStep(4);
  }

  async function onCompanySubmit(values: CompanyForm) {
    clearFeedback();
    setCompany(values);
    setStep(5);
  }

  async function runSetup() {
    clearFeedback();
    setBusy(true);
    try {
      const r = (await setupApi.run({
        accept_license: accept,
        install_dir: installDir,
        pg: { ...pg, database: "postgres" },
        company: {
          code: company.db_name.toUpperCase().slice(0, 32),
          name: company.name,
          trade_name: company.name,
          tax_number: company.tax_number,
          db_name: company.db_name,
          admin_username: company.admin_username,
          admin_email: company.admin_email,
          admin_password: company.admin_password,
          admin_first_name: company.admin_first_name,
          admin_last_name: company.admin_last_name,
          admin_full_name: `${company.admin_first_name} ${company.admin_last_name}`.trim(),
        },
      })) as Record<string, unknown>;
      setResult(r);
      const db = r.database as Record<string, unknown> | undefined;
      setSeedInfo((db?.seed as Record<string, unknown>) || null);
      setStep(6);
      setMsg("Kurulum tamamlandı");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kurulum hatası");
    } finally {
      setBusy(false);
    }
  }

  const login = (result?.login || {}) as Record<string, string>;

  return (
    <div className="wizard-page">
      <Card className="wizard-card border-0 shadow-2xl">
        <CardHeader>
          <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-sidebar px-3 py-1.5 text-xs font-bold text-white">
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-black">TB</span>
            TabiaERP Kurulum
          </div>
          <CardTitle>Kurulum Sihirbazı</CardTitle>
          <CardDescription>6 adımda canlı PostgreSQL ile kurulum</CardDescription>
          <div className="step-dots mt-4">
            {dots.map((d) => (
              <div
                key={d}
                title={STEP_LABELS[d - 1]}
                className={cn(
                  "step-dot",
                  d === step && "active",
                  d < step && "done"
                )}
              >
                {d}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Adım {step}/6 — {STEP_LABELS[step - 1]}
          </p>
        </CardHeader>
        <CardContent>
          {err ? <div className="alert-error mb-3">{err}</div> : null}
          {msg ? <div className="alert-ok mb-3">{msg}</div> : null}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">1. Hoş geldiniz + Lisans</h3>
              <Textarea readOnly rows={9} value={LICENSE} className="font-mono text-xs" />
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <Checkbox
                  checked={accept}
                  onCheckedChange={(v) => setAccept(v === true)}
                />
                Lisans sözleşmesini okudum ve kabul ediyorum
              </label>
              <div className="flex justify-end">
                <Button disabled={!accept} onClick={() => setStep(2)}>
                  Devam
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form className="space-y-4" onSubmit={dirForm.handleSubmit(onDirSubmit)}>
              <h3 className="text-base font-bold text-slate-800">2. Kurulum dizini</h3>
              <div className="space-y-2">
                <Label htmlFor="install_dir">Dizin</Label>
                <Input id="install_dir" {...dirForm.register("install_dir")} />
                {dirForm.formState.errors.install_dir ? (
                  <p className="text-xs font-semibold text-red-600">
                    {dirForm.formState.errors.install_dir.message}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Geri
                </Button>
                <Button type="submit" disabled={busy}>
                  Dizini Doğrula
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <h3 className="text-base font-bold text-slate-800">3. PostgreSQL bağlantısı</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ["host", "Host", "text"],
                    ["port", "Port", "number"],
                    ["user", "Kullanıcı", "text"],
                    ["password", "Şifre", "password"],
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={type}
                      {...pgForm.register(key, key === "port" ? { valueAsNumber: true } : undefined)}
                    />
                    {pgForm.formState.errors[key] ? (
                      <p className="text-xs font-semibold text-red-600">
                        {pgForm.formState.errors[key]?.message as string}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              {pgOk ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  Bağlantı doğrulandı — devam edebilirsiniz
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Devam için önce bağlantıyı test edin.
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  Geri
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={busy} onClick={onTestPg}>
                    Bağlantıyı Test Et
                  </Button>
                  <Button type="button" disabled={busy || !pgOk} onClick={goCompanyStep}>
                    Devam
                  </Button>
                </div>
              </div>
            </form>
          )}

          {step === 4 && (
            <form className="space-y-4" onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
              <h3 className="text-base font-bold text-slate-800">4. Şirket tanımlama</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Ticari unvan</Label>
                  <Input id="name" {...companyForm.register("name")} />
                  {companyForm.formState.errors.name ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Vergi no</Label>
                  <Input id="tax_number" {...companyForm.register("tax_number")} />
                  {companyForm.formState.errors.tax_number ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.tax_number.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db_name">Veritabanı adı</Label>
                  <Input id="db_name" placeholder="sirket2026" {...companyForm.register("db_name")} />
                  {companyForm.formState.errors.db_name ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.db_name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_first_name">Admin ad</Label>
                  <Input id="admin_first_name" {...companyForm.register("admin_first_name")} />
                  {companyForm.formState.errors.admin_first_name ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.admin_first_name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_last_name">Admin soyad</Label>
                  <Input id="admin_last_name" {...companyForm.register("admin_last_name")} />
                  {companyForm.formState.errors.admin_last_name ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.admin_last_name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_email">E-posta</Label>
                  <Input id="admin_email" type="email" {...companyForm.register("admin_email")} />
                  {companyForm.formState.errors.admin_email ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.admin_email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_username">Kullanıcı adı</Label>
                  <Input id="admin_username" {...companyForm.register("admin_username")} />
                  {companyForm.formState.errors.admin_username ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.admin_username.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin_password">Şifre</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    {...companyForm.register("admin_password")}
                  />
                  {companyForm.formState.errors.admin_password ? (
                    <p className="text-xs font-semibold text-red-600">
                      {companyForm.formState.errors.admin_password.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                  Geri
                </Button>
                <Button type="submit">Devam</Button>
              </div>
            </form>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">5. Veritabanı oluşturma</h3>
              <p className="text-sm text-slate-600">
                Şablon DB (<code className="rounded bg-slate-100 px-1">tabiadb</code>) üzerinden
                kopyalama + tablolar/ilişkiler + seed uygulanacak.
              </p>
              <ul className="ml-5 list-disc space-y-1 text-sm text-slate-700">
                <li>Standart hesap planı</li>
                <li>Birimler (Adet, Kg, Litre, Metre)</li>
                <li>Vergi oranları (KDV %0, %1, %10, %20)</li>
                <li>Kayıt türleri (Resmi, Gayri Resmi)</li>
                <li>Para birimleri (TRY, USD, EUR)</li>
              </ul>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Hedef DB: <strong>{company.db_name}</strong> · Şirket:{" "}
                <strong>{company.name}</strong>
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(4)}>
                  Geri
                </Button>
                <Button disabled={busy} onClick={runSetup}>
                  {busy ? "Oluşturuluyor..." : "Veritabanını Oluştur"}
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">6. Uygulama hazır</h3>
              <div className="alert-ok">Kurulum başarıyla tamamlandı. Backend ve frontend adresleri aşağıda.</div>
              <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <div>
                  <span className="font-bold">Kullanıcı:</span> {login.username || company.admin_username}
                </div>
                <div>
                  <span className="font-bold">Şifre:</span> {login.password || company.admin_password}
                </div>
                <div>
                  <span className="font-bold">API:</span> {login.api || "http://127.0.0.1:8010"}
                </div>
                <div>
                  <span className="font-bold">Frontend:</span>{" "}
                  {login.frontend || "http://127.0.0.1:5173"}
                </div>
                <div>
                  <span className="font-bold">Giriş:</span>{" "}
                  {login.login_url || "http://127.0.0.1:5173/login"}
                </div>
              </div>
              {seedInfo ? (
                <pre className="overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify({ seed: seedInfo, database: result?.database }, null, 2)}
                </pre>
              ) : null}
              <Link to="/login">
                <Button className="w-full sm:w-auto">Giriş Ekranına Git</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
