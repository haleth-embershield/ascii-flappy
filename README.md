# ASCII Flapper

A VERY SIMPLE tower defense game built with Zig (v0.14) targeting WebAssembly. This project showcases ZIG + ASCII generator as renderer.

## Description
TODO

## How to Play
1. Click "Start Game" to begin
2. Jump.
3. Survive!

### Controls
- **Space**: Jump

## Development
This project is built using Zig v0.14 targeting WebAssembly. It's designed as a simple, single-file implementation to demonstrate how Zig can be used with HTML Canvas via WebAssembly.

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
- `web/`: Contains HTML, CSS, JavaScript, and audio files
- `build.zig`: Build configuration for Zig