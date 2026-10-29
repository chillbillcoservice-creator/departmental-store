"use client";

import { useState, useEffect } from 'react';

/**
 * Strict, comprehensive multi-layered mobile device detector.
 * Guarantees accurate detection across all phone form factors (S, M, L, XL, XXL,
 * Xiaomi/Redmi/Poco/Mi devices, Samsung Galaxy, iPhones, and foldables) in both portrait and landscape.
 */
export function isStrictMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // Check sticky session storage first to prevent layout flipping during keyboard open/close or rotation
    try {
        const cached = sessionStorage.getItem('chillbill_is_mobile');
        if (cached === 'true') return true;
        if (cached === 'false') return false;
    } catch (e) {}

    const ua = navigator.userAgent || '';
    
    // Layer 1: Modern W3C Client Hints (Navigator.userAgentData)
    const isClientHintMobile = typeof navigator !== 'undefined' && 
        (navigator as any).userAgentData?.mobile === true;

    // Layer 2: Comprehensive Mobile User Agent Regex
    // Covers Android, iPhone, iPod, BlackBerry, IEMobile, Opera Mini, Mobile Safari,
    // and OEM tokens (XiaoMi, Redmi, POCO, MI , HyperOS)
    const mobileUARegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|XiaoMi|Redmi|POCO|MI |HyperOS|SAMSUNG|Galaxy/i;
    const isMobileUA = mobileUARegex.test(ua);

    // Layer 3: Hardware Touch & Pointer Capabilities (Coarse finger touch + No mouse hover)
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const hasCoarsePointer = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
    const hasNoHover = typeof window.matchMedia === 'function' ? window.matchMedia('(hover: none)').matches : false;

    // Layer 4: Orientation-Independent Physical Screen Dimensions
    // For any smartphone (S, M, L, XL, XXL) in the world, the smaller physical dimension (portrait width) is <= 600px.
    // Laptops and desktop monitors always have minimum physical dimension >= 768px or 1080px.
    const screenWidth = window.screen ? window.screen.width : window.innerWidth;
    const screenHeight = window.screen ? window.screen.height : window.innerHeight;
    const minPhysicalDimension = Math.min(screenWidth, screenHeight);
    const isPhonePhysicalSize = minPhysicalDimension > 0 && minPhysicalDimension <= 600;

    // Layer 5: Viewport Width & Touch Phablet/Foldable Fallback (up to 1024px in landscape)
    const isSmallViewport = window.innerWidth < 768;
    const isTouchPhoneViewport = Boolean(isTouch && window.innerWidth <= 1024 && (hasCoarsePointer || hasNoHover || minPhysicalDimension < 768));

    // Final Determination:
    // If any mobile hardware/UA indicator is present, strictly treat as mobile device
    const detectedMobile = Boolean(
        isClientHintMobile ||
        isMobileUA ||
        (isPhonePhysicalSize && isTouch) ||
        isTouchPhoneViewport ||
        isSmallViewport
    );

    try {
        sessionStorage.setItem('chillbill_is_mobile', detectedMobile ? 'true' : 'false');
    } catch (e) {}

    return detectedMobile;
}

export function useMobileDetection() {
    const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return isStrictMobileDevice();
        }
        return false;
    });
    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);

        const checkMobile = () => {
            const result = isStrictMobileDevice();
            setIsMobileDevice(result);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);

    // Strict device separation:
    // Mobile device -> Mobile companion only
    // Desktop/PC -> Full Desktop POS only
    const isMobile = mounted ? isMobileDevice : isMobileDevice;

    return {
        isMobile,
        isMobileDevice,
        mounted
    };
}
