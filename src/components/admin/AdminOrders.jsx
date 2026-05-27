const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, CheckCircle2, Clock, Eye, EyeOff, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';

const normalizePrice = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

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
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function AdminOrders({ highlightId }) {
  const queryClient = useQueryClient();
  const [revealedOrders, setRevealedOrders] = useState({});
  const highlightRef = useRef(null);

  const toggleReveal = (orderId) =>
    setRevealedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [highlightId]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => db.entities.Order.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Order updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-24">
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        orders.map(order => {
        const isHighlighted = order.id === highlightId;
        const isRevealed = revealedOrders[order.id];
        return (
        <div
          key={order.id}
          ref={isHighlighted ? highlightRef : null}
          className={`bg-card border rounded-xl p-4 transition-all ${
            isHighlighted
              ? 'border-primary ring-2 ring-primary/30'
              : order.payment_method === 'bank_voucher' && order.status === 'payment_submitted'
              ? 'border-accent/50'
              : 'border-border'
          }`}
        >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">{order.customer_name || order.customer_email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Badge className={`text-[10px] ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>

            {/* Items */}
            <div className="space-y-1 mb-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.product_title} × {item.quantity}</span>
                  <span>R{(normalizePrice(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>R{normalizePrice(order.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Voucher Info */}
            {order.payment_method === 'bank_voucher' && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-accent">Bank Voucher</span>
                    <span className="text-xs text-muted-foreground">{order.voucher_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <button onClick={() => toggleReveal(order.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">Code</span>
                    <span className="text-sm font-mono">{isRevealed ? (order.voucher_code || 'N/A') : '••••••••••••'}</span>
                  </div>
                  {order.voucher_pin && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">PIN</span>
                      <span className="text-sm font-mono">{isRevealed ? order.voucher_pin : '••••'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              {order.delivery_method === 'delivery' ? <Truck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {order.delivery_method === 'delivery' ? `Delivery: ${order.delivery_address}` : 'Collection'}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {order.payment_method === 'bank_voucher' && order.status === 'payment_submitted' && (
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: order.id, data: { status: 'processing' } })}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg gap-1 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approve Payment
                </Button>
              )}
              <Select
                value={order.status}
                onValueChange={(val) => updateMutation.mutate({ id: order.id, data: { status: val } })}
              >
                <SelectTrigger className="h-8 text-xs bg-secondary border-0 rounded-lg flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="payment_submitted">Voucher Submitted</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}