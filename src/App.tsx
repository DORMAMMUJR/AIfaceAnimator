import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, FileImage, Loader2, CheckCircle2, AlertCircle, Play, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'En cola' | 'Procesando' | 'Completado' | 'Error'>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('El archivo es demasiado grande. Máximo 5MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Formato no válido. Solo JPG/PNG.');
      } else {
        setError('Error al cargar el archivo.');
      }
      return;
    }

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  } as any);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleAnimate = async () => {
    if (!file) return;

    setStatus('En cola');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/v1/animate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al iniciar la animación');
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      setStatus('Error');
    }
  };

  // Polling for status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (jobId && (status === 'En cola' || status === 'Procesando')) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/status/${jobId}`);
          if (!res.ok) throw new Error('Error al consultar estado');
          
          const data = await res.json();
          setStatus(data.status);
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.status === 'Completado' && data.url) {
            setVideoUrl(data.url);
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error(err);
          // Optionally handle polling errors
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, status]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setJobId(null);
    setStatus('idle');
    setProgress(0);
    setVideoUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">AI Face Animator</h1>
          </div>
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            GPU Workers Online
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Upload & Controls */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-medium tracking-tight mb-2">Da vida a tus retratos</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Sube una foto frontal y nuestro motor de IA (LivePortrait/SadTalker) generará una animación facial fluida procesada en GPU.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative"
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ease-out",
                    isDragActive 
                      ? "border-indigo-500 bg-indigo-500/5" 
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-sm">
                    <UploadCloud className={cn("w-8 h-8", isDragActive ? "text-indigo-400" : "text-zinc-400")} />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Arrastra tu foto aquí</h3>
                  <p className="text-sm text-zinc-500 mb-4">o haz clic para explorar</p>
                  <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-600">
                    <span>JPG, PNG</span>
                    <span>•</span>
                    <span>Max 5MB</span>
                  </div>
                </div>
                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="relative aspect-[3/4] sm:aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-xl">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Status Overlay */}
                  {status !== 'idle' && status !== 'Completado' && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                      <div className="font-mono text-sm font-medium text-white mb-2">
                        {status.toUpperCase()}
                      </div>
                      <div className="w-full max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: "linear", duration: 0.5 }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-zinc-400 font-mono">{progress}%</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    disabled={status === 'En cola' || status === 'Procesando'}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-sm bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cambiar Foto
                  </button>
                  <button
                    onClick={handleAnimate}
                    disabled={status !== 'idle' && status !== 'Error'}
                    className="flex-[2] px-4 py-3 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === 'idle' || status === 'Error' ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Animar Rostro
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando en GPU...
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Result */}
        <div className="lg:pl-12 lg:border-l border-zinc-800 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-medium">Resultado</h3>
            {status === 'Completado' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Renderizado
              </span>
            )}
          </div>

          <div className={cn(
            "flex-1 rounded-2xl border border-zinc-800 overflow-hidden relative flex items-center justify-center transition-all duration-500",
            videoUrl ? "bg-black shadow-2xl" : "bg-zinc-900/30 border-dashed"
          )}>
            {videoUrl ? (
              <motion.video
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 text-zinc-500">
                <FileImage className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">El video generado aparecerá aquí.</p>
                <div className="mt-8 space-y-3 max-w-xs mx-auto text-left">
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">1</div>
                    <span>Sube una imagen frontal</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">2</div>
                    <span>Inferencia en Celery Worker</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">3</div>
                    <span>Descarga MP4 (H.264)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
