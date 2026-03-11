import express from "express";
import adminController from "../controllers/admin/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router=express.Router();

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/dashboard",authMiddleware.adminAuth,adminController.loadDashboard)
router.get("/users",authMiddleware.adminAuth,adminController.loadUsers)
router.post("/block-user/:id",authMiddleware.adminAuth,adminController.toggleBlockUser)
router.get("/logout",adminController.logout)



export default router;