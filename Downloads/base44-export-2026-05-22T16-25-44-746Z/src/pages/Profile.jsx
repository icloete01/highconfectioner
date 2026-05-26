const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Package, LogOut, Clock, ChevronRight, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const statusColors = {
  pending_payment: 'bg-yellow-500/20 text-yellow-300',
  payment_submitted: 'bg-blue-500/20 text-blue-300',
  processing: 'bg-primary/20 text-primary',
  ready: 'bg-accent/20 text-accent',
  delivered: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-destructive/20 text-destructive',
};

const statusLabels = {
  pending_payment: 'Pending Payment',
  payment_submitted: 'Voucher Submitted',
  processing: 'Processing',
  ready: 'Ready for Collection',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function Profile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const allOrders = await db.entities.Order.list('-created_date');
      return allOrders || [];
    },
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold">{user?.full_name || 'Member'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Leaf className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold">{user?.role === 'admin' ? 'Admin' : 'Member'}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Order History</h2>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
            <Link to="/shop">
              <Button variant="link" className="text-primary mt-2 text-sm">Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="font-semibold text-sm mt-0.5">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[order.status]}`}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold">R{order.total_amount?.toFixed(2)}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="px-4 pb-24">
        <Button
          variant="ghost"
          onClick={() => db.auth.logout()}
          className="w-full justify-start text-muted-foreground hover:text-destructive gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}