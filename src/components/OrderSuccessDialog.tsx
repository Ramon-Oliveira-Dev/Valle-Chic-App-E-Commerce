import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderSuccessDialog({ isOpen, onClose }: OrderSuccessDialogProps) {
  const navigate = useNavigate();

  const handleOk = () => {
    onClose();
    navigate('/');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card w-full max-w-sm p-8 rounded-[24px] border border-secondary/20 bg-[#0E121E] flex flex-col items-center text-center shadow-2xl shadow-secondary/10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mb-6"
            >
              <CheckCircle size={72} className="text-secondary" />
            </motion.div>

            <h2 className="font-headline text-2xl font-bold text-secondary mb-3">
              Pedido Enviado!
            </h2>

            <p className="text-surface/70 text-sm leading-relaxed mb-8">
              Seu pedido foi registrado com sucesso e já está sendo processado.
            </p>

            <button
              onClick={handleOk}
              className="w-full bg-secondary text-[#0E121E] font-bold text-base tracking-wide py-4 rounded-xl hover:bg-secondary/90 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
