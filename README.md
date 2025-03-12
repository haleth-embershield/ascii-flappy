# ASCII Flappy Bird

A retro-style Flappy Bird game rendered entirely in ASCII characters, built with Zig (v0.14) targeting WebAssembly. This is a learning project for me.

## Description

ASCII Flappy Bird reimagines the classic mobile game using ASCII character rendering. Navigate a bird through a series of pipes by timing your jumps carefully. The game features:

- Pure ASCII rendering for a nostalgic terminal aesthetic
- Smooth physics-based gameplay
- Collision detection with pipes and boundaries
- Score tracking and high score persistence
- Responsive controls via keyboard, mouse, or touch

This project demonstrates how modern web technologies (WebAssembly) can be combined with retro aesthetics (ASCII art) to create an engaging gaming experience.

## How to Play

1. Click "Start Game" or press Space to begin
2. Press Space, click, or tap to make the bird jump
3. Navigate through the gaps between pipes
4. Each pipe you pass increases your score
5. Avoid hitting pipes, the ceiling, or the ground
6. Try to beat your high score!

### Controls

- **Space**: Jump
- **Click/Tap**: Jump
- **P**: Pause/Resume game

## Technical Details

### ASCII Rendering

The game uses a custom ASCII renderer implemented in Zig. The renderer:
- Converts RGB pixel data to ASCII characters based on brightness
- Maintains aspect ratio while converting to character-based output
- Optimizes for readability and visual clarity

### Architecture

The game is built with a clean separation between:
- Game logic (implemented in Zig)
- Rendering (custom ASCII renderer)
- User interface (HTML/CSS/JavaScript)

Communication between these layers happens via WebAssembly exports/imports.

## Development

This project is built using Zig v0.14 targeting WebAssembly. The game logic is written in Zig and compiled to WebAssembly, which is then loaded and executed in a web browser.

### Prerequisites

- Zig 0.14.0 or later
- A modern web browser with WebAssembly support

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