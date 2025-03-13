# ASCII Flappy Bird Performance Optimization Roadmap

This document outlines targeted optimizations to improve performance in the ASCII Flappy Bird game, with a focus on minimizing the WebAssembly-JavaScript boundary overhead and reducing startup time.

## 1. Ahead-of-Time (AOT) Optimization

### Why
The warm-up jitter you're experiencing is likely due to the browser's JIT compiler taking time to optimize your WebAssembly code. Using Zig's release modes can generate highly optimized Wasm upfront.

### Implementation

1. Update your build command to use ReleaseFast or ReleaseSmall:

```bash
zig build-lib src/main.zig -target wasm32-freestanding -O ReleaseFast -dynamic
```

2. For even smaller code size (potentially improving load time):

```bash
zig build-lib src/main.zig -target wasm32-freestanding -O ReleaseSmall -dynamic
```

### Expected Outcome
- Reduced startup time
- More consistent frame rates during the first few seconds of gameplay

## 2. Preallocate ASCII Frame Buffer

### Why
Dynamic allocations for each frame can trigger garbage collection or memory resizing, causing jitter. Preallocating a fixed buffer will eliminate this overhead.

### Implementation

In `renderer.zig`:

1. Add a preallocation function:

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

/// Free the global ASCII buffer
pub fn freeAsciiBuffer(allocator: std.mem.Allocator) void {
    if (global_ascii_buffer) |buffer| {
        allocator.free(buffer);
        global_ascii_buffer = null;
    }
}
```

2. Modify the `renderToAscii` function to use the preallocated buffer:

```zig
pub fn renderToAscii(allocator: std.mem.Allocator, img: Image, params: RenderParams) ![]u8 {
    // Use global buffer if available
    if (global_ascii_buffer) |buffer| {
        if (buffer.len == img.width * img.height * img.channels) {
            // Buffer is correct size, continue rendering to it
            // (rendering logic remains the same, but we return the global buffer)
            
            // ... existing rendering code ...
            
            return buffer;
        }
    }
    
    // Fall back to allocating a new buffer
    // ... existing allocation code ...
}
```

3. Update initialization in `main.zig`:

```zig
// In init() function:
try renderer.preallocateAsciiBuffer(allocator, PIXEL_WIDTH, PIXEL_HEIGHT * 3);

// In deinit() function:
renderer.freeAsciiBuffer(allocator);
```

### Expected Outcome
- Elimination of per-frame allocation/deallocation
- Reduced garbage collection pauses
- More consistent frame rates

## 3. Batch WebGL Calls

### Why
Crossing the Wasm-JS boundary for each WebGL call introduces overhead. Batching these calls can significantly improve performance.

### Implementation

1. Modify `webgl.js` to accept batched commands:

```javascript
// Add new function for batched rendering
function executeBatchedCommands(commandBuffer, width, height, zigMemory) {
    if (!gl || !texture) {
        console.error('WebGL not initialized');
        return false;
    }
    
    // Parse command buffer from WASM memory
    const buffer = new Uint8Array(zigMemory.buffer);
    const commands = new Uint32Array(buffer.buffer, commandBuffer, 1);
    const numCommands = commands[0];
    
    // Command format: [opcode, param1, param2, ...] 
    const commandData = new Uint32Array(buffer.buffer, commandBuffer + 4, numCommands * 4);
    
    // Execute commands in batch
    for (let i = 0; i < numCommands; i++) {
        const cmdIndex = i * 4;
        const opcode = commandData[cmdIndex];
        
        switch(opcode) {
            case 1: // Texture upload
                const dataPtr = commandData[cmdIndex + 1];
                const frameData = buffer.subarray(dataPtr, dataPtr + width * height * 3);
                
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(
                    gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, 
                    gl.RGB, gl.UNSIGNED_BYTE, frameData
                );
                break;
                
            case 2: // Draw call
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                break;
                
            // Add more command types as needed
        }
    }
    
    return true;
}

// Export new function
window.AsciiFlappyWebGL.executeBatch = executeBatchedCommands;
```

2. Add command buffer structure in Zig:

```zig
// In renderer.zig
const WebGLCommand = enum(u32) {
    UploadTexture = 1,
    DrawArrays = 2,
};

