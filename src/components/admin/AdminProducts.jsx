const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import ProductFormDialog from './ProductFormDialog';

const normalizePrice = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.entities.Product.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, visible }) => db.entities.Product.update(id, { is_visible: visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <Button
          size="sm"
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="rounded-lg bg-primary hover:bg-primary/90 gap-1"
        >
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(product => (
            <div key={product.id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
              <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold truncate">{product.title}</h3>
                    <p className="text-xs text-muted-foreground">R{normalizePrice(product.price).toFixed(2)} · Stock: {product.stock_level ?? '∞'}</p>
                  </div>
                  {!product.is_visible && (
                    <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">Hidden</Badge>
                  )}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditProduct(product); setShowForm(true); }}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleMutation.mutate({ id: product.id, visible: !product.is_visible })}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {product.is_visible !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {product.is_visible !== false ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(product.id)}
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProductFormDialog
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}