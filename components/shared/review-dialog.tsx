"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReviewDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
  onSubmit: (rating: number, comment: string) => void;
  onSkip?: () => void;
}

export default function ReviewDialog({
  open,
  title = "How did we do?",
  description = "Your feedback helps us improve the experience.",
  isSubmitting = false,
  onSubmit,
  onSkip,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(rating, comment.trim());
  };

  const handleSkip = () => {
    setRating(0);
    setHovered(0);
    setComment("");
    onSkip?.();
  };

  const activeRating = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Star rating */}
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    star <= activeRating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>

          {/* Rating label */}
          <p className="text-center text-xs text-muted-foreground h-4">
            {activeRating === 1 && "Poor"}
            {activeRating === 2 && "Fair"}
            {activeRating === 3 && "Good"}
            {activeRating === 4 && "Great"}
            {activeRating === 5 && "Excellent"}
          </p>

          {/* Comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional comments? (optional)"
            className="min-h-20 resize-none text-sm"
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2">
          {onSkip ? (
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isSubmitting}>
              Skip
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline star display for showing existing reviews
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "size-3.5",
            star <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
