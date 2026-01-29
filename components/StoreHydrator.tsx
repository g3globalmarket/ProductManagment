"use client"

import { useEffect } from "react"
import { useProductStore } from "@/lib/store"

/**
 * Client-only component that manually rehydrates Zustand persist store.
 * This prevents hydration mismatches by ensuring store is only hydrated on client.
 * 
 * Mount this component in the root layout to hydrate the store once on client mount.
 */
export function StoreHydrator() {
  const setHasHydrated = useProductStore((state) => state.setHasHydrated)
  const hasHydrated = useProductStore((state) => state.hasHydrated)

  useEffect(() => {
    // Only hydrate once
    if (hasHydrated) return

    // Manually rehydrate the store from localStorage
    // Zustand persist rehydrates synchronously
    useProductStore.persist.rehydrate()
    
    // Set hydrated flag after rehydration completes
    // Use requestAnimationFrame to ensure state updates are processed
    requestAnimationFrame(() => {
      setHasHydrated(true)
    })
  }, [hasHydrated, setHasHydrated])

  // This component doesn't render anything
  return null
}

