import { motion } from "framer-motion";
import { ReactNode } from "react";
import { isPrerendering } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

const PageTransition = ({ children, className }: PageTransitionProps) => {
  const shouldAnimate = !isPrerendering();

  return (
    <motion.div
      variants={pageVariants}
      initial={shouldAnimate ? "initial" : false}
      animate="animate"
      exit={shouldAnimate ? "exit" : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
