"use client";

import { apiFetch } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Settings, 
  Grid3X3, 
  ShoppingCart, 
  DollarSign, 
  Table as TableIcon, 
  BookOpen, 
  TrendingUp, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Pencil,
  Utensils, 
  ReceiptText, 
  RefreshCw 
} from "lucide-react";
import Logo from "@/components/Logo";

type Usuario = {
  id: number;
  name: string;
  email: string;
  role_id: number;
};

type Categoria = {
  id: number;
  name: string;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  category_id: number;
  is_available: boolean;
};

type Mesa = {
  table_number: number;
  status: string;
  total_amount: number;
};

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<MenuItem[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formularios
  const [nuevoUsuario, setNuevoUsuario] = useState({ name: "", email: "", password: "123", role_id: 2 });
  const [nuevoProducto, setNuevoProducto] = useState({ name: "", price: 10.0, category_id: 1, description: "" });
  const [nuevaCategoria, setNuevaCategoria] = useState({ name: "" });
  const [categoriaEditando, setCategoriaEditando] = useState<{ id: number; name: string } | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Usuarios
      const resUsers = await apiFetch("/users");
      if (resUsers.ok) setUsuarios(await resUsers.json());

      // Categorías
      const resCats = await apiFetch("/categories");
      if (resCats.ok) setCategorias(await resCats.json());

      // Menú
      const resMenu = await apiFetch("/menu");
      if (resMenu.ok) setProductos(await resMenu.json());

      // Mesas
      const resMesas = await apiFetch("/tables/status");
      if (resMesas.ok) setMesas(await resMesas.json());
    } catch (e) {
      console.error("Error cargando datos de administración", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Agregar Usuario
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoUsuario.name || !nuevoUsuario.email) return;

    try {
      const res = await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "Administrador" },
        body: JSON.stringify(nuevoUsuario),
      });
      if (res.ok) {
        setNuevoUsuario({ name: "", email: "", password: "123", role_id: 2 });
        cargarDatos();
      } else {
        alert("Error al registrar personal");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (!confirm("¿Desea eliminar este usuario?")) return;
    try {
      const res = await apiFetch(`/users/${id}`, {
        method: "DELETE",
        headers: { "X-User-Role": "Administrador" },
      });
      if (res.ok) cargarDatos();
    } catch {
      alert("Error al eliminar");
    }
  };

  // Agregar Producto
  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.name) return;

    try {
      const res = await apiFetch("/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "Administrador" },
        body: JSON.stringify({
          name: nuevoProducto.name,
          price: nuevoProducto.price,
          category_id: nuevoProducto.category_id,
          description: nuevoProducto.description || "Plato especial de la casa",
          image_url: "/images/logo_sabor_chugurano.png",
          is_available: true,
        }),
      });
      if (res.ok) {
        setNuevoProducto({ name: "", price: 10.0, category_id: 1, description: "" });
        cargarDatos();
      } else {
        alert("Error al agregar plato");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleEliminarProducto = async (id: number) => {
    if (!confirm("¿Eliminar este plato del menú?")) return;
    try {
      const res = await apiFetch(`/menu/${id}`, {
        method: "DELETE",
        headers: { "X-User-Role": "Administrador" },
      });
      if (res.ok) cargarDatos();
    } catch {
      alert("Error al eliminar");
    }
  };

  // Categorías
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.name.trim()) return;
    try {
      const res = await apiFetch("/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "Administrador" },
        body: JSON.stringify({ name: nuevaCategoria.name.trim() }),
      });
      if (res.ok) {
        setNuevaCategoria({ name: "" });
        cargarDatos();
      } else {
        alert("Error al crear la categoría (¿nombre duplicado?)");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleGuardarCategoria = async () => {
    if (!categoriaEditando || !categoriaEditando.name.trim()) return;
    try {
      const res = await apiFetch(`/categories/${categoriaEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Role": "Administrador" },
        body: JSON.stringify({ name: categoriaEditando.name.trim() }),
      });
      if (res.ok) {
        setCategoriaEditando(null);
        cargarDatos();
      } else {
        alert("Error al actualizar la categoría");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleEliminarCategoria = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría? Los platos asociados quedarán sin categoría.")) return;
    try {
      const res = await apiFetch(`/categories/${id}`, {
        method: "DELETE",
        headers: { "X-User-Role": "Administrador" },
      });
      if (res.ok) cargarDatos();
    } catch {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo size="sm" />
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                Panel de Administración Central
              </h1>
              <p className="text-xs text-zinc-400">Gestión de Personal, Menú, Categorías y Mesas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-amber-400" : ""}`} />
              Sincronizar
            </button>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition"
            >
              Ir a Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Acceso Rápido a Módulos */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap gap-2 text-xs">
          <Link href="/facturacion" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-amber-400 font-semibold flex items-center gap-1.5">
            <ReceiptText className="w-3.5 h-3.5" /> Facturación Electrónica
          </Link>
          <Link href="/menu-diario" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-amber-400 font-semibold flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Menú Diario Configurable
          </Link>
          <Link href="/pedidos" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-semibold flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5" /> Comandas / Meseros
          </Link>
          <Link href="/caja" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-semibold flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Caja Registradora
          </Link>
          <Link href="/cocina" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Pantalla Cocina
          </Link>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* USUARIOS Y PERSONAL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-white">Usuarios y Personal ({usuarios.length})</h2>
              </div>
            </div>

            {/* Formulario nuevo usuario */}
            <form onSubmit={handleCrearUsuario} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase">Registrar Personal</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellido"
                  value={nuevoUsuario.name}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, name: e.target.value })}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                />
                <input
                  type="email"
                  required
                  placeholder="correo@saborchugurano.pe"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={nuevoUsuario.role_id}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, role_id: parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Mesero de Sala</option>
                  <option value={3}>Cajero</option>
                  <option value={4}>Cocinero / Chef</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Registrar Usuario
                </button>
              </div>
            </form>

            {/* Lista usuarios */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-zinc-400 font-mono text-[11px]">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {u.role_id === 1 ? "Admin" : u.role_id === 2 ? "Mesero" : u.role_id === 3 ? "Cajero" : "Cocina"}
                    </span>
                    <button
                      onClick={() => handleEliminarUsuario(u.id)}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MENÚ Y PLATOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-white">Carta de Platos ({productos.length})</h2>
              </div>
            </div>

            {/* Formulario nuevo plato */}
            <form onSubmit={handleCrearProducto} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase">Crear Plato en la Carta</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre del Plato"
                  value={nuevoProducto.name}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, name: e.target.value })}
                  className="sm:col-span-6 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                />
                <input
                  type="number"
                  step="0.50"
                  required
                  placeholder="Precio"
                  value={nuevoProducto.price}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, price: parseFloat(e.target.value) || 0 })}
                  className="sm:col-span-3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                />
                <select
                  value={nuevoProducto.category_id}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, category_id: parseInt(e.target.value) })}
                  className="sm:col-span-3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar a Carta
              </button>
            </form>

            {/* Lista productos */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {productos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[10px] text-zinc-400">
                      {categorias.find((c) => c.id === p.category_id)?.name || "Categoría"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-400">S/ {Number(p.price).toFixed(2)}</span>
                    <button
                      onClick={() => handleEliminarProducto(p.id)}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CATEGORÍAS DEL MENÚ */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-white">Categorías del Menú ({categorias.length})</h2>
          </div>

          <form onSubmit={handleCrearCategoria} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={nuevaCategoria.name}
              onChange={(e) => setNuevaCategoria({ name: e.target.value })}
              placeholder="Nombre de la nueva categoría (ej. Postres)"
              className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar Categoría
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs"
              >
                {categoriaEditando?.id === cat.id ? (
                  <input
                    autoFocus
                    value={categoriaEditando.name}
                    onChange={(e) => setCategoriaEditando({ id: cat.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGuardarCategoria();
                      if (e.key === "Escape") setCategoriaEditando(null);
                    }}
                    className="flex-1 min-w-0 px-2 py-1 bg-zinc-900 border border-amber-500/50 rounded-lg text-white text-xs"
                  />
                ) : (
                  <span className="font-semibold text-white truncate">{cat.name}</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      categoriaEditando?.id === cat.id
                        ? handleGuardarCategoria()
                        : setCategoriaEditando({ id: cat.id, name: cat.name })
                    }
                    className="p-1.5 text-zinc-500 hover:text-amber-400 rounded-lg transition"
                    title={categoriaEditando?.id === cat.id ? "Guardar" : "Renombrar"}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEliminarCategoria(cat.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {categorias.length === 0 && (
              <p className="text-xs text-zinc-500 col-span-full">No hay categorías registradas.</p>
            )}
          </div>
        </div>

        {/* MESAS Y ESTADO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <TableIcon className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-white">Estado de las 12 Mesas</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {mesas.map((m) => (
              <div
                key={m.table_number}
                className={`p-3 rounded-xl border text-center ${
                  m.status === "Libre"
                    ? "bg-zinc-950 border-emerald-500/30 text-emerald-400"
                    : m.status === "Ocupada"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-blue-500/10 border-blue-500/40 text-blue-400"
                }`}
              >
                <div className="font-bold text-sm">Mesa {m.table_number}</div>
                <div className="text-[10px] uppercase font-bold mt-1">{m.status}</div>
                {m.total_amount > 0 && (
                  <div className="text-[10px] text-zinc-300 font-mono mt-0.5">S/ {m.total_amount.toFixed(2)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