pub const CommandBuffer = struct {
    commands: []u32,
    count: usize,
    capacity: usize,
    
    pub fn init(allocator: std.mem.Allocator, capacity: usize) !CommandBuffer {
        const commands = try allocator.alloc(u32, capacity * 4 + 1);
        return CommandBuffer{
            .commands = commands,
            .count = 0,
            .capacity = capacity,
        };
    }
    
    pub fn deinit(self: *CommandBuffer, allocator: std.mem.Allocator) void {
        allocator.free(self.commands);
    }
    
    pub fn reset(self: *CommandBuffer) void {
        self.count = 0;
    }
    
    pub fn addTextureCommand(self: *CommandBuffer, data_ptr: [*]const u8) void {
        if (self.count >= self.capacity) return;
        
        const index = self.count * 4 + 1;
        self.commands[index] = @enumToInt(WebGLCommand.UploadTexture);
        self.commands[index + 1] = @ptrToInt(data_ptr);
        self.count += 1;
    }
    
    pub fn addDrawCommand(self: *CommandBuffer) void {
        if (self.count >= self.capacity) return;
        
        const index = self.count * 4 + 1;
        self.commands[index] = @enumToInt(WebGLCommand.DrawArrays);
        self.count += 1;
    }
    
    pub fn getBufferPtr(self: *CommandBuffer) [*]u32 {
        self.commands[0] = @intCast(u32, self.count);
        return self.commands.ptr;
    }
};

// Add to GameData in main.zig
command_buffer: renderer.CommandBuffer,

// Initialize in init()
command_buffer = try renderer.CommandBuffer.init(allocator, 10),

// Clean up in deinit()
game.command_buffer.deinit(allocator);
```

3. Update rendering to use batched commands in `main.zig`:

```zig
// Replace direct JS calls with command buffer in drawGame()
extern "env" fn executeBatchedCommands(cmd_ptr: [*]u32, width: u32, height: u32) void;

