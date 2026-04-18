import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STAGGER_DELAY = 0.05;
const ITEM_DURATION = 0.3;

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ITEM_DURATION,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: STAGGER_DELAY,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ITEM_DURATION, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
} as const;

type PageTransitionProps = {
  children: ReactNode;
  pathname: string;
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerPage({ children, className }: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

export default function PageTransition({ children, pathname }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}