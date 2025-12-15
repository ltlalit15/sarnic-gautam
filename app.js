import { Router } from "express";
import AuthRoutes from "./Routers/AuthRoute.js";
import brandRoute from "./Routers/brandRoute.js";
import industryRoutes from "./Routers/IndustryRoute.js";
import flavourRoutes from "./Routers/flavourRoute.js";
import packtypeRoute from "./Routers/packtypeRoute.js";
import packcodeRoutes from "./Routers/packcodeRoute.js";
import subBrandRoute from "./Routers/subBrandRoute.js";
import clintSupplierRoutes from "./Routers/clientSupplier.Routes.js";
import projectRoutes from "./Routers/project.Routes.js";
import jobRoutes from "./Routers/jobRoutes.js";
import companyRoutes from "./Routers/company.routes.js";
import taxCategoryRoutes from "./Routers/taxCategory.routes.js";




const router = Router();

router.use("/api/s1", AuthRoutes);
router.use("/api/s1", brandRoute);
router.use("/api/s1", industryRoutes);
router.use("/api/s1", flavourRoutes);
router.use("/api/s1", packtypeRoute);
router.use("/api/s1", packcodeRoutes);
router.use("/api/s1", subBrandRoute);
router.use("/api/s1", clintSupplierRoutes);   
router.use("/api/s1", projectRoutes);
router.use("/api/s1", jobRoutes);
router.use("/api/s1", companyRoutes);
router.use("/api/s1", taxCategoryRoutes);




export default router;
