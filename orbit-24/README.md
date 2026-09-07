# ORBIT / 24

An independent, responsive fidget playground at `/orbit-24/`.

Drag the outer ring counterclockwise for 24 ratchet steps per revolution. Unlock it for free rotation in both directions; flick it for inertia. Explode the assembly to inspect the original Blender geometry. Sound is synthesized after the first user gesture and can be disabled.

## Run

Serve the repository as static files and open `/orbit-24/`. No build process or application server is needed. All scripts, fonts and model data are served from this directory; there are no third-party runtime requests, analytics or API keys.

## Controls

- Space / right arrow: one step
- F: ratchet / free spin
- E: explode / assemble
- V: top / angled view
- M: sound
- R: reset
- Left arrow: reverse step in free mode

The page supports mouse, touch and native keyboard controls, reduced motion, dark/light appearance, loading errors and persisted sound/vibration/theme preferences. Animation stops rendering when idle and pauses when the page is hidden.

`assets/model-data.json` comes from the original Blender design. Meshes are simplified for web display. The gear train uses 24 / 12 / 48 teeth: carrier speed is 2/3 of the input ring, and planets spin at 2 times the ring speed. The ratchet input rule and sound are a digital interaction, not a physical contact or force simulation.

Third-party software: Three.js 0.160.1 (MIT), Outfit (SIL Open Font License). License notices are included in `assets/`.

The site is deployed by the existing GitHub Pages branch publication. Updating this directory does not require changing the homepage or Pages configuration.

Optional vibration is off by default. Enable the vibration switch on a supported phone (for example, Android Chrome) for a 10 ms pulse at each ratchet detent, limited to one pulse every 45 ms. It works independently of sound and stays quiet in free spin. Turning it off, resetting, changing modes or leaving the page cancels vibration. Browsers without the Vibration API show a disabled switch; iPhone Safari does not support this API. API availability or a successful call does not guarantee physical vibration, which also depends on hardware and system settings.
