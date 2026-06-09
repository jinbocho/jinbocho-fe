import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

import { normalizeIsbn } from "@/features/records/isbn";

interface IsbnScannerProps {
  onDetected: (isbn: string) => void;
  // Rendered when the camera is unavailable (denied / no device / insecure context).
  onUnavailable?: () => void;
}

type ScanError = "denied" | "no-camera" | "insecure" | "unknown";

const MESSAGES: Record<ScanError, string> = {
  denied: "Camera access was blocked. Allow it in your browser settings, or type the ISBN instead.",
  "no-camera": "No camera found on this device. Type the ISBN instead.",
  insecure: "Camera scanning needs a secure (HTTPS) connection. Type the ISBN instead.",
  unknown: "Couldn't start the camera. Type the ISBN instead.",
};

export function IsbnScanner({ onDetected, onUnavailable }: IsbnScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<ScanError | null>(null);

  useEffect(() => {
    // getUserMedia is only available in secure contexts.
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setError("insecure");
      onUnavailable?.();
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let done = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, ctrl) => {
          controls ??= ctrl;
          if (result && !done) {
            done = true;
            ctrl.stop();
            onDetected(normalizeIsbn(result.getText()));
          }
        },
      )
      .then((ctrl) => {
        controls = ctrl;
      })
      .catch((e: unknown) => {
        const name = e instanceof Error ? e.name : "";
        const kind: ScanError =
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "no-camera"
              : "unknown";
        setError(kind);
        onUnavailable?.();
      });

    return () => {
      done = true;
      controls?.stop();
    };
  }, [onDetected, onUnavailable]);

  if (error) {
    return (
      <div className="rounded-md border border-line bg-paper p-4 text-sm text-ink-soft">
        {MESSAGES[error]}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md bg-ink">
      <video
        ref={videoRef}
        className="aspect-[4/3] w-full object-cover"
        aria-label="ISBN barcode scanner viewfinder"
        muted
        playsInline
      />
    </div>
  );
}
