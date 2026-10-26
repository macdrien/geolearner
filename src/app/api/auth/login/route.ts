import { NextResponse } from "next/server";
import {
  createSessionToken,
  credentialsAreConfigured,
  credentialsMatch,
  sessionCookie,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!credentialsAreConfigured()) {
    return NextResponse.json(
      { error: "La connexion n’est pas encore configurée sur le serveur." },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "La requête de connexion est invalide." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.email.length > 254 ||
    body.password.length > 1024
  ) {
    return NextResponse.json(
      { error: "Adresse e-mail ou mot de passe incorrect." },
      { status: 401 },
    );
  }

  if (!credentialsMatch(body.email, body.password)) {
    return NextResponse.json(
      { error: "Adresse e-mail ou mot de passe incorrect." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    sessionCookie.name,
    createSessionToken(body.email.trim().toLowerCase()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: sessionCookie.maxAge,
    },
  );

  return response;
}
