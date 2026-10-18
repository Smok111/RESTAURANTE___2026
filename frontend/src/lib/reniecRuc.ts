// Módulo para consultar DNI (RENIEC) y RUC (SUNAT).
// Las llamadas se hacen contra el proxy interno /api/consulta/[tipo], que a su
// vez consulta a apis.net.pe desde el servidor. Así el token nunca se expone al
// navegador y se evita el bloqueo por CORS.

export type ConsultaDniResponse = {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
};

export type ConsultaRucResponse = {
  ruc: string;
  razonSocial: string;
  estado: string;
  condicion: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
};

async function consultar(numero: string, tipo: "dni" | "ruc") {
  const res = await fetch(`/api/consulta/${tipo}?numero=${encodeURIComponent(numero)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 422) {
    throw new Error(data.error || "El documento no cumple el formato válido");
  }
  if (res.status === 404) {
    throw new Error("No se encontró el documento en los registros de SUNAT/RENIEC");
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Error al consultar (HTTP ${res.status})`);
  }

  return data;
}

export async function consultarDNI(dni: string): Promise<ConsultaDniResponse> {
  const cleanDni = dni.trim();
  if (!/^\d{8}$/.test(cleanDni)) {
    throw new Error("El DNI debe tener 8 dígitos numéricos");
  }

  const data = await consultar(cleanDni, "dni");

  const nombreCompleto =
    data.nombreCompleto ||
    data.nombre ||
    `${data.nombres || ""} ${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim();

  return {
    dni: cleanDni,
    nombres: data.nombres || "",
    apellidoPaterno: data.apellidoPaterno || "",
    apellidoMaterno: data.apellidoMaterno || "",
    nombreCompleto,
  };
}

export async function consultarRUC(ruc: string): Promise<ConsultaRucResponse> {
  const cleanRuc = ruc.trim();
  if (!/^\d{11}$/.test(cleanRuc)) {
    throw new Error("El RUC debe tener 11 dígitos numéricos");
  }

  const data = await consultar(cleanRuc, "ruc");

  return {
    ruc: cleanRuc,
    razonSocial: data.razonSocial || data.nombre || "",
    estado: data.estado || "ACTIVO",
    condicion: data.condicion || "HABIDO",
    direccion: data.direccion || "",
    departamento: data.departamento || "",
    provincia: data.provincia || "",
    distrito: data.distrito || "",
  };
}
