import { motion } from 'framer-motion';

const categories = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'gummies', label: 'Gummies', emoji: '🍬' },
  { key: 'chocolates', label: 'Chocolates', emoji: '🍫' },
  { key: 'baked_goods', label: 'Baked Goods', emoji: '🧁' },
  { key: 'beverages', label: 'Drinks', emoji: '🥤' },
];

export default function CategoryFilter({ active, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
      {categories.map(({ key, label, emoji }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground bg-secondary hover:text-foreground'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="categoryBg"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{emoji}</span>
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}