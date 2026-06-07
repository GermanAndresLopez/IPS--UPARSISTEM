"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, ClipboardList,
  Bell, BarChart2, Shield, Settings, Heart, LogOut, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",               label: "Dashboard",      icon: <LayoutDashboard className="w-5 h-5" />, roles: ["ADMIN","COORDINADOR","OPERATIVO"] },
   { href: "/dashboard/ingresos",      label: "Ingresos",       icon: <ClipboardList className="w-5 h-5" />,  roles: ["ADMIN","COORDINADOR","OPERATIVO"] },
  { href: "/dashboard/ordenes",       label: "Órdenes",        icon: <FileText className="w-5 h-5" />,       roles: ["ADMIN","COORDINADOR"] },
  { href: "/dashboard/pacientes",     label: "Pacientes",      icon: <Users className="w-5 h-5" />,          roles: ["ADMIN","COORDINADOR","OPERATIVO"] },
  { href: "/dashboard/alertas",       label: "Alertas",        icon: <Bell className="w-5 h-5" />,           roles: ["ADMIN","COORDINADOR"], badge: 4 },
  { href: "/dashboard/reportes",      label: "Reportes",       icon: <BarChart2 className="w-5 h-5" />,      roles: ["ADMIN","COORDINADOR"] },
  { href: "/dashboard/auditoria",     label: "Auditoría",      icon: <Shield className="w-5 h-5" />,         roles: ["ADMIN"] },
  { href: "/dashboard/configuracion", label: "Configuración",  icon: <Settings className="w-5 h-5" />,       roles: ["ADMIN"] },
];

interface SidebarProps {
  userRol: string;
  userName: string;
}

export function Sidebar({ userRol, userName }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRol));

  const getRolLabel = (rol: string) => {
    if (rol === "ADMIN") return "Administrador";
    if (rol === "COORDINADOR") return "Coordinador";
    return "Operativo";
  };

  const getRolColor = (rol: string) => {
    if (rol === "ADMIN") return "bg-indigo-100 text-indigo-700";
    if (rol === "COORDINADOR") return "bg-blue-100 text-blue-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const initials = userName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">TerapiaApp</h1>
            <p className="text-xs text-gray-400">Gestión de Pacientes</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map(item => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <span className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && !isActive && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/dashboard/mi-perfil"
            title="Editar mis datos y contraseña"
            className={cn(
              "flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl transition px-1 py-1 -mx-1 -my-1",
              pathname === "/dashboard/mi-perfil" ? "bg-indigo-50" : "hover:bg-gray-50"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{userName}</p>
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", getRolColor(userRol))}>
                {getRolLabel(userRol)}
              </span>
            </div>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("terapia_user");
              localStorage.removeItem("session");
              window.location.href = "/login";
            }}
            className="text-gray-400 hover:text-red-500 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
