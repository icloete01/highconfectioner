const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, ArrowLeft, CheckCircle2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { appParams } from '@/lib/app-params';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [paymentMethod] = useState('bank_voucher');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPin, setVoucherPin] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [deliveryMethod] = useState('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [hasHydratedSavedAddress, setHasHydratedSavedAddress] = useState(false);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => db.entities.CartItem.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const total = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  useEffect(() => {
    if (!user || hasHydratedSavedAddress) {
      return;
    }

    setDeliveryAddress(user.delivery_address || '');
    setHasHydratedSavedAddress(true);
  }, [user]);

  const persistDeliveryAddress = async (address) => {
    const token = appParams.token || localStorage.getItem('base44_access_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`/api/apps/${appParams.appId}/entities/User/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delivery_address: address }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save delivery address');
    }

    return data;
  };

  const saveAddressMutation = useMutation({
    mutationFn: persistDeliveryAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to save delivery address');
    },
  });

  const handleSaveAddress = async () => {
    const normalizedAddress = deliveryAddress.trim();
    if (!normalizedAddress) return;

    if (normalizedAddress === (user?.delivery_address || '').trim()) {
      return;
    }

    await saveAddressMutation.mutateAsync(normalizedAddress);
  };

  const handleContinueToPayment = async () => {
    const normalizedAddress = deliveryAddress.trim();
    if (!normalizedAddress) {
      toast.error('Please enter a delivery address');
      return;
    }

    try {
      await handleSaveAddress();
      setStep(2);
    } catch (error) {
      toast.error(error?.message || 'Failed to save delivery address');
    }
  };

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const normalizedAddress = deliveryAddress.trim();
      if (!normalizedAddress) {
        throw new Error('Please enter a delivery address');
      }

      await handleSaveAddress();

      const order = await db.entities.Order.create({
        customer_email: user?.email || '',
        customer_name: user?.full_name || '',
        items: cartItems.map((ci) => ({
          product_id: ci.product_id,
          product_title: ci.product_title,
          quantity: ci.quantity || 1,
          price: ci.price,
          dosage: ci.dosage || '',
        })),
        total_amount: total,
        payment_method: paymentMethod,
        voucher_code: paymentMethod === 'bank_voucher' ? voucherCode : '',
        voucher_pin: paymentMethod === 'bank_voucher' ? voucherPin : '',
        voucher_type: paymentMethod === 'bank_voucher' ? voucherType : '',
        status: paymentMethod === 'bank_voucher' ? 'payment_submitted' : 'processing',
        delivery_method: deliveryMethod,
        delivery_address: normalizedAddress,
      });

      for (const item of cartItems) {
        await db.entities.CartItem.delete(item.id);
      }

      return order;
    },
    onSuccess: async (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      try {
        const admins = await db.entities.User.filter({ role: 'admin' });
        const orderUrl = `${window.location.origin}/admin?order=${order.id}`;
        for (const admin of admins) {
          await db.integrations.Core.SendEmail({
            to: admin.email,
            subject: `New Order from ${order.customer_name || order.customer_email} — R${order.total_amount?.toFixed(2)}`,
            body: `A new order has been placed.\n\nCustomer: ${order.customer_name || order.customer_email}\nTotal: R${order.total_amount?.toFixed(2)}\nPayment: Bank Voucher\n\nView and manage this order here:\n${orderUrl}\n\nYou must be logged in as an admin to access the link.`,
          });
        }
      } catch (error) {
        // Ignore email failures.
      }
      setOrderPlaced(true);
    },
  });

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto">
            {paymentMethod === 'bank_voucher'
              ? 'Your voucher is being verified. We\'ll update you once approved.'
              : 'Your order is being prepared. Check your profile for updates.'}
          </p>
          <Button onClick={() => navigate('/shop')} className="rounded-xl bg-primary hover:bg-primary/90">
            Back to Shop
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button onClick={() => step === 1 ? navigate(-1) : setStep(step - 1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-xl font-bold">Checkout</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
        </div>
      </div>

      <div className="px-4">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold">Delivery Method</h2>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Delivery only
                </span>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Delivery</p>
                    <p className="text-xs text-muted-foreground">Collection is hidden for now. Orders will be delivered to the address below.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Delivery Address</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  onBlur={handleSaveAddress}
                  placeholder="Full delivery address"
                  className="mt-1 bg-secondary border-0 rounded-xl"
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold mb-3">Order Summary</h2>
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.product_title} × {item.quantity || 1}</span>
                    <span className="font-medium">R{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">R{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleContinueToPayment}
              disabled={saveAddressMutation.isPending || !deliveryAddress.trim()}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            >
              Continue to Payment
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold mb-1">Payment</h2>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-primary bg-primary/5 mb-4">
                <Banknote className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Bank Voucher / OTC</p>
                  <p className="text-xs text-muted-foreground">eWallet · CashSend · Instant Money</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Voucher Provider</Label>
                  <Select value={voucherType} onValueChange={setVoucherType}>
                    <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fnb_ewallet">FNB eWallet</SelectItem>
                      <SelectItem value="absa_cashsend">ABSA CashSend</SelectItem>
                      <SelectItem value="standard_instant">Standard Bank Instant Money</SelectItem>
                      <SelectItem value="capitec_send">Capitec Send</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Voucher / Reference Code</Label>
                  <Input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value)}
                    placeholder="Enter your voucher code"
                    className="mt-1 bg-secondary border-0 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Voucher PIN</Label>
                  <Input
                    value={voucherPin}
                    onChange={(event) => setVoucherPin(event.target.value)}
                    placeholder="Enter your voucher PIN"
                    type="password"
                    className="mt-1 bg-secondary border-0 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Due</span>
              <span className="text-xl font-bold">R{total.toFixed(2)}</span>
            </div>

            <Button
              onClick={() => placeOrderMutation.mutate()}
              disabled={placeOrderMutation.isPending || !voucherCode || !voucherType || !voucherPin}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-base"
            >
              {placeOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}