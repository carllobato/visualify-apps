/** Applied while the user scrolls down in the main scroll region (mobile only). */
export const APP_SHELL_MOBILE_HEADER_SCROLL_HIDDEN_CLASS =
  "vf-app-shell-mobile-header--scroll-hidden";

/** Minimum scroll delta (px) before toggling hide/show. */
export const APP_SHELL_MOBILE_HEADER_SCROLL_DELTA_PX = 6;

/** Always show the header when the scroll region is within this distance of the top. */
export const APP_SHELL_MOBILE_HEADER_SCROLL_TOP_PX = 4;

export function findAppShellScrollRegion(header: HTMLElement): HTMLElement | null {
  const mainColumn = header.closest(".vf-app-shell-main-column");
  if (!mainColumn) return null;
  const region = mainColumn.querySelector(".vf-app-shell-scroll-region");
  return region instanceof HTMLElement ? region : null;
}

export function syncAppShellMobileHeaderOffset(header: HTMLElement): void {
  const offset = `${header.offsetHeight}px`;
  const mainColumn = header.closest(".vf-app-shell-main-column");
  if (mainColumn instanceof HTMLElement) {
    mainColumn.style.setProperty("--vf-app-shell-mobile-header-offset", offset);
  }
}

function readAppShellScrollTop(scrollRegion: HTMLElement | null): number {
  const regionTop = scrollRegion?.scrollTop ?? 0;
  return Math.max(regionTop, window.scrollY);
}

/** Hide on scroll down, reveal on scroll up — pairs with mobile header CSS. */
export function bindAppShellMobileHeaderScroll(header: HTMLElement): () => void {
  const scrollRegion = findAppShellScrollRegion(header);
  if (!scrollRegion) {
    return () => {};
  }

  const mobileQuery = window.matchMedia("(max-width: 767px)");
  let lastScrollTop = readAppShellScrollTop(scrollRegion);
  let rafId = 0;

  const setHidden = (hidden: boolean) => {
    header.classList.toggle(APP_SHELL_MOBILE_HEADER_SCROLL_HIDDEN_CLASS, hidden);
  };

  const onScroll = () => {
    if (!mobileQuery.matches) {
      setHidden(false);
      return;
    }

    if (rafId !== 0) return;

    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      const scrollTop = readAppShellScrollTop(scrollRegion);
      const delta = scrollTop - lastScrollTop;

      if (scrollTop <= APP_SHELL_MOBILE_HEADER_SCROLL_TOP_PX) {
        setHidden(false);
      } else if (delta > APP_SHELL_MOBILE_HEADER_SCROLL_DELTA_PX) {
        setHidden(true);
      } else if (delta < -APP_SHELL_MOBILE_HEADER_SCROLL_DELTA_PX) {
        setHidden(false);
      }

      lastScrollTop = scrollTop;
    });
  };

  const onMobileChange = () => {
    if (!mobileQuery.matches) {
      setHidden(false);
      lastScrollTop = readAppShellScrollTop(scrollRegion);
    }
  };

  syncAppShellMobileHeaderOffset(header);
  const headerResizeObserver = new ResizeObserver(() => {
    syncAppShellMobileHeaderOffset(header);
  });
  headerResizeObserver.observe(header);

  const scrollRegionResizeObserver = new ResizeObserver(() => {
    lastScrollTop = readAppShellScrollTop(scrollRegion);
  });
  scrollRegionResizeObserver.observe(scrollRegion);

  scrollRegion.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  mobileQuery.addEventListener("change", onMobileChange);

  return () => {
    if (rafId !== 0) {
      window.cancelAnimationFrame(rafId);
    }
    headerResizeObserver.disconnect();
    scrollRegionResizeObserver.disconnect();
    scrollRegion.removeEventListener("scroll", onScroll);
    window.removeEventListener("scroll", onScroll);
    mobileQuery.removeEventListener("change", onMobileChange);
    setHidden(false);
    const mainColumn = header.closest(".vf-app-shell-main-column");
    if (mainColumn instanceof HTMLElement) {
      mainColumn.style.removeProperty("--vf-app-shell-mobile-header-offset");
    }
  };
}
