import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/prisma";
import { assertStrongPassword } from "../src/server/security/password";
import { MEVZUAT_SEED_TASLAK, mevzuatSeedYazilabilir } from "./mevzuat.seed";

type CoaRow = { code: string; name: string; account_level?: string; is_postable?: boolean; is_system?: boolean };

export async function seedChart(companyId: number) {
  const file = path.resolve("src/data/tdhp_seed.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as CoaRow[];
  const data = rows
    .filter((row) => row.code && row.name)
    .map((row) => ({
      companyId,
      kod: row.code,
      ad: row.name,
      seviye: row.account_level || "ANA",
      isPostable: Boolean(row.is_postable),
      kilitli: row.account_level === "SINIF" || row.account_level === "ALT_SINIF" || row.account_level === "ANA" || row.is_system === true,
    }));
  const chunk = 200;
  for (let i = 0; i < data.length; i += chunk) {
    await prisma.hesapPlani.createMany({ data: data.slice(i, i + chunk), skipDuplicates: true });
  }
}

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  assertStrongPassword(password);
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@tabiaerp.local").toLowerCase();
  const year = new Date().getFullYear();

  const company = await prisma.company.upsert({
    where: { code: "TABIA" },
    update: { name: "Tabia Çivi ve Tel İmalat Sanayi A.Ş.", isActive: true },
    create: {
      code: "TABIA",
      name: "Tabia Çivi ve Tel İmalat Sanayi A.Ş.",
      vkn: "1234567890",
      branches: { create: { code: "MERKEZ", name: "Merkez" } },
      periods: { create: { year, isClosed: false } },
      depolar: { create: { code: "MERKEZ", name: "Merkez Depo" } },
      fiyatlar: { create: { code: "STANDART", name: "Standart Liste" } },
    },
  });

  await prisma.fiscalPeriod.upsert({
    where: { companyId_year: { companyId: company.id, year } },
    update: {},
    create: { companyId: company.id, year, isClosed: false },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, isActive: true, companyId: company.id, role: "ADMIN", failedLoginCount: 0, lockedUntil: null },
    create: {
      companyId: company.id,
      username,
      email,
      fullName: "Sistem Yöneticisi",
      passwordHash,
      role: "ADMIN",
      passwordChangedAt: new Date(),
    },
  });
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "ADMIN" },
    create: { userId: user.id, companyId: company.id, role: "ADMIN" },
  });
  await seedChart(company.id);
  if (!mevzuatSeedYazilabilir()) {
    console.log(`Mevzuat parametreleri yazılmadı. Doğrulanacak anahtar sayısı: ${MEVZUAT_SEED_TASLAK.length}`);
  }
  console.log(`Kurulum hazır. Kullanıcı: ${username}`);
}

const entry = process.argv[1]?.replace(/\\/g, "/") || "";
if (entry.endsWith("prisma/seed.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
