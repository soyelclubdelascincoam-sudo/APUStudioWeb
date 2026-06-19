import React, { useState, useEffect, useRef } from 'react';
import { supabase, isLiveSupabase } from '../supabase';

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: any;
}

export default function UploadPanel() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentFolder, setCurrentFolder] = useState<'insumos' | 'rubros' | null>(null);
  const [selectedFolderForUpload, setSelectedFolderForUpload] = useState<'insumos' | 'rubros'>('insumos');
  const [counts, setCounts] = useState({ insumos: 0, rubros: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar conteo de archivos en cada carpeta
  const loadCounts = async () => {
    if (!isLiveSupabase) {
      setCounts({ insumos: 2, rubros: 1 });
      return;
    }
    try {
      const [insumosRes, rubrosRes] = await Promise.all([
        supabase.storage.from('documentos_apue').list('insumos', { limit: 100 }),
        supabase.storage.from('documentos_apue').list('rubros', { limit: 100 })
      ]);
      
      setCounts({
        insumos: (insumosRes.data || []).filter(f => f.name !== '.emptyFolderPlaceholder').length,
        rubros: (rubrosRes.data || []).filter(f => f.name !== '.emptyFolderPlaceholder').length
      });
    } catch (e) {
      console.error('Error al cargar conteos de archivos:', e);
    }
  };

  // Cargar lista de archivos de la carpeta seleccionada
  const loadFiles = async (folderName?: 'insumos' | 'rubros') => {
    const targetFolder = folderName || currentFolder;
    if (!targetFolder) return;

    if (!isLiveSupabase) {
      // Simulación local de archivos por carpeta
      if (targetFolder === 'insumos') {
        setFiles([
          { name: "precios-cemento-peru-2026.pdf", id: "mock-i1", created_at: new Date().toISOString() },
          { name: "fletes-transporte-nacional.pdf", id: "mock-i2", created_at: new Date(Date.now() - 3600000).toISOString() }
        ]);
      } else {
        setFiles([
          { name: "APU-ExcavacionYLimpiezaSuelo.pdf", id: "mock-r1", created_at: new Date().toISOString() }
        ]);
      }
      return;
    }

    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from('documentos_apue')
        .list(targetFolder, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;
      
      // Filtrar placeholders invisibles de carpetas creadas manualmente si existen
      const filtered = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      setFiles(filtered);
    } catch (err: any) {
      console.error('Error al cargar archivos de Storage:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setMessage(null);
      } else {
        setMessage({ text: "Solo se permiten archivos PDF.", type: "error" });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setMessage(null);
      } else {
        setMessage({ text: "Solo se permiten archivos PDF.", type: "error" });
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage({ 
      text: `Subiendo documento a "${selectedFolderForUpload}" en Supabase Storage...`, 
      type: "info" 
    });

    // Limpieza de nombre para evitar caracteres conflictivos
    const safeName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = `${selectedFolderForUpload}/${safeName}`;

    if (!isLiveSupabase) {
      // Simulación local
      setTimeout(() => {
        setSelectedFile(null);
        setUploading(false);
        setMessage({ 
          text: `¡Simulación de subida exitosa! El archivo se habría guardado en "documentos_apue/${selectedFolderForUpload}/${selectedFile.name}"`, 
          type: "success" 
        });
        loadCounts();
        if (currentFolder === selectedFolderForUpload) {
          loadFiles(currentFolder);
        }
      }, 1500);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documentos_apue')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      setMessage({ 
        text: `¡PDF "${selectedFile.name}" subido correctamente a la carpeta "${selectedFolderForUpload}"! Se ha activado el trigger de IA.`, 
        type: "success" 
      });
      setSelectedFile(null);
      
      // Recargar estadísticas y refrescar si estamos visualizando esa carpeta
      await loadCounts();
      if (currentFolder === selectedFolderForUpload) {
        await loadFiles(currentFolder);
      }
    } catch (err: any) {
      console.error('Error de subida:', err);
      setMessage({ 
        text: `Error al subir el archivo: ${err.message || 'Verifica las políticas RLS del Storage.'}`, 
        type: "error" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!currentFolder) return;
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${filename}" de la carpeta "${currentFolder}"?`)) return;

    const filePath = `${currentFolder}/${filename}`;

    if (!isLiveSupabase) {
      setFiles(prev => prev.filter(f => f.name !== filename));
      setCounts(prev => ({ ...prev, [currentFolder]: Math.max(0, prev[currentFolder] - 1) }));
      setMessage({ text: "Archivo simulado eliminado de la vista.", type: "info" });
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('documentos_apue')
        .remove([filePath]);

      if (error) throw error;
      
      setMessage({ text: "Archivo eliminado correctamente de Supabase Storage.", type: "info" });
      await loadCounts();
      await loadFiles(currentFolder);
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      setMessage({ text: "Fallo al eliminar el archivo del Storage.", type: "error" });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 p-6">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-tight">
            Importación Automatizada de APUs (PDF)
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">
            Sube documentos a las carpetas del Bucket de Supabase. El trigger de IA procesará el contenido automáticamente.
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
          isLiveSupabase 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-stone-200 text-stone-600 border-stone-300'
        }`}>
          <i className={`ti ${isLiveSupabase ? 'ti-cloud-upload' : 'ti-cloud-off'} mr-1`}></i>
          {isLiveSupabase ? 'Supabase Storage Activo' : 'Simulación Local'}
        </span>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden">
        {/* Zona Izquierda: Carga de Archivos */}
        <div className="col-span-3 flex flex-col bg-white border border-stone-200 rounded-3xl p-6 shadow-sm overflow-y-auto space-y-5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
            Subir Nuevo Documento
          </h4>

          {/* Selector de Carpeta de Destino */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-stone-500 block">
              Selecciona la carpeta de destino:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFolderForUpload('insumos')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedFolderForUpload === 'insumos'
                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                    : 'bg-white border-stone-250 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <i className="ti ti-folder text-base"></i>
                Carpeta "insumos"
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolderForUpload('rubros')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedFolderForUpload === 'rubros'
                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                    : 'bg-white border-stone-250 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <i className="ti ti-folder text-base"></i>
                Carpeta "rubros"
              </button>
            </div>
            <p className="text-[10px] text-stone-400 italic">
              {selectedFolderForUpload === 'insumos' 
                ? '→ Ideal para catálogos de recursos, materiales y mano de obra.' 
                : '→ Ideal para análisis de precios unitarios y presupuestos de obra.'}
            </p>
          </div>

          {/* Area Drag & Drop */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-orange-500 bg-orange-50/30' 
                : selectedFile 
                ? 'border-emerald-500 bg-emerald-50/10' 
                : 'border-stone-250 bg-stone-50 hover:bg-stone-100/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <i className={`ti ${
              selectedFile ? 'ti-file-type-pdf text-emerald-600' : 'ti-cloud-upload text-stone-400'
            } text-4xl mb-3`}></i>
            
            {selectedFile ? (
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-800 block truncate max-w-sm">
                  {selectedFile.name}
                </span>
                <span className="text-[10px] text-stone-400 font-mono block">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-700 block">
                  Arrastra tu PDF aquí, o haz clic para buscarlo
                </span>
                <span className="text-[10px] text-stone-400 block">
                  El archivo se subirá en: <strong className="font-extrabold text-orange-600">documentos_apue/{selectedFolderForUpload}/</strong>
                </span>
              </div>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 font-medium border ${
              message.type === 'error' 
                ? 'bg-rose-50 text-rose-700 border-rose-150' 
                : message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                : 'bg-stone-100 text-stone-700 border-stone-250'
            }`}>
              <i className={`ti ${message.type === 'error' ? 'ti-alert-circle' : 'ti-info-circle'} text-sm mt-0.5 shrink-0`}></i>
              <span>{message.text}</span>
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <i className="ti ti-loader-2 spin"></i> Subiendo archivo...
                </>
              ) : (
                <>
                  <i className="ti ti-upload"></i> Subir a Supabase en /{selectedFolderForUpload}
                </>
              )}
            </button>
          )}
        </div>

        {/* Zona Derecha: Explorador del Storage */}
        <div className="col-span-2 flex flex-col bg-white border border-stone-200 rounded-3xl p-6 shadow-sm overflow-hidden">
          {/* Barra de Navegación / Breadcrumbs */}
          <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-stone-100">
            {currentFolder ? (
              <button
                onClick={() => setCurrentFolder(null)}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold transition-colors cursor-pointer"
              >
                <i className="ti ti-arrow-left"></i>
                <span>Volver a Inicio</span>
              </button>
            ) : (
              <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                Explorador de Carpetas
              </h4>
            )}
            
            {currentFolder && (
              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 font-mono">
                /{currentFolder}
              </span>
            )}
          </div>

          {/* Listado de Carpetas / Archivos */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {currentFolder === null ? (
              // VISTA A: Carpetas Raíz
              <div className="space-y-4 pt-1">
                {/* Carpeta: Insumos */}
                <div
                  onClick={() => {
                    setCurrentFolder('insumos');
                    loadFiles('insumos');
                  }}
                  className="bg-stone-50 border border-stone-200 hover:border-orange-300 hover:bg-orange-50/10 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm group"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 text-orange-600 p-3 rounded-xl group-hover:scale-105 transition-transform">
                      <i className="ti ti-folder text-xl"></i>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-800">insumos/</h5>
                      <p className="text-[10px] text-stone-450 mt-1 leading-normal">
                        Catálogo de recursos e insumos generales.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-500">
                    <span>{counts.insumos} {counts.insumos === 1 ? 'PDF' : 'PDFs'}</span>
                    <i className="ti ti-chevron-right text-stone-400"></i>
                  </div>
                </div>

                {/* Carpeta: Rubros */}
                <div
                  onClick={() => {
                    setCurrentFolder('rubros');
                    loadFiles('rubros');
                  }}
                  className="bg-stone-50 border border-stone-200 hover:border-orange-300 hover:bg-orange-50/10 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm group"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 text-orange-600 p-3 rounded-xl group-hover:scale-105 transition-transform">
                      <i className="ti ti-folder text-xl"></i>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-800">rubros/</h5>
                      <p className="text-[10px] text-stone-450 mt-1 leading-normal">
                        Documentos de Análisis de Precios Unitarios.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-500">
                    <span>{counts.rubros} {counts.rubros === 1 ? 'PDF' : 'PDFs'}</span>
                    <i className="ti ti-chevron-right text-stone-400"></i>
                  </div>
                </div>
              </div>
            ) : (
              // VISTA B: Archivos de la carpeta seleccionada
              <>
                {loadingFiles ? (
                  <div className="py-20 text-center text-xs text-stone-400 font-bold flex flex-col items-center gap-2">
                    <i className="ti ti-loader-2 spin text-orange-600 text-lg"></i>
                    <span>Cargando archivos...</span>
                  </div>
                ) : files.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between hover:bg-stone-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden mr-2">
                      <i className="ti ti-file-pdf text-rose-500 text-lg shrink-0"></i>
                      <div className="overflow-hidden">
                        <span className="text-[11px] font-bold text-stone-750 block truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[9px] text-stone-400 font-medium block mt-0.5">
                          Subido: {new Date(file.created_at).toLocaleDateString('es-ES')} {new Date(file.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(file.name)}
                      className="text-stone-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-200/50 cursor-pointer transition-colors"
                      title={`Eliminar de ${currentFolder}`}
                    >
                      <i className="ti ti-trash text-xs"></i>
                    </button>
                  </div>
                ))}

                {!loadingFiles && files.length === 0 && (
                  <div className="py-20 text-center border border-dashed border-stone-200 rounded-2xl text-stone-400 italic text-[11px] flex flex-col items-center gap-2">
                    <i className="ti ti-folder-open text-2xl text-stone-350"></i>
                    <span>No hay archivos cargados en esta carpeta.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
