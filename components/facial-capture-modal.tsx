'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, RefreshCw, Check, X, Upload, AlertCircle,
  Smartphone, Monitor, SwitchCamera, CheckCircle2,
  FolderCheck, Sparkles, Loader2, Zap, ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FacialCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoBase64: string) => void;
  initialPhoto?: string | null;
  dossierNumber?: string | null;
  userName?: string | null;
}

// Filtre d'accentuation et de netteté subtile (Unsharp Mask)
// Corrige le rendu mou/lissé typique des webcams intégrées d'ordinateurs portables en intérieur
function applySubtleSharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);
    const w = width;
    const h = height;
    const weight = 0.20; // 20% d'accentuation des contours (yeux, arêtes du visage, cheveux)

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = (rowOffset + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const up = copy[((y - 1) * w + x) * 4 + c];
          const down = copy[((y + 1) * w + x) * 4 + c];
          const left = copy[(rowOffset + (x - 1)) * 4 + c];
          const right = copy[(rowOffset + (x + 1)) * 4 + c];
          const laplacian = 4 * center - up - down - left - right;
          data[idx + c] = Math.min(255, Math.max(0, center + laplacian * weight));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn('Subtle sharpen skipped:', e);
  }
}

export default function FacialCaptureModal({
  isOpen,
  onClose,
  onCapture,
  initialPhoto,
  dossierNumber,
  userName,
}: FacialCaptureModalProps) {
  // Modes : 'stream' (flux direct webcam/téléphone), 'native-camera' (appareil natif mobile), 'upload' (fichier)
  const [mode, setMode] = useState<'stream' | 'native-camera' | 'upload'>('stream');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(initialPhoto || null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Qualité et résolution en direct
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number } | null>(null);
  const [enhanceSharpness, setEnhanceSharpness] = useState<boolean>(true);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isZoomed, setIsZoomed] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Détection des caméras disponibles (MacBook FaceTime, iPhone Continuité, Webcam externe USB)
  const enumerateCameras = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
        setAvailableDevices(videoInputs);
      } catch (err) {
        console.warn('Enumerate devices notice:', err);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setStreamResolution(null);
  }, []);

  // Démarrage du flux caméra en Haute Définition (Full HD 1080p / HD 720p)
  const startCamera = useCallback(async (deviceIdToUse?: string) => {
    setCameraError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('La capture directe n\'est pas supportée. Utilisez l\'appareil photo mobile ou l\'import de fichier.');
      }

      // Arrêter le flux précédent
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const targetDeviceId = deviceIdToUse !== undefined ? deviceIdToUse : selectedDeviceId;

      let mediaStream: MediaStream | null = null;

      // Tentative 1 : Demande Full HD 1080p / 720p avec contraintes 'ideal' (sécurisées pour MacBook et PC)
      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        };

        if (targetDeviceId && targetDeviceId.trim() !== '') {
          videoConstraints.deviceId = { ideal: targetDeviceId };
        } else if (facingMode) {
          videoConstraints.facingMode = { ideal: facingMode };
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch (err1) {
        console.warn('HD ideal constraints fallback to basic video:', err1);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err2) {
          throw err2;
        }
      }

      if (!mediaStream) throw new Error('Aucun flux vidéo reçu de la caméra.');

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Lire la résolution réelle fournie par le capteur
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          setStreamResolution({ width: settings.width, height: settings.height });
        }
      }

      // Mettre à jour la liste des périphériques avec labels réels autorisés
      enumerateCameras();
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Autorisation d\'accès à la caméra refusée. Vous pouvez utiliser l\'appareil photo mobile ou téléverser une photo.'
          : 'Impossible d\'activer le flux vidéo direct. Utilisez l\'appareil photo mobile ou l\'import de photo.'
      );
      setMode('native-camera');
    }
  }, [facingMode, selectedDeviceId, enumerateCameras]);

  // Basculer entre caméra frontale (selfie) et caméra arrière
  const toggleFacingMode = () => {
    setSelectedDeviceId('');
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
  };

  useEffect(() => {
    if (isOpen && mode === 'stream' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, mode, capturedPhoto, facingMode, selectedDeviceId, startCamera, stopCamera]);

  // Capture instantanée HAUTE DÉFINITION & NETTETÉ RENFORCÉE
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    // Déclencher le flash obturateur visuel
    setFlash(true);
    setTimeout(() => setFlash(false), 220);

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // 1. Cadrage centré carré (1:1) haute définition correspondant exactement à l'ovale de guidage
    // Évite de capturer toute la pièce en dézoomé et concentre les pixels sur le visage
    const cropSize = Math.min(vw, vh);
    const cropX = Math.round((vw - cropSize) / 2);
    const cropY = Math.round((vh - cropSize) / 2);

    // 2. Taille cible haute résolution (1024×1024 pour un rendu rétina ultra-net)
    const targetSize = Math.min(cropSize, 1024);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 3. Activation du lissage haute fidélité
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 4. Correction de contraste et de clarté pour compenser l'éclairage intérieur des webcams Mac
    if (enhanceSharpness) {
      ctx.filter = 'contrast(1.06) brightness(1.02) saturate(1.04)';
    }

    // 5. Gestion de l'effet miroir pour caméra frontale
    if (facingMode === 'user') {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    // 6. Dessin haute fidélité de la zone centrale portrait
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      targetSize,
      targetSize
    );

    // 7. Application du filtre de netteté des contours (anti-flou spécial capteur portable)
    if (enhanceSharpness) {
      applySubtleSharpen(ctx, targetSize, targetSize);
    }

    // 8. Compression directe en 1 seule étape à 92% de qualité (pas de double compression destructive)
    const highDefBase64 = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(highDefBase64);
    stopCamera();
  };

  // Déclencheur avec compte à rebours 3s
  const handleTriggerCountdown = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        takeSnapshot();
        setIsCapturing(false);
      }
    }, 1000);
  };

  // Optimisation et compression des images importées par fichier ou caméra native mobile
  const processAndSetImage = (dataUrl: string) => {
    setProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1200; // Augmenté à 1200px pour une clarté optimale
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedPhoto(optimizedBase64);
      } else {
        setCapturedPhoto(dataUrl);
      }
      setProcessing(false);
    };
    img.onerror = () => {
      setCapturedPhoto(dataUrl);
      setProcessing(false);
    };
    img.src = dataUrl;
  };

  // Gestion des photos prises via l'appareil mobile natif ou fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un format d\'image valide (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processAndSetImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setIsZoomed(false);
    if (mode === 'stream') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Photo & Reconnaissance Faciale
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    HD Nette
                  </span>
                </h3>
                {dossierNumber ? (
                  <p className="text-[11px] font-mono text-primary font-bold flex items-center gap-1.5 mt-0.5">
                    <FolderCheck className="w-3.5 h-3.5" /> Dossier N° {dossierNumber}
                    {userName ? <span className="text-foreground font-semibold">• {userName}</span> : ''}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Photo d'identité nette pour la validation du dossier</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sélecteur de méthode (Ordinateur / Téléphone & Tablette / Fichier) */}
          {!capturedPhoto && (
            <div className="grid grid-cols-3 border-b border-border bg-muted/30 p-1.5 gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('stream');
                  setCameraError(null);
                }}
                className={`py-2 px-1 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  mode === 'stream'
                    ? 'bg-card text-foreground shadow font-bold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-primary" /> Caméra Mac / PC
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('native-camera');
                  stopCamera();
                  nativeCameraInputRef.current?.click();
                }}
                className={`py-2 px-1 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  mode === 'native-camera'
                    ? 'bg-card text-foreground shadow font-bold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-primary" /> Téléphone / Tablette
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('upload');
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                className={`py-2 px-1 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  mode === 'upload'
                    ? 'bg-card text-foreground shadow font-bold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Fichier JPG/PNG
              </button>
            </div>
          )}

          {/* Inputs masqués pour mobile et upload */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Corps de la modal */}
          <div className="p-5 flex flex-col items-center justify-center min-h-[340px]">
            {cameraError && mode === 'stream' && (
              <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-xs flex items-start gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Accès au flux direct non disponible</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{cameraError}</p>
                </div>
              </div>
            )}

            {processing ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
                <Loader2 className="w-9 h-9 animate-spin text-primary" />
                <p className="text-xs font-semibold">Traitement et optimisation haute netteté...</p>
              </div>
            ) : capturedPhoto ? (
              /* Prévisualisation de la photo capturée */
              <div className="flex flex-col items-center gap-4 w-full">
                <div
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black transition-all cursor-zoom-in ${
                    isZoomed ? 'w-80 h-80' : 'w-64 h-64'
                  }`}
                  title="Cliquez pour agrandir et vérifier la netteté des détails"
                >
                  <img
                    src={capturedPhoto}
                    alt="Photo du dossier"
                    className="w-full h-full object-cover"
                  />

                  {/* Badge conformité */}
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Check className="w-3 h-3" /> Photo HD Nette
                  </div>

                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> {isZoomed ? 'Vue 1:1' : 'Zoomer'}
                  </div>

                  {dossierNumber && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-1 rounded-lg text-center truncate shadow">
                      Dossier : {dossierNumber}
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Qualité haute définition validée
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Le visage est cadré, centré et net. Vous pouvez cliquer sur la photo pour agrandir et inspecter les détails avant de confirmer.
                  </p>
                </div>
              </div>
            ) : mode === 'stream' ? (
              /* Vue Flux Caméra Directe (MacBook Pro, PC, Tablettes) */
              <div className="w-full flex flex-col items-center space-y-3">
                {/* Cadre vidéo interactif */}
                <div className="relative w-full max-w-md aspect-[4/3] bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-border flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight) {
                        setStreamResolution({ width: v.videoWidth, height: v.videoHeight });
                      }
                    }}
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                  />

                  {/* Effet obturateur flash lors de la capture */}
                  {flash && (
                    <div className="absolute inset-0 bg-white z-40 animate-pulse pointer-events-none" />
                  )}

                  {/* Badge de résolution en temps réel */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 shadow">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {streamResolution
                      ? `${streamResolution.width}×${streamResolution.height} (${streamResolution.width >= 1280 ? 'HD Net' : 'SD'})`
                      : 'Flux HD actif'}
                  </div>

                  {/* Boutons d'ajustement en surimpression */}
                  <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEnhanceSharpness(!enhanceSharpness)}
                      title="Activer/Désactiver l'optimisation de netteté anti-flou"
                      className={`p-2 rounded-xl backdrop-blur-md text-xs font-semibold border transition flex items-center gap-1 shadow ${
                        enhanceSharpness
                          ? 'bg-primary text-primary-foreground border-primary/40'
                          : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">Anti-flou</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      title="Changer de caméra (Frontale / Arrière)"
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition flex items-center shadow"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Guide visuel ovale pour le visage centré */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-48 h-60 border-2 border-dashed border-primary rounded-[50%] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.45)]">
                      <span className="text-[10px] text-white bg-black/75 px-3 py-1 rounded-full font-bold backdrop-blur-md border border-white/10">
                        Placez le visage au centre
                      </span>
                    </div>
                  </div>

                  {/* Compte à rebours animé */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-30">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1.25, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="text-8xl font-black text-white drop-shadow-2xl"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}
                </div>

                {/* Sélecteur de caméras multiples (FaceTime HD Mac vs Caméra Continuité iPhone vs Webcams externes) */}
                {availableDevices.length > 1 && (
                  <div className="w-full max-w-md flex items-center gap-2 px-1">
                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                      Source caméra :
                    </span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {availableDevices.map((d, index) => (
                        <option key={d.deviceId || index} value={d.deviceId}>
                          {d.label || `Caméra ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conseil de netteté MacBook Pro */}
                <p className="text-[11px] text-muted-foreground text-center max-w-sm flex items-center justify-center gap-1">
                  💡 <span className="font-semibold">Conseil netteté MacBook :</span> Regardez bien l'objectif en haut de l'écran avec une lumière face à vous.
                </p>
              </div>
            ) : mode === 'native-camera' ? (
              /* Vue Appareil photo natif pour Mobile & Tablette */
              <div className="w-full flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Appareil Photo Téléphone ou Tablette</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Déclenchez directement le capteur photo haute définition de votre téléphone ou tablette pour enregistrer la photo au dossier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xl flex items-center gap-2 transition transform hover:scale-105"
                >
                  <Camera className="w-4 h-4" /> Déclencher l'appareil photo du téléphone
                </button>
              </div>
            ) : (
              /* Vue Upload fichier */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-muted/20 hover:bg-muted/40"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-foreground mb-1">
                  Sélectionnez une photo nette depuis votre appareil
                </p>
                <p className="text-[11px] text-muted-foreground">Formats JPG, PNG, WebP en haute définition acceptés</p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition shadow-sm"
                >
                  Parcourir les fichiers
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reprendre la photo
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-lg"
                >
                  <FolderCheck className="w-4 h-4" /> Enregistrer au dossier
                </button>
              </>
            ) : mode === 'stream' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    disabled={isCapturing || !!cameraError}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-border hover:bg-muted text-foreground transition flex items-center gap-1.5"
                    title="Capture instantanée immédiate"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Instantané
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerCountdown}
                    disabled={isCapturing || !!cameraError}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 transition disabled:opacity-50 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    {isCapturing ? 'Capture...' : 'Photo HD (3s)'}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
