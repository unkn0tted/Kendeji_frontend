import type { Variants } from "motion/react";

export const sectionViewport = {
  once: true,
  amount: 0.24,
};

export const sectionReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 36,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.72,
      ease: "easeOut",
    },
  },
};

export const cardReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.98,
  },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.08,
      duration: 0.56,
      ease: "easeOut",
    },
  }),
};
