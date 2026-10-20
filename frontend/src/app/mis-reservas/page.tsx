"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  LogOut,
  MessageSquare,
  Phone,
  RefreshCw,
  Users,
  UtensilsCrossed
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { apiFetch, clearSession, getToken } from "@/lib/api";

type Reservation = {
  id: number;
  name: string;
  phone: string;
  email: string;
  reservation_date: string;
  reservation_time: string;
  guests_count: number;
  notes: string;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  Confirmada: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Pendiente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Cancelada: "bg-red-500/15 text-red-400 border-red-500/30",
  Atendida: "bg-sky-500/15 text-sky-400 border-sky-500/30"
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const clean = (value || "").slice(0, 10);
  const [year, month, day] = clean.split("-");
  if (!year || !month || !day) return clean;
  return `${day}/${month}/${year}`;
}

function formatTime(value: string) {
  const [h, m] = (value || "").split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m || "00"} ${suffix}`;
}

export default function MisReservas() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const cargarReservas = useCallback(async () => {
    setError("");
    try {
      const res = await apiFetch("/reservations/mine", { cache: "no-store" });
      if (res.status === 401) {
        clearSession();
        router.replace("/login?next=%2Fmis-reservas");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar tus reservas");
        return;
      }
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Error de conexión al cargar tus reservas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=%2Fmis-reservas");
      return;
    }
    const timer = setTimeout(cargarReservas, 0);
    return () => clearTimeout(timer);
  }, [cargarReservas, router]);

  const cancelarReserva = async (reserva: Reservation) => {
    if (!confirm(`¿Cancelar tu reserva del ${formatDate(reserva.reservation_date)} a las ${formatTime(reserva.reservation_time)}?`)) {
      return;
    }
    setCancelingId(reserva.id);
    setError("");
    try {
      const res = await apiFetch(`/reservations/${reserva.id}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cancelar la reserva");
        return;
      }
      await cargarReservas();
    } catch (err) {
      console.error(err);
      setError("Error de conexión al cancelar la reserva");
    } finally {
      setCancelingId(null);
    }
  };

  const cerrarSesion = () => {
    clearSession();
    router.push("/");
  };

  const hoy = hoyISO();
  const proximas = reservations.filter(
    (r) => r.status !== "Cancelada" && r.status !== "Atendida" && r.reservation_date >= hoy
  );
  const historial = reservations.filter(
    (r) => !proximas.some((p) => p.id === r.id)
  );

  const renderCard = (reserva: Reservation) => {
    const cancelable = reserva.status === "Confirmada" || reserva.status === "Pendiente";
    const esHoy = reserva.reservation_date === hoy;
    return (
      <motion.article
        key={reserva.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Código #RES-{reserva.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_STYLES[reserva.status] || "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"}`}>
                {reserva.status}
              </span>
              {esHoy && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary border border-primary/30">
                  Hoy
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white mt-1.5">
              {reserva.guests_count} {reserva.guests_count === 1 ? "persona" : "personas"}
            </h3>
          </div>

          {cancelable && (
            <button
              onClick={() => cancelarReserva(reserva)}
              disabled={cancelingId === reserva.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelingId === reserva.id ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CalendarX2 className="w-3.5 h-3.5" />
              )}
              Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-zinc-950/60 rounded-xl p-3 border border-white/5">
            <CalendarDays className="w-4 h-4 text-primary mb-1" />
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Fecha</span>
            <span className="text-white font-semibold">{formatDate(reserva.reservation_date)}</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-3 border border-white/5">
            <Clock className="w-4 h-4 text-primary mb-1" />
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Hora</span>
            <span className="text-white font-semibold">{formatTime(reserva.reservation_time)}</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-3 border border-white/5">
            <Users className="w-4 h-4 text-primary mb-1" />
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Comensales</span>
            <span className="text-white font-semibold">{reserva.guests_count}</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-3 border border-white/5">
            <Phone className="w-4 h-4 text-primary mb-1" />
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Teléfono</span>
            <span className="text-white font-semibold truncate block">{reserva.phone || "—"}</span>
          </div>
        </div>

        {reserva.notes && (
          <div className="mt-3 flex gap-2 text-xs text-zinc-400 bg-zinc-950/40 rounded-xl p-3 border border-white/5">
            <MessageSquare className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <span>{reserva.notes}</span>
          </div>
        )}
      </motion.article>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center">
            <Logo size={44} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#reservas"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-primary text-black text-xs font-black hover:brightness-110 transition-all"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> Nueva reserva
            </Link>
            <button
              onClick={cerrarSesion}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-white/10 text-zinc-300 text-xs font-semibold hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-primary transition-colors mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Mis Reservas</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Aquí puedes revisar y cancelar tus reservas.
            </p>
          </div>
          <button
            onClick={cargarReservas}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 text-xs font-semibold hover:border-primary/40 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm">Cargando tus reservas...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-10 sm:p-14 text-center">
            <div className="w-20 h-20 bg-primary/15 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/30">
              <CalendarDays className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Aún no tienes reservas</h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-8">
              Reserva tu mesa en Sabor Chugurano y aparecerá aquí para que puedas gestionarla.
            </p>
            <Link
              href="/#reservas"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-black rounded-2xl text-sm hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(204,153,51,0.3)]"
            >
              Reservar una mesa <UtensilsCrossed className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {proximas.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Próximas reservas
                </h2>
                <div className="space-y-4">{proximas.map(renderCard)}</div>
              </section>
            )}

            {historial.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Historial
                </h2>
                <div className="space-y-4 opacity-90">{historial.map(renderCard)}</div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
