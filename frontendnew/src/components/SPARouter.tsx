"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SPARouter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle SPA routing for GitHub Pages
    // The 404.html redirects routes to index.html with query params
    const path = searchParams.get("/");

    if (path) {
      // Remove the leading slash and decode the path
      const decodedPath = decodeURIComponent(path);

      // Navigate to the correct route
      router.replace(decodedPath + window.location.hash);
    }
  }, [router, searchParams]);

  return null;
}