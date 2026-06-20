'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const slides = ['/auth-slides/slide1.jpg', '/auth-slides/slide2.jpg', '/auth-slides/slide3.jpg']

export function AuthCarousel() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setIdx((prev) => (prev + 1) % slides.length), 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-1/2 min-h-screen relative hidden md:flex flex-col justify-between p-12 overflow-hidden border-r border-border/30">
      {slides.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          className={`object-cover transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-black/60 z-10" />
      <div className="relative z-20 mt-auto">
        <p className="font-display text-3xl md:text-4xl font-normal tracking-wide text-foreground leading-snug">
          Futfi8.
          <br />
            <span className="text-zinc-300">
            The football. The fight.
          </span>
        </p>
      </div>
    </div>
  )
}
