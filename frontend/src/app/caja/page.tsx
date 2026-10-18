"use client";

import { apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Printer, 
  X,
  TrendingUp,
  CircleCheck,
  LogOut
} from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";


type OrderItem = {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
};

type Order = {
  id: number;
  table_number: number;
  status: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
};

type Payment = {
  id: number;
  order_id: number;
  table_number: number;
  payment_method: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function CajaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  
  // Modal de cobro
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Yape" | "Plin">("Efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedPaymentTicket, setCompletedPaymentTicket] = useState<{
    order: Order;
    method: string;
    amount: number;
    cashGiven?: number;
    change?: number;
    date: string;
  } | null>(null);

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"pendientes" | "historial">("pendientes");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    // Restricciones de Rol: Solo Cajeros (3) y Administradores (1) acceden a Caja & Facturación
    if (parsed.role_id !== 3 && parsed.role_id !== 1) {
      if (parsed.role_id === 2) {
        window.location.href = "/pedidos";
      } else if (parsed.role_id === 4) {
        window.location.href = "/cocina";
      } else {
        window.location.href = "/login";
      }
      return;
    }
  }, []);

  const fetchData = async () => {
    try {
      const [resOrders, resPayments] = await Promise.all([
        apiFetch("/orders"),
        apiFetch("/payments")
      ]);

      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        setOrders(dataOrders || []);
      }
      if (resPayments.ok) {
        const dataPayments = await resPayments.json();
        setPayments(dataPayments || []);
      }
    } catch (err) {
      console.error("Error al cargar datos de caja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Actualiza cada 4 segundos
    return () => clearInterval(interval);
  }, []);

  const openPaymentModal = async (order: Order) => {
    setOrderDetailsLoading(true);
    setSelectedOrder(order);
    setCashGiven(order.total_amount.toString());
    setPaymentMethod("Efectivo");

    try {
      const res = await apiFetch(`/orders/${order.id}`);
      if (res.ok) {
        const fullOrder = await res.json();
        setSelectedOrder(fullOrder);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    if (!user) {
      alert("Error: sesión no iniciada. Por favor recarga la página.");
      return;
    }
    setIsProcessing(true);

    // Usar el estado `user` que ya está en memoria (cargado desde localStorage al inicio)
    // Evita el bug donde re-parsear localStorage devolvía undefined y caía al id=1 (Admin)
    const cashierId = Number(user.id);

    try {
      const res = await apiFetch("/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: Number(selectedOrder.id),
          cashier_id: cashierId,
          payment_method: paymentMethod,
          amount: Number(selectedOrder.total_amount)
        })
      });

      if (res.ok) {
        const given = parseFloat(cashGiven) || selectedOrder.total_amount;
        const change = Math.max(0, given - selectedOrder.total_amount);

        setCompletedPaymentTicket({
          order: selectedOrder,
          method: paymentMethod,
          amount: selectedOrder.total_amount,
          cashGiven: paymentMethod === "Efectivo" ? given : undefined,
          change: paymentMethod === "Efectivo" ? change : undefined,
          date: new Date().toLocaleString()
        });

        setSelectedOrder(null);
        fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Error al procesar el pago");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al procesar el pago");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrar órdenes por cobrar
  const pendingOrders = orders.filter(o => o.status === "Completado" || o.status === "Preparando" || o.status === "Pendiente");
  const readyToPayOrders = orders.filter(o => o.status === "Completado");
  const inProgressOrders = pendingOrders.filter(o => o.status !== "Completado");
  const totalRecaudadoHoy = payments.reduce((acc, p) => acc + p.amount, 0);

  const efectivoTotal = payments.filter(p => p.payment_method === "Efectivo").reduce((a, b) => a + b.amount, 0);
  const tarjetaTotal = payments.filter(p => p.payment_method === "Tarjeta").reduce((a, b) => a + b.amount, 0);
  const digitalTotal = payments.filter(p => p.payment_method === "Yape" || p.payment_method === "Plin").reduce((a, b) => a + b.amount, 0);

  const parsedCash = parseFloat(cashGiven) || 0;
  const vuelto = selectedOrder ? Math.max(0, parsedCash - selectedOrder.total_amount) : 0;

  const renderOrderCard = (order: Order, isReady: boolean) => (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-zinc-900/60 rounded-3xl border p-6 flex flex-col justify-between transition-all ${
        isReady
          ? "border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
          : "border-white/10"
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">ORDEN #{order.id}</span>
            <h2 className="text-2xl font-black text-white mt-0.5">Mesa {order.table_number}</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isReady
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
            {isReady ? "Cuenta Lista" : order.status}
          </span>
        </div>

        <div className="bg-zinc-950/60 rounded-2xl p-4 border border-white/5 mb-6">
          <div className="text-xs text-zinc-400 mb-1">Total a Pagar</div>
          <div className="text-3xl font-black text-primary">S/ {order.total_amount.toFixed(2)}</div>
        </div>
      </div>

      <button
        onClick={() => openPaymentModal(order)}
        className="w-full py-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,153,51,0.25)] hover:scale-[1.01]"
      >
        <Receipt className="w-5 h-5" />
        Cobrar Cuenta
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground pb-20">
      {/* Top Navbar */}
      <div className="bg-zinc-900/80 border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Logo size={40} showText={false} />
            </Link>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <h1 className="font-bold text-xl tracking-wide flex items-center gap-2">
                Caja & Facturación
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Punto de Venta
                </span>
              </h1>
              <p className="text-xs text-amber-400 font-medium">Sabor Chugurano • Cobro de mesas y emisión de tickets</p>
            </div>
          </div>


          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/80 rounded-xl border border-white/5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-400 hidden md:inline">Caja:</span>
                <span className="font-bold text-white">{user.name}</span>
              </div>
            )}

            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold rounded-xl border border-white/5 text-zinc-300 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              Actualizar
            </button>

            {user?.role_id === 1 && (
              <Link
                href="/dashboard"
                className="text-xs font-bold px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors hidden sm:flex items-center gap-1.5"
              >
                Panel Admin
              </Link>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="text-xs px-3 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase text-zinc-400">Total en Caja Hoy</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">S/ {totalRecaudadoHoy.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-2">{payments.length} transacciones registradas</div>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase text-zinc-400">Efectivo</span>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-primary">S/ {efectivoTotal.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-2">Billetes y monedas físicas</div>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase text-zinc-400">Tarjetas</span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-blue-400">S/ {tarjetaTotal.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-2">POS Visa / Mastercard</div>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase text-zinc-400">Yape / Plin</span>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-400">S/ {digitalTotal.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-2">Billeteras electrónicas</div>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-3 mb-6 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("pendientes")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "pendientes"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <Clock className="w-4 h-4" />
            Mesas por Cobrar ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "historial"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Historial de Pagos ({payments.length})
          </button>
        </div>

        {/* Content Tab: Pendientes */}
        {activeTab === "pendientes" && (
          pendingOrders.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl bg-zinc-900/30">
              <CircleCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-1">¡Caja al día!</h3>
              <p className="text-zinc-500 text-sm">No hay cuentas pendientes de cobro en este momento.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Listos para cobrar */}
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Listos para Cobrar</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {readyToPayOrders.length}
                  </span>
                </div>
                {readyToPayOrders.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/10 rounded-3xl bg-zinc-900/30 text-sm text-zinc-500">
                    Ninguna cuenta lista para cobrar por ahora.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {readyToPayOrders.map((order) => renderOrderCard(order, true))}
                  </div>
                )}
              </section>

              {/* En preparación */}
              {inProgressOrders.length > 0 && (
                <section>
                  <div className="flex items-center gap-2.5 mb-4">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">En Preparación</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {inProgressOrders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressOrders.map((order) => renderOrderCard(order, false))}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {/* Content Tab: Historial */}
        {activeTab === "historial" && (
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="pb-4 px-4">ID Pago</th>
                  <th className="pb-4 px-4">Mesa</th>
                  <th className="pb-4 px-4">Método</th>
                  <th className="pb-4 px-4">Monto Cobrado</th>
                  <th className="pb-4 px-4">Fecha y Hora</th>
                  <th className="pb-4 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-zinc-300">#{p.id} (Ord #{p.order_id})</td>
                    <td className="py-4 px-4 font-bold text-white">Mesa {p.table_number}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 text-xs font-semibold border border-white/5 text-zinc-200">
                        {p.payment_method === "Efectivo" && <DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                        {p.payment_method === "Tarjeta" && <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                        {(p.payment_method === "Yape" || p.payment_method === "Plin") && <Smartphone className="w-3.5 h-3.5 text-purple-400" />}
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-primary text-base">
                      S/ {p.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-zinc-400 text-xs">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE COBRO */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-950/50">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Cobrar Mesa {selectedOrder.table_number}
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                      Orden #{selectedOrder.id}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Verifica el desglose y selecciona el método de pago</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* Desglose de Platos */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Detalle del Consumo</h4>
                  {orderDetailsLoading ? (
                    <div className="py-8 text-center text-zinc-500">Cargando platos...</div>
                  ) : selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="bg-zinc-950 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="p-3.5 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-bold text-white">{item.quantity}x {item.name}</span>
                            {item.notes && <p className="text-xs text-amber-400/80 italic">"{item.notes}"</p>}
                          </div>
                          <span className="font-bold text-primary">S/ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">Consumo registrado por orden</div>
                  )}
                </div>

                {/* Métodos de Pago */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Método de Pago</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "Efectivo", icon: DollarSign, label: "Efectivo" },
                      { id: "Tarjeta", icon: CreditCard, label: "Tarjeta POS" },
                      { id: "Yape", icon: Smartphone, label: "Yape" },
                      { id: "Plin", icon: Smartphone, label: "Plin" }
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all font-bold text-xs ${
                            isSel
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                              : "bg-zinc-950 text-zinc-400 border-white/5 hover:text-white hover:border-white/20"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Si es efectivo: Calculadora de vuelto */}
                {paymentMethod === "Efectivo" && (
                  <div className="bg-zinc-950/80 rounded-2xl p-4 border border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Monto Entregado por Cliente</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">S/</span>
                          <input
                            type="number"
                            step="0.10"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 font-bold text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-1/2 bg-zinc-900 p-3.5 rounded-xl border border-white/5 text-right">
                        <div className="text-xs text-zinc-400">Vuelto a Entregar</div>
                        <div className={`text-2xl font-black ${vuelto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          S/ {vuelto.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Botones rápidos de billetes */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-xs font-bold">
                      <span className="text-zinc-500 self-center mr-1">Rápido:</span>
                      {[selectedOrder.total_amount, 20, 50, 100].map((val, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashGiven(val.toString())}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-white/10"
                        >
                          {idx === 0 ? "Exacto" : `S/ ${val}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
                  <span className="font-bold text-base text-zinc-200">TOTAL A COBRAR</span>
                  <span className="font-black text-3xl text-primary">S/ {selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-zinc-950/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-3 rounded-xl font-bold text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessing || (paymentMethod === "Efectivo" && parsedCash < selectedOrder.total_amount)}
                  onClick={handleProcessPayment}
                  className="px-7 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {isProcessing ? "Procesando..." : "Confirmar Pago & Boleta"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE TICKET / BOLETA IMPRIMIBLE */}
      <AnimatePresence>
        {completedPaymentTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white text-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 font-mono text-xs flex flex-col gap-4"
            >
              {/* Header Boleta */}
              <div className="text-center border-b pb-4 border-dashed border-zinc-400">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden border border-zinc-300">
                  <img src="/images/logo.png" alt="Sabor Chugurano" className="w-full h-full object-cover" />
                </div>
                <h2 className="font-black text-lg uppercase tracking-wider">SABOR CHUGURANO</h2>
                <p className="text-[10px] text-zinc-600">R.U.C. 20601234567</p>
                <p className="text-[10px] text-zinc-600">Tradición &amp; Sabor Peruano • Menú y Carta</p>
                <div className="mt-2 font-bold text-xs uppercase bg-zinc-100 py-1 rounded">
                  BOLETA DE VENTA ELECTRÓNICA
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Ticket #{completedPaymentTicket.order.id} | Mesa {completedPaymentTicket.order.table_number}</p>
                <p className="text-[10px] text-zinc-500">{completedPaymentTicket.date}</p>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b pb-4 border-dashed border-zinc-400 max-h-56 overflow-y-auto">
                <div className="flex justify-between font-bold text-[11px] pb-1 border-b">
                  <span>CANT. DESCRIPCIÓN</span>
                  <span>TOTAL</span>
                </div>
                {completedPaymentTicket.order.items && completedPaymentTicket.order.items.length > 0 ? (
                  completedPaymentTicket.order.items.map((it, i) => (
                    <div key={i} className="flex flex-col py-0.5 border-b border-zinc-100">
                      <div className="flex justify-between">
                        <span className="truncate pr-2 font-semibold">{it.quantity}x {it.name}</span>
                        <span className="font-bold">S/ {it.subtotal.toFixed(2)}</span>
                      </div>
                      {it.notes && (
                        <span className="text-[9px] text-zinc-600 italic pl-2">↳ {it.notes}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>Consumo General</span>
                    <span>S/ {completedPaymentTicket.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Totales y Vuelto */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-sm">
                  <span>TOTAL A PAGAR:</span>
                  <span>S/ {completedPaymentTicket.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>MÉTODO:</span>
                  <span>{completedPaymentTicket.method}</span>
                </div>
                {completedPaymentTicket.cashGiven !== undefined && (
                  <>
                    <div className="flex justify-between text-zinc-600">
                      <span>PAGÓ CON:</span>
                      <span>S/ {completedPaymentTicket.cashGiven.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-800 font-bold">
                      <span>VUELTO:</span>
                      <span>S/ {(completedPaymentTicket.change || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Pie de ticket */}
              <div className="text-center text-[10px] text-zinc-500 border-t pt-3 border-dashed border-zinc-400">
                <p className="font-bold">¡Gracias por su preferencia!</p>
                <p>Sabor Chugurano • www.saborchugurano.pe</p>
              </div>


              {/* Botones de acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-zinc-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedPaymentTicket(null)}
                  className="px-4 py-2.5 bg-zinc-200 text-zinc-800 font-bold rounded-xl hover:bg-zinc-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
