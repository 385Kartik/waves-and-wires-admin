import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-fast hover:border-primary/30">
      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden bg-secondary">
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>

      {/* Discount badge */}
      {discount > 0 && (
        <span className="absolute left-3 top-3 rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
          -{discount}%
        </span>
      )}

      {/* Wishlist */}
      <button
        onClick={() => toggleItem(product)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-fast hover:text-destructive"
      >
        <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-destructive text-destructive' : ''}`} />
      </button>

      {/* Info */}
      <div className="p-4">
        <p className="mb-1 text-xs text-muted-foreground">{product.category_name}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="mb-2 text-sm font-semibold text-foreground transition-fast group-hover:text-primary line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="mb-2 flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          <span className="text-xs text-muted-foreground">{product.rating} ({product.review_count})</span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">₹{product.price.toLocaleString()}</span>
            {product.compare_at_price && (
              <span className="text-xs text-muted-foreground line-through">₹{product.compare_at_price.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={() => addItem(product)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-fast hover:bg-primary/90"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
