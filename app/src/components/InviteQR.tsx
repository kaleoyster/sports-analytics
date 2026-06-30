"use client";

import { QRCodeSVG } from "qrcode.react";

interface InviteQRProps {
  url: string;
  size?: number;
}

export default function InviteQR({ url, size = 160 }: InviteQRProps) {
  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          marginSize={0}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
      <p className="text-center text-xs text-text-muted">
        Scan to join — code is filled in automatically
      </p>
    </div>
  );
}