fn drawGame() void {
    // Clear the command buffer
    game.command_buffer.reset();
    
    // ... existing rendering code ...
    
    if (game.ascii_renderer.use_ascii) {
        // Render to ASCII
        game.ascii_output = renderer.renderToAscii(allocator, game.game_image, game.ascii_renderer) catch {
            logString("Failed to render ASCII");
            return;
        };
        
        // Add commands to buffer
        game.command_buffer.addTextureCommand(game.ascii_output.ptr);
        game.command_buffer.addDrawCommand();
        
        // Execute batched commands
        executeBatchedCommands(
            game.command_buffer.getBufferPtr(), 
            @intCast(u32, PIXEL_WIDTH), 
            @intCast(u32, PIXEL_HEIGHT)
        );
    } else {
        // Direct rendering path
        game.command_buffer.addTextureCommand(game.game_image.data.ptr);
        game.command_buffer.addDrawCommand();
        
        executeBatchedCommands(
            game.command_buffer.getBufferPtr(),
            @intCast(u32, PIXEL_WIDTH),
            @intCast(u32, PIXEL_HEIGHT)
        );
    }
}
```

4. Update `index.html` to expose new function:

```javascript
// Add to imports.env
executeBatchedCommands: (cmdPtr, width, height) => {
    window.AsciiFlappyWebGL.executeBatch(cmdPtr, width, height, zigModule.memory);
},
```

### Expected Outcome
- Reduced Wasm-JS boundary crossings
- Better rendering performance, especially during animations
- Lower CPU usage

## 4. Single-Pass ASCII Rendering 

### Why
The current rendering may be performing multiple passes over image data. A single-pass algorithm would be more efficient.

### Implementation

Optimize the `renderToAscii` function in `renderer.zig`:

```zig
pub fn renderToAscii(allocator: std.mem.Allocator, img: Image, params: RenderParams) ![]u8 {
    // Use preallocated buffer or allocate new one
    var output_buffer = if (global_ascii_buffer) |buffer| 
                            buffer 
                         else 
                            try allocator.alloc(u8, img.width * img.height * img.channels);
    
    // Process pixels in a single pass with minimal branching
    const block_size = params.block_size;
    var y: usize = 0;
    while (y < img.height) : (y += block_size) {
        var x: usize = 0;
        while (x < img.width) : (x += block_size) {
            // Get average brightness in block
            var brightness: f32 = 0.0;
            var num_pixels: usize = 0;
            
            // Sum brightness in block
            const max_y = @min(y + block_size, img.height);
            const max_x = @min(x + block_size, img.width);
            
            var by: usize = y;
            while (by < max_y) : (by += 1) {
                var bx: usize = x;
                while (bx < max_x) : (bx += 1) {
                    const pixel_index = (by * img.width + bx) * img.channels;
                    const r = img.data[pixel_index];
                    const g = img.data[pixel_index + 1];
                    const b = img.data[pixel_index + 2];
                    
                    // Convert to grayscale using weighted formula
                    const gray = 0.299 * @intToFloat(f32, r) + 
                                 0.587 * @intToFloat(f32, g) + 
                                 0.114 * @intToFloat(f32, b);
                    
                    brightness += gray;
                    num_pixels += 1;
                }
            }
            
            brightness = if (num_pixels > 0) brightness / @intToFloat(f32, num_pixels) else 0;
            brightness = brightness * params.brightness_boost;
            
            // Map brightness to ASCII character
            const char_index = mapBrightnessToAscii(brightness, params);
            
            // Write ASCII representation to output
            const output_block = createAsciiBlock(img, x, y, max_x, max_y, params, char_index);
            
            // Write block to output buffer
            for (by = y; by < max_y; by += 1) {
                for (bx = x; bx < max_x; bx += 1) {
                    const out_index = (by * img.width + bx) * img.channels;
                    output_buffer[out_index] = output_block.color[0];
                    output_buffer[out_index + 1] = output_block.color[1];
                    output_buffer[out_index + 2] = output_block.color[2];
                }
            }
        }
    }
    
    return output_buffer;
}
```

### Expected Outcome
- Faster ASCII rendering
- More efficient memory access patterns
- Reduced computational load

## 5. Minimize Exported Functions

### Why
Each exported function creates overhead. Reducing the number of exported functions can improve initialization time and reduce memory usage.

### Implementation

1. Review and consolidate exported functions in `main.zig`:

```zig
// Combine related functions
export fn handleInput(input_type: u32, x: f32, y: f32) void {
    switch (input_type) {
        0 => handleJump(), // Jump
        1 => handleClick(x, y), // Click
        2 => togglePause(), // Pause
        else => {},
    }
}

// Replace individual export functions with the combined version
// Remove these exports:
// export fn handleJump() void
// export fn handleClick(x_pos: f32, y_pos: f32) void
// export fn togglePause() void
```

2. Update `index.html` to use the combined function:

```javascript
// Update event handlers
function handleJump() {
    if (!zigModule) return;
    zigModule.handleInput(0, 0, 0); // Jump
}

function handleCanvasClick(event) {
    if (!zigModule || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    zigModule.handleInput(1, x, y); // Click
}

function togglePause() {
    if (!zigModule) return;
    zigModule.handleInput(2, 0, 0); // Pause
}
```

### Expected Outcome
- Reduced overhead in the WebAssembly module
- Smaller module size
- Faster initialization

## Implementation Priority

For maximum benefit with minimal effort, implement these optimizations in the following order:

1. **AOT Optimization** - Simplest change with potentially large impact
2. **Preallocate ASCII Frame Buffer** - Addresses memory allocation issues
3. **Minimize Exported Functions** - Relatively simple code changes
4. **Single-Pass ASCII Rendering** - More involved but significant performance boost
5. **Batch WebGL Calls** - Most complex but potentially largest performance improvement

## Measuring Success

After implementing each optimization:

1. Measure startup time before and after
2. Compare frame rate stability especially during the first 5-10 seconds
3. Monitor memory usage patterns
4. Check for any rendering glitches or behavior changes

Collect this data to determine which optimizations had the most impact and to guide further performance tuning. 