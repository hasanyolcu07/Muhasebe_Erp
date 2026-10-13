import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", AuthController.login);
router.post("/login/otp", AuthController.loginOtp);
router.post("/refresh", AuthController.refresh);
router.get("/me", authenticate, AuthController.me);
router.post("/logout", authenticate, AuthController.logout);
router.get("/sessions", authenticate, AuthController.sessions);
router.delete("/sessions/:id", authenticate, AuthController.revokeSession);
router.post("/password", authenticate, AuthController.changePassword);
router.post("/2fa/setup", authenticate, AuthController.setupTotp);
router.post("/2fa/enable", authenticate, AuthController.enableTotp);
router.post("/2fa/disable", authenticate, AuthController.disableTotp);

export default router;
