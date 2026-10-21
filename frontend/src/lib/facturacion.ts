// Lógica de negocio para facturación, ventas, clientes, productos, facturas y boletas en Sabor Chugurano.
// Persistido en el backend (tablas clientes / ventas / venta_items).

import { apiFetch } from "./api";

export type Cliente = {
  id: number;
  nombre: string;
  dni?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
};

export type Producto = {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  categoria?: string;
  imagen_url?: string;
};

export type DetalleVenta = {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export type Venta = {
  id: number;
  tipo: "factura" | "boleta";
  serie: string;
  numero: string;
  cliente_id: number;
  cliente_nombre: string;
  cliente_documento: string;
  direccion?: string;
  productos: DetalleVenta[];
  subtotal: number;
  igv: number;
  total: number;
  metodo_pago: "Efectivo" | "Yape" | "Plin" | "Tarjeta" | "Transferencia" | "Mixto";
  fecha: string;
  estado: "Emitida" | "Anulada";
};

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const detalle = data.details
      ? Object.entries(data.details as Record<string, string>)
          .map(([campo, msg]) => `${campo}: ${msg}`)
          .join(", ")
      : "";
    return `${data.error || `HTTP ${res.status}`}${detalle ? ` (${detalle})` : ""}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ------------------- Clientes -------------------

export async function obtenerClientes(): Promise<Cliente[]> {
  const res = await apiFetch(`/clientes`, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function crearCliente(cliente: Omit<Cliente, "id">): Promise<Cliente> {
  const res = await apiFetch(`/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cliente),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return await res.json();
}

export async function eliminarCliente(id: number): Promise<void> {
  const res = await apiFetch(`/clientes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res));
}

// ------------------- Ventas / Comprobantes -------------------

export async function obtenerVentas(): Promise<Venta[]> {
  const res = await apiFetch(`/ventas`, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function registrarVenta(venta: Venta): Promise<Venta> {
  const res = await apiFetch(`/ventas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...venta,
      tipo: venta.tipo === "boleta" ? "Boleta" : "Factura",
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return { ...venta, id: data.id };
}

export async function actualizarVenta(
  id: number,
  datos: Pick<Venta, "cliente_nombre" | "cliente_documento" | "direccion" | "metodo_pago">
): Promise<void> {
  const res = await apiFetch(`/ventas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function anularVenta(id: number): Promise<void> {
  const res = await apiFetch(`/ventas/${id}/anular`, { method: "PATCH" });
  if (!res.ok) throw new Error(await errorMessage(res));
}
