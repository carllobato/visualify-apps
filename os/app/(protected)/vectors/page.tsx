import { redirect } from "next/navigation";
import { OS_ROUTES } from "@/lib/os-routes";

export const dynamic = "force-dynamic";

/** Legacy route — bookmarks and links still use /vectors. */
export default function VectorsRedirectPage() {
  redirect(OS_ROUTES.streams);
}
