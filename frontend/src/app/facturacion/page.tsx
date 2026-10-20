"use client";

import { apiFetch } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ReceiptText,
  FileText,
  Search,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Building2,
  User,
  AlertCircle,
  Eye,
  Pencil,
  X,
  RefreshCw
} from "lucide-react";
import Logo from "@/components/Logo";
import {
  Cliente,
  Venta,
  DetalleVenta,
  obtenerClientes,
  crearCliente,
  eliminarCliente,
  obtenerVentas,
  registrarVenta,
  actualizarVenta,
  anularVenta
} from "@/lib/facturacion";
import { consultarDNI, consultarRUC } from "@/lib/reniecRuc";

type TabType = "emitir" | "historial" | "clientes";

type TicketData = {
  tipoComprobante: "boleta" | "factura";
  serie: string;
  numero: string;
  fecha: string;
  clienteNombre: string;
  clienteDocumento: string;
  clienteDireccion?: string;
  metodoPago: string;
  items: DetalleVenta[];
  subtotal: number;
  igv: number;
  total: number;
};

function TicketComprobante({ data }: { data: TicketData }) {
  return (
    <div className="bg-white text-zinc-900 rounded-2xl p-6 shadow-2xl font-mono text-xs border border-zinc-300 print:rounded-none print:border-0 print:p-0 print:shadow-none print:w-[72mm]">
      <div className="text-center pb-4 border-b border-dashed border-zinc-400">
        <div className="w-16 h-16 mx-auto mb-2 relative print:w-12 print:h-12">
          <img
            src="/images/logo_sabor_chugurano.png"
            alt="Logo"
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <h2 className="font-bold text-base tracking-wider uppercase">SABOR CHUGURANO</h2>
        <p className="text-[10px] text-zinc-600">RESTAURANTE Y EVENTOS E.I.R.L.</p>
        <p className="text-[10px] text-zinc-600">RUC: 20601234567</p>
        <p className="text-[10px] text-zinc-600">Av. Principal 123 - Centro Gastronómico</p>
        <p className="text-[10px] text-zinc-600">Tel: (01) 987-654-321</p>
      </div>

      <div className="py-3 border-b border-dashed border-zinc-400 space-y-1">
        <div className="font-bold text-center text-sm uppercase">
          {data.tipoComprobante === "boleta" ? "BOLETA DE VENTA ELECTRÓNICA" : "FACTURA ELECTRÓNICA"}
        </div>
        <div className="text-center font-bold">
          {data.serie} - {data.numero}
        </div>
        <div className="pt-2 text-[10px] space-y-0.5 text-zinc-700">
          <div>FECHA: {data.fecha}</div>
          <div>CLIENTE: {data.clienteNombre}</div>
          <div>{data.tipoComprobante === "boleta" ? "DNI" : "RUC"}: {data.clienteDocumento || "-"}</div>
          {data.clienteDireccion && <div>DIR: {data.clienteDireccion}</div>}
          <div>FORMA PAGO: {data.metodoPago}</div>
        </div>
      </div>

      <div className="py-3 border-b border-dashed border-zinc-400">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-zinc-300 text-left font-bold">
              <th className="pb-1">CANT</th>
              <th className="pb-1">DESCRIPCIÓN</th>
              <th className="pb-1 text-right">P.U.</th>
              <th className="pb-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {data.items.map((it, idx) => (
              <tr key={idx}>
                <td className="py-1 align-top">{it.cantidad}</td>
                <td className="py-1 pr-1">{it.nombre}</td>
                <td className="py-1 text-right">S/ {it.precio_unitario.toFixed(2)}</td>
                <td className="py-1 text-right font-semibold">S/ {it.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="py-3 border-b border-dashed border-zinc-400 text-[11px] space-y-1">
        <div className="flex justify-between">
          <span>OP. GRAVADA:</span>
          <span>S/ {data.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>I.G.V. (18%):</span>
          <span>S/ {data.igv.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-zinc-300">
          <span>IMPORTE TOTAL:</span>
          <span>S/ {data.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="pt-4 text-center space-y-1 text-[9px] text-zinc-500">
        <p>Representación impresa del Comprobante Electrónico</p>
        <p>Autorizado mediante resolución SUNAT</p>
        <p className="font-bold text-zinc-800">¡Gracias por su preferencia!</p>
      </div>
    </div>
  );
}

export default function FacturacionPage() {
  const [tab, setTab] = useState<TabType>("emitir");
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: number; name: string; price: number }[]>([]);

  // Estados para nuevo comprobante
  const [tipoComprobante, setTipoComprobante] = useState<"boleta" | "factura">("boleta");
  const [serie, setSerie] = useState("B001");
  const [documentoNumero, setDocumentoNumero] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [consultandoDoc, setConsultandoDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);

  // Items del comprobante en emisión
  const [items, setItems] = useState<DetalleVenta[]>([
    { producto_id: 1, nombre: "Menú del Día (Inc. Entrada)", cantidad: 1, precio_unitario: 10.0, subtotal: 10.0 }
  ]);
  const [metodoPago, setMetodoPago] = useState<Venta["metodo_pago"]>("Efectivo");

  // Estado para visualización / impresión
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<Venta | null>(null);

  // Estado para edición de los datos del comprobante
  const [editando, setEditando] = useState<Venta | null>(null);
  const [editForm, setEditForm] = useState({
    cliente_nombre: "",
    cliente_documento: "",
    direccion: "",
    metodo_pago: "Efectivo" as Venta["metodo_pago"],
  });

  // Estado para nuevo cliente manual
  const [nuevoCliente, setNuevoCliente] = useState<{
    nombre: string;
    dni: string;
    ruc: string;
    direccion: string;
    telefono: string;
  }>({ nombre: "", dni: "", ruc: "", direccion: "", telefono: "" });

  useEffect(() => {
    let cancelado = false;

    obtenerClientes()
      .then((lista) => {
        if (!cancelado) setClientes(lista);
      })
      .catch(() => { });

    obtenerVentas()
      .then((lista) => {
        if (!cancelado) setVentas(lista);
      })
      .catch(() => { });

    // Cargar platos desde backend
    apiFetch("/menu")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelado) return;
        if (Array.isArray(data) && data.length > 0) {
          setMenuItems(data.map((d: any) => ({ id: d.id, name: d.name, price: Number(d.price) })));
        } else {
          // Fallback
          setMenuItems([
            { id: 1, name: "Menú del Día - Costilla Dorada", price: 10.0 },
            { id: 2, name: "Menú del Día - Seco de Pollo", price: 10.0 },
            { id: 3, name: "Ceviche Mixto", price: 25.0 },
            { id: 4, name: "Chicharrón de Pota", price: 14.0 },
            { id: 5, name: "Chaufa de Mariscos", price: 20.0 },
            { id: 6, name: "Jarra Chicha Morada 1L", price: 10.0 },
          ]);
        }
      })
      .catch(() => {
        if (cancelado) return;
        setMenuItems([
          { id: 1, name: "Menú del Día - Costilla Dorada", price: 10.0 },
          { id: 2, name: "Menú del Día - Seco de Pollo", price: 10.0 },
          { id: 3, name: "Ceviche Mixto", price: 25.0 },
        ]);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Actualizar serie según tipo
  useEffect(() => {
    if (tipoComprobante === "boleta") {
      setSerie("B001");
    } else {
      setSerie("F001");
    }
  }, [tipoComprobante]);

  // Consulta automática DNI o RUC
  const handleConsultarDocumento = async () => {
    setErrorDoc(null);
    const doc = documentoNumero.trim();
    if (!doc) {
      setErrorDoc("Ingrese un número de documento");
      return;
    }

    setConsultandoDoc(true);
    try {
      if (tipoComprobante === "boleta") {
        if (doc.length !== 8) {
          throw new Error("El DNI debe tener 8 dígitos");
        }
        const data = await consultarDNI(doc);
        setClienteNombre(data.nombreCompleto);
      } else {
        if (doc.length !== 11) {
          throw new Error("El RUC debe tener 11 dígitos");
        }
        const data = await consultarRUC(doc);
        setClienteNombre(data.razonSocial);
        if (data.direccion) {
          setClienteDireccion(data.direccion);
        }
      }
    } catch (err: any) {
      setErrorDoc(err.message || "Error al consultar documento");
    } finally {
      setConsultandoDoc(false);
    }
  };

  // Cálculos de items
  const handleItemChange = (index: number, field: keyof DetalleVenta, val: any) => {
    const next = [...items];
    const it = { ...next[index], [field]: val };
    if (field === "cantidad" || field === "precio_unitario") {
      it.subtotal = Number((it.cantidad * it.precio_unitario).toFixed(2));
    }
    next[index] = it;
    setItems(next);
  };

  const handleAddItem = (platoId?: number) => {
    let plato = menuItems.find((p) => p.id === platoId);
    if (!plato && menuItems.length > 0) {
      plato = menuItems[0];
    }
    const nombre = plato ? plato.name : "Nuevo Plato / Consumo";
    const precio = plato ? plato.price : 10.0;

    setItems([
      ...items,
      {
        producto_id: plato ? plato.id : Date.now(),
        nombre,
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCalculado = items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const subtotalCalculado = Number((totalCalculado / 1.18).toFixed(2));
  const igvCalculado = Number((totalCalculado - subtotalCalculado).toFixed(2));

  // Emitir comprobante
  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Debe agregar al menos un ítem al comprobante");
      return;
    }
    if (!clienteNombre.trim()) {
      alert("Ingrese el nombre o razón social del cliente");
      return;
    }

    const correlativo = String(ventas.length + 46).padStart(6, "0");
    const nuevaVenta: Venta = {
      id: 0,
      tipo: tipoComprobante,
      serie,
      numero: correlativo,
      cliente_id: 0,
      cliente_nombre: clienteNombre.trim(),
      cliente_documento: documentoNumero.trim() || (tipoComprobante === "boleta" ? "00000000" : "20601234567"),
      direccion: clienteDireccion.trim() || undefined,
      productos: items,
      subtotal: subtotalCalculado,
      igv: igvCalculado,
      total: totalCalculado,
      metodo_pago: metodoPago,
      fecha: new Date().toISOString().slice(0, 10),
      estado: "Emitida",
    };

    try {
      const guardada = await registrarVenta(nuevaVenta);

      // Guardar también como cliente si trae documento
      if (documentoNumero.trim()) {
        try {
          await crearCliente({
            nombre: clienteNombre.trim(),
            dni: tipoComprobante === "boleta" ? documentoNumero.trim() : undefined,
            ruc: tipoComprobante === "factura" ? documentoNumero.trim() : undefined,
            direccion: clienteDireccion.trim() || undefined,
            telefono: clienteTelefono.trim() || undefined,
          });
        } catch {
          // No bloquear la emisión si el cliente ya existía
        }
      }

      setVentas(await obtenerVentas());
      setClientes(await obtenerClientes());

      setComprobanteSeleccionado(guardada);
      // Limpiar formulario
      setDocumentoNumero("");
      setClienteNombre("");
      setClienteDireccion("");
      setClienteTelefono("");
      setItems([{ producto_id: 1, nombre: "Menú del Día (Inc. Entrada)", cantidad: 1, precio_unitario: 10.0, subtotal: 10.0 }]);
      setTab("historial");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo emitir el comprobante");
    }
  };

  // Crear cliente desde pestaña clientes
  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return;

    try {
      await crearCliente({
        nombre: nuevoCliente.nombre.trim(),
        dni: nuevoCliente.dni.trim() || undefined,
        ruc: nuevoCliente.ruc.trim() || undefined,
        direccion: nuevoCliente.direccion.trim() || undefined,
        telefono: nuevoCliente.telefono.trim() || undefined,
      });
      setClientes(await obtenerClientes());
      setNuevoCliente({ nombre: "", dni: "", ruc: "", direccion: "", telefono: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar el cliente");
    }
  };

  const handleEliminarCliente = async (id: number) => {
    if (!confirm("¿Seguro que desea eliminar este cliente?")) return;
    try {
      await eliminarCliente(id);
      setClientes(await obtenerClientes());
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el cliente");
    }
  };

  const handleAnularVenta = async (id: number) => {
    if (!confirm("¿Desea anular este comprobante electrónico?")) return;
    try {
      await anularVenta(id);
      setVentas(await obtenerVentas());
      if (comprobanteSeleccionado?.id === id) {
        setComprobanteSeleccionado({ ...comprobanteSeleccionado, estado: "Anulada" });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo anular el comprobante");
    }
  };

  const ticketFormulario: TicketData = {
    tipoComprobante,
    serie,
    numero: String(ventas.length + 46).padStart(6, "0"),
    fecha: `${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`,
    clienteNombre: clienteNombre || "CLIENTES VARIOS",
    clienteDocumento: documentoNumero || "-",
    clienteDireccion: clienteDireccion || undefined,
    metodoPago,
    items,
    subtotal: subtotalCalculado,
    igv: igvCalculado,
    total: totalCalculado,
  };

  const ticketSeleccionado: TicketData | null = comprobanteSeleccionado
    ? {
      tipoComprobante: comprobanteSeleccionado.tipo.toLowerCase() === "factura" ? "factura" : "boleta",
      serie: comprobanteSeleccionado.serie,
      numero: comprobanteSeleccionado.numero,
      fecha: comprobanteSeleccionado.fecha,
      clienteNombre: comprobanteSeleccionado.cliente_nombre,
      clienteDocumento: comprobanteSeleccionado.cliente_documento,
      clienteDireccion: comprobanteSeleccionado.direccion || undefined,
      metodoPago: comprobanteSeleccionado.metodo_pago,
      items: comprobanteSeleccionado.productos,
      subtotal: comprobanteSeleccionado.subtotal,
      igv: comprobanteSeleccionado.igv,
      total: comprobanteSeleccionado.total,
    }
    : null;

  const ticketParaImprimir = tab === "historial" ? ticketSeleccionado : tab === "emitir" ? ticketFormulario : null;

  const abrirEdicion = (venta: Venta) => {
    setEditando(venta);
    setEditForm({
      cliente_nombre: venta.cliente_nombre,
      cliente_documento: venta.cliente_documento,
      direccion: venta.direccion || "",
      metodo_pago: venta.metodo_pago,
    });
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await actualizarVenta(editando.id, editForm);
      const lista = await obtenerVentas();
      setVentas(lista);
      setComprobanteSeleccionado(lista.find((v) => v.id === editando.id) || null);
      setEditando(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo actualizar el comprobante");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 print:bg-white text-foreground flex flex-col">
      {/* Barra Superior */}
      <header className="print:hidden border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo size="sm" />
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-amber-500" />
                Módulo de Facturación Electrónica SUNAT
              </h1>
              <p className="text-xs text-zinc-400">Emisión de Boletas, Facturas y Control de Clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/caja"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
            >
              Terminal Caja
            </Link>
            <Link
              href="/pedidos"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
            >
              Comandas
            </Link>
            {tab !== "clientes" && (
              <button
                onClick={() => {
                  if (tab === "historial" && !comprobanteSeleccionado) {
                    alert("Selecciona un comprobante con el ícono del ojo para imprimirlo");
                    return;
                  }
                  window.print();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="print:hidden border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex gap-2">
          <button
            onClick={() => setTab("emitir")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${tab === "emitir"
              ? "border-amber-500 text-amber-400 bg-amber-500/10"
              : "border-transparent text-zinc-400 hover:text-white"
              }`}
          >
            <FileText className="w-4 h-4" />
            Emitir Boleta / Factura
          </button>
          <button
            onClick={() => setTab("historial")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${tab === "historial"
              ? "border-amber-500 text-amber-400 bg-amber-500/10"
              : "border-transparent text-zinc-400 hover:text-white"
              }`}
          >
            <ReceiptText className="w-4 h-4" />
            Historial de Comprobantes ({ventas.length})
          </button>
          <button
            onClick={() => setTab("clientes")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${tab === "clientes"
              ? "border-amber-500 text-amber-400 bg-amber-500/10"
              : "border-transparent text-zinc-400 hover:text-white"
              }`}
          >
            <User className="w-4 h-4" />
            Directorio Clientes ({clientes.length})
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="print:hidden flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* PESTAÑA 1: EMITIR COMPROBANTE */}
        {tab === "emitir" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulario */}
            <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <form onSubmit={handleEmitir} className="space-y-6">
                {/* Tipo de Comprobante */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Tipo de Comprobante
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoComprobante("boleta")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition ${tipoComprobante === "boleta"
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md"
                        : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        }`}
                    >
                      <User className="w-4 h-4" />
                      Boleta de Venta (DNI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoComprobante("factura")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition ${tipoComprobante === "factura"
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md"
                        : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Factura Electrónica (RUC)
                    </button>
                  </div>
                </div>

                {/* Datos del Cliente y Consulta RENIEC/SUNAT */}
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase">
                      Datos del Receptor ({tipoComprobante === "boleta" ? "Persona Natural" : "Empresa / RUC"})
                    </span>
                    <span className="text-xs text-zinc-400">Serie: {serie}</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 block mb-1">
                        {tipoComprobante === "boleta" ? "DNI (8 dígitos)" : "RUC (11 dígitos)"}
                      </label>
                      <input
                        type="text"
                        value={documentoNumero}
                        onChange={(e) => setDocumentoNumero(e.target.value.replace(/\D/g, ""))}
                        placeholder={tipoComprobante === "boleta" ? "Ej. 47589632" : "Ej. 20601234567"}
                        maxLength={tipoComprobante === "boleta" ? 8 : 11}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleConsultarDocumento}
                        disabled={consultandoDoc}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 h-[42px] transition disabled:opacity-50"
                      >
                        {consultandoDoc ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        ) : (
                          <Search className="w-4 h-4 text-amber-400" />
                        )}
                        Consultar {tipoComprobante === "boleta" ? "RENIEC" : "SUNAT"}
                      </button>
                    </div>
                  </div>

                  {errorDoc && (
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errorDoc}
                    </p>
                  )}

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      {tipoComprobante === "boleta" ? "Nombres y Apellidos" : "Razón Social"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Ingrese o consulte nombre del cliente"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Dirección Fiscal / Entrega</label>
                      <input
                        type="text"
                        value={clienteDireccion}
                        onChange={(e) => setClienteDireccion(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Detalle de Productos / Platos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Detalle de Consumos / Platos
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Línea
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl"
                      >
                        <div className="flex-1 min-w-[160px]">
                          <input
                            type="text"
                            value={item.nombre}
                            onChange={(e) => handleItemChange(idx, "nombre", e.target.value)}
                            placeholder="Descripción del plato o bebida"
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                            required
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(idx, "cantidad", parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center"
                            placeholder="Cant."
                          />
                        </div>
                        <div className="w-28">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-zinc-400">S/</span>
                            <input
                              type="number"
                              step="0.10"
                              min="0"
                              value={item.precio_unitario}
                              onChange={(e) => handleItemChange(idx, "precio_unitario", parseFloat(e.target.value) || 0)}
                              className="w-full pl-7 pr-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right font-bold text-amber-400 text-sm">
                          S/ {item.subtotal?.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Acceso rápido a platos del restaurante */}
                  <div className="mt-3">
                    <span className="text-[11px] text-zinc-400 block mb-1">Platos rápidos del restaurante:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {menuItems.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleAddItem(m.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 border border-zinc-700"
                        >
                          + {m.name} (S/ {m.price.toFixed(2)})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Método de Pago y Totales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                      Método de Pago
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Tarjeta">Tarjeta de Débito / Crédito</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1.5 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>Op. Gravada:</span>
                      <span>S/ {subtotalCalculado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>I.G.V. (18%):</span>
                      <span>S/ {igvCalculado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-zinc-800">
                      <span className="text-amber-400">TOTAL:</span>
                      <span className="text-amber-400">S/ {totalCalculado.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botón Emitir */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Emitir {tipoComprobante === "boleta" ? "Boleta de Venta Electrónica" : "Factura Electrónica"}
                </button>
              </form>
            </div>

            {/* Vista Previa del Ticket / Factura */}
            <div className="lg:col-span-5">
              <TicketComprobante data={ticketFormulario} />
            </div>
          </div>
        )}

        {/* PESTAÑA 2: HISTORIAL DE COMPROBANTES */}
        {tab === "historial" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Comprobantes Emitidos</h2>
                  <p className="text-xs text-zinc-400">Listado oficial de boletas y facturas emitidas</p>
                </div>
                <button
                  onClick={() => setTab("emitir")}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Comprobante
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/70 text-zinc-400 text-xs uppercase border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Comprobante</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {ventas.map((v) => (
                      <tr key={v.id} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {v.serie}-{v.numero}
                          <span className="block text-[10px] text-zinc-400 font-normal uppercase">{v.tipo}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300 text-xs">{v.fecha}</td>
                        <td className="py-3 px-4 font-medium text-white">{v.cliente_nombre}</td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-400">{v.cliente_documento}</td>
                        <td className="py-3 px-4 text-xs text-zinc-300">{v.metodo_pago}</td>
                        <td className="py-3 px-4 text-right font-bold text-white">S/ {v.total?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.estado === "Emitida"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                          >
                            {v.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setComprobanteSeleccionado(v)}
                              title="Ver detalle"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {v.estado === "Emitida" && (
                              <button
                                onClick={() => abrirEdicion(v)}
                                title="Editar datos del comprobante"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {v.estado === "Emitida" && (
                              <button
                                onClick={() => handleAnularVenta(v.id)}
                                title="Anular comprobante"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-rose-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de detalle del comprobante seleccionado */}
            {comprobanteSeleccionado && ticketSeleccionado && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
                <div className="mx-auto my-8 w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-amber-500 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    {comprobanteSeleccionado.estado === "Emitida" && (
                      <button
                        onClick={() => abrirEdicion(comprobanteSeleccionado)}
                        className="px-3 py-1.5 bg-zinc-800 text-amber-400 font-bold rounded-lg text-xs flex items-center gap-1.5"
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                    )}
                    <button
                      onClick={() => setComprobanteSeleccionado(null)}
                      className="p-1.5 bg-zinc-800 text-zinc-300 rounded-lg"
                      title="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <TicketComprobante data={ticketSeleccionado} />
                </div>
              </div>
            )}

            {/* Modal de edición de datos del comprobante */}
            {editando && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <form
                  onSubmit={handleGuardarEdicion}
                  className="w-full max-w-md space-y-4 rounded-2xl border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl"
                >
                  <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Pencil className="w-5 h-5" />
                    Editar comprobante {editando.serie}-{editando.numero}
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">Cliente</label>
                    <input
                      type="text"
                      required
                      value={editForm.cliente_nombre}
                      onChange={(e) => setEditForm({ ...editForm, cliente_nombre: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">Documento</label>
                    <input
                      type="text"
                      required
                      value={editForm.cliente_documento}
                      onChange={(e) => setEditForm({ ...editForm, cliente_documento: e.target.value.replace(/\D/g, "") })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">Dirección</label>
                    <input
                      type="text"
                      value={editForm.direccion}
                      onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">Método de pago</label>
                    <select
                      value={editForm.metodo_pago}
                      onChange={(e) => setEditForm({ ...editForm, metodo_pago: e.target.value as Venta["metodo_pago"] })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Tarjeta">Tarjeta de Débito / Crédito</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg text-xs font-bold"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: DIRECTORIO DE CLIENTES */}
        {tab === "clientes" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulario nuevo cliente */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" />
                Registrar Cliente
              </h2>
              <p className="text-xs text-zinc-400 mb-6">Guarde clientes frecuentes para agilizar la facturación</p>

              <form onSubmit={handleCrearCliente} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Nombre Completo o Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez / Empresa SAC"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">DNI</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={nuevoCliente.dni}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, dni: e.target.value.replace(/\D/g, "") })}
                      placeholder="8 dígitos"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">RUC</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={nuevoCliente.ruc}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, ruc: e.target.value.replace(/\D/g, "") })}
                      placeholder="11 dígitos"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Dirección</label>
                  <input
                    type="text"
                    value={nuevoCliente.direccion}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                    placeholder="Av. / Jr. / Calle"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="999-999-999"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition"
                >
                  Guardar Cliente
                </button>
              </form>
            </div>

            {/* Listado de clientes */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Directorio de Clientes Guardados</h2>
              <div className="space-y-3">
                {clientes.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{c.nombre}</div>
                      <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4">
                        {c.dni && <span>DNI: <strong className="text-zinc-300 font-mono">{c.dni}</strong></span>}
                        {c.ruc && <span>RUC: <strong className="text-zinc-300 font-mono">{c.ruc}</strong></span>}
                        {c.telefono && <span>Tel: {c.telefono}</span>}
                      </div>
                      {c.direccion && <div className="text-xs text-zinc-500">{c.direccion}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDocumentoNumero(c.ruc || c.dni || "");
                          setClienteNombre(c.nombre);
                          setClienteDireccion(c.direccion || "");
                          setTipoComprobante(c.ruc ? "factura" : "boleta");
                          setTab("emitir");
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-semibold rounded-lg"
                      >
                        Facturar
                      </button>
                      <button
                        onClick={() => handleEliminarCliente(c.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Área exclusiva de impresión: solo se imprime el comprobante */}
      {ticketParaImprimir && (
        <div id="ticket-print" className="hidden print:block">
          <TicketComprobante data={ticketParaImprimir} />
        </div>
      )}
    </div>
  );
}
