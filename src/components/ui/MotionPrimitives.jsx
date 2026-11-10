import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Emil Kowalski / Apple iOS Spring Physics Presets
 */
export const SPRING_SNAPPY = {
  type: 'spring',
  stiffness: 440,
  damping: 32,
  mass: 0.8
};

export const SPRING_SMOOTH = {
  type: 'spring',
  stiffness: 320,
  damping: 30,
  mass: 0.9
};

/**
 * Vaul-inspired Drag-to-Dismiss Modal / Sheet Overlay
 * Suporta gestos de toque/arraste vertical (drag="y") com física de molas
 * e fechamento automático ao arrastar para baixo (offset > 90px ou velocity > 420px/s).
 */
export function VaulModalSheet({
  isOpen,
  onClose,
  children,
  maxWidth = '540px',
  style = {},
  className = ''
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="vaul-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(4, 6, 12, 0.78)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            touchAction: 'none'
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`vaul-sheet ${className}`}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 320 }}
            dragElastic={{ top: 0.06, bottom: 0.55 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 90 || info.velocity.y > 420) {
                onClose?.();
              }
            }}
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.96 }}
            transition={SPRING_SNAPPY}
            style={{
              width: '100%',
              maxWidth,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'rgba(11, 15, 26, 0.95)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 28px 70px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
              borderRadius: '26px',
              padding: '16px 26px 24px',
              boxSizing: 'border-box',
              color: '#F8FAFC',
              position: 'relative',
              ...style
            }}
          >
            {/* Barra de Arraste (Vaul Drag Handle) */}
            <div
              title="Arraste para baixo para fechar"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '2px',
                paddingBottom: '12px',
                cursor: 'grab'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '5px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  transition: 'background-color 0.2s ease'
                }}
              />
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Wrapper de Transição de Página com Física de Mola (Spring Page Transition)
 */
export function SpringPageTransition({ activeKey, children }) {
  return (
    <motion.div
      key={activeKey}
      initial={{ opacity: 0, y: 10, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_SMOOTH}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Botão Magnético com Feedback Tátil (Microinteraction Skill)
 */
export function MagneticButton({
  children,
  onClick,
  className = '',
  style = {},
  type = 'button',
  disabled = false,
  title
}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.12;
    const deltaY = (e.clientY - centerY) * 0.12;
    setOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: offset.x, y: offset.y }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.965 }}
      transition={SPRING_SNAPPY}
      className={className}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      {children}
    </motion.button>
  );
}
