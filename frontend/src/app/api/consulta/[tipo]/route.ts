import type { NextRequest } from "next/server";

const API_BASE = "https://api.apis.net.pe/v2";
const TOKEN = (
  process.env.RENIEC_RUC_TOKEN ||
  process.env.NEXT_PUBLIC_RENIEC_RUC_TOKEN ||
  ""
).trim();

const RUTAS: Record<string, string> = {
  dni: "reniec/dni",
  ruc: "sunat/ruc",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  const numero = (request.nextUrl.searchParams.get("numero") || "").trim();
  const ruta = RUTAS[tipo];

  if (!ruta) {
    return Response.json({ error: "Tipo de documento no soportado" }, { status: 400 });
  }
  if (!/^\d+$/.test(numero)) {
    return Response.json({ error: "Número de documento inválido" }, { status: 400 });
  }
  if (!TOKEN) {
    return Response.json(
      { error: "Falta configurar el token RENIEC_RUC_TOKEN en el servidor" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${API_BASE}/${ruta}?numero=${encodeURIComponent(numero)}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: "No se pudo contactar el servicio de consulta de SUNAT/RENIEC" },
      { status: 502 }
    );
  }
}
