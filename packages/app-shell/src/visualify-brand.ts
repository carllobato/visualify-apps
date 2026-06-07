/** Bumped when `public/visualify-brand-mark.png` changes — busts browser cache for static PNGs. */
const VISUALIFY_BRAND_MARK_VERSION = "20260607";

/** Visualify symbol — host app serves `public/visualify-brand-mark.png`. */
export const VISUALIFY_BRAND_MARK_SRC = `/visualify-brand-mark.png?v=${VISUALIFY_BRAND_MARK_VERSION}`;

/** @deprecated Use {@link VISUALIFY_BRAND_MARK_SRC}. */
export const VISUALIFY_BRAND_MARK_LIGHT_SRC = VISUALIFY_BRAND_MARK_SRC;

/** @deprecated Dark theme uses CSS invert on {@link VISUALIFY_BRAND_MARK_SRC}. */
export const VISUALIFY_BRAND_MARK_DARK_SRC = VISUALIFY_BRAND_MARK_SRC;

/** @deprecated Use {@link VISUALIFY_BRAND_MARK_SRC}. */
export const APP_LOGIN_DEFAULT_BRAND_MARK_SRC = VISUALIFY_BRAND_MARK_SRC;

/** Light-theme full wordmark — host app serves `public/visualify-logo-light.png`. */
export const VISUALIFY_LOGO_LIGHT_SRC = `/visualify-logo-light.png?v=${VISUALIFY_BRAND_MARK_VERSION}`;

/** Dark-theme full wordmark — host app serves `public/visualify-logo-dark.png`. */
export const VISUALIFY_LOGO_DARK_SRC = `/visualify-logo-dark.png?v=${VISUALIFY_BRAND_MARK_VERSION}`;

export const visualifyBrandMarkClassName = "vf-visualify-brand-mark";

export const visualifyWordmarkClassName = "vf-visualify-wordmark";

/** Symbol size in platform rails and signed-out login rail (fits the 40px icon well). */
export const VISUALIFY_BRAND_MARK_RAIL_PX = 32;

/** Symbol size on login cards. */
export const VISUALIFY_BRAND_MARK_CARD_PX = 40;
