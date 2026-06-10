"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, FileSpreadsheet, FileText, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { reportesApi, type ResumenReporte } from "@/lib/api";
import { cn } from "@/lib/utils";

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];

type Periodo = "dia" | "semana" | "mes";
const PERIODO_LABEL: Record<Periodo, string> = { dia: "Hoy", semana: "Esta semana", mes: "Este mes" };
const PERIODO_TITULO: Record<Periodo, string> = { dia: "DÍA", semana: "SEMANA ACTUAL", mes: "MES ACTUAL" };


export default function ReportesPage() {
  const [periodo,    setPeriodo]    = useState<Periodo>("mes");
  const [data,       setData]       = useState<ResumenReporte | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

  const cargar = useCallback((p: Periodo) => {
    setLoading(true); setError("");
    reportesApi.resumen(p)
      .then(d  => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(periodo); }, [periodo, cargar]);

  // ─── Excel ──────────────────────────────────────────────────────────────────
  const exportarExcel = async () => {
    if (!data) return;
    setExportando("excel");
    try {
      const { utils: xlsxUtils, writeFile: xlsxWrite } = await import("xlsx");
      const wb   = xlsxUtils.book_new();

      xlsxUtils.book_append_sheet(wb,
        xlsxUtils.aoa_to_sheet([
          [`INFORME DE PACIENTES — ${PERIODO_TITULO[periodo]}`], [],
          ["TOTAL","NIÑOS (MASC.)","NIÑAS (FEM.)"],
          [data.total, data.masculino, data.femenino],
        ]), "Resumen");

      xlsxUtils.book_append_sheet(wb,
        xlsxUtils.json_to_sheet(data.por_diagnostico.map(r => ({ DIAGNOSTICO: r.name, CANTIDAD: r.value }))),
        "Por Diagnóstico");

      xlsxUtils.book_append_sheet(wb,
        xlsxUtils.json_to_sheet(data.por_eps.map(r => ({ EPS: r.name, CANTIDAD: r.value }))),
        "Por EPS");

      xlsxUtils.book_append_sheet(wb,
        xlsxUtils.json_to_sheet(data.por_edad.map(r => ({ "RANGO EDAD": r.rango, CANTIDAD: r.total }))),
        "Por Edad");

      xlsxUtils.book_append_sheet(wb,
        xlsxUtils.json_to_sheet(data.asistencia_detalle.map(r => ({
          FECHA: r.fecha,
          "TIPO DOC.": r.tipo_documento,
          "CÉDULA": r.documento_identidad,
          APELLIDOS: r.apellidos,
          NOMBRES: r.nombres,
          EPS: r.eps,
          "TELÉFONO": r.telefono,
        }))), "Asistencia");

      if (data.pacientes_nuevos.length)
        xlsxUtils.book_append_sheet(wb,
          xlsxUtils.json_to_sheet(data.pacientes_nuevos.map(p => ({
            PACIENTE: p.nombre_completo, EDAD: p.edad, EPS: p.eps, "CIE-10": p.cie10, TELÉFONO: p.telefono,
          }))), "Pacientes Nuevos");

      if (data.pacientes_ausentes.length)
        xlsxUtils.book_append_sheet(wb,
          xlsxUtils.json_to_sheet(data.pacientes_ausentes.map(p => ({
            PACIENTE: p.nombre_completo, EDAD: p.edad, EPS: p.eps, "CIE-10": p.cie10, TELÉFONO: p.telefono,
          }))), "Pacientes Ausentes");

      xlsxWrite(wb, `Reporte_${periodo}_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) { console.error("[Excel Error]", e); alert(`Error al generar Excel: ${(e as Error).message}`); }
    finally { setExportando(null); }
  };

  // ─── PDF ────────────────────────────────────────────────────────────────────
  const exportarPdf = async () => {
    if (!data) return;
    setExportando("pdf");
    try {
      const { jsPDF }  = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const pdf  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W    = 210;
      const ML   = 14;
      const MR   = 14;
      const TW   = W - ML - MR;
      let   y    = 0;

      // ── Paleta de colores ────────────────────────────────────────────────────
      const NAVY:  [number,number,number] = [30,  58, 138];
      const RED:   [number,number,number] = [204,  0,   0];
      const BLUE:  [number,number,number] = [30,  86, 210];
      const GREEN: [number,number,number] = [21, 128,  61];
      const GRN_C: [number,number,number] = [34, 197,  94]; // gráficas verdes
      const PURP:  [number,number,number] = [109, 40, 217]; // pie femenino
      const ALT:   [number,number,number] = [239,246, 255]; // fila alternada
      const DARK:  [number,number,number] = [17,  24,  39];
      const BORD:  [number,number,number] = [210,214, 220]; // bordes grises

      // ── Helpers ──────────────────────────────────────────────────────────────
      // Etiqueta del período igual al original: "MAYO 2026" / "SEMANA ACTUAL" / "HOY"
      const now = new Date();
      const periodoLabel = periodo === "mes"
        ? `${now.toLocaleString("es-CO",{month:"long"}).toUpperCase()} ${now.getFullYear()}`
        : periodo === "semana" ? "SEMANA ACTUAL" : "HOY";

      const lastY = () =>
        (pdf as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY;

      // Tabla con encabezado navy y pie en bold
      const tabla = (
        head:   string[][],
        body:   (string|number)[][],
        foot?:  (string|number)[][],
        cWs?:   number[],
        cAlns?: ("left"|"right"|"center")[],
      ) => {
        const cs: Record<number,object> = {};
        cWs?.forEach((w,i)  => { cs[i] = { ...cs[i], cellWidth: w }; });
        cAlns?.forEach((a,i)=> { cs[i] = { ...cs[i], halign: a   }; });
        autoTable(pdf, {
          startY: y, head, body,
          ...(foot ? { foot, showFoot: "lastPage" as const } : {}),
          margin: { left: ML, right: MR },
          styles:             { fontSize:7.5, cellPadding:2, textColor:DARK },
          headStyles:         { fillColor:NAVY, textColor:[255,255,255], fontStyle:"bold", fontSize:8 },
          alternateRowStyles: { fillColor:ALT },
          ...(foot ? { footStyles:{ fillColor:[255,255,255], textColor:DARK, fontStyle:"bold", fontSize:8, lineColor:NAVY, lineWidth:{ top:0.5, right:0, bottom:0, left:0 } as unknown as number } } : {}),
          columnStyles: cs,
        });
        y = lastY() + 6;
      };

      // Dibuja un sector del donut usando moveTo/lineTo
      const sector = (
        cx:number, cy:number, r:number,
        sa:number, ea:number,
        col:[number,number,number],
      ) => {
        const steps = 48;
        pdf.setFillColor(...col);
        pdf.moveTo(cx, cy);
        for (let i=0; i<=steps; i++) {
          const a = sa + (ea-sa)*(i/steps);
          pdf.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
        }
        pdf.close();
        pdf.fill();
      };

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 1 — Logo · Título · KPIs · Diagnósticos
      // ════════════════════════════════════════════════════════════════════════

      // ── Título rojo centrado ─────────────────────────────────────────────────
      y = 18;
      pdf.setTextColor(...RED);
      pdf.setFontSize(19); pdf.setFont("helvetica","bold");
      pdf.text(`INFORME DE PACIENTES – ${periodoLabel}`, W/2, y, { align:"center" });
      y += 9;

      // Fila KPI: [Caja roja: total] NIÑOS [Caja azul: masc] NIÑAS [Caja verde: fem]
      const bW=33, bH=13, gap=6, lblW=28;
      const rowTot = bW*3 + lblW*2 + gap*4;
      let kx = (W - rowTot)/2;
      const kY = y;

      const kpiBox = (x:number, val:number, col:[number,number,number]) => {
        pdf.setFillColor(...col);
        pdf.roundedRect(x, kY, bW, bH, 2, 2, "F");
        pdf.setTextColor(255,255,255);
        pdf.setFontSize(16); pdf.setFont("helvetica","bold");
        pdf.text(String(val), x+bW/2, kY+8.8, {align:"center"});
      };
      const kpiLbl = (x:number, txt:string, col:[number,number,number]) => {
        pdf.setTextColor(...col);
        pdf.setFontSize(12); pdf.setFont("helvetica","bold");
        pdf.text(txt, x+lblW/2, kY+8.8, {align:"center"});
      };

      kpiBox(kx, data.total,     RED);   kx += bW+gap;
      kpiLbl(kx, "NIÑOS",        DARK);  kx += lblW+gap;
      kpiBox(kx, data.masculino, BLUE);  kx += bW+gap;
      kpiLbl(kx, "NIÑAS",        GREEN); kx += lblW+gap;
      kpiBox(kx, data.femenino,  GREEN);
      y += bH + 7;

      // Tabla diagnósticos
      tabla(
        [["DIAGNOSTICO","CANTIDAD"]],
        data.por_diagnostico.map(r=>[r.name, r.value]),
        [["Total general", data.total]],
        undefined,
        ["left","right"],
      );

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 2 — Rango edad · Gráficas
      // ════════════════════════════════════════════════════════════════════════
      pdf.addPage();
      y = 14;

      // Tabla rango etario
      tabla(
        [["RANGO EDAD","CANTIDAD"]],
        data.por_edad.map(r=>[r.rango, r.total]),
        [["Total general", data.total]],
        [55, 30],
        ["left","right"],
      );

      // ── Dos gráficas lado a lado ─────────────────────────────────────────────
      const halfW  = (TW-6)/2;
      const chartH = 65;
      const boxY   = y;

      pdf.setDrawColor(...BORD); pdf.setLineWidth(0.35);
      pdf.rect(ML,       boxY, halfW, chartH);
      pdf.rect(ML+halfW+6, boxY, halfW, chartH);

      // ┌─ Pie/donut GÉNERO ─────────────────────────────────────────────────┐
      pdf.setTextColor(...DARK); pdf.setFontSize(9); pdf.setFont("helvetica","bold");
      pdf.text("Pacientes por Género", ML+halfW/2, boxY+6, {align:"center"});

      if (data.total > 0) {
        const tot   = data.masculino + data.femenino;
        const mFrac = data.masculino / tot;
        const fFrac = 1 - mFrac;
        const gCx   = ML + halfW/2;
        const gCy   = boxY + 10 + 22;
        const OR    = 22, IR = 11;

        // Sectores
        const sa = -Math.PI/2;
        sector(gCx, gCy, OR, sa, sa + mFrac*2*Math.PI, GRN_C);
        if (fFrac > 0)
          sector(gCx, gCy, OR, sa + mFrac*2*Math.PI, sa + 2*Math.PI, PURP);
        // Hueco donut
        pdf.setFillColor(255,255,255);
        pdf.circle(gCx, gCy, IR, "F");

        // Leyenda inferior
        const pM = Math.round(mFrac*100), pF = 100-pM;
        pdf.setFontSize(5.5); pdf.setFont("helvetica","normal");
        pdf.setFillColor(...GRN_C);
        pdf.rect(ML+3, boxY+chartH-12, 3.5, 3, "F");
        pdf.setTextColor(...DARK);
        pdf.text(`MASCULINO; ${data.masculino}; ${pM}%`, ML+8, boxY+chartH-9.5);
        pdf.setFillColor(...PURP);
        pdf.rect(ML+3, boxY+chartH-7, 3.5, 3, "F");
        pdf.text(`FEMENINO; ${data.femenino}; ${pF}%`, ML+8, boxY+chartH-4.5);
      }

      // ┌─ Barras horizontales EPS ───────────────────────────────────────────┐
      const epX      = ML+halfW+6;
      const maxEps   = Math.max(...data.por_eps.map(r=>r.value),1);
      const epBarMax = halfW-34;

      pdf.setTextColor(...DARK); pdf.setFontSize(9); pdf.setFont("helvetica","bold");
      pdf.text("Pacientes por EPS", epX+halfW/2, boxY+6, {align:"center"});

      let eY = boxY+13;
      data.por_eps.slice(0,7).forEach(r => {
        const bw = Math.max((r.value/maxEps)*epBarMax, 1);
        pdf.setFillColor(...GRN_C);
        pdf.rect(epX+30, eY, bw, 5, "F");
        pdf.setTextColor(...DARK); pdf.setFontSize(6); pdf.setFont("helvetica","normal");
        pdf.text(r.name, epX+29, eY+3.8, {align:"right"});
        pdf.setFont("helvetica","bold");
        pdf.text(String(r.value), epX+30+bw+2, eY+3.8);
        pdf.setFont("helvetica","normal");
        eY += 8;
      });

      y = boxY + chartH + 6;

      // ── Barras verticales ASISTENCIA ─────────────────────────────────────────
      if (data.asistencias.length) {
        const aH  = 50;
        const aW  = TW;
        const aY0 = y;
        pdf.setDrawColor(...BORD); pdf.setLineWidth(0.35);
        pdf.rect(ML, aY0, aW, aH+22);

        pdf.setTextColor(...DARK); pdf.setFontSize(10); pdf.setFont("helvetica","bold");
        pdf.text("Asistencia en el Período", W/2, aY0+7, {align:"center"});

        const maxA   = Math.max(...data.asistencias.map(r=>r.total),1);
        const n      = data.asistencias.length;
        const slotW  = (aW-16)/n;
        const barW   = Math.min(slotW*0.55, 20);
        const baseY  = aY0 + aH + 8;

        // Líneas de cuadrícula
        [0.25,0.5,0.75,1].forEach(f => {
          const ly  = baseY - f*aH;
          const val = Math.round(f*maxA);
          pdf.setDrawColor(225,225,225); pdf.setLineWidth(0.15);
          pdf.line(ML+8, ly, ML+aW-2, ly);
          pdf.setFontSize(5); pdf.setTextColor(160,160,160); pdf.setFont("helvetica","normal");
          pdf.text(String(val), ML+7, ly+1, {align:"right"});
        });

        data.asistencias.forEach((r,i) => {
          const bh  = Math.max((r.total/maxA)*aH, 1);
          const bx  = ML+8 + i*slotW + (slotW-barW)/2;
          const by2 = baseY-bh;
          pdf.setFillColor(...GRN_C);
          pdf.rect(bx, by2, barW, bh, "F");
          pdf.setFontSize(6); pdf.setTextColor(...DARK); pdf.setFont("helvetica","bold");
          pdf.text(String(r.total), bx+barW/2, by2-1, {align:"center"});
          pdf.setFontSize(5.5); pdf.setFont("helvetica","normal");
          pdf.text(r.dia, bx+barW/2, baseY+5, {align:"center"});
        });

        y = aY0 + aH + 26;
      }

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 3+ — Pacientes ausentes
      // ════════════════════════════════════════════════════════════════════════
      if (data.pacientes_ausentes.length) {
        pdf.addPage(); y = 14;

        pdf.setFillColor(...DARK);
        pdf.rect(ML, y, TW, 10, "F");
        pdf.setTextColor(255,255,255); pdf.setFontSize(10); pdf.setFont("helvetica","bold");
        pdf.text(`PACIENTES ANTIGUOS QUE NO ASISTIERON EN ${periodoLabel}`, W/2, y+7, {align:"center"});
        y += 14;

        tabla(
          [["PACIENTE","EDAD","EPS","CIE-10","TELÉFONO"]],
          data.pacientes_ausentes.map(p=>[
            p.nombre_completo,
            Number(p.edad).toFixed(2),
            p.eps,
            p.cie10.toUpperCase(),
            p.telefono,
          ]),
          undefined,
          [72,15,30,15,40],
          ["left","right","left","left","left"],
        );
      }

      // ════════════════════════════════════════════════════════════════════════
      // Pacientes nuevos
      // ════════════════════════════════════════════════════════════════════════
      if (data.pacientes_nuevos.length) {
        pdf.addPage(); y = 14;

        pdf.setFillColor(...DARK);
        pdf.rect(ML, y, TW, 10, "F");
        pdf.setTextColor(255,255,255); pdf.setFontSize(10); pdf.setFont("helvetica","bold");
        pdf.text(`PACIENTES NUEVOS EN ${periodoLabel}`, W/2, y+7, {align:"center"});
        y += 14;

        tabla(
          [["PACIENTE","EDAD","EPS","CIE-10","TELÉFONO"]],
          data.pacientes_nuevos.map(p=>[
            p.nombre_completo,
            Number(p.edad).toFixed(1),
            p.eps,
            p.cie10.toUpperCase(),
            p.telefono,
          ]),
          undefined,
          [72,15,30,15,40],
          ["left","right","left","left","left"],
        );
      }

      // ── Pie de página ────────────────────────────────────────────────────────
      const np = (pdf as unknown as {internal:{getNumberOfPages():number}}).internal.getNumberOfPages();
      for (let i=1; i<=np; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7); pdf.setTextColor(156,163,175); pdf.setFont("helvetica","normal");
        pdf.text(`Página ${i} de ${np}`, W-MR, 291, {align:"right"});
        pdf.text("TerapiaApp — Sistema de Gestión de Pacientes", ML, 291);
      }

      pdf.save(`Reporte_${periodo}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) { console.error("[PDF Error]", e); alert(`Error al generar PDF: ${(e as Error).message}`); }
    finally { setExportando(null); }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Encabezado + controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes e Informes</h2>
          <p className="text-gray-500 text-sm mt-1">Dashboard visual y exportación en PDF / Excel</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro período */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(["dia","semana","mes"] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition",
                  periodo===p ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {PERIODO_LABEL[p]}
              </button>
            ))}
          </div>
          <button onClick={() => cargar(periodo)} disabled={loading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          {/* Exportar */}
          <button onClick={exportarExcel} disabled={!data || !!exportando}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60">
            {exportando==="excel" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/>}
            Excel
          </button>
          <button onClick={exportarPdf} disabled={!data || !!exportando}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60">
            {exportando==="pdf" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
            PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />{error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:"Pacientes en el período", value:data.total,                      color:"text-indigo-600"  },
              { label:"Masculino",               value:data.masculino,                  color:"text-blue-600"    },
              { label:"Femenino",                value:data.femenino,                   color:"text-emerald-600" },
              { label:"Pacientes nuevos",        value:data.pacientes_nuevos.length,    color:"text-amber-600"   },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={`text-3xl font-bold ${k.color}`}>{k.value ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Gráficas — misma disposición que antes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Asistencias por día */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Asistencias en el período</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.asistencias} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize:12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:"12px", fontSize:12 }} />
                  <Bar dataKey="total" fill="#6366f1" radius={[6,6,0,0]} name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución por EPS */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Distribución por EPS</h3>
              {data.por_eps.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.por_eps} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" paddingAngle={3}>
                      {data.por_eps.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius:"12px", fontSize:11 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize:"11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
              )}
            </div>

            {/* Por diagnóstico CIE-10 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Por diagnóstico CIE-10</h3>
              {data.por_diagnostico.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.por_diagnostico.slice(0,8)} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize:9 }} width={155} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:"12px", fontSize:12 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0,6,6,0]} name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
              )}
            </div>

            {/* Distribución por Rango Etario */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Distribución por Rango Etario</h3>
              {data.por_edad.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.por_edad} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="rango" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:"12px", fontSize:12 }} />
                    <Bar dataKey="total" fill="#10b981" radius={[6,6,0,0]} name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
              )}
            </div>

          </div>

          {/* Sección de exportar (informativa) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              Exportar Reporte
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              El reporte incluye diagnósticos, rango etario, EPS, asistencia, pacientes nuevos y pacientes
              con orden activa que no asistieron en el período seleccionado.
            </p>
            <div className="flex gap-3">
              <button onClick={exportarExcel} disabled={!!exportando}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {exportando==="excel" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/>}
                Descargar Excel
              </button>
              <button onClick={exportarPdf} disabled={!!exportando}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {exportando==="pdf" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
                Descargar PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
