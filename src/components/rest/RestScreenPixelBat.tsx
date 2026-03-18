"use client"

import { useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import "./restScreenPixelBat.css"

const PARTICLE_COUNT = 18

/**
 * Morcego pixel (CSS box-shadow) + partículas e flutuação com Motion —
 * visual no estilo dos tutoriais (maior, mais “vivo”).
 */
export function RestScreenPixelBat() {
  const reduceMotion = useReducedMotion()

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const t = (i / PARTICLE_COUNT) * Math.PI * 2
        const layer = 1 + (i % 3)
        return {
          id: i,
          baseX: Math.cos(t + i * 0.4) * (55 + layer * 22),
          baseY: Math.sin(t * 1.1) * (38 + layer * 14),
          duration: 0.55 + (i % 5) * 0.12,
          delay: (i * 0.04) % 0.5,
        }
      }),
    []
  )

  return (
    <motion.div
      className="rest-screen-bat-outer"
      initial={false}
      animate={
        reduceMotion
          ? { y: 0, rotate: 0 }
          : {
              y: [0, -14, 2, -8, 0],
              rotate: [-3, 4, -2, 3, -3],
            }
      }
      transition={{
        duration: 3.6,
        repeat: Infinity,
        ease: [0.45, 0.05, 0.55, 0.95],
      }}
    >
      <div className="rest-screen-bat-stage">
        {!reduceMotion &&
          particles.map((p) => (
            <motion.span
              key={p.id}
              className="rest-screen-bat-particle"
              style={{
                left: `calc(50% + ${p.baseX}px)`,
                top: `calc(50% + ${p.baseY}px)`,
              }}
              animate={{
                opacity: [0.12, 1, 0.2, 0.65, 0.12],
                scale: [1, 1.15, 0.85, 1.05, 1],
                x: [0, 6, -4, 3, 0],
                y: [0, -5, 4, -3, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
                delay: p.delay,
                times: [0, 0.25, 0.5, 0.75, 1],
              }}
            />
          ))}
        <span className="rest-screen-bat-pixel" />
      </div>
    </motion.div>
  )
}
