import GeoLearner from "./geolearner";
import { getSession } from "@/lib/auth";
import geography from "@/data/geography.json";
import { connection } from "next/server";

export const instant = false;

export default async function Home() {
  await connection();
  const session = await getSession();

  return <GeoLearner email={session?.email ?? null} geography={geography} />;
}
