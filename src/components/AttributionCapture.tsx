"use client";

import { useEffect, useRef } from "react";
import { ensureAnonId, track } from "@/lib/track-client";

export function AttributionCapture() {
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    did.current = true;
    ensureAnonId();
    track("page_view");
  }, []);

  return null;
}

