import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning';
  buttonText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  buttonText,
  onConfirm,
  showCancel = false
}: NotificationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
      default:
        return 'error';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      case 'error':
      default:
        return 'text-secondary';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-[#0a0f1a] border-2 border-secondary/40 rounded-[40px] p-10 flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* Icon Container */}
            <div className="w-24 h-24 rounded-full bg-surface/5 flex items-center justify-center mb-8">
              <span className={`material-symbols-outlined text-5xl ${getIconColor()}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {getIcon()}
              </span>
            </div>

            {/* Content */}
            <h3 className="text-surface text-3xl font-headline italic mb-4">{title}</h3>
            <p className="text-surface/60 text-lg mb-10 leading-relaxed">
              {message}
            </p>

            {/* Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  if (onConfirm) {
                    onConfirm();
                  }
                  onClose();
                }}
                className="w-full py-5 bg-secondary text-primary font-bold text-sm uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(226,179,32,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                {buttonText || (onConfirm ? 'Confirmar' : (type === 'error' ? 'TENTAR NOVAMENTE' : 'CONTINUAR'))}
              </button>
              
              {(showCancel || onConfirm) && (
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-transparent text-surface/60 font-bold text-sm uppercase tracking-widest rounded-full border border-surface/10 hover:bg-surface/5 transition-all duration-300"
                >
                  Cancelar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
