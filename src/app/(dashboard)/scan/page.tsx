"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check, RotateCcw, AlertCircle, Zap, Car, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { isValidItalianPlate, formatPlate, estimateCarYearFromPlate } from "@/lib/utils";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

type Step = "camera" | "preview" | "plate-input" | "submitting" | "success";

export default function ScanPage() {
  const { t } = useI18n();
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

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(null);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setCameraError(t.scan.cameraErrorDenied);
      else if (err.name === "NotFoundError") setCameraError(t.scan.cameraErrorNotFound);
      else setCameraError(t.scan.cameraError);
    }
  }, [facingMode, t]);

  useEffect(() => {
    if (step === "camera") startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, [step, startCamera]);

  useEffect(() => {
    fetch("/api/plates/today").then((r) => r.json()).then((data) => setRemaining(data.remaining)).catch(() => {});
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setStep("preview");
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (plateNumber.length >= 7) setEstimatedYear(estimateCarYearFromPlate(plateNumber));
    else setEstimatedYear(null);
  }, [plateNumber]);

  const handleSubmit = async () => {
    if (!capturedPhoto || !plateNumber) return;
    if (!isValidItalianPlate(plateNumber)) { toast.error(t.scan.errorInvalid); return; }
    setStep("submitting");
    try {
      const res = await fetch("/api/plates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNumber: formatPlate(plateNumber), photoBase64: capturedPhoto, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t.scan.errorSend); setStep("plate-input"); return; }
      setStep("success");
      setRemaining(data.remainingToday);
    } catch {
      toast.error(t.scan.errorConnection);
      setStep("plate-input");
    }
  };

  const reset = () => { setCapturedPhoto(null); setPlateNumber(""); setNotes(""); setEstimatedYear(null); setStep("camera"); };

  if (remaining === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center px-4 text-center bg-slate-950">
        <div className="glass-card p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t.scan.limitTitle}</h2>
          <p className="text-slate-400 text-sm mb-6">{t.scan.limitText}</p>
          <Link href="/dashboard" className="btn-primary w-full">{t.scan.backHome}</Link>
        </div>
      </div>
    );
  }

  return (
    // h-dvh + overflow-hidden = the page never scrolls
    <div className="h-dvh flex flex-col bg-slate-950 overflow-hidden">

      {/* ── Header ── fixed height */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-3 z-10 flex-shrink-0">
        <Link href="/dashboard" className="w-9 h-9 glass-card flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </Link>
        <h1 className="font-semibold text-white">{t.scan.title}</h1>
        {remaining !== null && (
          <div className="glass-card px-2.5 py-1 text-xs font-medium text-brand-400">
            {remaining} {t.scan.remainingLeft}
          </div>
        )}
      </div>

      {/* ── Content ── fills remaining height exactly */}
      <AnimatePresence mode="wait">

        {/* STEP: Camera */}
        {step === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 relative overflow-hidden min-h-0">
            {cameraError ? (
              <div className="h-full flex flex-col items-center justify-center px-4 text-center gap-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-slate-300 text-sm">{cameraError}</p>
                <button onClick={startCamera} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" />{t.scan.retry}
                </button>
              </div>
            ) : (
              <>
                {/* Video fills the container */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Viewfinder overlay — centered in upper 2/3 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ paddingBottom: "30%" }}>
                  <div className="relative w-72 h-20">
                    {["top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                      "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                      "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                      "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg"].map((cls, i) => (
                      <div key={i} className={`absolute w-6 h-6 border-white/80 ${cls}`} />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white/70 text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        {t.scan.aimAtPlate}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls — fixed at bottom, overlaid on video */}
                <div className="absolute bottom-0 left-0 right-0 pb-safe">
                  {/* Gradient fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                  <div className="relative flex items-center justify-center gap-10 px-6 py-6">
                    {/* Flip camera */}
                    <button
                      onClick={() => setFacingMode((f) => f === "environment" ? "user" : "environment")}
                      className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-5 h-5 text-white" />
                    </button>

                    {/* Shutter */}
                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                    >
                      <div className="w-16 h-16 rounded-full border-4 border-slate-300 bg-white" />
                    </button>

                    {/* Spacer */}
                    <div className="w-12 h-12" />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && capturedPhoto && (
          <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 bg-black min-h-0">
              <img src={capturedPhoto} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
            </div>
            <div className="px-4 py-4 flex gap-3 flex-shrink-0">
              <button onClick={reset} className="btn-secondary flex-1">
                <X className="w-4 h-4" />{t.scan.retake}
              </button>
              <button onClick={() => setStep("plate-input")} className="btn-primary flex-1">
                <Check className="w-4 h-4" />{t.scan.usePhoto}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: Plate input */}
        {step === "plate-input" && (
          <motion.div key="plate-input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-4 gap-4">

            {/* Thumbnail — smaller to save space */}
            {capturedPhoto && (
              <div className="relative h-24 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">
                <img src={capturedPhoto} alt="Photo" className="w-full h-full object-cover" />
                <button onClick={reset}
                  className="absolute top-2 right-2 w-7 h-7 bg-slate-900/80 rounded-full flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            )}

            {/* Plate input */}
            <div className="space-y-2 flex-shrink-0">
              <label className="text-sm font-medium text-slate-300">{t.scan.plateLabel}</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="AB123CD"
                className="input-field font-mono text-xl text-center tracking-widest uppercase"
                maxLength={7}
                autoFocus
                autoCapitalize="characters"
              />

              <AnimatePresence>
                {estimatedYear && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
                    <Car className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <p className="text-sm text-brand-300">
                      {t.scan.estimatedYear} <span className="font-bold">{estimatedYear}</span>
                    </p>
                    {estimatedYear < 1980 && (
                      <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                        {t.scan.vintage}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {plateNumber.length >= 7 && !isValidItalianPlate(plateNumber) && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{t.scan.invalidPlate}
                </p>
              )}
            </div>

            {/* Notes — shorter textarea */}
            <div className="space-y-2 flex-shrink-0">
              <label className="text-sm font-medium text-slate-300">
                {t.scan.notesLabel}{" "}
                <span className="text-slate-500 font-normal">{t.scan.notesOptional}</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.scan.notesPlaceholder}
                className="input-field resize-none h-16 text-sm"
                maxLength={200}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValidItalianPlate(plateNumber) || !capturedPhoto}
              className="btn-primary w-full flex-shrink-0"
            >
              <Zap className="w-4 h-4" />{t.scan.submitButton}
            </button>
          </motion.div>
        )}

        {/* STEP: Submitting */}
        {step === "submitting" && (
          <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-slate-300 font-medium">{t.scan.submitting}</p>
          </motion.div>
        )}

        {/* STEP: Success */}
        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-5">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
              <Check className="w-12 h-12 text-green-400" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{t.scan.successTitle}</h2>
              <div className="plate-badge text-xl mx-auto inline-block mb-3">{formatPlate(plateNumber)}</div>
              {estimatedYear && (
                <p className="text-slate-400 text-sm">
                  {t.scan.estimatedYear} <span className="text-white font-medium">{estimatedYear}</span>
                </p>
              )}
            </div>
            {remaining !== null && remaining > 0 && (
              <p className="text-slate-400 text-sm">
                {t.scan.successRemaining}{" "}
                <span className="text-brand-400 font-medium">{remaining}</span>{" "}
                {remaining === 1 ? t.scan.successRemainingPlate : t.scan.successRemainingPlates}{" "}
                {t.scan.successToday}
              </p>
            )}
            <div className="flex gap-3 w-full max-w-xs">
              {remaining !== null && remaining > 0 && (
                <button onClick={reset} className="btn-primary flex-1">
                  <Camera className="w-4 h-4" />{t.scan.scanAgain}
                </button>
              )}
              <Link href="/dashboard" className="btn-secondary flex-1">{t.scan.home}</Link>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
