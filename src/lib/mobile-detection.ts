"use client";

import { useState, useEffect } from 'react';

export function useMobileDetection() {
    const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);

        // Remove any legacy viewMode toggle override to prevent cross-contamination
        try {
            localStorage.removeItem('chillbill_owner_view_mode');
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

    // Pure device separation:
    // Mobile device -> Mobile companion only
    // Desktop/PC -> Full Desktop POS only
    const isMobile = mounted ? isMobileDevice : false;

    return {
        isMobile,
        isMobileDevice,
        mounted
    };
}
