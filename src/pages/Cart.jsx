const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart() {
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => db.entities.CartItem.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.CartItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CartItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-semibold mb-2">Failed to Load Cart</h2>
          <p className="text-sm text-muted-foreground mb-4">{error?.message || 'Please try again'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-serif text-xl font-bold">Your Cart</h1>
        <p className="text-sm text-muted-foreground">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-6">Browse our premium selection</p>
          <Link to="/shop">
            <Button className="rounded-xl bg-primary hover:bg-primary/90 gap-2">
              Browse Menu <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-3">
            <AnimatePresence>
              {cartItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-card border border-border rounded-xl p-3 flex gap-3"
                >
                  <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{item.product_title}</h3>
                    {item.dosage && (
                      <span className="text-xs text-primary">{item.dosage}</span>
                    )}
                    <p className="text-sm font-bold mt-1">R{(item.price * (item.quantity || 1)).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg">
                      <button
                        onClick={() => {
                          if ((item.quantity || 1) <= 1) {
                            deleteMutation.mutate(item.id);
                          } else {
                            updateMutation.mutate({ id: item.id, data: { quantity: (item.quantity || 1) - 1 } });
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">{item.quantity || 1}</span>
                      <button
                        onClick={() => updateMutation.mutate({ id: item.id, data: { quantity: (item.quantity || 1) + 1 } })}
                        className="w-7 h-7 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Checkout Footer */}
          <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold">R{total.toFixed(2)}</span>
              </div>
              <Link to="/checkout">
                <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-base gap-2">
                  Checkout <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}