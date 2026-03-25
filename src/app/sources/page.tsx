import { redirect } from "next/navigation";

/** Vaccine sources admin UI is hidden for now; remove redirect to restore `/sources`. */
export default function SourcesPage() {
  redirect("/");
}
