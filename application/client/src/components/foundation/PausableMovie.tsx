import classNames from "classnames";
import { RefCallback, useCallback, useEffect, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  src: string;
}

/**
 * クリックすると再生・一時停止を切り替えます。
 */
export const PausableMovie = ({ src }: Props) => {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver で viewport に入ったら読み込み開始
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // viewport に入ったら GIF をフェッチ
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        if (!cancelled) setData(buf);
      });
    return () => { cancelled = true; };
  }, [isVisible, src]);

  const animatorRef = useRef<any>(null);
  const canvasCallbackRef = useCallback<RefCallback<HTMLCanvasElement>>(
    (el) => {
      animatorRef.current?.stop();

      if (el === null || data === null) {
        return;
      }

      // GIF を動的にインポートして解析する
      void (async () => {
        const { Animator, Decoder } = await import("gifler");
        const { GifReader } = await import("omggif");

        const reader = new GifReader(new Uint8Array(data));
        const frames = Decoder.decodeFramesSync(reader);
        const animator = new Animator(reader, frames);

        animator.animateInCanvas(el);
        animator.onFrame(frames[0]!);

        // 視覚効果 off のとき GIF を自動再生しない
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setIsPlaying(false);
          animator.stop();
        } else {
          setIsPlaying(true);
          animator.start();
        }

        animatorRef.current = animator;
      })();
    },
    [data],
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const handleClick = useCallback(() => {
    setIsPlaying((isPlaying) => {
      if (isPlaying) {
        animatorRef.current?.stop();
      } else {
        animatorRef.current?.start();
      }
      return !isPlaying;
    });
  }, []);

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <div ref={sentinelRef} className="h-full w-full">
        {data === null ? null : (
          <button
            aria-label="動画プレイヤー"
            className="group relative block h-full w-full"
            onClick={handleClick}
            type="button"
          >
            <canvas ref={canvasCallbackRef} className="w-full" />
            <div
              className={classNames(
                "absolute left-1/2 top-1/2 flex items-center justify-center w-16 h-16 text-cax-surface-raised text-3xl bg-cax-overlay/50 rounded-full -translate-x-1/2 -translate-y-1/2",
                {
                  "opacity-0 group-hover:opacity-100": isPlaying,
                },
              )}
            >
              <FontAwesomeIcon iconType={isPlaying ? "pause" : "play"} styleType="solid" />
            </div>
          </button>
        )}
      </div>
    </AspectRatioBox>
  );
};
