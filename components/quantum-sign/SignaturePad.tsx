'use client';

import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/Button";
import { Eraser } from "lucide-react";

export interface SignaturePadRef {
  toDataURL: () => string | undefined;
  isEmpty: () => boolean;
  clear: () => void;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad({ width = 500, height = 200 }, ref) {
    const sigRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      toDataURL: () => sigRef.current?.toDataURL('image/png'),
      isEmpty: () => sigRef.current?.isEmpty() ?? true,
      clear: () => sigRef.current?.clear(),
    }));

    return (
      <div className="space-y-2">
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{
              width,
              height,
              className: "w-full",
              style: { width: '100%', height: `${height}px` },
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => sigRef.current?.clear()}
            className="text-muted-foreground"
          >
            <Eraser className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  }
);
