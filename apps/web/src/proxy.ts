import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that don't require authentication
// /api/notificacoes/cron authenticates via x-cron-secret header (external scheduler)
const publicRoutes = ["/login", "/register", "/api/auth", "/api/notificacoes/cron"];

// Role-based route access
const allModuleRoutes = ["/admin", "/dashboard", "/obras", "/cronograma", "/andamento", "/rdo", "/financeiro", "/materiais", "/equipe", "/documentos", "/qualidade", "/seguranca", "/galeria", "/orcamentos", "/orcador", "/contratos", "/ocorrencias", "/notificacoes", "/relatorios", "/configuracoes"];
const roleRoutes: Record<string, string[]> = {
  SUPER_ADMIN: allModuleRoutes,
  ADMIN: allModuleRoutes,
  ENGENHEIRO: ["/dashboard", "/obras", "/cronograma", "/andamento", "/rdo", "/materiais", "/equipe", "/documentos", "/qualidade", "/seguranca", "/galeria", "/ocorrencias", "/notificacoes", "/relatorios"],
  ENCARREGADO: ["/dashboard", "/obras", "/andamento", "/rdo", "/materiais", "/equipe", "/seguranca", "/galeria", "/ocorrencias", "/notificacoes"],
  FINANCEIRO: ["/dashboard", "/obras", "/financeiro", "/orcamentos", "/orcador", "/contratos", "/notificacoes", "/relatorios"],
  ALMOXARIFE: ["/dashboard", "/obras", "/materiais", "/notificacoes"],
  CLIENTE: ["/dashboard", "/obras", "/documentos", "/galeria", "/notificacoes", "/relatorios"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    // APIs respondem 401 JSON (o app mobile usa esse status para encerrar a sessão)
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // APIs are protected only by authentication; role checks apply to pages.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Check role-based access
  const userRole = token.role as string;
  const allowedRoutes = roleRoutes[userRole] || [];

  // Allow root redirect
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Check if the path is allowed for the user's role
  const isAllowed = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!isAllowed) {
    // Redirect to obras dashboard if role doesn't have access
    return NextResponse.redirect(new URL("/obras", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
