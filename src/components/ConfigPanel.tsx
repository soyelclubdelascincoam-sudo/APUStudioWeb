import React from 'react';
import { isLiveSupabase } from '../supabase';

import { ConfigIA } from '../types';

interface ConfigPanelProps {
  configIA: ConfigIA;
  setConfigIA: React.Dispatch<React.SetStateAction<any>>;
}

export default function ConfigPanel({ configIA, setConfigIA }: ConfigPanelProps) {
  const [verEsquema, setVerEsquema] = React.useState(false);
  
  // Variables del cliente (enmascaradas)
  const urlConfigurada = (import.meta as any).env.VITE_SUPABASE_URL || '';

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 p-6 flex flex-col items-center gap-6">
      
      {/* TARJETA DE ESTADO DE CONEXION SUPABASE */}
      <div className="w-full max-w-2xl bg-white border border-stone-250 rounded-3xl p-6.5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">
              Estado del Servidor Remoto
            </h3>
            <h4 className="text-sm font-extrabold text-stone-850 mt-1 uppercase">
              Conexión Externa de Base de Datos
            </h4>
          </div>
          {isLiveSupabase ? (
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conectado a Supabase
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-600 border border-amber-250 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> Simulador de Desarrollo Activo
            </span>
          )}
        </div>

        {isLiveSupabase ? (
          <div className="bg-emerald-500/5 border border-emerald-150 p-4 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-stone-405 uppercase tracking-wide block">URL del Proyecto Vinculado:</span>
            <div className="flex items-center gap-2">
              <i className="ti ti-link text-emerald-600 font-bold"></i>
              <code className="text-xs font-mono font-bold text-stone-700 bg-white border border-stone-200 px-3 py-1.5 rounded-lg select-all w-full truncate block">
                {urlConfigurada}
              </code>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed mt-2 pl-0.5">
              El frontend se encuentra comunicado <strong>satisfactoriamente con su backend en vivo de Supabase</strong>. La información de insumos y presupuestos se lee en tiempo real directamente desde sus tablas productivas de Base de Datos.
            </p>
          </div>
        ) : (
          <div className="bg-amber-500/5 border border-amber-150 p-4.5 rounded-2xl space-y-3">
            <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <i className="ti ti-plug"></i> ¿Cómo conectar con tu Base de Datos en Supabase?
            </h5>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Actualmente estás viendo datos de prueba (local storage simulado) para que la interfaz funcione de inmediato. Para conectar esta interfaz con tus tablas de Supabase en producción que ya tienen datos cargados, solo debes proveer las siguientes variables de entorno:
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs bg-white border border-stone-200 p-2.5 rounded-xl">
                <span>URL de tu API:</span>
                <code className="font-mono bg-stone-50 text-stone-800 font-bold px-2 py-0.5 rounded text-[10.5px]">VITE_SUPABASE_URL</code>
              </div>
              <div className="flex justify-between items-center text-xs bg-white border border-stone-200 p-2.5 rounded-xl">
                <span>Clave de Acceso Pública Anon:</span>
                <code className="font-mono bg-stone-50 text-stone-800 font-bold px-2 py-0.5 rounded text-[10.5px]">VITE_SUPABASE_ANON_KEY</code>
              </div>
            </div>

            <p className="text-[10px] text-stone-400 italic">
              * Nota: Puedes configurar estas variables en el panel lateral de ajustes de la plataforma o en el archivo ejecutor .env. Al introducirlas, el frontend reanudará automáticamente la escucha en la URL remota.
            </p>
          </div>
        )}

        {/* ACCORDION DE DETALLE DE ESQUEMA REQUERIDO DE TABLAS */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50">
          <button
            onClick={() => setVerEsquema(!verEsquema)}
            className="w-full p-4 flex justify-between items-center bg-stone-100 hover:bg-stone-200/50 transition-colors text-left cursor-pointer outline-none border-none"
          >
            <div className="flex items-center gap-2">
              <i className="ti ti-table text-stone-600 text-sm"></i>
              <span className="text-xs font-bold text-stone-700 uppercase">Mapeo de Tablas y Columnas Consultadas</span>
            </div>
            <i className={`ti ${verEsquema ? 'ti-chevron-up' : 'ti-chevron-down'} text-stone-400 font-bold`}></i>
          </button>
          
          {verEsquema && (
            <div className="p-4 bg-white border-t border-stone-200 space-y-4 max-h-96 overflow-y-auto font-sans">
              <p className="text-[11px] text-stone-500 leading-relaxed border-b border-stone-100 pb-2.5">
                Para que el frontend pueda cargar adecuadamente la información que ya tienes en tu base de datos de Supabase, tus tablas y sus columnas deben coincidir exactamente con la estructura que consulta el sistema:
              </p>

              {/* TABLA: INSUMOS DE MATERIALES */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">INSUMOS_MAT</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Materiales</span>
                </div>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_insumo_mat</strong> (Clave primaria - texto o UUID)</div>
                  <div>• <strong className="text-stone-700">name_insumo_mat</strong> (Texto - Ej: "Cemento Gris Portland")</div>
                  <div>• <strong className="text-stone-700">precio_insumo_mat</strong> (Económico / numérico)</div>
                  <div>• <strong className="text-stone-700">unidad</strong> (Texto, Ej: "bolsa", "kg", "m³")</div>
                  <div>• <strong className="text-stone-700">proveedor</strong> (Texto - Opcional)</div>
                </div>
              </div>

              {/* TABLA: MANO DE OBRA */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">INSUMOS_MOB</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Mano de Obra</span>
                </div>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_insumo_mob</strong> (Clave primaria - texto o UUID)</div>
                  <div>• <strong className="text-stone-700">name_insumo_mob</strong> (Texto - Ej: "Oficial Albañil")</div>
                  <div>• <strong className="text-stone-700">precio_insumo_mob</strong> (Costo por hora - numérico)</div>
                  <div>• <strong className="text-stone-700">categoria</strong> (Texto - Ej: "Servicio Profesional/Obrero")</div>
                </div>
              </div>

              {/* TABLA: EQUIPOS Y HERRAMIENTAS */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">INSUMOS_EYH</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Equipos y Herramientas</span>
                </div>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_insumo_eyh</strong> (Clave primaria - texto o UUID)</div>
                  <div>• <strong className="text-stone-700">name_insumo_eyh</strong> (Texto - Ej: "Mezcladora de Concreto")</div>
                  <div>• <strong className="text-stone-700">precio_insumo_eyh</strong> (Costo hora/día - numérico)</div>
                  <div>• <strong className="text-stone-700">tipo</strong> (Texto - Ej: "Maquinaria pesada", "Manual")</div>
                </div>
              </div>

              {/* TABLA: TRANSPORTE */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">INSUMOS_TRANSP</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Transporte y Acarreos</span>
                </div>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_insumo_transp</strong> (Clave primaria - texto o UUID)</div>
                  <div>• <strong className="text-stone-700">name_insumo_transp</strong> (Texto - Ej: "Flete Volqueta 12m³")</div>
                  <div>• <strong className="text-stone-700">precio_insumo_transp</strong> (Costo por viaje/km - numérico)</div>
                  <div>• <strong className="text-stone-700">distancia_km</strong> (Distancia media de servicio - opcional)</div>
                </div>
              </div>

              {/* TABLA: RUBROS */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">RUBROS</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Rubros o Precios Unitarios</span>
                </div>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_rubro</strong> (Clave primaria de búsqueda - texto o UUID)</div>
                  <div>• <strong className="text-stone-700">nombre_rubro</strong> (Texto descriptivo principal)</div>
                  <div>• <strong className="text-stone-700">unidad</strong> (Texto de cuantificación - Ej: "m³", "m²", "kg")</div>
                  <div>• <strong className="text-stone-700">precio_rubro</strong> (Monto acumulado directo - numérico)</div>
                </div>
              </div>

              {/* TABLAS DE RECETA (CONEXIÓN ADICIONAL APU) */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-150">
                  <span className="font-mono text-xs font-bold text-orange-600 block">RECETA_MAT / MOB / EYH / TRANSP</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Fórmulas APU</span>
                </div>
                <p className="text-[10.5px] text-stone-500 pl-2">
                  Estas tablas almacenan el desglose de recursos asociados a cada rubro. Se consultan mediante <code className="bg-stone-100 font-mono text-[9px] px-1 rounded font-bold">.eq('id_rubro', id)</code>:
                </p>
                <div className="text-[10.5px] text-stone-600 space-y-1 pl-2 font-mono">
                  <div>• <strong className="text-stone-700">id_rubro</strong> (Relación de enlace con la tabla RUBROS)</div>
                  <div>• <strong className="text-stone-700">codigo</strong> (Identificador único del insumo - texto)</div>
                  <div>• <strong className="text-stone-700">descripcion</strong> (Nombre del recurso en la receta)</div>
                  <div>• <strong className="text-stone-700">unidad</strong> (Soporte métrico)</div>
                  <div>• <strong className="text-stone-702">cantidad</strong> (Rendimiento por unidad de rubro)</div>
                  <div>• <strong className="text-stone-750">precio_unitario</strong> (Costo base)</div>
                  <div>• <strong className="text-stone-750">precio_total</strong> (Subtotal de participación en la fórmula)</div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* PARAMETROS DE GESTION IA */}
      <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-tight">
            Configuración y Asistente Generativo IA
          </h3>
          <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
            Personalice el comportamiento de las auditorías de APU en vivo, optimización de mezclas, y estandarización analítica de insumos.
          </p>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Parámetro 0: Gemini API Key */}
          <div className="py-4 flex flex-col gap-2">
            <div>
              <span className="text-xs font-black text-stone-850 uppercase flex items-center gap-1.5">
                <i className="ti ti-key text-orange-600"></i> Gemini API Key (Google AI Studio)
              </span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Requerida para habilitar la generación automática de presupuestos con IA. Su clave se almacena únicamente en el navegador (local storage).
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={configIA.apiKey || ''}
                onChange={(e) => setConfigIA((prev: any) => ({ ...prev, apiKey: e.target.value }))}
                className="flex-1 px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-mono font-semibold outline-none focus:bg-white focus:border-orange-500 transition-all"
              />
              {configIA.apiKey ? (
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1">
                  <i className="ti ti-circle-check"></i> Configurada
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-600 border border-amber-250 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1">
                  <i className="ti ti-alert-triangle"></i> Pendiente
                </span>
              )}
            </div>
          </div>

          {/* Parámetro 1: Modelo Generativo */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Modelo de Lenguaje Predeterminado</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Seleccione el estándar de red neuronal que liderará las estimaciones de rendimiento.
              </p>
            </div>
            <select
              value={configIA.modelo}
              onChange={(e) => setConfigIA((prev: any) => ({ ...prev, modelo: e.target.value }))}
              className="px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-semibold outline-none focus:bg-white focus:border-orange-500"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultrarrápido)</option>
              <option value="gemini-2.5-pro">Gemini 3.0 Pro (Máxima Precisión)</option>
            </select>
          </div>

          {/* Parámetro 2: Temperatura */}
          <div className="py-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-black text-stone-800 uppercase">Temperatura de Muestreo (Creatividad)</span>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                  Valores bajos producen estimaciones con estrictidad estadística e hitos previos del mercado.
                </p>
              </div>
              <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full">
                {configIA.temperatura}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={configIA.temperatura}
              onChange={(e) => setConfigIA((prev: any) => ({ ...prev, temperatura: parseFloat(e.target.value) }))}
              className="w-full accent-orange-600"
            />
          </div>

          {/* Parámetro 3: Normalización */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Sanitización y Estandarización de Unidades</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Homologa unidades en litros, bolsas, m³ o kilogramos automáticamente al comparar proveedores externos.
              </p>
            </div>
            <button
              onClick={() => setConfigIA((prev: any) => ({ ...prev, normalizarUnidades: !prev.normalizarUnidades }))}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer outline-none ${
                configIA.normalizarUnidades ? 'bg-orange-650' : 'bg-stone-250'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                  configIA.normalizarUnidades ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Parámetro 4: Filtros anti-duplicados */}
          <div className="py-4 flex items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-black text-stone-800 uppercase">Filtro Anticolisiones Transaccionales</span>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                Previene entradas duplicadas empleando llaves de integridad compuesta (UP-Serts) al sincronizar con el cluster remoto.
              </p>
            </div>
            <button
              onClick={() => setConfigIA((prev: any) => ({ ...prev, filtroAntiDuplicados: !prev.filtroAntiDuplicados }))}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer outline-none ${
                configIA.filtroAntiDuplicados ? 'bg-orange-650' : 'bg-stone-250'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                  configIA.filtroAntiDuplicados ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
