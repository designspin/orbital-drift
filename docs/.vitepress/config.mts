import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Canvas TS Engine',
  description: 'A hands-on book building a canvas game engine in TypeScript.',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],
    sidebar: [
      { text: 'Introduction', link: '/00-intro/' },
      { text: 'Setup', link: '/01-setup/' },
      { text: 'Drawing', link: '/02-drawing/' },
      { text: 'Game Loop', link: '/03-gameloop/' },
      { text: 'Input', link: '/04-input/' },
      { text: 'Entities', link: '/05-entities/' },
      { text: 'Collision', link: '/06-collision/' },
      { text: 'UI', link: '/07-ui/' },
      { text: 'State', link: '/08-state/' },
      { text: 'Assets', link: '/09-assets/' },
      { text: 'Camera', link: '/10-camera/' },
      { text: 'Sound', link: '/11-sound/' },
      { text: 'Particles', link: '/12-particles/' },
      { text: 'Improvements', link: '/13-improvements/' },
      { text: 'Architecture', link: '/14-architecture/' },
      { text: 'Wrap Up', link: '/99-wrap-up/' },
    ],
  },
})
