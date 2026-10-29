import React from 'react';

interface ReportModalProps {
  presupuesto: any;
  onClose: () => void;
  onTriggerBrowserPrint: () => void;
}

export default function ReportModal({ presupuesto, onClose, onTriggerBrowserPrint }: ReportModalProps) {
  const indPct = presupuesto.porcentaje_indirectos ?? 12;
  const utiPct = presupuesto.porcentaje_utilidad ?? 8;
  const ivaPct = presupuesto.porcentaje_iva ?? 10;

  const items = presupuesto.items || [];
  const cd = presupuesto.costo_directo_total ?? items.reduce((a: number, b: any) => a + (Number(b.subtotal || b.cantidad * (b.precio || b.precio_rubro || 0)) || 0), 0);
  const indirectos = presupuesto.costo_indirecto_total ?? (cd * (indPct / 100));
  const utilidad = presupuesto.monto_utilidad ?? (cd * (utiPct / 100));
  const subtotal = presupuesto.subtotal_sin_iva ?? (cd + indirectos + utilidad);
  const iva = presupuesto.monto_iva ?? (subtotal * (ivaPct / 100));
  const total = presupuesto.monto_total ?? presupuesto.monto ?? (subtotal + iva);

  // Agrupar items por capítulo
  const capitulosMap: Record<string, any[]> = {};
  items.forEach((item: any) => {
    const capName = item.capitulo_presup || '1. OBRAS PRELIMINARES';
    if (!capitulosMap[capName]) {
      capitulosMap[capName] = [];
    }
    capitulosMap[capName].push(item);
  });

  const capitulosOrdenados = Object.keys(capitulosMap).sort((a, b) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header de controles */}
        <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50 select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded font-black">
              ID: {presupuesto.id.toUpperCase()}
            </span>
            <span className="text-xs font-bold text-stone-700">Informe Técnico de Cotización de Obra</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerBrowserPrint}
              className="px-4.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <i className="ti ti-printer"></i> Imprimir Reporte
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-200 text-stone-500 hover:text-stone-850 rounded-xl cursor-pointer"
            >
              <i className="ti ti-x text-sm font-bold"></i>
            </button>
          </div>
        </div>

        {/* Cuerpo del Reporte Imprimible */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-stone-800" id="planilla-reporte-imprimible">
          {/* Cabecera Membrete */}
          <div className="flex justify-between items-start pb-8 border-b-2 border-stone-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6.5 h-6.5 bg-stone-900 rounded-lg flex items-center justify-center text-white text-[11px] font-black tracking-widest leading-none">CP</span>
                <strong className="text-xs uppercase tracking-widest font-black text-stone-900">Control Patrimonial S.A.</strong>
              </div>
              <p className="text-[10px] text-stone-400">
                Sistemas de Control Patrimonial y Costos Civiles · Asunción, Paraguay
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-black text-stone-900 uppercase tracking-tight">PRESUPUESTO ESTIMATIVO</h2>
              <p className="text-[10px] text-stone-500 font-bold uppercase mt-1">
                Documento N° {presupuesto.id.slice(0, 8).toUpperCase()}-{new Date(presupuesto.fecha || presupuesto.created_at || Date.now()).getFullYear()}
              </p>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="grid grid-cols-2 gap-8 py-6 text-xs">
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">INFORMACIÓN DEL PROYECTO</span>
              <strong className="text-stone-900 text-[13px] block font-extrabold">{presupuesto.proyecto}</strong>
              <span className="text-stone-550 block">Cliente: {presupuesto.cliente}</span>
              <span className="text-stone-500 block">Ubicación de Obra: República de Paraguay</span>
            </div>
            <div className="space-y-1.5 text-right">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">DETALLES DE EXPEDICIÓN</span>
              <span className="text-stone-600 block">Fecha Emisión: {new Date(presupuesto.fecha || presupuesto.created_at || Date.now()).toLocaleDateString('es-ES')}</span>
              <span className="text-stone-600 block">Moneda de Pago: Dólar Americano (USD)</span>
              <span className="text-stone-600 block">Vigencia Estimación: 45 días</span>
            </div>
          </div>

          {/* Tabla de Cómputo Métrico */}
          <table className="w-full text-left text-[11px] border-collapse mt-4">
            <thead>
              <tr className="bg-stone-100 border-b-2 border-stone-800 text-stone-800 font-bold uppercase text-[9px] tracking-wide">
                <th className="py-2.5 px-3 w-10 text-center">N°</th>
                <th className="py-2.5 px-3">Clasificación / Rubro</th>
                <th className="py-2.5 px-3 text-center">Unidad</th>
                <th className="py-2.5 px-3 text-right">Cantidad</th>
                <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                <th className="py-2.5 px-3 text-right">Precio Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {capitulosOrdenados.map((capName) => (
                <React.Fragment key={capName}>
                  {/* Fila del Capítulo */}
                  <tr className="bg-stone-100 font-bold border-t border-stone-300">
                    <td colSpan={6} className="py-2 px-3 text-stone-800 font-extrabold text-[9.5px] uppercase tracking-wider">
                      <i className="ti ti-folder text-orange-600 mr-1.5"></i>
                      {capName}
                    </td>
                  </tr>
                  {/* Rubros del Capítulo */}
                  {capitulosMap[capName].map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50/40">
                      <td className="py-3 px-3 text-center font-mono text-[10px] text-stone-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[8px] text-stone-400 font-bold block">{item.id_rubro}</span>
                        <strong className="text-[10.5px] font-bold text-stone-800">{item.nombre_rubro}</strong>
                      </td>
                      <td className="py-3 px-3 text-center font-bold uppercase text-stone-500">{item.unidad || 'm³'}</td>
                      <td className="py-3 px-3 text-right font-semibold text-stone-700">{Number(item.cantidad).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-stone-500">${Number(item.precio || item.precio_rubro || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">${Number(item.subtotal || item.cantidad * (item.precio || item.precio_rubro || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Totales y Firmas */}
          <div className="grid grid-cols-12 gap-6 mt-10 pt-6 border-t border-stone-200 text-xs">
            <div className="col-span-7 flex flex-col justify-end space-y-4">
              <div className="max-w-xs border-t border-stone-350 pt-2 text-center text-[10px] text-stone-400 font-medium tracking-wide">
                Firma Responsable Técnico / Inspector de Obra
              </div>
            </div>

            <div className="col-span-5 space-y-2.5 pl-4 border-l border-stone-200 font-medium text-stone-600">
              <div className="flex justify-between">
                <span>Costo de Campo Directo:</span>
                <span className="font-mono">${cd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[10px]">
                <span>Gastos Generales / Indirectos ({indPct}%):</span>
                <span className="font-mono">${indirectos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[10px]">
                <span>Margen sobre Obra ({utiPct}%):</span>
                <span className="font-mono">${utilidad.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-stone-150 pt-2.5 flex justify-between font-bold text-stone-800">
                <span>Subtotal Operativo:</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[10px]">
                <span>IVA Ley Licitación ({ivaPct}%):</span>
                <span className="font-mono">${iva.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-stone-800 pt-3 flex justify-between text-stone-900 font-black text-sm uppercase">
                <span>Total de Obra:</span>
                <span className="font-mono font-black text-orange-650">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
