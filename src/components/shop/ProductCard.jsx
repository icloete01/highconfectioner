import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

const strainColors = {
  indica: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sativa: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hybrid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cbd_only: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const strainLabels = {
  indica: 'Indica',
  sativa: 'Sativa',
  hybrid: 'Hybrid',
  cbd_only: 'CBD Only',
};

export default function ProductCard({ product, index = 0 }) {
  const queryClient = useQueryClient();
  const numericPrice = Number(product.price);
  const formattedPrice = Number.isFinite(numericPrice)
    ? `R${numericPrice.toFixed(2)}`
    : 'R0.00';

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => db.entities.CartItem.list(),
  });

  const currentQuantity = cartItems.find((item) => item.product_id === product.id)?.quantity || 0;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const existing = cartItems.find((item) => item.product_id === product.id);

      if (existing) {
        return db.entities.CartItem.update(existing.id, {
          quantity: (existing.quantity || 1) + 1,
        });
      }

      return db.entities.CartItem.create({
        product_id: product.id,
        product_title: product.title,
        product_image: product.image_url,
        price: product.price,
        dosage: product.dosage,
        quantity: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add to cart');
    },
  });

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (product.stock_level !== undefined && product.stock_level <= 0) {
      return;
    }

    addToCartMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Link to={`/product/${product.id}`} className="block group">
        <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="aspect-square relative overflow-hidden bg-secondary">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <span className="text-4xl">🌿</span>
              </div>
            )}
            {product.stock_level !== undefined && product.stock_level <= 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-sm font-semibold text-white/80">Sold Out</span>
              </div>
            )}
            {product.is_featured && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-accent text-accent-foreground border-0 text-[10px] font-bold px-2 py-0.5">
                  FEATURED
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                {product.title}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              {product.dosage && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary font-medium">
                  {product.dosage}
                </Badge>
              )}
              {product.strain_type && (
                <Badge className={`text-[10px] px-1.5 py-0 border font-medium ${strainColors[product.strain_type]}`}>
                  {strainLabels[product.strain_type]}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold text-foreground">
                {formattedPrice}
              </p>
              <div className="flex items-center gap-1.5">
                {currentQuantity > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {currentQuantity}
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-lg gap-1.5"
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || (product.stock_level !== undefined && product.stock_level <= 0)}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}