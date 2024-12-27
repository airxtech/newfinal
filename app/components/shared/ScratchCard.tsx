// src/components/shared/ScratchCard.tsx
import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRewards } from '@/hooks/useRewards';

interface ScratchCardProps {
  onClose: () => void;
  onReveal: (amount: number) => void;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ onClose, onReveal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasScratchStarted, setHasScratchStarted] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const scratchRadius = 25;

  const { handleScratchCard, loading, error } = useRewards();

  // Get reward amount on mount
  useEffect(() => {
    const initScratchCard = async () => {
      const rewardAmount = await handleScratchCard();
      if (rewardAmount === null) {
        onClose();
        return;
      }
      setReward(rewardAmount);

      const mainCanvas = canvasRef.current;
      const bgCanvas = backgroundCanvasRef.current;
      if (!mainCanvas || !bgCanvas) return;

      const size = Math.min(window.innerWidth * 0.8, 300);

      mainCanvas.width = size;
      mainCanvas.height = size;
      bgCanvas.width = size;
      bgCanvas.height = size;

      const bgCtx = bgCanvas.getContext('2d');
      if (!bgCtx) return;

      // Background for reward amount
      bgCtx.fillStyle = '#18181b';
      bgCtx.fillRect(0, 0, size, size);
      bgCtx.font = 'bold 40px Inter';
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillStyle = '#10b981';
      bgCtx.fillText(`${rewardAmount.toFixed(2)} ZOA`, size/2, size/2);

      // Scratching layer
      const ctx = mainCanvas.getContext('2d');
      if (!ctx) return;

      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#10B981');
      gradient.addColorStop(1, '#EAB308');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    };

    initScratchCard();
  }, []);

  const calculateScratchPercentage = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) transparent++;
    }
    return (transparent / (pixels.length / 4)) * 100;
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isRevealed || !reward) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (!hasScratchStarted) {
      setHasScratchStarted(true);
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
    ctx.fill();

    const percentage = calculateScratchPercentage(ctx);
    
    if (percentage >= 60 && !isRevealed) {
      setIsRevealed(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onReveal(reward);
      setTimeout(() => onClose(), 1500);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-white animate-pulse">Loading your reward...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={onClose}
            className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Scratch to Earn ✨</h3>
          {!hasScratchStarted && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X size={24} />
            </button>
          )}
        </div>

        <div className="relative">
          <canvas
            ref={backgroundCanvasRef}
            className="absolute top-0 left-0 rounded-lg"
          />
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => { setIsDrawing(true); scratch(e); }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseOut={() => setIsDrawing(false)}
            onMouseMove={scratch}
            onTouchStart={(e) => { setIsDrawing(true); scratch(e); }}
            onTouchEnd={() => setIsDrawing(false)}
            onTouchMove={scratch}
            className="relative z-10 touch-none cursor-pointer rounded-lg"
          />

          {!isRevealed && (
            <div className="absolute top-4 left-0 right-0 text-center z-20">
              <span className="text-white text-lg font-semibold">
                {hasScratchStarted 
                  ? "Keep scratching to reveal prize!" 
                  : "Scratch to reveal your prize!"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScratchCard;