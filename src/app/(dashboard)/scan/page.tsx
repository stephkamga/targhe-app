"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Zap,
  Car,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { isValidItalianPlate, formatPlate, estimateCarYearFromPlate } from "@/lib/utils";
import Link from "next/link";

type Step = "camera" | "preview" | "plate-input" | "submitting" | "success";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("camera");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [estimatedYear, setEstimatedYear] = useState<number | null>(null);

  // Avvia la camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setCameraError("Permesso fotocamera negato. Abilita l'accesso nelle impostazioni.");
      } else if (err.name === "NotFoundError") {
        setCameraError("Nessuna fotocamera trovata sul dispositivo.");
      } else {
        setCameraError("Impossibile accedere alla fotocamera.");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    if (step === "camera") {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [step, startCamera]);

  // Controlla targhe rimanenti
  useEffect(() => {
    fetch("/api/plates/today")
      .then((r) => r.json())
      .then((data) => setRemaining(data.remaining))
      .catch(() => {});
  }, []);

  // Scatta la foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);
    setStep("preview");

    // Ferma la camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  // Aggiorna stima anno quando cambia la targa
  useEffect(() => {
    if (plateNumber.length >= 7) {
      const year = estimateCarYearFromPlate(plateNumber);
      setEstimatedYear(year);
    } else {
      setEstimatedYear(null);
    }
  }, [plateNumber]);

  // Invia la targa
  const handleSubmit = async () => {
    if (!capturedPhoto || !plateNumber) return;

    if (!isValidItalianPlate(plateNumber)) {
      toast.error("Formato targa non valido");
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/plates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formatPlate(plateNumber),
          photoBase64: capturedPhoto,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Errore nell'invio");
        setStep("plate-input");
        return;
      }

      setStep("success");
      setRemaining(data.remainingToday);
    } catch {
      toast.error("Errore di connessione");
      setStep("plate-input");
    }
  };

  const reset = () => {
    setCapturedPhoto(null);
    setPlateNumber("");
    setNotes("");
    setEstimatedYear(null);
    setStep("camera");
  };

  // Blocca se non ci sono targhe rimanenti
  if (remaining === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <div className="glass-card p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Limite raggiunto</h2>
          <p className="text-slate-400 text-sm mb-6">
            Hai già inserito 3 targhe oggi. Torna domani per continuare la caccia!
          </p>
          <Link href="/dashboard" className="btn-primary w-full">
            Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 z-10">
        <Link
          href="/dashboard"
          className="w-9 h-9 glass-card flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </Link>
        <h1 className="font-semibold text-white">Scansiona targa</h1>
        {remaining !== null && (
          <div className="glass-card px-2.5 py-1 text-xs font-medium text-brand-400">
            {remaining} rimaste
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Step: Camera */}
        {step === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {cameraError ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-slate-300 text-sm">{cameraError}</p>
                <button onClick={startCamera} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" />
                  Riprova
                </button>
              </div>
            ) : (
              <>
                {/* Viewfinder */}
                <div className="relative flex-1 bg-black overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay mirino */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-72 h-20">
                      {/* Angoli del mirino */}
                      {[
                        "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                        "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                        "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                        "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
                      ].map((cls, i) => (
                        <div
                          key={i}
                          className={`absolute w-6 h-6 border-white/80 ${cls}`}
                        />
                      ))}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-white/60 text-xs font-medium bg-black/30 px-3 py-1 rounded-full">
                          Inquadra la targa
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gradient bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>

                {/* Controlli camera */}
                <div className="px-6 py-6 flex items-center justify-center gap-8">
                  {/* Flip camera */}
                  <button
                    onClick={() =>
                      setFacingMode((f) =>
                        f === "environment" ? "user" : "environment"
                      )
                    }
                    className="w-12 h-12 glass-card flex items-center justify-center"
                  >
                    <RotateCcw className="w-5 h-5 text-slate-300" />
                  </button>

                  {/* Scatta */}
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-slate-300 bg-white" />
                  </button>

                  {/* Placeholder */}
                  <div className="w-12 h-12" />
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step: Preview foto */}
        {step === "preview" && capturedPhoto && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="relative flex-1 bg-black">
              <img
                src={capturedPhoto}
                alt="Foto scattata"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="px-4 py-4 flex gap-3">
              <button onClick={reset} className="btn-secondary flex-1">
                <X className="w-4 h-4" />
                Riprendi
              </button>
              <button
                onClick={() => setStep("plate-input")}
                className="btn-primary flex-1"
              >
                <Check className="w-4 h-4" />
                Usa questa
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Inserimento targa */}
        {step === "plate-input" && (
          <motion.div
            key="plate-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 px-4 py-4 space-y-5"
          >
            {/* Anteprima foto piccola */}
            {capturedPhoto && (
              <div className="relative h-32 rounded-2xl overflow-hidden bg-slate-800">
                <img
                  src={capturedPhoto}
                  alt="Foto"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 w-7 h-7 bg-slate-900/80 rounded-full flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            )}

            {/* Input targa */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Numero di targa
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) =>
                  setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="AB123CD"
                className="input-field font-mono text-xl text-center tracking-widest uppercase"
                maxLength={7}
                autoFocus
                autoCapitalize="characters"
              />

              {/* Stima anno */}
              <AnimatePresence>
                {estimatedYear && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 rounded-xl border border-brand-500/20"
                  >
                    <Car className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <p className="text-sm text-brand-300">
                      Anno stimato:{" "}
                      <span className="font-bold">{estimatedYear}</span>
                    </p>
                    {estimatedYear < 1980 && (
                      <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                        Vintage!
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validazione */}
              {plateNumber.length >= 7 && !isValidItalianPlate(plateNumber) && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Formato non valido (es. AB 123 CD)
                </p>
              )}
            </div>

            {/* Note opzionali */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Note{" "}
                <span className="text-slate-500 font-normal">(opzionale)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es. Ferrari rossa, Fiat 500 d'epoca..."
                className="input-field resize-none h-20 text-sm"
                maxLength={200}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValidItalianPlate(plateNumber) || !capturedPhoto}
              className="btn-primary w-full"
            >
              <Zap className="w-4 h-4" />
              Invia targa
            </button>
          </motion.div>
        )}

        {/* Step: Invio in corso */}
        {step === "submitting" && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-slate-300 font-medium">Invio in corso...</p>
          </motion.div>
        )}

        {/* Step: Successo */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30"
            >
              <Check className="w-12 h-12 text-green-400" />
            </motion.div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Targa registrata!
              </h2>
              <div className="plate-badge text-xl mx-auto inline-block mb-3">
                {formatPlate(plateNumber)}
              </div>
              {estimatedYear && (
                <p className="text-slate-400 text-sm">
                  Anno stimato: <span className="text-white font-medium">{estimatedYear}</span>
                </p>
              )}
            </div>

            {remaining !== null && remaining > 0 && (
              <p className="text-slate-400 text-sm">
                Puoi ancora inserire{" "}
                <span className="text-brand-400 font-medium">{remaining}</span>{" "}
                {remaining === 1 ? "targa" : "targhe"} oggi
              </p>
            )}

            <div className="flex gap-3 w-full max-w-xs">
              {remaining !== null && remaining > 0 ? (
                <button onClick={reset} className="btn-primary flex-1">
                  <Camera className="w-4 h-4" />
                  Scansiona ancora
                </button>
              ) : null}
              <Link href="/dashboard" className="btn-secondary flex-1">
                Home
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas nascosto per cattura foto */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
