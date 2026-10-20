"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { apiFetch, setSession } from "@/lib/api";

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiFetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) setSession(data.token, data.user);
        const next = new URLSearchParams(window.location.search).get("next");
        const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/mis-reservas";
        router.push(destino);
      } else {
        setError(data.error || "No se pudo crear la cuenta");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex overflow-hidden selection:bg-primary/30">
      <div className="hidden lg:flex w-1/2 relative bg-zinc-950 items-center justify-center">
        <Image
          fill
          src="/images/nosotros_restaurant.png"
          alt="Restaurante"
          className="object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />

        <div className="relative z-10 p-16 w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="mb-8">
              <Logo size={64} />
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
              Reserva <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                sin esperas
              </span>
            </h1>

            <p className="text-xl text-zinc-300 max-w-md leading-relaxed">
              Crea tu cuenta en <strong className="text-white">Sabor Chugurano</strong> para reservar tu mesa, revisar tus reservas y cancelarlas cuando lo necesites.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

        <Link href="/" className="absolute top-8 left-8 lg:left-auto lg:right-12 flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors z-20 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold tracking-wide text-sm">Regresar a Inicio</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 py-20 lg:py-0"
        >
          <div className="mb-8 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-4 lg:hidden">
              <Logo size={56} />
            </div>
            <h2 className="text-3xl font-bold mb-2">Crea tu cuenta</h2>
            <p className="text-zinc-400">Es gratis y te toma menos de un minuto</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm flex items-center justify-center font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="group">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block group-focus-within:text-primary transition-colors">
                Nombre y Apellidos
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block group-focus-within:text-primary transition-colors">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20"
                  placeholder="tu-correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block group-focus-within:text-primary transition-colors">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="tel"
                  required
                  minLength={6}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20"
                  placeholder="Ej. 987654321"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="group">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block group-focus-within:text-primary transition-colors">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20"
                    placeholder="Mín. 6"
                  />
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block group-focus-within:text-primary transition-colors">
                  Repetir contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20"
                    placeholder="Repite tu clave"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(204,153,51,0.25)] hover:shadow-[0_0_40px_rgba(204,153,51,0.4)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-6 h-6 rounded-full border-2 border-zinc-900/20 border-t-zinc-900 animate-spin" />
              ) : (
                <>
                  <span>Crear mi cuenta</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-zinc-400 mt-2">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
