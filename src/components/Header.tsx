import { Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from './NotificationCenter';

export function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      
      if (isOutsideMenu && isOutsideButton) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  const handleLogoClick = () => {
    if (user && role) {
      const dashboardPath = role === 'dealer' ? '/dealer' : role === 'sales' ? '/sales' : '/driver';
      navigate(dashboardPath);
    } else {
      navigate('/');
    }
    setMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
        <button onClick={handleLogoClick} className="flex items-center space-x-2 touch-target">
          <img src="/swaprunn-logo-2025.png" alt="SwapRunn" className="h-12 sm:h-16 md:h-20" />
        </button>

        <div className="flex items-center gap-2">
          {user && <NotificationCenter />}
          <button
            ref={buttonRef}
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white hover:text-gray-300 transition p-2 touch-target"
            aria-label="Menu"
          >
            <Menu size={28} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div ref={menuRef} className="absolute top-full right-2 sm:right-4 mt-2 bg-zinc-900 text-white shadow-2xl w-64 rounded-lg border border-zinc-700 z-50 overflow-hidden animate-slide-in">
          <nav className="flex flex-col">
            {!user ? (
              <>
                <button
                  onClick={() => {
                    navigate('/how-it-works');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 font-medium touch-target"
                  data-testid="link-how-it-works"
                >
                  How It Works
                </button>
                <button
                  onClick={() => {
                    navigate('/register-dealer');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 font-medium touch-target"
                >
                  Register Dealership
                </button>
                <button
                  onClick={() => {
                    navigate('/login?type=sales');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 touch-target"
                >
                  Sales Login
                </button>
                <button
                  onClick={() => {
                    navigate('/login?type=driver');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 touch-target"
                >
                  Driver Login
                </button>
                <button
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition text-zinc-400 text-sm touch-target"
                >
                  Dealership Login
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate(role === 'dealer' ? '/dealer' : role === 'sales' ? '/sales' : '/driver');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 font-medium touch-target"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition border-b border-zinc-700/50 touch-target"
                >
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-3.5 hover:bg-zinc-800 active:bg-zinc-700 text-left transition text-red-400 font-medium touch-target"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
