import React from 'react';
import { Menu } from 'lucide-react';
import { motion } from 'motion/react';

interface MenuButtonProps {
  onClick: () => void;
}

export default function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/20 group"
    >
      <Menu 
        size={20} 
        className="text-[#C5A059] group-hover:text-white transition-colors duration-300" 
        strokeWidth={2}
      />
    </motion.button>
  );
}
