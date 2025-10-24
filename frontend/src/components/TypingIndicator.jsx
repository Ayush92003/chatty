/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";

const TypingIndicator = () => {
  const dots = [0, 1, 2];
  return (
    <div className="flex items-center gap-1 h-6">
      {dots.map((dot, index) => (
        <motion.span
          key={index}
          className="w-2 h-2 bg-green-500 rounded-full"
          animate={{ scale: [0, 1, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "loop",
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
