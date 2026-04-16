import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  pathname: string;
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeInOut = [0.4, 0, 0.2, 1] as const;

const pageShellVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.16, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: easeInOut },
  },
};

const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.02,
    },
  },
  exit: {},
};

const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.12, ease: easeInOut },
  },
};

export function StaggerPage({ children, className }: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export default function PageTransition({ children, pathname }: PageTransitionProps) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={pathname}
        variants={pageShellVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full h-full min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}