"use client";

import { apiFetch } from "@/lib/api";

import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  UtensilsCrossed, 
  Star, 
  Calendar, 
  Clock, 
  Users, 
  Phone, 
  User, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  CalendarCheck2,
  Flame,
  Soup,
  Check
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
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

type Category = {
  id: number;
  name: string;
};

type MenuDiaPlato = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  disponible: boolean;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: "Menú del Día (Inc. Entrada)" },
  { id: 2, name: "Entradas" },
  { id: 3, name: "Pescados y Mariscos" },
  { id: 4, name: "Pollos y Carnes" },
  { id: 5, name: "Chaufas" },
  { id: 6, name: "Parrillas" },
  { id: 7, name: "Bebidas" }
];

const DEFAULT_ENTRADAS = ["Sopa del Día", "Papa a la Huancaína"];

const DEFAULT_SEGUNDOS = [
  { name: "Costilla Dorada", desc: "Jugosa costilla crocante con arroz y ensalada" },
  { name: "Pavita", desc: "Tierna pavita dorada con sazón casera" },
  { name: "Seco a la Norteña pollo", desc: "Al culantro norteño y chicha con frejoles" },
  { name: "Pescado Frito", desc: "Pescado fresco crocante con yucas y arroz" }
];

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCat, setSelectedCat] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  // Selector interactivo para armar tu Menú del Día
  const [selectedEntrada, setSelectedEntrada] = useState<string>("Papa a la Huancaína");
  const [selectedSegundo, setSelectedSegundo] = useState<string>("Costilla Dorada");

  // Menú Diario configurable cargado desde el backend
  const [entradas, setEntradas] = useState<string[]>(DEFAULT_ENTRADAS);
  const [segundos, setSegundos] = useState<{ name: string; desc: string }[]>(DEFAULT_SEGUNDOS);

  // Formulario de Reserva
  const [resForm, setResForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    time: "13:00",
    guests: 2,
    notes: ""
  });
  const [isSubmittingRes, setIsSubmittingRes] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<{
    id: number;
    name: string;
    date: string;
    time: string;
    guests: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/menu"),
      apiFetch("/categories")
    ])
      .then(async ([resM, resC]) => {
        if (resM.ok) {
          const items = await resM.json();
          if (Array.isArray(items) && items.length > 0) setMenuItems(items);
        }
        if (resC.ok) {
          const cats = await resC.json();
          if (Array.isArray(cats) && cats.length > 0) setCategories(cats);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching menu:", err);
        setLoading(false);
      });
  }, []);

  // Cargar el Menú del Día activo (pizarra configurable desde el dashboard)
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    let cancelado = false;
    apiFetch(`/daily-menus/${hoy}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((dm) => {
        if (cancelado || !dm || dm.activo === false) return;
        if (Array.isArray(dm.entradas) && dm.entradas.length > 0) {
          setEntradas(dm.entradas);
          setSelectedEntrada(dm.entradas[0]);
        }
        const segs = (Array.isArray(dm.platos) ? dm.platos : [])
          .filter((p: MenuDiaPlato) => p.disponible && (!p.categoria || p.categoria === "Segundo"))
          .map((p: MenuDiaPlato) => ({ name: p.nombre, desc: p.descripcion || "Plato del día" }));
        if (segs.length > 0) {
          setSegundos(segs);
          setSelectedSegundo(segs[0].name);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRes(true);

    try {
      const res = await apiFetch("/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resForm.name,
          phone: resForm.phone,
          email: resForm.email,
          reservation_date: resForm.date,
          reservation_time: resForm.time,
          guests_count: Number(resForm.guests),
          notes: resForm.notes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfirmedReservation({
          id: data.reservation_id,
          name: resForm.name,
          date: resForm.date,
          time: resForm.time,
          guests: Number(resForm.guests)
        });
        setResForm({
          name: "",
          phone: "",
          email: "",
          date: new Date().toISOString().split("T")[0],
          time: "13:00",
          guests: 2,
          notes: ""
        });
      } else {
        alert("Error al registrar la reserva. Por favor verifica tus datos.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al registrar la reserva.");
    } finally {
      setIsSubmittingRes(false);
    }
  };

  const filteredMenu = selectedCat === "all" 
    ? menuItems 
    : menuItems.filter(i => i.category_id === selectedCat);

  const timeSlots = [
    { label: "12:30 PM", value: "12:30" },
    { label: "1:00 PM", value: "13:00" },
    { label: "1:30 PM", value: "13:30" },
    { label: "2:00 PM", value: "14:00" },
    { label: "7:30 PM", value: "19:30" },
    { label: "8:00 PM", value: "20:00" },
    { label: "8:30 PM", value: "20:30" },
    { label: "9:00 PM", value: "21:00" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* NAVBAR PÚBLICA PARA CLIENTES */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link href="/" className="group flex items-center">
            <Logo size={46} />
          </Link>

          {/* Enlaces de Navegación del Cliente */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-zinc-300">
            <a href="#menu-del-dia" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Menú del Día (S/ 10)
            </a>
            <a href="#menu" className="hover:text-primary transition-colors">Platos a la Carta</a>
            <a href="#nosotros" className="hover:text-primary transition-colors">Nosotros</a>
            <a href="#reservas" className="hover:text-primary transition-colors">Reservar Mesa</a>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 rounded-full border border-white/10 hover:border-primary/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 group"
              title="Iniciar sesión en el sistema"
            >
              <User className="w-3.5 h-3.5 text-zinc-400 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline">Acceso Personal</span>
            </Link>

            <a 
              href="#reservas" 
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-primary text-black font-black hover:brightness-110 transition-all text-xs shadow-[0_0_20px_rgba(204,153,51,0.35)] hover:scale-105"
            >
              Reservar Mesa
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start gap-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">
                Restaurante • Menú &amp; Platos a la Carta
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              Auténtico Sabor <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                Chugurano &amp; Peruano
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-300 max-w-lg leading-relaxed">
              Disfruta de nuestros contundentes <span className="text-amber-400 font-bold">Menús del Día a S/ 10.00 con entrada incluida</span> (Sopa o Huancaína) y de nuestra selecta carta de pescados, mariscos, platos criollos, chaufas y parrillas.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a 
                href="#menu-del-dia" 
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-primary text-black font-black text-base hover:scale-105 transition-all shadow-[0_0_30px_rgba(204,153,51,0.4)]"
              >
                Ver Menú del Día S/ 10 <ArrowRight className="w-5 h-5" />
              </a>
              <a 
                href="#menu" 
                className="px-8 py-4 rounded-full border border-white/20 hover:bg-white/5 text-zinc-200 hover:text-white transition-all font-bold text-base"
              >
                Carta Completa
              </a>
            </div>

            {/* Badges de Garantía */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10 w-full text-left">
              <div>
                <p className="text-2xl font-black text-amber-400">S/ 10.00</p>
                <p className="text-xs text-zinc-400">Menú Completo (Inc. Entrada)</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-zinc-400">Frescura y Sazón Casera</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">+30</p>
                <p className="text-xs text-zinc-400">Platos a la Carta</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-full border border-amber-500/20 p-4 relative">
              <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_35s_linear_infinite]" />
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-800 flex items-center justify-center relative overflow-hidden shadow-2xl shadow-primary/20">
                <Image 
                  fill
                  src="/images/logo.png" 
                  alt="Sabor Chugurano" 
                  className="object-cover p-3 opacity-95 hover:scale-105 transition-all duration-700 cursor-pointer"
                  priority
                />
              </div>
              
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-6 top-16 bg-background/90 backdrop-blur-xl border border-amber-500/30 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Especialidad</p>
                  <p className="text-base font-black text-white">Menú &amp; A la Carta</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-6 bottom-16 bg-background/90 backdrop-blur-xl border border-emerald-500/30 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Menú del Día</p>
                  <p className="text-base font-black text-emerald-400">Entrada Incluida</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* SECCIÓN ESPECIAL: MENÚ DEL DÍA CON ENTRADA INCLUIDA (S/ 10.00) */}
      <section className="py-20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-t border-b border-amber-500/20 relative z-10" id="menu-del-dia">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-4 h-4 text-amber-400" /> Promoción Principal de la Casa
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white">
              Menú del Día a solo <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">S/ 10.00</span>
            </h2>
            <p className="text-zinc-300 text-base mt-3 leading-relaxed">
              En Sabor Chugurano, tu menú del día viene <strong className="text-amber-400">100% completo con entrada incluida</strong> a tu elección: Sopa del Día calientita o una cremosa Papa a la Huancaína.
            </p>
          </div>

          {/* Banner Interactivo: Arma tu Menú del Día */}
          <div className="bg-zinc-900/90 border-2 border-amber-500/40 rounded-3xl p-6 lg:p-10 shadow-[0_0_50px_rgba(204,153,51,0.15)] relative overflow-hidden backdrop-blur-xl">
            <div className="grid lg:grid-cols-3 gap-8 items-center">
              
              {/* Paso 1: Entrada Incluida */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black">1</span>
                  Elige tu Entrada (Incluida)
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {entradas.map((nombre, idx) => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setSelectedEntrada(nombre)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedEntrada === nombre
                          ? "bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "bg-zinc-950/70 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                          {idx === 0 ? <Soup className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{nombre}</div>
                          <div className="text-[11px] text-zinc-400">Incluida con tu Menú del Día</div>
                        </div>
                      </div>
                      {selectedEntrada === nombre && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: Segundo a elegir */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black">2</span>
                  Elige tu Segundo (Plato de Fondo)
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                  {segundos.map((seg) => (
                    <button
                      key={seg.name}
                      type="button"
                      onClick={() => setSelectedSegundo(seg.name)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                        selectedSegundo === seg.name
                          ? "bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20"
                          : "bg-zinc-950/70 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🍽️</span>
                        {selectedSegundo === seg.name && (
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px]">✓</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-extrabold">{seg.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{seg.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del Combo Menú */}
              <div className="bg-zinc-950 p-6 rounded-2xl border border-amber-500/30 flex flex-col justify-between h-full gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-widest pb-3 border-b border-white/10">
                    <span>Resumen de tu Menú</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">Incluye Entrada</span>
                  </div>

                  <div className="space-y-3 mt-4 text-sm">
                    <div className="flex items-start justify-between">
                      <span className="text-zinc-400">Entrada Seleccionada:</span>
                      <span className="font-extrabold text-amber-300 text-right">{selectedEntrada}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-zinc-400">Segundo Seleccionado:</span>
                      <span className="font-extrabold text-white text-right">{selectedSegundo}</span>
                    </div>
                    <div className="flex items-start justify-between pt-3 border-t border-white/10">
                      <span className="text-zinc-300 font-bold">Precio Total Menú:</span>
                      <span className="text-2xl font-black text-amber-400">S/ 10.00</span>
                    </div>
                  </div>
                </div>

                <a
                  href="#reservas"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-primary text-black font-black rounded-xl text-center text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
                >
                  Reservar Mesa para Almorzar
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN CARTA & MENÚ COMPLETA (Para los clientes) */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative z-10" id="menu">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Nuestra Carta Completa
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white">Menú &amp; Platos a la Carta</h2>
              <p className="text-zinc-400 text-sm mt-2">
                Deliciosas preparaciones al momento con ingredientes seleccionados de primera calidad y auténtico sabor chugurano.
              </p>
            </div>

            {/* Filtros de Categorías */}
            <div className="flex gap-2 overflow-x-auto pb-2 max-w-full custom-scrollbar">
              <button
                onClick={() => setSelectedCat("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCat === "all"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
                }`}
              >
                Todos los Platos ({menuItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCat === c.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMenu.map((item, i) => {
                const defaultImgs = [
                  "/images/ceviche_hero.png",
                  "/images/lomo_saltado.png",
                  "/images/arroz_mariscos.png",
                  "/images/chicha_morada.png"
                ];
                const img = item.image_url || defaultImgs[i % defaultImgs.length];
                const isMenuDia = item.category_id === 1;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 6) * 0.05 }}
                    key={item.id} 
                    className={`group rounded-3xl bg-zinc-900/60 border overflow-hidden transition-all flex flex-col justify-between shadow-xl ${
                      isMenuDia 
                        ? "border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/10" 
                        : "border-white/5 hover:border-primary/40"
                    }`}
                  >
                    <div className="h-56 overflow-hidden relative bg-zinc-950">
                      <img 
                        src={img} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85 group-hover:opacity-100" 
                      />
                      
                      {/* Badge de Menú del Día */}
                      {isMenuDia && (
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                          <Star className="w-3 h-3 fill-black" />
                          <span>Inc. Entrada (Sopa o Huancaína)</span>
                        </div>
                      )}

                      <div className="absolute top-4 right-4 bg-zinc-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black text-amber-400 border border-amber-500/30 shadow-lg">
                        S/ {item.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                          {item.description || "Elaborado con la receta tradicional de la casa y los mejores insumos frescos."}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider">
                          {categories.find(c => c.id === item.category_id)?.name || "Especialidad"}
                        </span>
                        {item.is_available ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-400">Agotado hoy</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN NOSOTROS */}
      <section className="py-24 relative z-10 overflow-hidden" id="nosotros">
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[550px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <Image 
              fill 
              src="/images/nosotros_restaurant.png" 
              alt="Restaurante Sabor Chugurano" 
              className="object-cover hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
              Nuestra Esencia
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">
              Sabor Chugurano: Tradición en Cada Bocado
            </h2>
            <div className="w-20 h-1 bg-amber-500 mb-8" />
            <p className="text-base text-zinc-300 mb-6 leading-relaxed">
              En <strong className="text-white">Sabor Chugurano</strong>, nos inspiramos en la calidez andina de Chugur y la riqueza de la cocina peruana. Brindamos a nuestros comensales platos contundentes, económicos y de primer nivel, desde nuestro aclamado Menú del Día con entrada incluida hasta exquisitos platos marinos, criollos y parrillas a la carta.
            </p>
            <p className="text-base text-zinc-400 leading-relaxed mb-6">
              Cada receta es preparada al momento por nuestro equipo de cocineros, asegurando el balance perfecto de sabor, porciones generosas y la atención amable que te hace sentir como en casa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECCIÓN RESERVAS */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative z-10" id="reservas">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <CalendarCheck2 className="w-3.5 h-3.5" /> Planifica tu Visita
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Reserva tu Mesa</h2>
            <p className="text-zinc-400 text-sm">Asegura tu lugar en nuestro salón y disfruta de una experiencia gastronómica sin esperas.</p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {confirmedReservation ? (
                /* Tarjeta de Confirmación de Reserva */
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900/80 border border-emerald-500/40 rounded-3xl p-8 lg:p-12 text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden backdrop-blur-xl"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <h3 className="text-3xl font-black text-white mb-2">¡Reserva Confirmada con Éxito!</h3>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto mb-8">
                    Te esperamos en <strong className="text-white">Sabor Chugurano</strong>. Hemos separado tu mesa para la fecha y hora seleccionada.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950 p-6 rounded-2xl border border-white/5 text-left mb-8">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Código Reserva</span>
                      <span className="text-base font-black text-amber-400">#RES-{confirmedReservation.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Titular</span>
                      <span className="text-base font-bold text-white truncate block">{confirmedReservation.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Fecha &amp; Hora</span>
                      <span className="text-base font-bold text-white">{confirmedReservation.date} • {confirmedReservation.time}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Comensales</span>
                      <span className="text-base font-bold text-emerald-400">{confirmedReservation.guests} Personas</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setConfirmedReservation(null)}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Realizar Otra Reserva
                    </button>
                    <a
                      href="#menu"
                      className="px-8 py-3 bg-primary text-primary-foreground font-black rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      Explorar Nuestra Carta
                    </a>
                  </div>
                </motion.div>
              ) : (
                /* Formulario de Reserva */
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-md"
                >
                  <form onSubmit={handleReservationSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary" /> Nombre y Apellidos *
                        </label>
                        <input
                          type="text"
                          required
                          value={resForm.name}
                          onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                          placeholder="Ej. Juan Pérez"
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-primary" /> Teléfono / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={resForm.phone}
                          onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                          placeholder="Ej. 987654321"
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> Fecha *
                        </label>
                        <input
                          type="date"
                          required
                          value={resForm.date}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Horario Preferido *
                        </label>
                        <select
                          value={resForm.time}
                          onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                          {timeSlots.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Comensales *
                        </label>
                        <select
                          value={resForm.guests}
                          onChange={(e) => setResForm({ ...resForm, guests: Number(e.target.value) })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                            <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Personas'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-primary" /> Correo Electrónico (Opcional)
                      </label>
                      <input
                        type="email"
                        value={resForm.email}
                        onChange={(e) => setResForm({ ...resForm, email: e.target.value })}
                        placeholder="tu-email@ejemplo.com (para enviarte confirmación)"
                        className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-2 text-zinc-300">
                        Notas especiales (cumpleaños, ubicación en terraza, etc.)
                      </label>
                      <textarea
                        rows={2}
                        value={resForm.notes}
                        onChange={(e) => setResForm({ ...resForm, notes: e.target.value })}
                        placeholder="Escribe cualquier detalle que nos ayude a darte la mejor atención..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingRes}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-primary text-black font-black text-base rounded-2xl hover:brightness-110 transition-all shadow-[0_0_30px_rgba(204,153,51,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmittingRes ? "Confirmando tu reserva..." : "Confirmar Reserva Inmediata ➔"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-zinc-950 text-zinc-400 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <Logo size={40} />
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="hidden sm:inline">© {new Date().getFullYear()} Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#menu-del-dia" className="hover:text-amber-400 transition-colors">Menú S/ 10</a>
            <a href="#menu" className="hover:text-white transition-colors">Platos a la Carta</a>
            <a href="#reservas" className="hover:text-white transition-colors">Reservas</a>
            <Link 
              href="/login" 
              className="text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-semibold"
            >
              <User className="w-3.5 h-3.5" /> Acceso Personal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
