"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface HandRockProps {
  userImage: number;
  images: string[];
  currentImageIndex: number;
  isPlaying?: boolean;
  result: number;
}

const HandRock = ({
  userImage,
  images,
  currentImageIndex,
  isPlaying,
  result,
}: HandRockProps) => {
  return (
    <div>
      <div className="flex justify-between">
        <motion.img
          src={images[userImage]}
          width={"40%"}
          style={{ rotate: "45deg" }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
        />
        <Image src="/vs.svg" alt="" width={100} height={100} />
        {isPlaying ? (
          <motion.img
            src={images[currentImageIndex]}
            width={"40%"}
            style={{ rotate: "-45deg" }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
          />
        ) : (
          <motion.img
            src={images[result]}
            width={"40%"}
            style={{ rotate: "-45deg" }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
          />
        )}
      </div>
    </div>
  );
};

export default HandRock;
