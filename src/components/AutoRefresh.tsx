"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh({ every = 2500 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
