const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Link, useLocation } from 'react-router-dom';
import { Store, ShoppingBag, User, LayoutDashboard } from 'lucide-react';
// High Confectioner

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const location = useLocation();

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => db.entities.CartItem.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isAdmin = user?.role === 'admin';

  const tabs = [
    { path: '/shop', icon: Store, label: 'Shop' },
    { path: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  if (isAdmin) {
    tabs.push({ path: '/admin', icon: LayoutDashboard, label: 'Admin' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, icon: Icon, label, badge }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                {badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {badge}
                  </motion.span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}