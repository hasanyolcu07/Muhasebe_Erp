import { Router, Request, Response } from "express";
import { z } from "zod";
import { authorize } from "../middleware/auth.middleware";
import { PublicError, toPublicMessage } from "../security/publicError";
import { approveYearEnd, listYearEndOperations, previewYearEnd } from "../services/yearEnd.service";

export const yearEndRouter = Router();

const previewSchema = z.object({
  fiscal_year: z.coerce.number().int(),
  operation_key: z.string().optional(),
  preparation_mode: z.enum(["MANUAL", "AI"]).optional(),
  branch_id: z.coerce.number().optional(),
  record_type_id: z.coerce.number().optional(),
});

function companyIdOf(req: Request): number {
  const id = req.user?.companyId;
  if (!id) throw new PublicError("Şirket kapsamı bulunamadı.", 401);
  return id;
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error: unknown) => {
      if (res.headersSent) return;
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Girdi doğrulama hatası", message: "Girdi doğrulama hatası" });
        return;
      }
      const pub = toPublicMessage(error, "Yıl sonu işlemi tamamlanamadı.");
      res.status(pub.status).json({ success: false, error: pub.message, message: pub.message });
    });
  };
}

yearEndRouter.get("/sistem/yil-sonu/operations", asyncRoute(async (_req, res) => {
  res.json(await listYearEndOperations());
}));

yearEndRouter.post(
  "/sistem/yil-sonu/preview",
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  asyncRoute(async (req, res) => {
    const body = previewSchema.parse(req.body ?? {});
    const run = await previewYearEnd(companyIdOf(req), body);
    res.json(run);
  })
);

yearEndRouter.post(
  "/sistem/yil-sonu/:id/onayla",
  authorize(["ADMIN"]),
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new PublicError("Taslak numarası geçersiz.", 400);
    const run = await approveYearEnd(companyIdOf(req), req.user!.userId, id, String(req.body?.reason ?? ""));
    res.json(run);
  })
);

yearEndRouter.post(
  "/yevmiye/yil-sonu",
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  asyncRoute(async (req, res) => {
    const body = previewSchema.parse({ ...(req.body ?? {}), operation_key: "kapanis-fisi" });
    const run = await previewYearEnd(companyIdOf(req), body);
    res.json(run);
  })
);

yearEndRouter.post(
  "/yevmiye/yil-sonu/:id/onayla",
  authorize(["ADMIN"]),
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new PublicError("Taslak numarası geçersiz.", 400);
    const run = await approveYearEnd(companyIdOf(req), req.user!.userId, id, String(req.body?.reason ?? ""));
    res.json(run);
  })
);
