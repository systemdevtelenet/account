import { redirect } from "next/navigation";

export default function Home() {
  // Keep the root URL as a shortcut to the primary dashboard route.
  redirect("/dashboard");
}
