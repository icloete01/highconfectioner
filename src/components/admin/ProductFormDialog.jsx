import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProductFormDialog({ product, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const [form, setForm] = useState({
    title: product?.title || '',
    short_description: product?.short_description || '',
    description: product?.description || '',
    price: product?.price ?? '',
    category: product?.category || 'gummies',
    dosage: product?.dosage || '',
    strain_type: product?.strain_type || 'hybrid',
    ingredients: product?.ingredients || '',
    dosing_guidelines: product?.dosing_guidelines || '',
    stock_level: product?.stock_level ?? '',
    is_visible: product?.is_visible ?? true,
    is_featured: product?.is_featured ?? false,
    image_url: product?.image_url || '',
  });

  const handleChange = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      handleChange('image_url', file_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        price: Number(form.price),
        stock_level: form.stock_level !== '' ? Number(form.stock_level) : null,
      };
      return isEdit
        ? db.entities.Product.update(product.id, data)
        : db.entities.Product.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save product');
    },
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="z-[60] max-w-md max-h-[85vh] overflow-y-auto bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground">
            {isEdit ? 'Edit Product' : 'New Product'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="bg-secondary border-0 rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Short Description</Label>
            <Input
              value={form.short_description}
              onChange={(e) => handleChange('short_description', e.target.value)}
              className="bg-secondary border-0 rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Full Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="bg-secondary border-0 rounded-xl mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Price (ZAR)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="bg-secondary border-0 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Stock Level</Label>
              <Input
                type="number"
                value={form.stock_level}
                onChange={(e) => handleChange('stock_level', e.target.value)}
                placeholder="∞"
                className="bg-secondary border-0 rounded-xl mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger className="bg-secondary border-0 rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="gummies">Gummies</SelectItem>
                  <SelectItem value="chocolates">Chocolates</SelectItem>
                  <SelectItem value="baked_goods">Baked Goods</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Strain Type</Label>
              <Select value={form.strain_type} onValueChange={(v) => handleChange('strain_type', v)}>
                <SelectTrigger className="bg-secondary border-0 rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="cbd_only">CBD Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Dosage</Label>
            <Input
              value={form.dosage}
              onChange={(e) => handleChange('dosage', e.target.value)}
              placeholder="e.g. 10mg THC"
              className="bg-secondary border-0 rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Ingredients</Label>
            <Textarea
              value={form.ingredients}
              onChange={(e) => handleChange('ingredients', e.target.value)}
              className="bg-secondary border-0 rounded-xl mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs">Dosing Guidelines</Label>
            <Textarea
              value={form.dosing_guidelines}
              onChange={(e) => handleChange('dosing_guidelines', e.target.value)}
              className="bg-secondary border-0 rounded-xl mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs">Product Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="bg-secondary border-0 rounded-xl mt-1"
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover mt-2"
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Visible in Shop</Label>
            <Switch checked={form.is_visible} onCheckedChange={(v) => handleChange('is_visible', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Featured</Label>
            <Switch checked={form.is_featured} onCheckedChange={(v) => handleChange('is_featured', v)} />
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || form.price === ''}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}