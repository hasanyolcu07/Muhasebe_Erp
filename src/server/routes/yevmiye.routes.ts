/**
 * Yevmiye Fişleri REST API Rotaları
 */

import { Router } from "express";
import { YevmiyeController } from "../controllers/yevmiye.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// POST /api/yevmiye — Yeni Yevmiye Fişi Oluştur (Sadece ADMIN ve MUHASEBE_UZMANI)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  YevmiyeController.create
);

router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  YevmiyeController.list
);

router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  YevmiyeController.getById
);

// DELETE /api/yevmiye/:id — Yevmiye Fişi Sil (Yalnızca ADMIN)
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  YevmiyeController.delete
);

export default router;
