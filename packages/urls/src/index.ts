export {
  HQ_APPS_PATH,
  VISUALIFY_PRODUCT_KEYS,
  VISUALIFY_PRODUCTS,
  getProductDefinition,
  isVisualifyProductKey,
  type VisualifyProductDefinition,
  type VisualifyProductKey,
  type VisualifyProductOriginEnvVar,
} from "./products";

export { readPublicEnv, resolveOriginFromProduct } from "./env";

export {
  getHqAppsUrl,
  getProductDashboardUrl,
  getProductOrigin,
  joinOriginPath,
  normalizeOrigin,
} from "./resolve";
