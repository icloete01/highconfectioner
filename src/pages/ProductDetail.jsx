const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, ShoppingBag, AlertTriangle, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const strainColors = {
  indica: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sativa: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hybrid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cbd_only: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const strainLabels = {
  indica: 'Indica', sativa: 'Sativa', hybrid: 'Hybrid', cbd_only: 'CBD Only',
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list(),
  });

  const product = products.find(p => p.id === id);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!product) {
        throw new Error('Product not found');
      }
      const cartItems = await db.entities.CartItem.list();
      const existing = cartItems.find(ci => ci.product_id === product.id);
      if (existing) {
        return db.entities.CartItem.update(existing.id, {
          quantity: (existing.quantity || 1) + qty
        });
      }
      return db.entities.CartItem.create({
        product_id: product.id,
        product_title: product.title,
        product_image: product.image_url,
        price: product.price,
        dosage: product.dosage,
        quantity: qty,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add item to cart');
    },
  });

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const normalizedPrice = parseFloat(product.price) || 0;
  const outOfStock = product.stock_level !== undefined && product.stock_level <= 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Image */}
      <div className="relative aspect-square bg-secondary">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-20 h-20 text-muted-foreground/20" />
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-5"
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {product.dosage && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {product.dosage}
            </Badge>
          )}
          {product.strain_type && (
            <Badge className={`text-xs border ${strainColors[product.strain_type]}`}>
              {strainLabels[product.strain_type]}
            </Badge>
          )}
        </div>

        <h1 className="font-serif text-2xl font-bold text-foreground mb-1">{product.title}</h1>
        <p className="text-2xl font-bold text-primary mb-4">R{normalizedPrice.toFixed(2)}</p>

        {product.short_description && (
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">{product.short_description}</p>
        )}

        {product.description && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}

        {product.ingredients && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Ingredients</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.ingredients}</p>
          </div>
        )}

        {product.dosing_guidelines && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-accent">Dosing Guidelines</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.dosing_guidelines}</p>
          </div>
        )}
      </motion.div>

      {/* Sticky Add to Cart */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex items-center bg-secondary rounded-xl">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => addToCartMutation.mutate()}
            disabled={outOfStock || addToCartMutation.isPending}
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-base gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            {outOfStock ? 'Sold Out' : `Add — R${(normalizedPrice * qty).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}