"use client";

import { apiFetch } from "@/lib/api";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Grid3X3, 
  ChefHat, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  UtensilsCrossed, 
  Users, 
  ChevronRight,
  Sparkles,
  BellRing,
  LogOut,
  Soup,
  Check,
  X,
  Star,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  image_url?: string;
  is_available: boolean;
};

type CartItem = MenuItem & {
  cartKey: string;
  quantity: number;
  notes: string;
};


type TableStatus = {
  table_number: number;
  status: "Libre" | "Ocupada" | "Por Cobrar";
  order_status?: string;
  order_id?: number;
  total_amount?: number;
  created_at?: string;
};

// Sonido de campana usando Web Audio API (sin archivos externos)
function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Campana: oscilador sinusoidal con decay rápido
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);        // La5 - tono agudo de campana
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3); // decae a Mi5
    gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
    // Segundo "ding" más suave después de 0.2s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1108, ctx.currentTime + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.6);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.21);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (e) {
    console.warn("Audio no disponible:", e);
  }
}

function PedidosContent() {
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [addedItemId, setAddedItemId] = useState<number | null>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Vista: "plano" (Mapa grande de mesas) o "carta" (Toma de pedidos)
  const [viewMode, setViewMode] = useState<"plano" | "carta">("plano");

  const [user, setUser] = useState<any>(null);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  // Toast de confirmación al marcar como servido
  const [servidoToast, setServidoToast] = useState<{ mesa: number; id: number } | null>(null);

  const [categories, setCategories] = useState<{ id: number | "all"; name: string }[]>([
    { id: "all", name: "Todos" },
    { id: 1, name: "Menú del Día (Inc. Entrada)" },
    { id: 2, name: "Entradas" },
    { id: 3, name: "Pescados y Mariscos" },
    { id: 4, name: "Pollos y Carnes" },
    { id: 5, name: "Chaufas" },
    { id: 6, name: "Parrillas" },
    { id: 7, name: "Bebidas" }
  ]);

  // Modal para seleccionar la Entrada incluida del Menú del Día
  const [menuItemForEntrada, setMenuItemForEntrada] = useState<MenuItem | null>(null);
  const [entradaChoice, setEntradaChoice] = useState<string>("Sopa del Día");
  const [extraNote, setExtraNote] = useState<string>("");

  const showServidoToast = (mesa: number, id: number) => {
    setServidoToast({ mesa, id });
    setTimeout(() => setServidoToast(null), 3000);
  };

  const flashAdded = (itemId: number) => {
    setAddedItemId(itemId);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedItemId(null), 900);
  };

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    // Restricciones de Rol: Solo Meseros (2) y Administradores (1) acceden a la toma de pedidos
    if (parsed.role_id !== 2 && parsed.role_id !== 1) {
      if (parsed.role_id === 3) {
        window.location.href = "/caja";
      } else if (parsed.role_id === 4) {
        window.location.href = "/cocina";
      } else {
        window.location.href = "/login";
      }
      return;
    }
  }, []);

  useEffect(() => {
    const mesaParam = searchParams.get("mesa");
    if (mesaParam) {
      setTableNumber(mesaParam);
      setViewMode("carta");
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [resMenu, resTables, resOrders, resCats] = await Promise.all([
        apiFetch("/menu"),
        apiFetch("/tables/status"),
        apiFetch("/orders"),
        apiFetch("/categories")
      ]);

      if (resMenu.ok) setMenuItems(await resMenu.json() || []);
      if (resTables.ok) setTables(await resTables.json() || []);
      if (resOrders.ok) {
        const allOrders: any[] = await resOrders.json() || [];
        setReadyOrders(allOrders.filter(o => o.status === "Completado"));
      }
      if (resCats.ok) {
        const cats = await resCats.json();
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories([{ id: "all", name: "Todos" }, ...cats]);
        }
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const selectMesaAndGoToMenu = (mesaNum: number) => {
    setTableNumber(mesaNum.toString());
    setViewMode("carta");
  };

  const handleItemClick = (item: MenuItem) => {
    if (!item.is_available) return;
    if (item.category_id === 1) {
      setMenuItemForEntrada(item);
      setEntradaChoice("Sopa del Día");
      setExtraNote("");
    } else {
      addToCart(item, "");
      flashAdded(item.id);
    }
  };

  const confirmEntradaModal = () => {
    if (!menuItemForEntrada) return;
    const finalNote = extraNote.trim() 
      ? `Entrada: ${entradaChoice} | ${extraNote.trim()}`
      : `Entrada: ${entradaChoice}`;
    addToCart(menuItemForEntrada, finalNote);
    flashAdded(menuItemForEntrada.id);
    setMenuItemForEntrada(null);
  };

  const addToCart = (item: MenuItem, notes: string = "") => {
    if (!item.is_available) return;
    const cartKey = `${item.id}-${notes.trim()}`;
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, cartKey, quantity: 1, notes }];
    });
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartKey === cartKey) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeItem = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const updateNotes = (cartKey: string, notes: string) => {
    setCart(prev => prev.map(item => item.cartKey === cartKey ? { ...item, notes } : item));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    
    const payload = {
      table_number: parseInt(tableNumber) || 1,
      waiter_id: user?.id || 2,
      items: cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.notes
      }))
    };

    try {
      const res = await apiFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`¡Comanda enviada a Cocina para Mesa ${tableNumber}! (Orden #${data.order_id})`);
        setCart([]);
        loadData();
      } else {
        alert("Hubo un error al enviar la orden a cocina");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor");
    } finally {
      setIsSubmitting(false);
    }
  };




  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(i => i.category_id === selectedCategory);

  const salonTables = tables.slice(0, 8);
  const terrazaTables = tables.slice(8, 12);

  const currentTableInfo = tables.find(t => t.table_number === parseInt(tableNumber));

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground pb-24 overflow-x-hidden">

      {/* ===== TOAST FLOTANTE DE CONFIRMACIÓN ===== */}
      <AnimatePresence>
        {servidoToast && (
          <motion.div
            key="servido-toast"
            initial={{ opacity: 0, y: -30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed top-6 left-4 right-4 sm:left-auto sm:right-6 z-[9999] max-w-[calc(100vw-2rem)] sm:max-w-md flex items-center gap-3 px-4 sm:px-5 py-4 rounded-2xl bg-emerald-500 text-black shadow-[0_8px_32px_rgba(16,185,129,0.45)] border border-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-black text-sm">¡Mesa {servidoToast.mesa} confirmada!</div>
              <div className="text-[11px] font-semibold opacity-75">Lista para cobrar en caja 💳</div>
            </div>
            {/* Barra de progreso */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute bottom-0 left-0 h-1 w-full bg-black/20 rounded-b-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header Sticky */}
      <div className="border-b border-white/5 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 min-h-16 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:text-amber-400 transition-colors text-sm font-semibold text-zinc-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={36} showText={false} />
              <div>
                <span className="font-black text-sm tracking-wider text-white block">SABOR CHUGURANO</span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">Terminal de Meseros</span>
              </div>
            </Link>
          </div>


          {/* Selector de Modos: Plano vs Carta */}
          <div className="order-last w-full sm:order-none sm:w-auto flex items-center bg-zinc-950 p-1.5 rounded-2xl border border-white/10">
            <motion.button
              type="button"
              onClick={() => setViewMode("plano")}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className={`relative flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                viewMode === "plano" ? "text-primary-foreground" : "text-zinc-400 hover:text-white"
              }`}
            >
              {viewMode === "plano" && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : "view-mode-pill"}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/25"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                <span>Plano de Mesas</span>
              </span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setViewMode("carta")}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className={`relative flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                viewMode === "carta" ? "text-primary-foreground" : "text-zinc-400 hover:text-white"
              }`}
            >
              {viewMode === "carta" && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : "view-mode-pill"}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/25"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="whitespace-nowrap">Tomar Pedido (Mesa {tableNumber})</span>
              </span>
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/80 rounded-xl border border-white/5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-400 hidden md:inline">Mesero:</span>
                <span className="font-bold text-white max-w-[90px] sm:max-w-none truncate">{user.name}</span>
              </div>
            )}

            {user?.role_id === 1 && (
              <Link 
                href="/dashboard" 
                className="text-xs font-bold px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors flex items-center gap-1.5"
                title="Panel de Administración"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panel Admin</span>
              </Link>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="text-xs px-3 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all active:scale-95 font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* COMUNICACIÓN COCINERO -> MESERO: Alerta de Platos Listos */}
        {readyOrders.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-emerald-400 uppercase tracking-wider">
                    ¡Aviso de Cocina: {readyOrders.length} {readyOrders.length === 1 ? 'comanda lista' : 'comandas listas'} para servir!
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Listo en barra
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  El cocinero terminó la preparación. Por favor recoge y sirve en la mesa correspondiente.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {readyOrders.map((ro) => (
                <button
                  key={ro.id}
                  onClick={async () => {
                    // Sonido + toast de confirmación
                    playDing();
                    showServidoToast(ro.table_number, ro.id);
                    // IMPORTANTE: "Completado" → backend lo mapea a "Por Cobrar"
                    await apiFetch(`/orders/${ro.id}/status`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "Completado" })
                    });
                    loadData();
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mesa {ro.table_number}: Servido ✓
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 1: PLANO GENERAL DE MESAS GRANDE (Item Solicitado por el Usuario) */}
        {/* ========================================================================= */}
        {viewMode === "plano" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
            className="space-y-10"
          >
            {/* Banner superior con resumen */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                  <Grid3X3 className="w-8 h-8 text-primary" />
                  Plano del Restaurante
                </h1>
                <p className="text-zinc-400 text-sm">
                  Selecciona cualquier mesa para abrir o continuar la comanda del cliente.
                </p>
              </div>

              {/* Leyenda de colores grandes */}
              <div className="flex flex-wrap gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-white/5 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                  <span className="text-emerald-400">Libre (Disponible)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
                  <span className="text-amber-400">Ocupada (En Cocina)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]" />
                  <span className="text-blue-400">Por Cobrar (Cuenta)</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: SALÓN PRINCIPAL (Mesas 1 a 8) */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Salón Principal</h2>
                  <p className="text-xs text-zinc-400">Mesas 1 a 8 • Zona central del restaurante</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {salonTables.map((tbl) => (
                  <TableCardBig 
                    key={tbl.table_number} 
                    tbl={tbl} 
                    userRole={user?.role_id}
                    onSelect={() => selectMesaAndGoToMenu(tbl.table_number)} 
                  />
                ))}
              </div>
            </div>

            {/* SECCIÓN 2: ZONA TERRAZA & BAR (Mesas 9 a 12) */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Zona Terraza & Bar Norteño</h2>
                  <p className="text-xs text-zinc-400">Mesas 9 a 12 • Ambiente al aire libre</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {terrazaTables.map((tbl) => (
                  <TableCardBig 
                    key={tbl.table_number} 
                    tbl={tbl} 
                    userRole={user?.role_id}
                    onSelect={() => selectMesaAndGoToMenu(tbl.table_number)} 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: TOMA DE COMANDA Y CARTA (Con Barra de Mesa Rápida) */}
        {/* ========================================================================= */}
        {viewMode === "carta" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
          >
            {/* Cabecera de Mesa Activa */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 mb-8 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-xl sm:text-2xl shadow-lg shadow-primary/20">
                  M{tableNumber}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">Comanda Mesa {tableNumber}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      currentTableInfo?.status === "Libre" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      currentTableInfo?.status === "Ocupada" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                      "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {currentTableInfo?.status || "Libre"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {currentTableInfo?.status === "Ocupada" 
                      ? `Esta mesa tiene una orden activa (#${currentTableInfo.order_id}). Puedes agregarle más platos.` 
                      : "Mesa lista para registrar una nueva orden de comida."}
                  </p>
                </div>
              </div>

              {/* Botón para cambiar de mesa */}
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => setViewMode("plano")}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5"
              >
                <Grid3X3 className="w-4 h-4 text-primary" />
                Cambiar de Mesa en el Plano
              </motion.button>
            </div>

            {/* Selector de Mesas Rápido (Espacioso, no apretado) */}
            <div className="mb-8">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Selección Rápida de Mesa:
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
                  const tbl = tables.find(t => t.table_number === num);
                  const isSel = tableNumber === num.toString();
                  const st = tbl?.status || "Libre";

                  return (
                    <motion.button
                      key={num}
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                      animate={shouldReduceMotion ? undefined : { scale: isSel ? 1.05 : 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      onClick={() => setTableNumber(num.toString())}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                        isSel
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30"
                          : st === "Libre"
                          ? "bg-zinc-900/60 text-zinc-300 border-emerald-500/20 hover:border-emerald-500/50"
                          : st === "Ocupada"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                      }`}
                    >
                      M{num}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* CONTENEDOR PRINCIPAL: CARTA + COMANDA */}
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
              {/* Sección Menú */}
              <div className="lg:col-span-2 min-w-0">
                {/* Categorías */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
                      }`}
                    >
                      {cat.name}
                    </motion.button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-5">
                    {filteredItems.map((item, i) => {
                      const isMenuDia = item.category_id === 1;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          key={item.id} 
                          className={`min-w-0 bg-zinc-900/60 border rounded-3xl overflow-hidden flex flex-col justify-between transition-all ${
                            isMenuDia
                              ? "border-amber-500/30 hover:border-amber-400/70 shadow-lg shadow-amber-500/5"
                              : item.is_available 
                              ? "border-white/5 hover:border-primary/40 shadow-lg shadow-black/40" 
                              : "border-red-500/20 opacity-60 bg-zinc-950/40"
                          }`}
                        >
                          <div className="relative h-36 w-full bg-zinc-950 overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                                <UtensilsCrossed className="w-8 h-8" />
                              </div>
                            )}

                            {isMenuDia && (
                              <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                                <Star className="w-3 h-3 fill-black" />
                                <span>Inc. Entrada</span>
                              </div>
                            )}

                            <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-amber-400 border border-amber-500/30">
                              S/ {item.price.toFixed(2)}
                            </div>
                          </div>

                          <div className="p-5 flex flex-col justify-between flex-1 gap-3 min-w-0">
                            <div className="min-w-0">
                              <h3 className="font-bold text-base leading-tight text-white mb-1 break-words">{item.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">{item.description}</p>
                            </div>

                            {item.is_available ? (
                              <motion.button
                                type="button"
                                onClick={() => handleItemClick(item)}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                                whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
                                className={`w-full py-2.5 rounded-xl border transition-all font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                                  addedItemId === item.id
                                    ? "bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/30"
                                    : isMenuDia
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-black"
                                    : "border-white/10 hover:bg-primary hover:text-primary-foreground hover:border-primary text-zinc-200"
                                }`}
                              >
                                <AnimatePresence mode="wait" initial={false}>
                                  {addedItemId === item.id ? (
                                    <motion.span
                                      key="added"
                                      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                                      className="flex items-center gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Agregado</span>
                                    </motion.span>
                                  ) : (
                                    <motion.span
                                      key="idle"
                                      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                                      className="flex items-center gap-1.5"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{isMenuDia ? "Elegir Entrada & Pedir" : "Agregar al Pedido"}</span>
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            ) : (
                              <div className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs text-center">
                                Agotado
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                  </div>
                )}
              </div>

              {/* Sección Comanda Actual */}
              <div className="lg:col-span-1 min-w-0">
                <div className="sticky top-28 bg-zinc-900/90 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative p-2.5 bg-primary/20 rounded-xl">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <AnimatePresence>
                          {totalUnits > 0 && (
                            <motion.span
                              key={totalUnits}
                              initial={shouldReduceMotion ? false : { scale: 0.4, opacity: 0 }}
                              animate={{ scale: shouldReduceMotion ? 1 : [1.3, 1], opacity: 1 }}
                              exit={shouldReduceMotion ? undefined : { scale: 0.4, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 18 }}
                              className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-lg shadow-primary/30"
                            >
                              {totalUnits}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div>
                        <h2 className="text-xl font-black">Comanda Actual</h2>
                        <span className="text-xs text-primary font-bold">MESA {tableNumber}</span>
                      </div>
                    </div>
                    {cart.length > 0 && (
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                        onClick={() => setCart([])}
                        className="text-xs text-zinc-500 hover:text-red-400 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Vaciar
                      </motion.button>
                    )}
                  </div>

                  {successMsg ? (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-5 rounded-2xl text-center mb-6"
                    >
                      <p className="font-bold text-sm mb-2">{successMsg}</p>
                      <button 
                        onClick={() => { setSuccessMsg(""); setViewMode("plano"); }}
                        className="mt-2 text-xs font-bold underline hover:text-emerald-300 active:scale-95 transition-transform"
                      >
                        Volver al plano de mesas
                      </button>
                    </motion.div>
                  ) : cart.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      La comanda está vacía.<br/>Agrega platos de la carta para Mesa {tableNumber}.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3 max-h-[38vh] overflow-y-auto pr-1 custom-scrollbar">
                        <AnimatePresence initial={false} mode="popLayout">
                          {cart.map(item => (
                            <motion.div
                              layout
                              key={item.cartKey}
                              initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={shouldReduceMotion ? undefined : { opacity: 0, x: -20, scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              className="bg-zinc-950/70 p-3.5 rounded-2xl border border-white/5"
                            >
                              <div className="flex justify-between items-start mb-1.5">
                                <div>
                                  <span className="font-bold text-sm text-white block">{item.name}</span>
                                  {item.notes && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 mt-1">
                                      <Soup className="w-3 h-3 text-amber-400" />
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                                <span className="text-primary font-black text-sm whitespace-nowrap ml-2">
                                  S/ {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 mt-2">
                                <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                                  <motion.button
                                    type="button"
                                    whileTap={shouldReduceMotion ? undefined : { scale: 0.8 }}
                                    onClick={() => updateQuantity(item.cartKey, -1)}
                                    className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-md hover:text-primary hover:bg-white/5 transition-colors"
                                    aria-label={`Quitar una unidad de ${item.name}`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </motion.button>
                                  <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                      key={item.quantity}
                                      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                                      className="w-6 text-center font-bold text-xs"
                                    >
                                      {item.quantity}
                                    </motion.span>
                                  </AnimatePresence>
                                  <motion.button
                                    type="button"
                                    whileTap={shouldReduceMotion ? undefined : { scale: 0.8 }}
                                    onClick={() => updateQuantity(item.cartKey, 1)}
                                    className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-md hover:text-primary hover:bg-white/5 transition-colors"
                                    aria-label={`Agregar una unidad de ${item.name}`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                                <motion.button
                                  type="button"
                                  whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
                                  onClick={() => removeItem(item.cartKey)}
                                  className="h-11 w-11 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-auto"
                                  aria-label={`Eliminar ${item.name} de la comanda`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                              <input
                                type="text"
                                placeholder="Editar indicación (ej. bien dorado, sin sal)"
                                value={item.notes}
                                onChange={(e) => updateNotes(item.cartKey, e.target.value)}
                                className="mt-2.5 w-full text-xs bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 text-white placeholder:text-zinc-600"
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>

                      </div>

                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-zinc-400">Total Comanda</span>
                          <motion.span
                            key={total.toFixed(2)}
                            initial={shouldReduceMotion ? false : { scale: 1.15 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="text-primary text-2xl font-black"
                          >
                            S/ {total.toFixed(2)}
                          </motion.span>
                        </div>

                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          onClick={submitOrder}
                          disabled={isSubmitting}
                          className="w-full bg-primary text-primary-foreground font-extrabold py-4 rounded-2xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(204,153,51,0.3)] hover:shadow-[0_0_30px_rgba(204,153,51,0.5)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" />
                          ) : (
                            `Enviar a Cocina (Mesa ${tableNumber})`
                          )}
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* MODAL DE SELECCIÓN DE ENTRADA INCLUIDA (MENÚ DEL DÍA) */}
      <AnimatePresence>
        {menuItemForEntrada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    Menú del Día • S/ 10.00
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">{menuItemForEntrada.name}</h3>
                </div>
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                  onClick={() => setMenuItemForEntrada(null)} 
                  className="h-11 w-11 -m-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <p className="text-xs text-zinc-300 mb-4">
                Elige la <strong className="text-amber-400">entrada incluida</strong> que desea el comensal:
              </p>

              <div className="space-y-2.5 mb-5">
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => setEntradaChoice("Sopa del Día")}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    entradaChoice === "Sopa del Día"
                      ? "bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍲</span>
                    <div>
                      <div className="font-bold text-sm text-white">Sopa del Día</div>
                      <div className="text-[10px] text-zinc-400">Caldo casero caliente con fideos y verduras</div>
                    </div>
                  </div>
                  {entradaChoice === "Sopa del Día" && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </motion.div>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => setEntradaChoice("Papa a la Huancaína")}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    entradaChoice === "Papa a la Huancaína"
                      ? "bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🥔</span>
                    <div>
                      <div className="font-bold text-sm text-white">Papa a la Huancaína</div>
                      <div className="text-[10px] text-zinc-400">Cremosa salsa huancaína tradicional, huevo y aceituna</div>
                    </div>
                  </div>
                  {entradaChoice === "Papa a la Huancaína" && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </motion.div>
                  )}
                </motion.button>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  Indicación extra para cocina (Opcional):
                </label>
                <input
                  type="text"
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  placeholder="Ej. bien dorado, sin ensalada, presa pierna..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => setMenuItemForEntrada(null)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  onClick={confirmEntradaModal}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Agregar Menú S/ 10.00
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// Componente de Tarjeta Grande para cada Mesa en el Plano
function TableCardBig({ tbl, userRole, onSelect }: { tbl: TableStatus; userRole?: number; onSelect: () => void }) {
  const shouldReduceMotion = useReducedMotion();
  const isLibre = tbl.status === "Libre";
  const isOcupada = tbl.status === "Ocupada";
  const isPorCobrar = tbl.status === "Por Cobrar";

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden shadow-xl min-h-[210px] ${
        isLibre
          ? "bg-zinc-900/60 border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
          : isOcupada
          ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30"
          : "bg-blue-500/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/40"
      }`}
    >
      <div>
        {/* Cabecera de la mesa */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              {tbl.table_number <= 8 ? "Salón" : "Terraza"}
            </div>
            <h3 className="text-3xl font-black text-white mt-0.5 tracking-tight">
              Mesa {tbl.table_number.toString().padStart(2, '0')}
            </h3>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            isLibre ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            isOcupada ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse" :
            "bg-blue-500/20 text-blue-300 border border-blue-500/30"
          }`}>
            {tbl.status}
          </span>
        </div>

        {/* Información de consumo */}
        {!isLibre ? (
          <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-white/5 mb-4 text-xs">
            <div className="flex justify-between items-center text-zinc-400 mb-1">
              <span>Orden #{tbl.order_id}</span>
              <span className="font-semibold text-zinc-300">{tbl.order_status}</span>
            </div>
            <div className="text-xl font-black text-primary">
              S/ {(tbl.total_amount || 0).toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-white/5 mb-4 text-xs text-zinc-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Disponible para comensales</span>
          </div>
        )}
      </div>

      {/* Botón de acción grande */}
      <div>
        {isLibre ? (
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={onSelect}
            className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 border border-emerald-500/30 hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Tomar Pedido ➔
          </motion.button>
        ) : isPorCobrar ? (
          <div className="flex gap-2">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={onSelect}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl text-xs transition-colors"
            >
              Ver Pedido
            </motion.button>
            {userRole === 1 ? (
              <Link
                href="/caja"
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-black font-extrabold rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
              >
                <Receipt className="w-3.5 h-3.5" /> Cobrar
              </Link>
            ) : (
              <div 
                className="flex-1 py-3 bg-blue-500/10 text-blue-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1 border border-blue-500/20"
                title="Solo el personal de caja tiene permisos para cobrar"
              >
                <Receipt className="w-3.5 h-3.5" /> En Caja
              </div>
            )}
          </div>
        ) : (
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={onSelect}
            className="w-full py-3.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-extrabold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 border border-amber-500/30"
          >
            <Plus className="w-4 h-4" /> Agregar más platos
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default function Pedidos() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-white">Cargando terminal de pedidos...</div>}>
      <PedidosContent />
    </Suspense>
  );
}
