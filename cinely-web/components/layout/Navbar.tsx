'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { useScrollAware } from '../../hooks/useScrollAware';
import { useAuth } from '../../hooks/useAuth';

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'CN';
}

export function Navbar() {
  const isScrolled = useScrollAware(20);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.navbar} data-scrolled={isScrolled}>
      <div className={styles.leftSection}>
        <Link href="/" className={styles.brandLogo} aria-label="Cinely Home">
          <span>CINE<span className={styles.brandAccent}>LY</span></span>
        </Link>
        <nav aria-label="Primary Navigation">
          <ul className={styles.navLinks}>
            <li>
              <Link href="/" className={styles.navLink} data-active="true">
                Home
              </Link>
            </li>
            <li>
              <Link href="/?kind=movie" className={styles.navLink}>
                Movies
              </Link>
            </li>
            <li>
              <Link href="/?kind=series" className={styles.navLink}>
                Series
              </Link>
            </li>
            <li>
              <Link href="/settings/addons" className={styles.navLink}>
                Addons
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className={styles.rightSection}>
        <Link
          href="/search"
          className={styles.searchButton}
          aria-label="Search catalog"
          title="Search catalog"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>

        {isLoading ? (
          <div className={styles.profileAvatar} aria-hidden="true">
            <span>···</span>
          </div>
        ) : isAuthenticated && user ? (
          <div className={styles.profileWrapper} ref={menuRef}>
            <button
              type="button"
              className={styles.profileAvatar}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="User Profile Menu"
              title={user.displayName || user.email}
            >
              <span>{getInitials(user.displayName, user.email)}</span>
            </button>

            {isMenuOpen && (
              <div className={styles.userMenu} role="menu">
                <div className={styles.userMenuHeader}>
                  <span className={styles.userName}>{user.displayName}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <Link
                  href="/library/watchlist"
                  className={styles.userMenuItem}
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  My Watchlist
                </Link>
                <Link
                  href="/settings/addons"
                  className={styles.userMenuItem}
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Addon Settings
                </Link>
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={async () => {
                    setIsMenuOpen(false);
                    await logout();
                  }}
                  role="menuitem"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

