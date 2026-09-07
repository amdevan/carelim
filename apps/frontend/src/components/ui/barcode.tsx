"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function Barcode({
  value,
  width = 1.5,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = "",
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize,
          font: "monospace",
          textMargin: 2,
          margin: 0,
        });
      } catch {
        // Invalid barcode value — render nothing
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
