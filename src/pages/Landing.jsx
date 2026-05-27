import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Leaf, ArrowRight, ShieldCheck, Lock, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
            <Leaf className="w-10 h-10 text-primary" />
          </div>

          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
            High<br />Confectioner
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto mb-10 leading-relaxed">
            An exclusive members-only club curating premium infused edibles for the discerning palate.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Link to="/login">
              <Button className="w-full h-13 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl gap-2">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="outline"
                className="w-full h-13 text-base font-semibold rounded-xl border-border hover:border-primary/50 hover:bg-primary/5"
              >
                Request Membership
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="px-6 pb-10"
      >
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: ShieldCheck, label: '18+ Only' },
            { icon: Lock, label: 'Private Club' },
            { icon: Star, label: 'Premium' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border"
            >
              <Icon className="w-5 h-5 text-accent" />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}