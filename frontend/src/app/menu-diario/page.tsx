"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  UtensilsCrossed, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ArrowLeft, 
  Sparkles,
  Soup
} from "lucide-react";
import Logo from "@/components/Logo";
import { 
  MenuDia, 
  Plato, 
  obtenerMenus, 
  obtenerMenuPorFecha,
  guardarMenu, 
  eliminarMenu, 
  crearMenuBorrador,
  copiarMenu 
} from "@/lib/menuDiario";

export default function MenuDiarioPage() {
  const [menus, setMenus] = useState<MenuDia[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [menuActivo, setMenuActivo] = useState<MenuDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Formulario nuevo plato
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState(10.0);
  const [nuevaCat, setNuevaCat] = useState<Plato["categoria"]>("Segundo");
  const [nuevaDesc, setNuevaDesc] = useState("");

  // Nueva entrada
  const [nuevaEntrada, setNuevaEntrada] = useState("");

  // Modal o prompt de copiar
  const [fechaDestino, setFechaDestino] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  const aplicarMenu = (guardado: MenuDia) => {
    setMenuActivo(guardado);
    setMenus((prev) => {
      const idx = prev.findIndex((m) => m.id === guardado.id || m.fecha === guardado.fecha);
      if (idx === -1) return [guardado, ...prev];
      const copia = [...prev];
      copia[idx] = guardado;
      return copia;
    });
  };

  useEffect(() => {
    let cancelado = false;
    obtenerMenus()
      .then((list) => {
        if (cancelado) return;
        setMenus(list);
        const actual =
          list.find((m) => m.fecha === fechaSeleccionada) || list[0] || null;
        if (actual) {
          setFechaSeleccionada(actual.fecha);
          setMenuActivo(actual);
        }
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el menú diario. Verifica que el backend esté encendido.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [fechaSeleccionada]);

  const handleSeleccionarFecha = async (f: string) => {
    setFechaSeleccionada(f);
    const encontrado = menus.find((m) => m.fecha === f);
    if (encontrado) {
      setMenuActivo(encontrado);
      return;
    }
    try {
      const existente = await obtenerMenuPorFecha(f);
      if (existente) {
        setMenus((prev) => [existente, ...prev]);
        setMenuActivo(existente);
        return;
      }
      const guardado = await guardarMenu(crearMenuBorrador(f));
      setMenus((prev) => [guardado, ...prev]);
      setMenuActivo(guardado);
    } catch {
      setError("No se pudo preparar el menú para esa fecha.");
    }
  };

  const persistir = async (cambios: Partial<MenuDia>) => {
    if (!menuActivo) return;
    try {
      const guardado = await guardarMenu({ ...menuActivo, ...cambios });
      aplicarMenu(guardado);
    } catch {
      alert("No se pudo guardar el cambio en el menú.");
    }
  };

  const handleToggleEstadoMenu = async () => {
    if (!menuActivo) return;
    await persistir({ activo: !menuActivo.activo });
  };

  const handleAgregarPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuActivo || !nuevoNombre.trim()) return;

    const nuevoPlato: Plato = {
      id: Date.now(),
      nombre: nuevoNombre.trim(),
      descripcion: nuevaDesc.trim() || undefined,
      precio: nuevoPrecio,
      categoria: nuevaCat,
      disponible: true,
    };

    await persistir({ platos: [...menuActivo.platos, nuevoPlato] });
    setNuevoNombre("");
    setNuevaDesc("");
  };

  const handleEliminarPlato = async (platoId: number) => {
    if (!menuActivo) return;
    await persistir({ platos: menuActivo.platos.filter((p) => p.id !== platoId) });
  };

  const handleTogglePlato = async (platoId: number) => {
    if (!menuActivo) return;
    const platos = menuActivo.platos.map((p) =>
      p.id === platoId ? { ...p, disponible: !p.disponible } : p
    );
    await persistir({ platos });
  };

  const handleAgregarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuActivo || !nuevaEntrada.trim()) return;
    await persistir({ entradas: [...menuActivo.entradas, nuevaEntrada.trim()] });
    setNuevaEntrada("");
  };

  const handleEliminarEntrada = async (index: number) => {
    if (!menuActivo) return;
    await persistir({ entradas: menuActivo.entradas.filter((_, i) => i !== index) });
  };

  const handleCopiar = async () => {
    if (!menuActivo) return;
    try {
      const nuevo = await copiarMenu(menuActivo.fecha, fechaDestino);
      if (nuevo) {
        setMenus(await obtenerMenus());
        setFechaSeleccionada(fechaDestino);
        setMenuActivo(nuevo);
        alert(`Menú copiado exitosamente para la fecha ${fechaDestino}`);
      }
    } catch {
      alert("No se pudo copiar el menú.");
    }
  };

  const handleEliminarMenu = async () => {
    if (!menuActivo) return;
    if (!confirm(`¿Eliminar el menú del ${menuActivo.fecha}?`)) return;
    try {
      if (menuActivo.id) await eliminarMenu(menuActivo.id);
      const lista = await obtenerMenus();
      setMenus(lista);
      const primero = lista[0] || null;
      setMenuActivo(primero);
      if (primero) setFechaSeleccionada(primero.fecha);
    } catch {
      alert("No se pudo eliminar el menú.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex flex-col">
      {/* Encabezado */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="hidden sm:block shrink-0"><Logo size="sm" /></div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="min-w-0 truncate">Gestión de Menú Diario Configurable</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Pizarra de Menús del Día a S/ 10.00 con Entradas Incluidas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pedidos"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
            >
              Comandas de Meseros
            </Link>
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition"
            >
              Ver Carta en Vivo
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-8 space-y-8">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}
        {cargando && (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        )}

        {/* Barra de Fechas y Acciones de Día */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <label className="text-sm font-bold text-zinc-300">Fecha del Menú:</label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => handleSeleccionarFecha(e.target.value)}
              className="px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-amber-500"
            />
            {menuActivo && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  menuActivo.activo
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {menuActivo.activo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {menuActivo.activo ? "Menú Activo" : "Menú Inactivo"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleToggleEstadoMenu}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                menuActivo?.activo
                  ? "bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {menuActivo?.activo ? "Desactivar de la Carta" : "Activar en Carta"}
            </button>

            <button
              onClick={handleEliminarMenu}
              disabled={!menuActivo}
              className="px-4 py-2 rounded-xl text-xs font-bold transition bg-zinc-800 text-rose-300 border border-rose-900/60 hover:bg-rose-950 disabled:opacity-40 flex items-center gap-1.5"
              title="Eliminar el menú de esta fecha"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>

            <div className="flex flex-wrap items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">Copiar a:</span>
              <input
                type="date"
                value={fechaDestino}
                onChange={(e) => setFechaDestino(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs px-2 py-1"
              />
              <button
                onClick={handleCopiar}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
            </div>
          </div>
        </div>

        {/* Sección de Entradas Incluidas y Segundos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Entradas Incluidas */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Soup className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-white">Entradas a Elegir</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Opciones que el comensal puede elegir con su Menú del Día (S/ 10.00)
              </p>

              <form onSubmit={handleAgregarEntrada} className="flex gap-2">
                <input
                  type="text"
                  value={nuevaEntrada}
                  onChange={(e) => setNuevaEntrada(e.target.value)}
                  placeholder="Ej. Sopa de Casa / Causa"
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2">
                {menuActivo?.entradas.map((ent, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs"
                  >
                    <span className="font-semibold text-zinc-200">🥗 {ent}</span>
                    <button
                      onClick={() => handleEliminarEntrada(idx)}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjeta Informativa Pizarra */}
            <div className="bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                Pizarra Oficial Sabor Chugurano
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                El menú incluye 1 Entrada a elegir (Sopa o Huancaína) + 1 Segundo a S/ 10.00. 
                Los cambios realizados aquí se sincronizan automáticamente con las comandas de los meseros y la vista pública.
              </p>
            </div>
          </div>

          {/* Segundos del Día */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-white">Platos del Menú (Segundos)</h2>
                </div>
                <div className="text-xs text-zinc-400">
                  Total platos: <strong className="text-amber-400">{menuActivo?.platos.length || 0}</strong>
                </div>
              </div>

              {/* Agregar nuevo segundo */}
              <form onSubmit={handleAgregarPlato} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase">Añadir Plato a la Pizarra</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Nombre del plato (ej. Seco de Pollo)"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={nuevaCat}
                      onChange={(e) => setNuevaCat(e.target.value as Plato["categoria"])}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="Segundo">Segundo</option>
                      <option value="Entrada">Entrada</option>
                      <option value="Sopa">Sopa</option>
                      <option value="Postre">Postre</option>
                      <option value="Bebida">Bebida</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-zinc-400">S/</span>
                      <input
                        type="number"
                        step="0.50"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(parseFloat(e.target.value) || 10.0)}
                        className="w-full pl-7 pr-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                </div>
              </form>

              {/* Listado de Platos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuActivo?.platos.map((plato) => (
                  <div
                    key={plato.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      plato.disponible
                        ? "bg-zinc-950/70 border-zinc-800"
                        : "bg-zinc-950/40 border-zinc-800/40 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-white text-sm">{plato.nombre}</div>
                        {plato.descripcion && (
                          <p className="text-xs text-zinc-400 mt-0.5">{plato.descripcion}</p>
                        )}
                      </div>
                      <span className="font-bold text-amber-400 text-sm">
                        S/ {plato.precio.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => handleTogglePlato(plato.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          plato.disponible
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {plato.disponible ? "Disponible" : "Agotado"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarPlato(plato.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
