"use client";

import { useEffect, useState } from "react";

function clientDate(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  return `${parts} (GMT ${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""})`;
}

export function LocalDateTime({ value, fallback }: { value: string; fallback?: string }) {
  const [label, setLabel] = useState(fallback ?? value);
  useEffect(() => setLabel(clientDate(value)), [value]);
  return <time dateTime={value} suppressHydrationWarning>{label}</time>;
}
