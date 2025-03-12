# ASCII Flappy Bird

A retro-style Flappy Bird game rendered entirely in ASCII characters, built with Zig targeting WebAssembly. This is a learning project for me.

This project demonstrates how modern web technologies (WebAssembly) can be combined with retro aesthetics (ASCII art) to create an engaging gaming experience.


### Controls

- **Space**: Jump
- **Click/Tap**: Jump
- **P**: Pause/Resume game

### Prerequisites

- Zig 0.14.0 or later

### Building and Running

```bash
# Build and run the project (starts a local web server)
zig build run

# Just build and deploy without running the server
zig build deploy

# Alternative: After deploying, serve with Python's HTTP server
zig build deploy
cd www
python -m http.server
```

## Project Structure

- `src/main.zig`: Main game logic and WebAssembly exports
- `src/renderer.zig`: ASCII rendering engine
- `web/`: Contains HTML, CSS, JavaScript, and audio files
  - `web/index.html`: Main game page and JavaScript code
  - `web/audio/`: Game sound effects
- `build.zig`: Build configuration for Zig

## TODOS:

- [ ] Higher Resolution
- [ ] Fix resizing on Mobile

## Educational Paths for myself

- [ ] Replace canvas with WebGL
- [ ] Replace WebGL with WebGPU

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by https://github.com/seatedro/glyph
- Built with Zig programming language