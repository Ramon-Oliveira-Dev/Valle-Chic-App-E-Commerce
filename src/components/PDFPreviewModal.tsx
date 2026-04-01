import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

export default function PDFPreviewModal({ isOpen, onClose, onConfirm, title, children }: PDFPreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-secondary/20 flex flex-col max-h-[90vh] relative"
          >
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none -mr-32 -mb-32"></div>
            
            <div className="p-6 border-b border-secondary/10 flex justify-between items-center bg-primary/40 backdrop-blur-sm relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">picture_as_pdf</span>
                </div>
                <h3 className="font-headline text-xl italic">{title}</h3>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-surface/60 hover:text-secondary transition-all hover:rotate-90">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
              <div className="bg-white text-slate-900 rounded-2xl shadow-inner p-10 min-h-[600px] relative overflow-hidden">
                {/* PDF Header with Logo */}
                <div className="flex justify-between items-start border-b-2 border-secondary/30 pb-8 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-secondary shadow-lg transform -rotate-3">
                      <span className="font-headline text-3xl italic font-bold">VC</span>
                    </div>
                    <div>
                      <h1 className="text-4xl font-serif italic font-bold text-slate-900 tracking-tight">Valle Chic</h1>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-secondary font-bold">Luxury & Style Admin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-secondary/10 rounded-full mb-2">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Documento Oficial</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500">DATA: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-slate-400">HORA: {new Date().toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-8">
                  {children}
                </div>

                {/* Footer */}
                <div className="mt-20 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-[9px] text-slate-400 italic">© 2026 Valle Chic - Sistema de Gestão Administrativa</p>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-secondary/30"></div>
                    <div className="w-2 h-2 rounded-full bg-secondary/20"></div>
                    <div className="w-2 h-2 rounded-full bg-secondary/10"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-secondary/10 bg-primary/60 backdrop-blur-md flex gap-4 relative z-10">
              <button 
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-secondary/20 text-surface/60 font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/5 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm}
                className="flex-[2] py-4 rounded-2xl bg-secondary text-primary font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/90 transition-all shadow-xl shadow-secondary/20 flex items-center justify-center gap-3 active:scale-95 group"
              >
                <span className="material-symbols-outlined text-sm group-hover:bounce">download</span>
                Confirmar e Baixar PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
