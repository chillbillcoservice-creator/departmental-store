"use client";

import { useState, useEffect } from 'react';

export type OwnerViewMode = 'auto' | 'mobile' | 'desktop';

export function useMobileDetection() {
    const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
    const [viewMode, setViewModeState] = useState<OwnerViewMode>('auto');
    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
        // Load manual preference if stored
        try {
            const saved = localStorage.getItem('chillbill_owner_view_mode') as OwnerViewMode;
            if (saved === 'mobile' || saved === 'desktop' || saved === 'auto') {
                setViewModeState(saved);
            }
        } catch (e) {}

        const checkMobile = () => {
            const isSmallScreen = window.innerWidth < 768;
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobileDevice(isSmallScreen || (isTouch && isSmallScreen) || (isMobileUA && isSmallScreen));
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const setViewMode = (mode: OwnerViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem('chillbill_owner_view_mode', mode);
        } catch (e) {}
    };

    // Determine effective display mode:
    // If user explicitly forced 'mobile' -> true
    // If user explicitly forced 'desktop' -> false
    // If 'auto' -> depends on isMobileDevice
    const isMobile = mounted
        ? (viewMode === 'mobile' ? true : viewMode === 'desktop' ? false : isMobileDevice)
        : false;

    return {
        isMobile,
        viewMode,
        setViewMode,
        isMobileDevice,
        mounted
    };
}
