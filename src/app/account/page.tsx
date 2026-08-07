import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  } else if (session.user.role === "DEALER") {
    redirect("/dealer");
  } else {
    redirect("/customer");
  }
}
