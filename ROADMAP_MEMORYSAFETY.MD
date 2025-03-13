# Memory Safety Roadmap for ASCII Flappy Bird

This document outlines key memory safety issues identified in the ASCII Flappy Bird project and provides recommendations for addressing them to prevent intermittent crashes and rendering problems.

## Critical Issues

### 1. Memory Leaks in Rendering Pipeline

**Problem:** Each frame rendering allocates new memory without freeing the previous buffer.

```zig
// In drawGame() and drawMenu()
game.ascii_output = renderer.renderToAscii(allocator, game.game_image, game.ascii_renderer) catch {
    logString("Failed to render ASCII");
    return;
};
```

**Solution:** Store and free the previous buffer before assigning a new one:

```zig
// Store the old output buffer
const old_output = game.ascii_output;

// Render the game image to ASCII
game.ascii_output = renderer.renderToAscii(allocator, game.game_image, game.ascii_renderer) catch {
    logString("Failed to render ASCII");
    return;
};

// Free the old buffer after successful allocation of the new one
allocator.free(old_output);
```

### 2. Unsafe Character Set Switching

**Problem:** When changing character sets, if `initAsciiChars` fails, `game.ascii_renderer.ascii_info` becomes a dangling pointer.

**Solution:** Create a temporary variable to hold the new character info before freeing the old one:

```zig
// Initialize the new character info first
const new_ascii_info = renderer.initAsciiChars(allocator, char_set) catch {
    logString("Failed to initialize character set");
    return;
};

// Free the old character info only after successful initialization
allocator.free(game.ascii_renderer.ascii_info);
game.ascii_renderer.ascii_chars = char_set;
game.ascii_renderer.ascii_info = new_ascii_info;
```

### 3. Potential Race Conditions in WebGL Rendering

**Problem:** WebGL might still be using the buffer while it's being modified or freed.

**Solution:** Implement double-buffering to ensure WebGL always has a complete frame:

```zig
// Add to GameData struct
current_buffer: usize, // 0 or 1
ascii_buffers: [2][]u8,

// In rendering code
const next_buffer = 1 - game.current_buffer;
game.ascii_buffers[next_buffer] = renderer.renderToAscii(...) catch {...};
renderer.render_game_frame(game.ascii_buffers[next_buffer].ptr, ...);
game.current_buffer = next_buffer;
```

## Additional Improvements

### 4. Bounds Checking in Bitmap Handling

**Problem:** In `convertToAscii`, there's potential for out-of-bounds access if `dy` exceeds the bitmap height (8).

**Solution:** Add explicit bounds checking:

```zig
// In convertToAscii function
if (dy >= 8) continue; // Skip if accessing beyond bitmap height
const shift: u3 = @intCast(7 - dx);
const bit: u8 = @as(u8, 1) << shift;
if ((bm[dy] & bit) != 0) {
    // ...
}
```

### 5. Safer Image Processing

**Problem:** Some bounds checks might allow processing to continue with incomplete data.

**Solution:** Implement more robust bounds checking and error handling:

```zig
// Example for rgbToGrayscale
for (0..img.height) |y| {
    for (0..img.width) |x| {
        const i = (y * img.width + x) * img.channels;
        if (i + 2 >= img.data.len) {
            // Log error and return early or use a default value
            continue;
        }
        // Process pixel...
    }
}
```

### 6. Defensive Memory Allocation

**Problem:** Memory allocation failures might not be properly handled throughout the codebase.

**Solution:** Add more robust error handling for allocations:

```zig
// Example pattern
const buffer = allocator.alloc(u8, size) catch |err| {
    logString("Memory allocation failed");
    // Either return error or use fallback strategy
    return err;
};
```

### 7. Null Pointer Protection

**Problem:** Some functions might not check for null pointers or empty slices.

**Solution:** Add explicit checks:

```zig
// Example pattern
if (data.len == 0 or data.ptr == null) {
    return error.InvalidData;
}
```

### 8. Memory Ownership Clarity

**Problem:** It's not always clear which function is responsible for freeing memory.

**Solution:** Add clear documentation and consistent patterns:

```zig
/// Caller owns the returned memory and must free it with allocator.free()
pub fn someFunction(allocator: std.mem.Allocator) ![]u8 {
    // ...
}
```

## Implementation Priority

