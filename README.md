# ASCII Flappy Bird

A retro-style Flappy Bird game rendered entirely in ASCII characters, built with Zig targeting WebAssembly. This is a learning project for me.

This project demonstrates how modern web technologies (WebAssembly) can be combined with retro aesthetics (ASCII art) to create an engaging gaming experience.

## Features

- Real-time ASCII art rendering
- Multiple character sets for different visual styles
- WebGL-accelerated rendering
- Optimized for performance and memory safety
- Responsive design that works on desktop and mobile

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
- `src/bitmap.zig`: Font bitmap data for ASCII rendering
- `web/`: Contains HTML, CSS, JavaScript, and audio files
  - `web/index.html`: Main game page and JavaScript code
  - `web/webgl.js`: WebGL rendering implementation
  - `web/audio/`: Game sound effects
- `build.zig`: Build configuration for Zig

## Technical Details

### Performance Optimizations

The game implements several key optimizations to ensure smooth gameplay:

1. **Preallocated ASCII Frame Buffer**
   - Eliminates per-frame memory allocations
   - Provides stable memory footprint during gameplay
   - Reduces garbage collection pauses

2. **Batched WebGL Commands**
   - Minimizes WebAssembly-JavaScript boundary crossings
   - Groups texture uploads and draw calls for efficiency
   - Reduces CPU overhead for rendering

3. **Single-Pass ASCII Rendering**
   - Processes pixels in a single pass with minimal branching
   - Implements efficient bounds checking
   - Optimizes memory access patterns

4. **Ahead-of-Time (AOT) Optimization**
   - Uses Zig's ReleaseFast mode for optimized WebAssembly
   - Reduces warm-up jitter in the browser
   - Improves startup time and initial frame rates

### Memory Safety Features

The codebase includes several memory safety features to prevent crashes and ensure stability:

1. **Safe Resource Management**
   - Proper initialization and cleanup of resources
   - Defensive memory allocation with error handling
   - Clear ownership semantics for allocated memory

2. **Robust Bounds Checking**
   - Extensive validation of image dimensions and data
   - Safe bitmap handling with explicit bounds checks
   - Protection against buffer overflows

3. **Safe Character Set Switching**
   - Initializes new resources before freeing old ones
   - Prevents dangling pointers during resource transitions
   - Handles initialization failures gracefully

4. **WebGL Race Condition Prevention**
   - Command buffer architecture prevents race conditions
   - Clear separation between frame preparation and rendering
   - Ensures WebGL always has a complete frame to render

## Lessons Learned

During the development of this project, several important lessons were learned:

1. **WebAssembly Performance Considerations**
   - Minimizing Wasm-JS boundary crossings is crucial for performance
   - Preallocating buffers significantly reduces runtime jitter
   - Batching related operations improves overall efficiency

2. **Memory Management in Zig**
   - Explicit allocator passing makes resource ownership clear
   - Error handling is essential for robust memory management
   - Defensive programming prevents most memory-related bugs

3. **ASCII Rendering Techniques**
   - Single-pass algorithms are more efficient than multi-pass approaches
   - Bitmap-based character rendering works well for real-time applications
   - Block-based processing reduces computational load

4. **WebGL Integration**
   - WebGL provides significant performance benefits over Canvas 2D
   - Texture-based rendering is efficient for ASCII art
   - Command batching reduces overhead in the rendering pipeline

## TODOS:

- [ ] Higher Resolution
- [ ] Fix resizing on Mobile
- [ ] Add difficulty levels
- [ ] Implement high score tracking

## Educational Paths for myself

- [ ] Replace WebGL with WebGPU
- [ ] Explore more advanced ASCII rendering techniques
- [ ] Implement multi-threading with Web Workers

## Advanced Features
- [ ] Implement shader effects (optional)
- [ ] Add post-processing capabilities
- [ ] Support dynamic resolution scaling
- [ ] Explore glyph-based rendering with texture atlas
```zig
// Potential glyph-based approach
const GlyphOutput = struct {
    indices: []u8,      // Glyph indices
    atlas: []u8,        // Texture atlas containing glyphs
    colors: []u8,       // Color information
};

fn renderAsGlyphs(img: Image, params: RenderParams) !GlyphOutput {
    // Implementation that outputs glyph indices instead of direct RGB
}
```

## Refactoring
- [ ] Refactor code for cleaner WebGL integration
- [ ] Create abstraction layer for rendering backend
- [ ] Improve error handling and recovery
- [ ] Clean up deprecated code paths

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by https://github.com/seatedro/glyph
- Built with Zig programming language