'use client'

import { useState, useEffect } from 'react'

const slides = [
  {
    title: 'The football. The fight.',
    subtitle: 'Premier League fan community powered by passion, banter, and loyalty.',
    image: '/Images/players/bruno.jpg',
  },
  {
    title: 'Your Locker Room.',
    subtitle: 'Your club. Your community. Your takes. One home for every fan.',
    image: '/Images/players/haaland.jpg',
  },
  {
    title: 'Win. Raid. Conquer.',
    subtitle: 'Victory earns you the right to post in the losing club\u2019s house.',
    image: '/Images/players/palmer.jpg',
  },
  {
    title: 'Hot Takes Board.',
    subtitle: 'The best Premier League takes. No filter. No mercy. All passion.',
    image: '/Images/players/saka.jpg',
  },
  {
    title: 'Build Your Reputation.',
    subtitle: 'Earn Fan Cred, unlock badges, and become a club Legend.',
    image: '/Images/players/vandijk.jpg',
  },
]

export default function AuthSlideshow() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="relative hidden md:flex w-1/2 min-h-screen overflow-hidden bg-black"
      style={{ borderTopRightRadius: 'var(--futfi8-border-radius-2xl)', borderBottomRightRadius: 'var(--futfi8-border-radius-2xl)' }}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 flex flex-col items-start justify-end p-12 pb-24 transition-all duration-700 ${
            index === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.3) 100%), url(${slide.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="max-w-md">
            <h2
              className="text-5xl font-medium tracking-tight text-white mb-4 leading-tight"
              style={{ fontFamily: 'var(--futfi8-typography-font-family-display)' }}
            >
              {slide.title}
            </h2>
            <p className="text-lg text-white/70 leading-relaxed">
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {slides.map((_, dotIndex) => (
          <button
            key={dotIndex}
            onClick={() => setCurrent(dotIndex)}
            className={`rounded-full transition-all duration-300 ${
              dotIndex === current
                ? 'bg-white w-10 h-2.5'
                : 'bg-white/30 w-2.5 h-2.5 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
