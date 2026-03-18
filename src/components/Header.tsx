import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Heart, Menu, X, Package } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Order Tracking', path: '/order-tracking' },
  { label: 'Contact', path: '/contact' },
  { label: 'Wishlist', path: '/wishlist' },
];

export default function Header() {
  const { itemCount, setIsOpen } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top bar */}
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-extrabold text-primary-foreground">W&W</span>
          </div>
          <span className="hidden sm:inline">Waves & Wires</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-fast ${
                location.pathname === link.path
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/wishlist"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground"
          >
            <Heart className="h-5 w-5" />
          </Link>

          <Link
            to={user ? '/account' : '/auth'}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground"
          >
            <User className="h-5 w-5" />
          </Link>

          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-border bg-background px-4 py-3 animate-fade-in">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
              }
            }}
            className="container flex gap-2"
          >
            <input
              type="text"
              placeholder="Search your favorite product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 rounded-md border border-input bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-fast hover:bg-primary/90"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-background p-4 animate-fade-in md:hidden">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-4 py-3 text-sm font-medium transition-fast ${
                location.pathname === link.path
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
