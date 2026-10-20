"use client";

import { motion } from "framer-motion";
import { ArrowLeft, UtensilsCrossed, Lock, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { apiFetch, setSession } from "@/lib/api";


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          setSession(data.token, data.user);
        } else {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        // Redirigir según el rol (o a la página solicitada)
        const next = new URLSearchParams(window.location.search).get("next");
        if (next && next.startsWith("/")) {
          router.push(next);
        } else if (data.user.role_id === 1) {
          router.push("/dashboard");
        } else if (data.user.role_id === 2) {
          router.push("/pedidos");
        } else if (data.user.role_id === 3) {
          router.push("/caja");
        } else if (data.user.role_id === 4) {
          router.push("/cocina");
        } else {
          router.push("/");
        }
      } else {
        setError(data.error || "Credenciales inválidas");
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
      
      {/* Left Side: Elegant Brand Imagery (Hidden on Mobile) */}
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
              Sabor <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                Chugurano
              </span>
            </h1>
            
            <p className="text-xl text-zinc-300 max-w-md leading-relaxed">
              Ingresa al sistema de gestión de <strong className="text-white">Sabor Chugurano</strong>. Control de comandas, menú del día, platos a la carta y facturación en caja.
            </p>
          </motion.div>

        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Dynamic Background Glows */}
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
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2">Bienvenido de vuelta</h2>
            <p className="text-zinc-400">Por favor, ingresa tus credenciales</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm flex items-center justify-center font-medium"
              >
                {error}
              </motion.div>
            )}
            
            <div className="group relative">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20" 
                  placeholder="admin@saborchugurano.pe"
                />
              </div>
            </div>
            
            <div className="group relative">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all hover:border-white/20" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-6 w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(204,153,51,0.25)] hover:shadow-[0_0_40px_rgba(204,153,51,0.4)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 overflow-hidden relative cursor-pointer"
            >
              {isLoading ? (
                <div className="w-6 h-6 rounded-full border-2 border-zinc-900/20 border-t-zinc-900 animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Panel</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

