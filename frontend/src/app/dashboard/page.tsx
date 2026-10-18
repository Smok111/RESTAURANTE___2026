"use client";

import { apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  LogOut,
  CheckCircle2,
  Clock,
  RotateCcw,
  LayoutDashboard,
  ReceiptText,
  Users,
  Settings,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Trash2,
  Plus,
  BookOpen,
  Grid3X3,
  Receipt,
  Eye,
  X,
  Edit3,
  ChefHat,
  Calendar,
  CalendarCheck,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Upload
} from "lucide-react";


import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  image_url?: string;
  is_available: boolean;
};



type Category = {
  id: number;
  name: string;
};

type TableStatus = {
  table_number: number;
  status: "Libre" | "Ocupada" | "Por Cobrar";
  order_status?: string;
  order_id?: number;
  total_amount?: number;
  created_at?: string;
};

type Reservation = {
  id: number;
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  email?: string;
  customer_email?: string;
  reservation_date: string;
  reservation_time: string;
  guests_count: number;
  notes?: string;
  special_requests?: string;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationFilter, setReservationFilter] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");

  // Modal para ver detalle de orden (Item 4)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados para Carta / Menú (Item 2)
  const [showAddDish, setShowAddDish] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isUploadingDishImg, setIsUploadingDishImg] = useState(false);
  const [dishForm, setDishForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: 1,
    image_url: "",
    is_available: true
  });

  // Modal para agregar usuario
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role_id: 2 });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    // El Mesero, Cocinero o Cajero NO tienen privilegios de Administrador
    if (parsed.role_id !== 1) {
      if (parsed.role_id === 2) {
        router.push("/pedidos");
      } else if (parsed.role_id === 3) {
        router.push("/caja");
      } else if (parsed.role_id === 4) {
        router.push("/cocina");
      } else {
        router.push("/login");
      }
      return;
    }
    setUser(parsed);
    fetchAllData();
  }, [router]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrders(),
      fetchStaff(),
      fetchMenu(),
      fetchCategories(),
      fetchTables(),
      fetchReservations()
    ]);
    setLoading(false);
  };

  const fetchReservations = async () => {
    try {
      const res = await apiFetch("/reservations");
      if (res.ok) setReservations(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  const updateReservationStatus = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchReservations();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReservation = async (id: number) => {
    if (!confirm("¿Eliminar esta reserva permanentemente?")) return;
    try {
      await apiFetch(`/reservations/${id}`, { method: "DELETE" });
      fetchReservations();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/orders");
      if (res.ok) setOrders(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/users");
      if (res.ok) setStaff(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await apiFetch("/menu");
      if (res.ok) setMenuItems(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch("/categories");
      if (res.ok) setCategories(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await apiFetch("/tables/status");
      if (res.ok) setTables(await res.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir detalle completo de orden (Item 4)
  const openOrderDetails = async (orderId: number, base?: Order) => {
    setLoadingDetails(true);
    // Abre el modal de inmediato con lo que ya tenemos y luego carga el desglose
    setSelectedOrderDetails(
      base
        ? { ...base, items: [] }
        : { id: orderId, table_number: 0, status: "Cargando", total_amount: 0, created_at: "" }
    );
    try {
      const res = await apiFetch(`/orders/${orderId}`);
      if (res.ok) {
        setSelectedOrderDetails(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateOrderStatus = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
      fetchTables();
    } catch (err) {
      console.error(err);
    }
  };

  // Acciones de Menú (Item 2)
  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: dishForm.name,
        description: dishForm.description,
        price: parseFloat(dishForm.price) || 0,
        category_id: Number(dishForm.category_id),
        image_url: dishForm.image_url || "",
        is_available: dishForm.is_available
      };

      if (editingDish) {
        await apiFetch(`/menu/${editingDish.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-User-Role": "1" },
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Role": "1" },
          body: JSON.stringify(payload)
        });
      }

      setShowAddDish(false);
      setEditingDish(null);
      setDishForm({ name: "", description: "", price: "", category_id: 1, image_url: "", is_available: true });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDishImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDishImg(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await apiFetch("/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setDishForm(prev => ({ ...prev, image_url: data.url }));
      } else {
        alert("Error al subir imagen");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al subir la imagen");
    } finally {
      setIsUploadingDishImg(false);
    }
  };

  const toggleDishAvailability = async (id: number) => {
    try {
      await apiFetch(`/menu/${id}/toggle`, { method: "PATCH" });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDish = async (id: number) => {
    if (!confirm("¿Eliminar este plato de la carta?")) return;
    try {
      await apiFetch(`/menu/${id}`, {
        method: "DELETE",
        headers: { "X-User-Role": "1" }
      });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishForm({
      name: dish.name,
      description: dish.description,
      price: dish.price.toString(),
      category_id: dish.category_id,
      image_url: dish.image_url || "",
      is_available: dish.is_available
    });
    setShowAddDish(true);
  };

  const deleteStaff = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await apiFetch(`/users/${id}`, {
        method: "DELETE",
        headers: { "X-User-Role": "1" }
      });
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Role": "1" },
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email,
          password: newStaff.password,
          role_id: Number(newStaff.role_id)
        })
      });
      setNewStaff({ name: "", email: "", password: "", role_id: 2 });
      setShowAddStaff(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  // Métricas
  const totalRevenue = orders.filter(o => o.status === "Pagado" || o.status === "Completado").reduce((sum, o) => sum + o.total_amount, 0);
  const pendingOrders = orders.filter(o => o.status === "Pendiente" || o.status === "Preparando").length;
  const readyOrders = orders.filter(o => o.status === "Completado").length;
  const avgTicket = orders.length > 0 ? (totalRevenue / orders.length) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size={38} showText={false} />
            <div>
              <div className="font-black tracking-wider text-sm text-white group-hover:text-amber-400 transition-colors">Sabor Chugurano</div>
              <div className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">Panel Integral</div>
            </div>
          </Link>

        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "resumen" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Resumen General
          </button>

          <button
            onClick={() => setActiveTab("ordenes")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "ordenes" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <ReceiptText className="w-5 h-5" /> Gestión de Órdenes
          </button>

          <button
            onClick={() => setActiveTab("mesas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "mesas" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Grid3X3 className="w-5 h-5" /> Mapa de Mesas
          </button>

          <button
            onClick={() => setActiveTab("reservas")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "reservas" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <span className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5" /> Reservaciones
            </span>
            {reservations.filter(r => r.status === 'Pendiente').length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'reservas' ? 'bg-black/25 text-white' : 'bg-amber-500/20 text-amber-400'
                }`}>
                {reservations.filter(r => r.status === 'Pendiente').length}
              </span>
            )}
          </button>

          <Link
            href="/caja"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20"
          >
            <span className="flex items-center gap-3">
              <Receipt className="w-5 h-5" /> Punto de Caja
            </span>
            <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">POS</span>
          </Link>

          <Link
            href="/facturacion"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
          >
            <span className="flex items-center gap-3">
              <ReceiptText className="w-5 h-5" /> Facturación
            </span>
            <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full font-bold">SUNAT</span>
          </Link>

          <Link
            href="/menu-diario"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
          >
            <span className="flex items-center gap-3">
              <Calendar className="w-5 h-5" /> Menú del Día
            </span>
            <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full font-bold">S/ 10</span>
          </Link>

          <button
            onClick={() => setActiveTab("menu")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "menu" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <BookOpen className="w-5 h-5" /> Carta & Menú
          </button>

          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "personal" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Users className="w-5 h-5" /> Personal
          </button>

          <button
            onClick={() => setActiveTab("configuracion")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "configuracion" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <Settings className="w-5 h-5" /> Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-zinc-900 rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.role_id === 1 ? 'Administrador' : 'Personal'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black mb-2">
                {activeTab === 'resumen' && `¡Hola, ${user.name.split(' ')[0]}! 👋`}
                {activeTab === 'ordenes' && 'Gestión de Órdenes & Comandas'}
                {activeTab === 'mesas' && 'Mapa Visual de Mesas en Vivo'}
                {activeTab === 'reservas' && 'Gestión de Reservaciones Web'}
                {activeTab === 'menu' && 'Gestión de Carta & Platos'}
                {activeTab === 'personal' && 'Administración de Personal'}
                {activeTab === 'configuracion' && 'Configuración del Restaurante'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'resumen' && 'Resumen financiero y actividad en vivo del restaurante.'}
                {activeTab === 'ordenes' && 'Haz clic en cualquier orden para ver el detalle de los platos solicitados.'}
                {activeTab === 'mesas' && 'Controla qué mesas están libres, comiendo o listas para pagar.'}
                {activeTab === 'reservas' && 'Gestiona y confirma las mesas reservadas en línea por los clientes.'}
                {activeTab === 'menu' && 'Crea platos, ajusta precios o márcalos como disponibles/agotados.'}
                {activeTab === 'personal' && 'Gestiona los accesos y roles del equipo.'}
                {activeTab === 'configuracion' && 'Preferencias generales del sistema.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllData}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl transition-all text-xs font-bold text-zinc-300"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
                Refrescar
              </button>

              {activeTab === 'menu' && (
                <button
                  onClick={() => {
                    setEditingDish(null);
                    setDishForm({ name: "", description: "", price: "", category_id: 1, image_url: "", is_available: true });
                    setShowAddDish(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all text-xs font-bold shadow-lg shadow-primary/20"
                >
                  <Plus className="w-4 h-4" /> Nuevo Plato
                </button>
              )}

              {activeTab === 'personal' && (
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all text-xs font-bold shadow-lg shadow-primary/20"
                >
                  <Plus className="w-4 h-4" /> Agregar Personal
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: RESUMEN GENERAL */}
          {activeTab === 'resumen' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                <MetricCard
                  title="Ingresos Totales"
                  value={`S/ ${totalRevenue.toFixed(2)}`}
                  icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
                  trend="En caja"
                />
                <MetricCard
                  title="Ticket Promedio"
                  value={`S/ ${avgTicket.toFixed(2)}`}
                  icon={<TrendingUp className="w-6 h-6 text-primary" />}
                  trend="Por comanda"
                />
                <MetricCard
                  title="Total Comandas"
                  value={orders.length.toString()}
                  icon={<ShoppingCart className="w-6 h-6 text-blue-400" />}
                  trend="Hoy"
                />
                <MetricCard
                  title="En Preparación"
                  value={pendingOrders.toString()}
                  icon={<Clock className="w-6 h-6 text-amber-400" />}
                  isWarning={pendingOrders > 0}
                />
                <MetricCard
                  title="Por Cobrar / Listas"
                  value={readyOrders.toString()}
                  icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                />
              </div>

              {/* Acciones rápidas de restaurante */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <Link
                  href="/pedidos"
                  className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-primary/40 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                      <UtensilsCrossed className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Módulo Mesero</h3>
                    <p className="text-zinc-400 text-xs">Tomar pedidos para enviar directo a cocina.</p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-primary flex items-center gap-1">
                    Abrir comanda ➔
                  </div>
                </Link>

                <Link
                  href="/cocina"
                  className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-amber-500/40 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                      <ChefHat className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Panel de Cocina</h3>
                    <p className="text-zinc-400 text-xs">Ver órdenes en preparación con alerta sonora.</p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-amber-400 flex items-center gap-1">
                    Ver pantalla de cocina ➔
                  </div>
                </Link>

                <Link
                  href="/caja"
                  className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Caja & Cobros</h3>
                    <p className="text-zinc-400 text-xs">Cobrar mesas con Efectivo, Tarjeta o Yape.</p>
                  </div>
                  <div className="mt-4 text-xs font-bold text-emerald-400 flex items-center gap-1">
                    Ir al punto de venta ➔
                  </div>
                </Link>
              </div>

              {/* Órdenes Recientes */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Últimas Comandas Registradas</h2>
                  <button onClick={() => setActiveTab("ordenes")} className="text-xs font-bold text-primary hover:underline">
                    Ver todas
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="pb-3 px-4 font-semibold">Orden</th>
                        <th className="pb-3 px-4 font-semibold">Mesa</th>
                        <th className="pb-3 px-4 font-semibold">Estado</th>
                        <th className="pb-3 px-4 font-semibold text-right">Monto</th>
                        <th className="pb-3 px-4 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {orders.slice(0, 6).map((order) => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-bold">#{order.id.toString().padStart(4, '0')}</td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-bold border border-white/5">
                              Mesa {order.table_number}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${order.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                order.status === 'Preparando' ? 'bg-primary/10 text-primary border border-primary/20' :
                                  order.status === 'Completado' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-primary">
                            S/ {order.total_amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openOrderDetails(order.id, order)}
                              className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: GESTIÓN DE ÓRDENES CON DETALLE (Item 4) */}
          {activeTab === 'ordenes' && (
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="pb-4 px-4 font-semibold">ID</th>
                      <th className="pb-4 px-4 font-semibold">Mesa</th>
                      <th className="pb-4 px-4 font-semibold">Hora</th>
                      <th className="pb-4 px-4 font-semibold">Monto</th>
                      <th className="pb-4 px-4 font-semibold">Estado</th>
                      <th className="pb-4 px-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold text-zinc-300">#{order.id.toString().padStart(4, '0')}</td>
                        <td className="py-4 px-4 font-bold">Mesa {order.table_number}</td>
                        <td className="py-4 px-4 text-zinc-400 text-xs">
                          {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="py-4 px-4 font-black text-primary">S/ {order.total_amount.toFixed(2)}</td>
                        <td className="py-4 px-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-primary"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Preparando">Preparando</option>
                            <option value="Completado">Completado</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => openOrderDetails(order.id, order)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-bold transition-all inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Platos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MAPA VISUAL DE MESAS (Item 5) */}
          {activeTab === 'mesas' && (
            <div>
              {/* Leyenda */}
              <div className="flex flex-wrap gap-4 mb-8 bg-zinc-900/60 p-4 rounded-2xl border border-white/5 text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  Mesa Libre (Disponible)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  Mesa Ocupada (En Cocina / Preparando)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  Mesa Por Cobrar (Completada / Pidiendo Cuenta)
                </span>
              </div>

              {/* Grid de Mesas 1 al 12 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {tables.map((tbl) => {
                  const isLibre = tbl.status === "Libre";
                  const isOcupada = tbl.status === "Ocupada";
                  const isPorCobrar = tbl.status === "Por Cobrar";

                  return (
                    <motion.div
                      key={tbl.table_number}
                      whileHover={{ scale: 1.02 }}
                      className={`p-6 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${isLibre
                          ? "bg-zinc-900/40 border-emerald-500/20 hover:border-emerald-500/40"
                          : isOcupada
                            ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                            : "bg-blue-500/5 border-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30"
                        }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-3xl font-black text-white">
                            #{tbl.table_number}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isLibre ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              isOcupada ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" :
                                "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black"
                            }`}>
                            {tbl.status}
                          </span>
                        </div>

                        {!isLibre && tbl.order_id && (
                          <div className="bg-zinc-950/70 p-3 rounded-2xl border border-white/5 mb-4 text-xs space-y-1">
                            <div className="text-zinc-400">Orden #{tbl.order_id}</div>
                            <div className="text-primary font-black text-base">S/ {(tbl.total_amount || 0).toFixed(2)}</div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        {isLibre ? (
                          <Link
                            href={`/pedidos?mesa=${tbl.table_number}`}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-primary hover:text-primary-foreground text-zinc-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Asignar Pedido
                          </Link>
                        ) : isPorCobrar ? (
                          <Link
                            href="/caja"
                            className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-black font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Cobrar Cuenta
                          </Link>
                        ) : (
                          <button
                            onClick={() => tbl.order_id && openOrderDetails(tbl.order_id)}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Consumo
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GESTIÓN DE CARTA & MENÚ (Item 2) */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Formulario de agregar/editar plato */}
              <AnimatePresence>
                {showAddDish && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 backdrop-blur-md overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">
                        {editingDish ? "Editar Plato" : "Crear Nuevo Plato en la Carta"}
                      </h3>
                      <button
                        onClick={() => { setShowAddDish(false); setEditingDish(null); }}
                        className="p-1.5 text-zinc-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveDish} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Nombre del Plato</label>
                        <input
                          type="text"
                          required
                          value={dishForm.name}
                          onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                          placeholder="Ej. Parihuela Mixta"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Precio (S/)</label>
                        <input
                          type="number"
                          step="0.50"
                          required
                          value={dishForm.price}
                          onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                          placeholder="35.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Categoría</label>
                        <select
                          value={dishForm.category_id}
                          onChange={(e) => setDishForm({ ...dishForm, category_id: Number(e.target.value) })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Disponibilidad</label>
                        <select
                          value={dishForm.is_available ? "true" : "false"}
                          onChange={(e) => setDishForm({ ...dishForm, is_available: e.target.value === "true" })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                        >
                          <option value="true">Disponible en Menú</option>
                          <option value="false">Agotado / No disponible</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Descripción e Ingredientes</label>
                        <textarea
                          rows={2}
                          value={dishForm.description}
                          onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                          placeholder="Pescado del día, mariscos selectos, ají panca y cilantro fresco..."
                        />
                      </div>

                      {/* Administrador de Imagen del Producto */}
                      <div className="md:col-span-2 bg-zinc-950/80 p-5 rounded-2xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" /> Fotografía del Plato
                          </label>
                          {dishForm.image_url && (
                            <button
                              type="button"
                              onClick={() => setDishForm({ ...dishForm, image_url: "" })}
                              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Quitar imagen
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                          {/* Vista previa de la imagen */}
                          <div className="relative aspect-video md:aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center group shadow-inner">
                            {dishForm.image_url ? (
                              <img
                                src={dishForm.image_url}
                                alt="Vista previa del plato"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                              />
                            ) : (
                              <div className="text-center p-4">
                                <ImageIcon className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                                <p className="text-xs text-zinc-500 font-semibold">Sin imagen asignada</p>
                                <span className="text-[10px] text-zinc-600">Sube una o elige del catálogo</span>
                              </div>
                            )}

                            {isUploadingDishImg && (
                              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-xs text-primary font-bold gap-2">
                                <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span>Subiendo fotografía...</span>
                              </div>
                            )}
                          </div>

                          {/* Controles de carga y selección */}
                          <div className="md:col-span-2 space-y-4">
                            {/* Subir archivo desde PC */}
                            <div>
                              <span className="block text-xs font-semibold text-zinc-400 mb-1.5">
                                Subir imagen desde tu computadora:
                              </span>
                              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-white/20 hover:border-primary/50 rounded-xl cursor-pointer transition-all text-xs font-bold text-zinc-200">
                                <Upload className="w-4 h-4 text-primary" />
                                <span>{isUploadingDishImg ? "Procesando..." : "Explorar archivo (PNG, JPG, WebP)"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isUploadingDishImg}
                                  onChange={handleDishImageUpload}
                                />
                              </label>
                            </div>

                            {/* O escribir URL manualmente */}
                            <div>
                              <span className="block text-xs font-semibold text-zinc-400 mb-1.5">
                                O pegar URL directa de la imagen:
                              </span>
                              <input
                                type="text"
                                value={dishForm.image_url}
                                onChange={(e) => setDishForm({ ...dishForm, image_url: e.target.value })}
                                placeholder="Ej: /images/ceviche_hero.png o https://..."
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                              />
                            </div>

                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setShowAddDish(false); setEditingDish(null); }}
                          className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                        >
                          {editingDish ? "Guardar Cambios" : "Agregar a la Carta"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lista de Platos */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="pb-4 px-4 font-semibold w-16">Foto</th>
                        <th className="pb-4 px-4 font-semibold">Plato</th>
                        <th className="pb-4 px-4 font-semibold">Categoría</th>
                        <th className="pb-4 px-4 font-semibold">Precio</th>
                        <th className="pb-4 px-4 font-semibold">Estado</th>
                        <th className="pb-4 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {menuItems.map((dish) => {
                        const cat = categories.find(c => c.id === dish.category_id)?.name || "General";
                        return (
                          <tr key={dish.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4">
                              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center relative shadow-md">
                                {dish.image_url ? (
                                  <img
                                    src={dish.image_url}
                                    alt={dish.name}
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <UtensilsCrossed className="w-5 h-5 text-zinc-600" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-white">{dish.name}</div>
                              <div className="text-xs text-zinc-400 line-clamp-1">{dish.description}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 bg-zinc-800 rounded-lg text-xs font-medium border border-white/5">
                                {cat}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-primary">
                              S/ {dish.price.toFixed(2)}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => toggleDishAvailability(dish.id)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${dish.is_available
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                                  }`}
                                title="Clic para cambiar disponibilidad"
                              >
                                {dish.is_available ? "✓ Disponible" : "✕ Agotado"}
                              </button>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => startEditDish(dish)}
                                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteDish(dish.id)}
                                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              {showAddStaff && (
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="text-lg font-bold mb-4">Agregar Nuevo Personal</h3>
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-400">Nombre Completo</label>
                      <input type="text" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-400">Correo Electrónico</label>
                      <input type="email" required value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-400">Contraseña</label>
                      <input type="password" required value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-400">Rol</label>
                      <select value={newStaff.role_id} onChange={e => setNewStaff({ ...newStaff, role_id: Number(e.target.value) })} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary">
                        <option value={1}>Administrador</option>
                        <option value={2}>Mesero</option>
                        <option value={3}>Cajero</option>
                        <option value={4}>Cocinero / Chef</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                      <button type="button" onClick={() => setShowAddStaff(false)} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors text-xs font-bold">Cancelar</button>
                      <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all">Guardar</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="pb-4 px-4 font-semibold">Nombre</th>
                        <th className="pb-4 px-4 font-semibold">Correo</th>
                        <th className="pb-4 px-4 font-semibold">Rol</th>
                        <th className="pb-4 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {staff.map((member) => (
                        <tr key={member.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-medium">{member.name}</td>
                          <td className="py-4 px-4 text-zinc-400">{member.email}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-bold border border-white/5">
                              {member.role_id === 1 ? 'Admin' : member.role_id === 2 ? 'Mesero' : member.role_id === 3 ? 'Cajero' : 'Cocinero / Chef'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button onClick={() => deleteStaff(member.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RESERVAS */}
          {activeTab === 'reservas' && (
            <div className="space-y-6">
              {/* Metric Cards para Reservas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-zinc-900/60 border border-white/5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-bold text-zinc-400">Total Solicitudes</span>
                    <CalendarCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-2xl font-black">{reservations.length}</div>
                </div>

                <div className="p-5 bg-zinc-900/60 border border-amber-500/20 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-bold text-amber-400">Por Confirmar</span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    {reservations.filter(r => r.status === 'Pendiente').length}
                  </div>
                </div>

                <div className="p-5 bg-zinc-900/60 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-bold text-emerald-400">Confirmadas</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {reservations.filter(r => r.status === 'Confirmada').length}
                  </div>
                </div>

                <div className="p-5 bg-zinc-900/60 border border-white/5 rounded-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-bold text-zinc-400">Comensales Previstos</span>
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-blue-400">
                    {reservations
                      .filter(r => r.status === 'Confirmada' || r.status === 'Pendiente')
                      .reduce((sum, r) => sum + (r.guests_count || 0), 0)}
                  </div>
                </div>
              </div>

              {/* Filtros de estado */}
              <div className="flex flex-wrap gap-2 items-center bg-zinc-900/40 p-2 rounded-2xl border border-white/5">
                {['todas', 'Pendiente', 'Confirmada', 'Completada', 'Cancelada'].map(f => (
                  <button
                    key={f}
                    onClick={() => setReservationFilter(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${reservationFilter === f
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {f === 'todas' ? 'Todas' : f}
                  </button>
                ))}
              </div>

              {/* Tabla de Reservas */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                {reservations.filter(r => reservationFilter === 'todas' || r.status === reservationFilter).length === 0 ? (
                  <div className="text-center py-16 text-zinc-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-base font-semibold">No hay reservas con este filtro</p>
                    <p className="text-xs text-zinc-600 mt-1">Las reservas hechas desde la página principal aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                          <th className="pb-4 px-4 font-semibold">Código / Cliente</th>
                          <th className="pb-4 px-4 font-semibold">Fecha & Hora</th>
                          <th className="pb-4 px-4 font-semibold">Personas</th>
                          <th className="pb-4 px-4 font-semibold">Contacto & WhatsApp</th>
                          <th className="pb-4 px-4 font-semibold">Petición Especial</th>
                          <th className="pb-4 px-4 font-semibold">Estado</th>
                          <th className="pb-4 px-4 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {reservations
                          .filter(r => reservationFilter === 'todas' || r.status === reservationFilter)
                          .map((res) => {
                            const custName = res.customer_name || res.name || "Cliente";
                            const custPhone = res.customer_phone || res.phone || "";
                            const custEmail = res.customer_email || res.email || "";
                            const custNotes = res.special_requests || res.notes || "";
                            const cleanDate = (res.reservation_date || "").split("T")[0];
                            const cleanPhone = custPhone.replace(/\D/g, "");
                            const whatsappUrl = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(
                              `¡Hola ${custName}! Te saludamos de Sabor Chugurano sobre tu reserva del día ${cleanDate} a las ${res.reservation_time}.`
                            )}`;


                            return (
                              <tr key={res.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="font-bold text-white text-sm">{custName}</div>
                                  <div className="text-xs text-primary font-mono mt-0.5">
                                    #RES-{res.id.toString().padStart(4, '0')}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    {cleanDate}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    {res.reservation_time}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-200 border border-white/5 inline-flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-primary" />
                                    {res.guests_count} {res.guests_count === 1 ? 'persona' : 'personas'}
                                  </span>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-zinc-300">{custPhone || "Sin teléfono"}</span>
                                    {cleanPhone && (
                                      <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                        title="Contactar por WhatsApp"
                                      >
                                        <MessageSquare className="w-3 h-3" /> WhatsApp
                                      </a>
                                    )}
                                  </div>
                                  {custEmail && (
                                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1 truncate max-w-[160px]">
                                      <Mail className="w-3 h-3 text-zinc-500" />
                                      {custEmail}
                                    </div>
                                  )}
                                </td>

                                <td className="py-4 px-4 max-w-xs">
                                  {custNotes ? (
                                    <div className="text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 line-clamp-2">
                                      "{custNotes}"
                                    </div>
                                  ) : (
                                    <span className="text-xs text-zinc-600 italic">Ninguna</span>
                                  )}
                                </td>

                                <td className="py-4 px-4">
                                  <select
                                    value={res.status}
                                    onChange={(e) => updateReservationStatus(res.id, e.target.value)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-zinc-950 focus:outline-none ${res.status === 'Pendiente' ? 'text-amber-400 border-amber-500/30' :
                                        res.status === 'Confirmada' ? 'text-emerald-400 border-emerald-500/30' :
                                          res.status === 'Completada' ? 'text-blue-400 border-blue-500/30' :
                                            'text-red-400 border-red-500/30'
                                      }`}
                                  >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="Completada">Completada</option>
                                    <option value="Cancelada">Cancelada</option>
                                  </select>
                                </td>

                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {res.status === 'Pendiente' && (
                                      <button
                                        onClick={() => updateReservationStatus(res.id, 'Confirmada')}
                                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all"
                                        title="Confirmar reserva"
                                      >
                                        Confirmar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteReservation(res.id)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Eliminar reserva"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CONFIGURACIÓN */}
          {activeTab === 'configuracion' && (
            <div className="max-w-2xl bg-zinc-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
              <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Preferencias de Sabor Chugurano</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold mb-2 text-zinc-400">Nombre del Restaurante</label>
                  <input type="text" defaultValue="Sabor Chugurano" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 text-zinc-400">R.U.C.</label>
                  <input type="text" defaultValue="20601234567" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 text-zinc-400">Moneda Oficial</label>
                  <select defaultValue="PEN" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary">
                    <option value="PEN">Soles Peruanos (S/)</option>
                    <option value="USD">Dólares Americanos ($)</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button onClick={() => alert("Ajustes guardados correctamente")} className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DETALLE DE ORDEN / PLATOS SOLICITADOS (Item 4) */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-950/60">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Comanda #{selectedOrderDetails.id}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      Mesa {selectedOrderDetails.table_number}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Estado actual: <span className="text-white font-bold">{selectedOrderDetails.status}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Platos Consumidos</h4>
                {loadingDetails ? (
                  <div className="text-center py-8 text-zinc-500 text-sm flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    Cargando desglose de la comanda...
                  </div>
                ) : selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrderDetails.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-zinc-950 rounded-2xl border border-white/5 flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-sm">
                            {item.quantity}x {item.name}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Precio unitario: S/ {item.unit_price.toFixed(2)}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-amber-300 mt-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 italic">
                              Nota: "{item.notes}"
                            </div>
                          )}
                        </div>
                        <div className="font-black text-primary text-base">
                          S/ {item.subtotal.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-sm">Sin desglose de platos registrado</div>
                )}

                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex justify-between items-center mt-4">
                  <span className="text-sm font-bold text-zinc-300">TOTAL COMANDA</span>
                  <span className="text-2xl font-black text-primary">S/ {selectedOrderDetails.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-zinc-950/60 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
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

function MetricCard({ title, value, icon, trend, isWarning }: { title: string, value: string, icon: React.ReactNode, trend?: string, isWarning?: boolean }) {
  return (
    <div className={`bg-zinc-900/50 backdrop-blur-md border ${isWarning ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5'} rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 bg-zinc-800 rounded-2xl">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-zinc-400 text-xs font-medium mb-1 uppercase tracking-wider">{title}</h3>
        <div className="text-3xl font-black text-white">{value}</div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </div>
  );
}
