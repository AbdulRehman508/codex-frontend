import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';

/** The account details a scan-to-pay QR carries. */
export interface PayableAccount {
  provider: string;
  account_title: string;
  account_number: string;
}

/**
 * Builds QR codes for office payment accounts. The generated code carries the
 * account details as plain text: a phone camera / Google Lens reads it and the
 * customer types the details into their wallet. Wallet-app scanners
 * (Easypaisa, JazzCash, bank apps) only accept Raast/EMVCo payment QRs and
 * report "scan failed" on plain text — for those, upload the provider's own
 * merchant QR on the office, which is printed instead.
 */
@Injectable({ providedIn: 'root' })
export class QrService {
  /**
   * PNG data URL for `text`. Rendered large and with the spec's 4-module quiet
   * zone: a thin margin or an upscaled (blurred) image is the usual reason a
   * printed QR fails to scan. Display it with `image-rendering: pixelated`.
   */
  toDataUrl(text: string): Promise<string> {
    return toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 600,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  /** Text encoded into an account's QR; the bill adds amount + invoice. */
  payload(account: PayableAccount, bill?: { amount: number; invoice: string }): string {
    const lines = [
      account.provider,
      `Title: ${account.account_title}`,
      `Account: ${account.account_number}`,
    ];
    if (bill) {
      lines.push(
        `Amount: ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Invoice: ${bill.invoice}`,
      );
    }
    return lines.join('\n');
  }
}
