import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (!verified) setShow(true);
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('age_verified', 'true');
    setShow(false);
  };

  const handleDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Leaf className="w-8 h-8 text-primary" />
            </div>

            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              High Confectioner
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              Premium Cannabis Club · Members Only
            </p>

            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <ShieldCheck className="w-10 h-10 text-accent mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Age Verification Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You must be 18 years or older to access this site. By entering, you confirm that you meet the legal age requirement.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirm}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
              >
                I am 18 or Older — Enter
              </Button>
              <Button
                onClick={handleDeny}
                variant="ghost"
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
              >
                I am under 18 — Leave
              </Button>
            </div>

            <p className="text-xs text-muted-foreground/50 mt-6">
              This site contains content related to cannabis products.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}