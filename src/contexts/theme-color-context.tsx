'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeColor = {
    name: string;
    value: string; // HSL value without 'hsl(' and ')'
    class: string; // Tailwind class for background (for the swatch UI)
};

export const themeColors: ThemeColor[] = [
    { name: 'Orange', value: '25 80% 55%', class: 'bg-orange-500' },
    { name: 'Blue', value: '221 83% 53%', class: 'bg-blue-500' },
    { name: 'Green', value: '142 76% 36%', class: 'bg-green-600' },
    { name: 'Red', value: '0 84% 60%', class: 'bg-red-500' },
    { name: 'Violet', value: '262 83% 58%', class: 'bg-violet-500' },
    { name: 'Pink', value: '316 73% 52%', class: 'bg-pink-500' },
    { name: 'Indigo', value: '243 75% 59%', class: 'bg-indigo-500' },
];

interface ThemeColorContextType {
    themeColor: string;
    setThemeColor: (color: string) => void;
    availableColors: ThemeColor[];
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    // Default to Orange
    const [themeColor, setThemeColorState] = useState<string>('25 80% 55%');

    useEffect(() => {
        // Load from local storage
        const savedColor = localStorage.getItem('theme-color');
        if (savedColor) {
            setThemeColorState(savedColor);
        }
    }, []);

    const setThemeColor = (color: string) => {
        setThemeColorState(color);
        localStorage.setItem('theme-color', color);
    };

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary', themeColor);
        // You might also want to update ring color or others that use primary
        root.style.setProperty('--ring', themeColor);
        // Note: chart-1 usually matches primary in the globals.css I saw
        root.style.setProperty('--chart-1', themeColor);
    }, [themeColor]);

    return (
        <ThemeColorContext.Provider value={{ themeColor, setThemeColor, availableColors: themeColors }}>
            {children}
        </ThemeColorContext.Provider>
    );
}

export function useThemeColor() {
    const context = useContext(ThemeColorContext);
    if (context === undefined) {
        throw new Error('useThemeColor must be used within a ThemeColorProvider');
    }
    return context;
}
