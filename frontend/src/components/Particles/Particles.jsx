import { useEffect, useRef } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

import './Particles.css'

const defaultColors = ['#ffffff', '#ffffff', '#ffffff']

// ── Conversión de color ───────────────────────────────────────────────────────
// Cada paso tiene un nombre que dice qué hace — Decompose Conditional (Shvets §10)
const expandShortHex    = (hex) => hex.split('').map((c) => c + c).join('')
const normalizeHex      = (hex) => hex.length === 3 ? expandShortHex(hex) : hex

const hexToRgb = (hex) => {
  const full = normalizeHex(hex.replace(/^#/, ''))
  const int  = parseInt(full, 16)
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

// ── Generación de partículas ──────────────────────────────────────────────────
const randomInRange     = ()      => Math.random() * 2 - 1
const isOutsideSphere   = (len)   => len > 1 || len === 0
const resolvedPalette   = (cols)  => cols?.length > 0 ? cols : defaultColors
const randomFromPalette = (pal)   => hexToRgb(pal[Math.floor(Math.random() * pal.length)])

// Rejection sampling: intenta un punto; si cae fuera de la esfera, se llama a
// sí misma — recursión en lugar de do/while para evitar variables mutables.
const randomUnitPoint = () => {
  const x   = randomInRange(), y = randomInRange(), z = randomInRange()
  const len = x * x + y * y + z * z
  return isOutsideSphere(len) ? randomUnitPoint() : [x, y, z]
}

// Construye los tres Float32Arrays que necesita la geometría WebGL.
// Usamos Array.from({ length: count }) para iterar sin for/let.
const buildParticleArrays = (count, palette) => {
  const positions = new Float32Array(count * 3)
  const randoms   = new Float32Array(count * 4)
  const colors    = new Float32Array(count * 3)

  Array.from({ length: count }, (_, i) => {
    const [x, y, z] = randomUnitPoint()
    const r = Math.cbrt(Math.random())
    positions.set([x * r, y * r, z * r], i * 3)
    randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
    colors.set(randomFromPalette(palette), i * 3)
  })

  return { positions, randoms, colors }
}

// ── Loop de animación — cada comportamiento tiene nombre ──────────────────────
const applyHoverOffset = (particles, mouse, factor) => {
  particles.position.x = -mouse.x * factor
  particles.position.y = -mouse.y * factor
}

const resetOffset = (particles) => {
  particles.position.x = 0
  particles.position.y = 0
}

const applyRotation = (particles, elapsed, speed) => {
  particles.rotation.x  = Math.sin(elapsed * 0.0002) * 0.1
  particles.rotation.y  = Math.cos(elapsed * 0.0005) * 0.15
  particles.rotation.z += 0.01 * speed
}

// ── Shaders GLSL (no son JS — se mantienen como están) ───────────────────────
const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`

// ── Componente principal ──────────────────────────────────────────────────────
const Particles = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className = '',
}) => {
  const containerRef = useRef(null)
  const mouseRef     = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ dpr: pixelRatio, depth: false, alpha: true })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.clearColor(0, 0, 0, 0)

    const camera = new Camera(gl, { fov: 15 })
    camera.position.set(0, 0, cameraDistance)

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight)
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
    }
    window.addEventListener('resize', resize, false)
    resize()

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      }
    }
    if (moveParticlesOnHover) container.addEventListener('mousemove', handleMouseMove)

    const palette = resolvedPalette(particleColors)
    const { positions, randoms, colors } = buildParticleArrays(particleCount, palette)

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random:   { size: 4, data: randoms },
      color:    { size: 3, data: colors },
    })

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime:           { value: 0 },
        uSpread:         { value: particleSpread },
        uBaseSize:       { value: particleBaseSize * pixelRatio },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest:   false,
    })

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program })

    
    const raf = { id: null, lastTime: performance.now(), elapsed: 0 }

    const update = (t) => {
      raf.id       = requestAnimationFrame(update)
      raf.elapsed += (t - raf.lastTime) * speed
      raf.lastTime = t

      program.uniforms.uTime.value = raf.elapsed * 0.001

      moveParticlesOnHover
        ? applyHoverOffset(particles, mouseRef.current, particleHoverFactor)
        : resetOffset(particles)

      !disableRotation && applyRotation(particles, raf.elapsed, speed)

      renderer.render({ scene: particles, camera })
    }

    raf.id = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      if (moveParticlesOnHover) container.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(raf.id)
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    particleCount, particleSpread, speed, moveParticlesOnHover,
    particleHoverFactor, alphaParticles, particleBaseSize,
    sizeRandomness, cameraDistance, disableRotation, pixelRatio,
  ])

  return <div ref={containerRef} className={`particles-container ${className}`} />
}

export default Particles
