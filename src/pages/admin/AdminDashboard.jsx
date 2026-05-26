import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingBag, Leaf, Users } from 'lucide-react';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminUsers from '@/components/admin/AdminUsers';

export default function AdminDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const highlightOrderId = urlParams.get('order') || null;
  const [tab, setTab] = useState(highlightOrderId ? 'orders' : 'orders');

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5 text-primary" />
          <h1 className="font-serif text-xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-xs text-muted-foreground">High Confectioner</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full bg-secondary rounded-none border-b border-border h-12">
          <TabsTrigger value="orders" className="flex-1 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <ShoppingBag className="w-4 h-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0">
          <AdminOrders highlightId={highlightOrderId} />
        </TabsContent>
        <TabsContent value="products" className="mt-0">
          <AdminProducts />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <AdminUsers />
        </TabsContent>
      </Tabs>
    </div>
  );
}