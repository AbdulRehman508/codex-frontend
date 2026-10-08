import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  /** bar width in px; 2 prints cleanly on a 203 dpi label printer */
  width?: number;
  height?: number;
  /** print the number under the bars */
  showText?: boolean;
  fontSize?: number;
}

/**
 * Renders shelf-label barcodes. CODE128 takes any SKU, letters included, so
 * a shop that never bought EAN numbers can still print scannable labels.
 */
@Injectable({ providedIn: 'root' })
export class BarcodeService {
  /**
   * A barcode as a PNG data URL, or null when the value cannot be encoded
   * (empty SKU, stray characters) — the label then prints without one
   * rather than breaking the whole sheet.
   */
  toDataUrl(value: string, options: BarcodeOptions = {}): string | null {
    const text = (value ?? '').trim();
    if (!text) return null;

    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: options.width ?? 2,
        height: options.height ?? 46,
        displayValue: options.showText ?? true,
        fontSize: options.fontSize ?? 13,
        textMargin: 2,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }
}
