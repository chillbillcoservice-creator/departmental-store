"use client";

import { useState, useEffect, useRef } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { cn } from "@/lib/utils";

interface OwnerAuthScreenProps {
  onAuthSuccess: (user: User, venueId: string, isNewUser: boolean) => void;
  onAccessDenied: (email: string) => void;
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4.2 2.4-7.3L2 9.4h7.6z" />
    </svg>
  );
}

export default function OwnerAuthScreen({ onAuthSuccess, onAccessDenied }: OwnerAuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringSignIn, setIsHoveringSignIn] = useState(false);
  const [isHoveringSignUp, setIsHoveringSignUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { auth, firestore } = initializeFirebase();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result) {
        const user = result.user;
        const email = (user.email ?? "").toLowerCase();
        const whitelistSnap = await getDoc(doc(firestore, "whitelist", email));
        if (!whitelistSnap.exists()) {
          onAccessDenied(user.email ?? email);
          setIsLoading(false);
          return;
        }
        const venueSnap = await getDoc(doc(firestore, "venues", user.uid));
        onAuthSuccess(user, user.uid, !venueSnap.exists());
      }
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      let userMsg = "Sign-in failed. Please try again.";
      if (err?.code === 'auth/operation-not-allowed') {
        userMsg = "Google Sign-In is not enabled in Firebase Console. Please enable Google under Authentication -> Sign-in method.";
      } else if (err?.code === 'auth/unauthorized-domain') {
        userMsg = "This domain is not in Firebase's authorized domains list. Please add it in Firebase Console -> Authentication -> Settings.";
      } else if (err?.code === 'auth/popup-closed-by-user') {
        userMsg = "Google sign-in popup was closed before completing.";
      } else if (err?.message?.includes('database (default) does not exist')) {
        userMsg = "Cloud Firestore Database has not been created yet in Firebase Console. Please create it under Firestore Database.";
      } else if (err?.message) {
        userMsg = err.message;
      }
      setError(userMsg);
      setIsLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="auth-root"
    >
      {/* ── Animated grain overlay ── */}
      <div className="grain-overlay" />

      {/* ── Dynamic cursor light ── */}
      <div
        className="cursor-light"
        style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
      />

      {/* ── Background blobs ── */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* ── Cinematic horizontal lines ── */}
      <div className="scanline scanline-top" />
      <div className="scanline scanline-bottom" />

      {/* ══════════ PAGE ══════════ */}
      <div className="page-grid">

        {/* ════════ LEFT SIDE ════════ */}
        <div className="left-panel">
          {/* Top nav bar */}
          <div className="top-nav">
            <div className="brand-logo">
              <span className="logo-chill">CHILL</span>
              <span className="logo-bill">BILL</span>
            </div>
            <div className="nav-badge">
              <SparkleIcon />
              <span>Retail & Store POS</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="hero-copy">
            <div className="eyebrow-label">
              <span className="eyebrow-dot" />
              Built for modern retail
            </div>

            <h1 className="hero-headline">
              <span className="headline-line">Fast billing.</span>
              <span className="headline-line accent-line">Flawless</span>
              <span className="headline-line">inventory.</span>
            </h1>

            <p className="hero-subtext">
              The command centre your store deserves.
              Lightning-fast barcode billing, live stock tracking, customer khata, and staff management —
              all from one elegant interface.
            </p>

            {/* Feature pills */}
            <div className="feature-pills">
              {["Fast Barcode Scan", "Stock & Reorder Alerts", "Customer Khata", "Staff PIN Control"].map((feat) => (
                <span key={feat} className="pill">{feat}</span>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="stats-bar">
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "< 1s", label: "Sync Speed" },
              { value: "∞", label: "Orders" },
            ].map(({ value, label }) => (
              <div key={label} className="stat-item">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════ RIGHT SIDE ════════ */}
        <div className="right-panel">
          <div className="auth-card">
            {/* Card shimmer top edge */}
            <div className="card-shimmer" />

            <div className="card-header">
              <p className="card-eyebrow">Welcome back</p>
              <h2 className="card-title">Get started</h2>
              <p className="card-subtitle">
                Sign in to your store dashboard or create a new store account.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="cta-stack">

              {/* Sign Up */}
              <button
                className={cn("cta-btn cta-signup", isHoveringSignUp && "cta-btn--hover")}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                onMouseEnter={() => setIsHoveringSignUp(true)}
                onMouseLeave={() => setIsHoveringSignUp(false)}
                aria-label="Create new store account"
              >
                <span className="cta-bg-flash" />
                <span className="cta-inner">
                  {isLoading ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <span className="cta-icon-wrap signup-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </span>
                      <span className="cta-text-wrap">
                        <span className="cta-label">New Business</span>
                        <span className="cta-desc">Create your store account</span>
                      </span>
                      <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Sign In */}
              <button
                className={cn("cta-btn cta-signin", isHoveringSignIn && "cta-btn--hover")}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                onMouseEnter={() => setIsHoveringSignIn(true)}
                onMouseLeave={() => setIsHoveringSignIn(false)}
                aria-label="Sign in to existing store"
              >
                <span className="cta-inner">
                  {isLoading ? (
                    <span className="spinner spinner--dark" />
                  ) : (
                    <>
                      <span className="cta-icon-wrap signin-icon">
                        <GoogleIcon />
                      </span>
                      <span className="cta-text-wrap">
                        <span className="cta-label signin-label">Returning Owner</span>
                        <span className="cta-desc signin-desc">Sign in with Google</span>
                      </span>
                      <svg className="cta-arrow signin-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="card-divider">
              <span className="divider-line" />
              <span className="divider-text">or</span>
              <span className="divider-line" />
            </div>

            {/* Staff login */}
            <button className="staff-btn" aria-label="Staff login">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Staff Login
            </button>

            {/* Error */}
            {error && (
              <div className="error-msg" role="alert">{error}</div>
            )}

            {/* Fine print */}
            <p className="fine-print">
              Secure · Encrypted · Multi-venue ready
            </p>
          </div>
        </div>

      </div>

      {/* ══════════ STYLES ══════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ─── Root ─── */
        .auth-root {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #080706;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          color: #fff;
        }

        /* ─── Grain ─── */
        .grain-overlay {
          position: fixed;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.35;
        }

        /* ─── Scanlines ─── */
        .scanline {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,160,80,0.15), transparent);
          z-index: 2;
          pointer-events: none;
        }
        .scanline-top { top: 0; }
        .scanline-bottom { bottom: 0; }

        /* ─── Cursor light ─── */
        .cursor-light {
          position: absolute;
          width: 600px;
          height: 600px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(212,140,60,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 2;
          transition: left 0.15s ease, top 0.15s ease;
        }

        /* ─── Blobs ─── */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          animation: blobDrift 20s infinite alternate ease-in-out;
        }
        .blob-1 {
          width: 55vw; height: 55vw;
          top: -20%; left: -15%;
          background: radial-gradient(circle, rgba(200,120,30,0.18), rgba(180,80,20,0.08));
          animation-delay: 0s;
        }
        .blob-2 {
          width: 45vw; height: 45vw;
          bottom: -20%; right: -10%;
          background: radial-gradient(circle, rgba(160,80,20,0.15), rgba(100,40,10,0.05));
          animation-delay: -7s;
        }
        .blob-3 {
          width: 30vw; height: 30vw;
          top: 30%; left: 35%;
          background: radial-gradient(circle, rgba(230,180,60,0.08), transparent);
          animation-delay: -4s;
        }
        @keyframes blobDrift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, -60px) scale(1.08); }
          66%  { transform: translate(-30px, 30px) scale(0.95); }
          100% { transform: translate(10px, -20px) scale(1.03); }
        }

        /* ─── Page grid ─── */
        .page-grid {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        /* ══════════ LEFT PANEL ══════════ */
        .left-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 4rem;
          position: relative;
        }
        .left-panel::after {
          content: '';
          position: absolute;
          top: 10%; right: 0; bottom: 10%;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(212,160,80,0.2) 30%, rgba(212,160,80,0.2) 70%, transparent);
        }

        /* ─── Nav ─── */
        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand-logo {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          letter-spacing: -0.02em;
        }
        .logo-chill {
          background: linear-gradient(135deg, #f5a623, #e8730a, #c8501a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .logo-bill { color: #fff; }
        .nav-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.85rem;
          background: rgba(212,160,80,0.1);
          border: 1px solid rgba(212,160,80,0.2);
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #d4a050;
          text-transform: uppercase;
        }

        /* ─── Hero copy ─── */
        .hero-copy {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2rem;
          padding: 3rem 0;
        }
        .eyebrow-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(212, 160, 80, 0.8);
        }
        .eyebrow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #d4a050;
          box-shadow: 0 0 8px rgba(212,160,80,0.8);
          animation: pulse 2.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }

        .hero-headline {
          display: flex;
          flex-direction: column;
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 900;
          font-size: clamp(3rem, 5.5vw, 5.5rem);
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .headline-line { display: block; color: #f0ead8; }
        .accent-line {
          font-style: italic;
          background: linear-gradient(135deg, #f5a623 0%, #e85a10 50%, #c84010 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtext {
          max-width: 38ch;
          font-size: 1rem;
          line-height: 1.75;
          color: rgba(240,234,216,0.5);
          margin: 0;
          font-weight: 400;
        }

        .feature-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .pill {
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(240,234,216,0.65);
          letter-spacing: 0.03em;
          transition: all 0.2s;
        }
        .pill:hover {
          background: rgba(212,160,80,0.12);
          border-color: rgba(212,160,80,0.3);
          color: #d4a050;
        }

        /* ─── Stats bar ─── */
        .stats-bar {
          display: flex;
          gap: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .stat-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f0ead8;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 0.68rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(240,234,216,0.35);
        }

        /* ══════════ RIGHT PANEL ══════════ */
        .right-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 4rem;
        }

        /* ─── Auth card ─── */
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: rgba(15,12,8,0.7);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2rem;
          padding: 2.5rem;
          box-shadow:
            0 0 0 1px rgba(212,160,80,0.06) inset,
            0 40px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(180,100,20,0.04);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .card-shimmer {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,160,80,0.4), transparent);
        }

        .card-header { display: flex; flex-direction: column; gap: 0.5rem; }
        .card-eyebrow {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #d4a050;
        }
        .card-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2.1rem;
          font-weight: 700;
          color: #f0ead8;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .card-subtitle {
          font-size: 0.84rem;
          color: rgba(240,234,216,0.45);
          line-height: 1.6;
          margin: 0;
        }

        /* ─── CTA buttons ─── */
        .cta-stack { display: flex; flex-direction: column; gap: 0.85rem; }

        .cta-btn {
          position: relative;
          width: 100%;
          padding: 0;
          border: none;
          border-radius: 1.1rem;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .cta-btn:hover   { transform: translateY(-2px); }
        .cta-btn:active  { transform: translateY(0); }
        .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Sign Up */
        .cta-signup {
          background: linear-gradient(135deg, #e87020 0%, #c8401a 60%, #a83010 100%);
          box-shadow: 0 8px 30px rgba(200,80,30,0.3), 0 2px 6px rgba(200,80,30,0.2);
        }
        .cta-signup:hover {
          box-shadow: 0 12px 40px rgba(200,80,30,0.45), 0 4px 12px rgba(200,80,30,0.3);
        }
        .cta-bg-flash {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .cta-signup:hover .cta-bg-flash { opacity: 1; }

        /* Sign In */
        .cta-signin {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: none;
        }
        .cta-signin:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(212,160,80,0.3);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .cta-inner {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.95rem 1.25rem;
          position: relative;
          z-index: 1;
        }

        .cta-icon-wrap {
          width: 38px; height: 38px;
          border-radius: 0.65rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .signup-icon {
          background: rgba(0,0,0,0.2);
          color: #fff;
        }
        .signin-icon {
          background: rgba(255,255,255,0.08);
        }

        .cta-text-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          text-align: left;
          flex: 1;
        }
        .cta-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.01em;
        }
        .cta-desc {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.6);
          font-weight: 400;
        }
        .signin-label  { color: rgba(240,234,216,0.9); }
        .signin-desc   { color: rgba(240,234,216,0.45); }

        .cta-arrow {
          color: rgba(255,255,255,0.5);
          flex-shrink: 0;
          transition: transform 0.2s, color 0.2s;
        }
        .cta-signup:hover .cta-arrow { color: #fff; transform: translateX(3px); }
        .signin-arrow { color: rgba(212,160,80,0.5); }
        .cta-signin:hover .signin-arrow { color: #d4a050; transform: translateX(3px); }

        /* ─── Divider ─── */
        .card-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .divider-text {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }

        /* ─── Staff btn ─── */
        .staff-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.8rem 1.25rem;
          border-radius: 0.9rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,234,216,0.45);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .staff-btn:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.14);
          color: rgba(240,234,216,0.7);
        }

        /* ─── Error ─── */
        .error-msg {
          padding: 0.7rem 1rem;
          border-radius: 0.75rem;
          background: rgba(220,50,40,0.1);
          border: 1px solid rgba(220,50,40,0.2);
          color: #f87171;
          font-size: 0.82rem;
          font-weight: 500;
          text-align: center;
        }

        /* ─── Fine print ─── */
        .fine-print {
          text-align: center;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.06em;
          font-weight: 500;
          margin: 0;
        }

        /* ─── Spinner ─── */
        .spinner {
          display: inline-block;
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .spinner--dark {
          border-top-color: rgba(240,234,216,0.9);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
          .page-grid {
            grid-template-columns: 1fr;
          }
          .left-panel {
            padding: 2rem 1.75rem 1.5rem;
            gap: 2rem;
          }
          .left-panel::after { display: none; }
          .hero-headline { font-size: 3rem; }
          .stats-bar { gap: 1.5rem; }
          .right-panel { padding: 1.5rem 1.75rem 3rem; }
          .auth-card { padding: 2rem 1.75rem; }
        }
      `}</style>
    </div>
  );
}
