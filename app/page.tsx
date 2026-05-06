import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CalendarView from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <CalendarView currentGroup={session.group} />;
}
