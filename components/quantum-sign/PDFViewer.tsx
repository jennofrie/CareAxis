'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface PDFViewerProps {
  url: string;
  onPageChange?: (page: number, totalPages: number) => void;
  interactive?: boolean;
  onPageClick?: (position: { x: number; y: number; page: number }) => void;
  signaturePosition?: SignaturePosition | null;
  signatureDataUrl?: string | null;
}

export function PDFViewer({
  url,
  onPageChange,
  interactive = false,
  onPageClick,
  signaturePosition,
  signatureDataUrl,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) setError("Failed to load PDF");
        console.error("PDF load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let isCancelled = false;

    async function renderPage() {
      const page = await pdf!.getPage(currentPage);
      const canvas = canvasRef.current!;
      const context = canvas.getContext("2d")!;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // pdfjs-dist v5 requires `canvas` in RenderParameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: context, viewport, canvas } as any).promise;

      if (
        signaturePosition &&
        signaturePosition.page === currentPage - 1 &&
        signatureDataUrl
      ) {
        const img = new Image();
        img.onload = () => {
          if (!isCancelled) {
            context.drawImage(
              img,
              signaturePosition.x * scale,
              signaturePosition.y * scale,
              signaturePosition.width * scale,
              signaturePosition.height * scale
            );
          }
        };
        img.src = signatureDataUrl;
      }

      onPageChange?.(currentPage, totalPages);
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdf, currentPage, totalPages, onPageChange, scale, signaturePosition, signatureDataUrl]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive || !onPageClick || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      onPageClick({
        x,
        y,
        page: currentPage - 1,
      });
    },
    [interactive, onPageClick, currentPage, scale]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            disabled={scale >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        {interactive && (
          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
            Click on the document to place your signature
          </span>
        )}
      </div>
      <div className="overflow-auto max-h-[600px] border border-border rounded-lg bg-muted/20">
        <canvas
          ref={canvasRef}
          className={`mx-auto ${interactive ? "cursor-crosshair" : ""}`}
          onClick={handleCanvasClick}
        />
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
