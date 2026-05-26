"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

interface UserData {
  nombre: string;
  rol: string;
  correo: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("terapia_user");
    if (!stored) {
      router.push("/login");
    } else {
      setUser(JSON.parse(stored));
    }
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userRol={user.rol} userName={user.nombre} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
