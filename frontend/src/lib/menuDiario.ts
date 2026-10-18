// Lógica de negocio para Menú Diario Configurable en Sabor Chugurano
// Persistido en el backend (tabla daily_menus) para que sea compartido entre meseros,
// cocina y la vista pública.

import { apiFetch } from "./api";

export type Plato = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: "Segundo" | "Entrada" | "Sopa" | "Postre" | "Bebida";
  imagen_url?: string;
  disponible: boolean;
};

export type MenuDia = {
  id: number;
  fecha: string; // YYYY-MM-DD
  activo: boolean;
  precio_menu: number; // Por defecto S/ 10.00
  entradas: string[];
  platos: Plato[];
  notas?: string;
  created_at?: string;
};

const ENDPOINT = "/daily-menus";

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function obtenerMenus(): Promise<MenuDia[]> {
  const res = await apiFetch(ENDPOINT, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function obtenerMenuPorFecha(fecha: string): Promise<MenuDia | null> {
  const res = await apiFetch(`${ENDPOINT}/${fecha}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await errorMessage(res));
  return await res.json();
}

// Crea o actualiza el menú de una fecha (el backend hace upsert por fecha).
export async function guardarMenu(menu: MenuDia): Promise<MenuDia> {
  const res = await apiFetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(menu),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return await res.json();
}

export async function eliminarMenu(id: number): Promise<void> {
  const res = await apiFetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export function crearMenuBorrador(fecha: string): MenuDia {
  return {
    id: 0,
    fecha,
    activo: true,
    precio_menu: 10.0,
    entradas: ["Sopa del Día", "Papa a la Huancaína"],
    platos: [
      { id: 101, nombre: "Costilla Dorada", precio: 10.0, categoria: "Segundo", disponible: true },
      { id: 102, nombre: "Seco de Pollo", precio: 10.0, categoria: "Segundo", disponible: true },
      { id: 103, nombre: "Pescado Frito", precio: 10.0, categoria: "Segundo", disponible: true },
      { id: 104, nombre: "Pota Saltada", precio: 10.0, categoria: "Segundo", disponible: true },
    ],
    notas: "Incluye entrada y refresco",
  };
}

export async function copiarMenu(fechaOrigen: string, fechaDestino: string): Promise<MenuDia | null> {
  const origen = await obtenerMenuPorFecha(fechaOrigen);
  if (!origen) return null;

  const nuevo: MenuDia = {
    ...origen,
    id: 0,
    fecha: fechaDestino,
    activo: true,
  };
  return await guardarMenu(nuevo);
}
