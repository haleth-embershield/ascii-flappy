# ASCII Flappy Bird Roadmap

## Current Architecture

- **main.zig**: Contains game logic, state management, and rendering instructions
- **index.html**: Contains HTML/CSS/JS for loading WASM, handling input, UI elements, and canvas rendering
- **renderer.zig**: Currently empty, will be our new ASCII rendering engine

## Goals

1. Replace Canvas 2D rendering with pure ASCII rendering
2. Minimize JavaScript and HTML to only load WASM and audio
3. Move all game logic, input handling, and rendering to Zig
4. Target 30fps for initial implementation

## Phase 1: ASCII Rendering Engine

### 1. Create ASCII Renderer in renderer.zig
- Define an ASCII buffer representing the screen (a 2D array of characters)
- Implement basic rendering primitives to replace Canvas 2D API:
  - `drawAsciiRect`: Fill a rectangle area with a specific ASCII character
  - `drawAsciiCircle`: Draw a circle using appropriate ASCII characters
  - `drawAsciiLine`: Draw a line using ASCII characters
  - `drawAsciiText`: Render text using ASCII characters
- Define a color system (possibly using ANSI escape codes if terminal-based, or a custom encoding for web)
- Implement frame buffer management (double buffering)
- Implement terminal/console output functions

### 2. Create ASCII Assets
- Design ASCII art for the bird, pipes, background, etc.
- Create different bird frames for animation
- Define ASCII templates for UI elements (score, game over, etc.)

## Phase 2: Rendering Integration

### 1. Modify main.zig to Use ASCII Renderer
- Import the new renderer module
- Replace Canvas 2D drawing calls with ASCII rendering calls
- Adjust game coordinates to match ASCII grid (characters have different aspect ratios than pixels)
- Implement ASCII-specific collision detection (may need to be coarser)

### 2. Frame Rate Control
- Implement a consistent 30fps update loop
- Ensure game physics scales correctly with the new frame rate

## Phase 3: Audio and Input Management

### 1. Audio Integration
- Research options for audio playback from WASM:
  - Option 1: Bundle audio into WASM (more challenging)
  - Option 2: Keep minimal JS for audio playback (easier short-term)
- Implement audio trigger functions in Zig

### 2. Input Handling
- Create input management system in Zig
- Define methods for JS to communicate input events to Zig

## Phase 4: Minimal Web Interface

### 1. Simplify index.html
- Remove all UI elements, CSS styling, and most JavaScript
- Keep only the minimal code needed to:
  - Load the WASM module
  - Set up communication between JS and WASM
  - Handle necessary browser events
  - Manage audio playback

### 2. Create DOM Output Method
- Determine the best method to display ASCII output:
  - Option 1: Use a pre-formatted text element with monospace font
  - Option 2: Use a canvas for text rendering (might be more performant)
  - Option 3: Use HTML table with colored cells

*We will use Option 2 for now*
  - Claude and Grok agree Option 2 is best and that we can " directly write to canvas from WebAssembly memory without creating intermediate DOM structures" per Claude and if thats true then thats exactly what I want.

## Phase 5: Testing and Optimization

### 1. Performance Testing
- Ensure the game maintains 30fps
- Optimize rendering engine if needed
- Consider implementing partial redraws to improve performance

### 2. Cross-Browser Testing
- Test in major browsers
- Address any compatibility issues

## Technical Challenges and Considerations

### ASCII Rendering Limitations
- Lower resolution and less visual fidelity
- Character aspect ratio differences (characters are taller than they are wide)
- Limited color options depending on the display method

### WebAssembly Integration
- Need to define clear interfaces between Zig and JavaScript
- Memory management for the ASCII buffer
- Efficient transfer of the rendered screen to the browser display

### Input and Timing
- Ensure responsive input handling without JavaScript event listeners
- Maintain consistent game speed regardless of rendering method

## Future Enhancements

### 1. Advanced ASCII Effects
- Implement more sophisticated ASCII art techniques
- Add animation effects
- Implement particle systems using ASCII characters

### 2. Full Audio Integration
- Move all audio processing to Zig/WASM
- Create an audio synthesis system in Zig for sound effects

### 3. Performance Improvements
- Implement incremental rendering (only update changed parts of the screen)
- Optimize ASCII rendering algorithms
- Consider increasing frame rate once stability is achieved 