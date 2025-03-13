# WebGL/WebGPU Integration Roadmap

This document outlines the plan for migrating our ASCII renderer from canvas-based rendering to using WebGL and eventually WebGPU. This transition will significantly improve performance, reduce JS-WASM boundary crossings, and allow for more rendering logic to reside in Zig.

## Phase 1: Preparation & Research (1-2 weeks)

### 1.1 Codebase Analysis
- [ ] Identify all current rendering components and data flow
- [ ] Document the current frame generation pipeline
- [ ] Analyze the `renderFrame` output format (RGB buffer structure)
- [ ] Identify potential bottlenecks in the current implementation

### 1.2 WebGL Learning
- [ ] Familiarize with WebGL API and concepts
- [ ] Study WebGL-WASM integration approaches
- [ ] Prototype simple WebGL rendering from Zig/WASM
- [ ] Understand texture handling in WebGL

### 1.3 Architecture Planning
- [ ] Design the new rendering pipeline
- [ ] Define the interface between Zig and JavaScript
- [ ] Plan for backward compatibility
- [ ] Determine optimal buffer formats for GPU rendering

## Phase 2: WebGL Implementation (2-4 weeks)

### 2.1 Core WebGL Setup
- [ ] Implement JavaScript WebGL context initialization
- [ ] Create simple vertex and fragment shaders
- [ ] Set up a full-screen quad for rendering
- [ ] Configure texture parameters for ASCII output

### 2.2 Zig WebGL Bindings
- [ ] Define external WebGL function bindings in Zig
```zig
extern fn glTexImage2D(target: u32, level: i32, internalformat: u32, width: i32, height: i32, border: i32, format: u32, type: u32, pixels: [*]const u8) void;
extern fn glDrawArrays(mode: u32, first: i32, count: i32) void;
// Add more as needed
```
- [ ] Create helper functions for WebGL operations
- [ ] Implement texture upload from Zig buffer to WebGL

### 2.3 Renderer Modifications
- [ ] Update `renderer.zig` to support WebGL output
- [ ] Modify `render_game_frame` to handle WebGL mode
- [ ] Implement efficient buffer handoff to WebGL
- [ ] Add optional parameter to switch between canvas and WebGL rendering

```zig
export fn render_game_frame(ptr: [*]u8, width: usize, height: usize, channels: usize, use_webgl: i32) [*]u8 {
    // Existing rendering code...
    
    if (use_webgl != 0) {
        // WebGL rendering path
        glTexImage2D(/* params */);
        glDrawArrays(/* params */);
        allocator.free(frame);
        return null; // WebGL handles rendering
    }
    
    // Canvas rendering path (backward compatibility)
    return frame.ptr;
}
```

### 2.4 Integration & Testing
- [ ] Create toggle mechanism between Canvas and WebGL rendering
- [ ] Implement performance monitoring
- [ ] Test across different browsers and devices
- [ ] Fix rendering inconsistencies between methods

## Phase 3: Optimization (2-3 weeks)

### 3.1 Performance Optimization
- [ ] Profile WebGL rendering performance
- [ ] Identify and eliminate bottlenecks
- [ ] Optimize texture uploads and buffer handling
- [ ] Implement batch rendering if applicable

### 3.2 Advanced Features
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

### 3.3 Refactoring
- [ ] Refactor code for cleaner WebGL integration
- [ ] Create abstraction layer for rendering backend
- [ ] Improve error handling and recovery
- [ ] Clean up deprecated code paths

## Phase 4: WebGPU Preparation (Future, 2-3 months)

### 4.1 WebGPU Research
- [ ] Study WebGPU API and browser support status
- [ ] Understand differences from WebGL
- [ ] Prototype simple WebGPU renderer
- [ ] Evaluate compute shader potential for ASCII generation

### 4.2 WebGPU Bindings
- [ ] Define WebGPU external functions for Zig
```zig
extern fn wgpuQueueWriteTexture(queue: *anyopaque, texture: *anyopaque, data: [*]const u8, dataLength: usize, width: u32, height: u32) void;
extern fn wgpuRenderPassEncoderDraw(pass: *anyopaque, vertexCount: u32, instanceCount: u32, firstVertex: u32, firstInstance: u32) void;
// More bindings needed
```
- [ ] Create initialization function for WebGPU setup
- [ ] Implement buffer handling for WebGPU

### 4.3 Compute Shader Exploration
- [ ] Research compute shader approach for ASCII generation
- [ ] Prototype direct generation of ASCII on GPU
- [ ] Compare performance with CPU-based generation
- [ ] Implement hybrid approach if beneficial

## Phase 5: WebGPU Implementation (Future, 3-4 months)

### 5.1 Core Implementation
- [ ] Implement WebGPU rendering pipeline
- [ ] Create adapter for existing renderer to WebGPU
- [ ] Set up proper resource management
- [ ] Handle device loss and other WebGPU-specific issues

### 5.2 Advanced Features
- [ ] Implement full compute shader ASCII generation
- [ ] Add advanced visual effects
- [ ] Support for high-resolution rendering
- [ ] Implement adaptive quality based on device capabilities

### 5.3 Finalization
- [ ] Performance testing and optimization
- [ ] Browser compatibility testing
- [ ] Fallback mechanisms for unsupported browsers
- [ ] Documentation and code cleanup

## Technical Considerations

### Buffer Management
- Current output: RGB buffer (width × height × 3 bytes)
- WebGL option 1: Use RGB buffer as texture
- WebGL option 2: Output glyph indices + font atlas for more efficient GPU rendering
- WebGPU advancement: Potentially generate ASCII directly on GPU with compute shaders

### JavaScript Role
- WebGL: Initialize context, set up shaders, create buffers
- WebGPU: Similar to WebGL but with more explicit resource management
- Both: Minimize JS involvement to setup only, with Zig handling rendering logic

### Backward Compatibility
- Maintain canvas rendering path for older browsers
- Implement feature detection for WebGL/WebGPU support
- Graceful fallback between rendering methods

## Resources

### WebGL Resources
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [MDN WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [WebAssembly and WebGL Integration](https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html)

### WebGPU Resources
- [WebGPU Samples](https://github.com/austinEng/webgpu-samples)
- [WebGPU Best Practices](https://toji.github.io/webgpu-best-practices/)
- [Dawn (WebGPU implementation)](https://dawn.googlesource.com/dawn) 