1. Fix memory leaks in rendering pipeline (Critical)
2. Implement safe character set switching (Critical)
3. Add double-buffering for WebGL rendering (High)
4. Improve bounds checking in bitmap handling (Medium)
5. Enhance image processing safety (Medium)
6. Implement defensive memory allocation (Medium)
7. Add null pointer protection (Medium)
8. Clarify memory ownership (Low)

## Testing Strategy

1. Implement memory leak detection tools
2. Create stress tests that rapidly switch between game states
3. Add assertions to verify memory integrity
4. Monitor memory usage during extended gameplay sessions
5. Test with various ASCII character sets and rendering options

By addressing these issues, the ASCII Flappy Bird project should become more memory-safe and stable, eliminating the intermittent crashes and rendering problems.

## Overlaps with Performance Optimization Roadmap

Several optimizations from the Performance Optimization Roadmap (ROADMAP_OPT.MD) would naturally address memory safety issues identified in this document:

### 1. Preallocated ASCII Frame Buffer ↔ Memory Leaks in Rendering Pipeline

**Optimization (from ROADMAP_OPT.MD):**
```zig
/// Preallocated buffer for ASCII output to avoid per-frame allocations
var global_ascii_buffer: ?[]u8 = null;

/// Preallocate a buffer for ASCII rendering to avoid per-frame allocations
pub fn preallocateAsciiBuffer(allocator: std.mem.Allocator, width: usize, height: usize) !void {
    // Free any existing buffer
    if (global_ascii_buffer) |buffer| {
        allocator.free(buffer);
    }
    
    // Allocate a new buffer with appropriate size (3 bytes per pixel for RGB)
    global_ascii_buffer = try allocator.alloc(u8, width * height * 3);
}
```

**Benefits:**
- Completely eliminates the memory leak in the rendering pipeline (Issue #1)
- Removes the need for per-frame allocations and deallocations
- Provides a stable memory footprint throughout the application lifecycle

### 2. Double-Buffering in Batch WebGL Calls ↔ Race Conditions in WebGL Rendering

**Optimization (from ROADMAP_OPT.MD):**
The command buffer structure and batched WebGL calls implementation naturally creates a form of double-buffering that addresses the race condition concerns:

```zig
// Add to GameData struct
command_buffer: renderer.CommandBuffer,

// In rendering code
game.command_buffer.reset();
// ... rendering logic ...
game.command_buffer.addTextureCommand(game.ascii_output.ptr);
game.command_buffer.addDrawCommand();
executeBatchedCommands(game.command_buffer.getBufferPtr(), ...);
```

**Benefits:**
- Ensures WebGL operations are properly sequenced
- Prevents race conditions between buffer modifications and rendering (Issue #3)
- Creates a clear boundary between frame preparation and rendering

### 3. Single-Pass ASCII Rendering ↔ Bounds Checking and Image Processing Safety

**Optimization (from ROADMAP_OPT.MD):**
The single-pass rendering algorithm includes more robust bounds checking:

```zig
// Sum brightness in block
const max_y = @min(y + block_size, img.height);
const max_x = @min(x + block_size, img.width);
            
var by: usize = y;
while (by < max_y) : (by += 1) {
    var bx: usize = x;
    while (bx < max_x) : (bx += 1) {
        const pixel_index = (by * img.width + bx) * img.channels;
        // ... safe pixel processing ...
    }
}
```

**Benefits:**
- Addresses bounds checking issues in bitmap handling (Issue #4)
- Improves image processing safety with explicit bounds (Issue #5)
- Reduces the risk of accessing out-of-bounds memory

### 4. AOT Optimization ↔ General Memory Safety

**Optimization (from ROADMAP_OPT.MD):**
Using Zig's release modes with optimizations:

```bash
zig build-lib src/main.zig -target wasm32-freestanding -O ReleaseFast -dynamic
```

**Benefits:**
- Enables Zig's built-in safety checks in optimized builds
- May catch some memory safety issues at compile time
- Produces more predictable runtime behavior

### Implementation Strategy

For maximum efficiency, consider implementing these overlapping optimizations first:

1. **Preallocated ASCII Frame Buffer** - Addresses the critical memory leak issue while improving performance
2. **Batch WebGL Calls with Command Buffer** - Solves race conditions and improves rendering efficiency
3. **Single-Pass ASCII Rendering** - Enhances bounds checking while optimizing the rendering pipeline
4. **AOT Optimization** - Provides a foundation of safety and performance improvements

By focusing on these overlapping areas first, you can address both memory safety and performance concerns simultaneously, getting the most benefit from your development efforts. 