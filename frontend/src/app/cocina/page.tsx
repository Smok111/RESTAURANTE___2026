"use client";

import { apiFetch } from "@/lib/api";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, CheckCircle2, Clock, AlertCircle, Play, Volume2, VolumeX, BellRing, Users, LogOut } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";


type OrderItem = {
  name: string;
  quantity: number;
  notes: string;
};

type KitchenOrder = {
  id: number;
  table_number: number;
  status: "Pendiente" | "Preparando";
  created_at: string;
  waiter_name?: string;
  items: OrderItem[];
};

export default function Cocina() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  
  const knownOrderIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    // Restricciones de Rol: Solo Cocineros (4) y Administradores (1) acceden a Cocina
    if (parsed.role_id !== 4 && parsed.role_id !== 1) {
      if (parsed.role_id === 2) {
        window.location.href = "/pedidos";
      } else if (parsed.role_id === 3) {
        window.location.href = "/caja";
      } else {
        window.location.href = "/login";
      }
      return;
    }
  }, []);

  // Sintetizador de campana de restaurante con Web Audio API (cero dependencias externas)
  const playBellSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Primera campana (aguda)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.8);

      // Segunda campana (tono armónico brillante)
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
          gain2.gain.setValueAtTime(0.35, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.2);
        } catch (_) {}
      }, 120);

    } catch (err) {
      console.warn("Audio Context aún no inicializado por el usuario:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/kitchen/orders");
      if (res.ok) {
        const data: KitchenOrder[] = await res.json();
        const incoming = data || [];

        // Detectar si hay órdenes nuevas que no habíamos visto antes
        if (!isFirstLoad.current) {
          const hasNew = incoming.some(o => !knownOrderIds.current.has(o.id));
          if (hasNew) {
            playBellSound();
            setHasNewAlert(true);
            setTimeout(() => setHasNewAlert(false), 4000);
          }
        } else {
          isFirstLoad.current = false;
        }

        // Actualizar IDs conocidos
        const idSet = new Set<number>();
        incoming.forEach(o => idSet.add(o.id));
        knownOrderIds.current = idSet;

        setOrders(incoming);
      }
    } catch (err) {
      console.error("Error al obtener órdenes de cocina:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Polling cada 3 segundos
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground overflow-x-hidden">
      {/* Alerta flotante cuando entra nueva orden */}
      <AnimatePresence>
        {hasNewAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-primary text-black font-extrabold px-6 py-3 rounded-full shadow-[0_0_30px_rgba(204,153,51,0.6)] flex items-center gap-3 border border-white/20"
          >
            <BellRing className="w-5 h-5 animate-bounce" />
            <span>¡NUEVA ORDEN ENTRANDO A COCINA!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <div className="bg-zinc-900/80 border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Logo size={40} showText={false} />
            </Link>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <h1 className="font-bold text-xl tracking-wide flex items-center gap-2">
                Panel de Cocina
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  En vivo
                </span>
              </h1>
              <p className="text-xs text-amber-400 font-medium">Sabor Chugurano • Comandas en tiempo real</p>
            </div>
          </div>


          <div className="flex items-center gap-3">
            {/* Botón de Sonido */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playBellSound();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                soundEnabled
                  ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                  : "bg-zinc-800 text-zinc-400 border-white/5 hover:text-white"
              }`}
              title="Activar/Silenciar campanita de cocina"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? "Campanita Activa" : "Silenciado"}
            </button>

            {user && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/80 rounded-xl border border-white/5 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-zinc-400 hidden md:inline">Cocinero:</span>
                <span className="font-bold text-white">{user.name}</span>
              </div>
            )}

            {user?.role_id === 1 && (
              <Link href="/dashboard" className="text-xs font-bold px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors hidden sm:flex items-center gap-1.5">
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <CheckCircle2 className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Todo al día en cocina!</h2>
            <p className="text-zinc-500 max-w-sm">No hay órdenes pendientes en este momento. Las nuevas comandas aparecerán automáticamente con alerta sonora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`relative flex flex-col rounded-3xl border overflow-hidden transition-all ${
                    order.status === "Preparando"
                      ? "bg-primary/5 border-primary/40 shadow-[0_0_30px_rgba(204,153,51,0.15)] ring-1 ring-primary/30"
                      : "bg-zinc-900/60 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                  }`}
                >
                  {/* Status Banner */}
                  <div className={`px-5 py-3 border-b flex justify-between items-center ${
                    order.status === "Preparando" ? "bg-primary/10 border-primary/20" : "bg-amber-500/10 border-amber-500/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xl">#{order.id.toString().padStart(4, "0")}</span>
                      <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-bold tracking-wider">MESA {order.table_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                      {order.status === "Pendiente" ? (
                        <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                          <AlertCircle className="w-4 h-4" /> Nueva Comanda
                        </span>
                      ) : (
                        <span className="text-primary flex items-center gap-1.5">
                          <ChefHat className="w-4 h-4" /> En Preparación
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info del Mesero que tomó la comanda y hora */}
                  <div className="px-5 py-2.5 bg-black/40 text-xs flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mesero: {order.waiter_name || "Mesero de Sala"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hace un momento"}</span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="p-5 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[320px] custom-scrollbar">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-3 bg-zinc-950/70 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="bg-primary/20 text-primary border border-primary/30 font-bold text-lg min-w-[36px] h-9 flex items-center justify-center rounded-lg">
                          {item.quantity}x
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-[15px] text-white">{item.name}</h3>
                          {item.notes && (
                            <p className="text-xs text-amber-300 mt-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-medium">
                              ⚠️ Indicación: "{item.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-5 pt-0 mt-3">
                    {order.status === "Pendiente" ? (
                      <button
                        onClick={() => updateStatus(order.id, "Preparando")}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all border border-amber-500/40 hover:scale-[1.01]"
                      >
                        <Play className="w-5 h-5 fill-current" /> Empezar a Preparar
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(order.id, "Completado")}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(204,153,51,0.3)] hover:shadow-[0_0_30px_rgba(204,153,51,0.5)] hover:scale-[1.01]"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Marcar como Listo / Servir
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
