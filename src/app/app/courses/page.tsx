import { redirect } from "next/navigation";

export default function CoursesPage() {
  redirect("/onboarding?edit=1");
}
