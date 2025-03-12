// ASCII FlappyBird
// A simple FlappyBird-style game built with Zig v0.14 targeting WebAssembly

const std = @import("std");

// WASM imports for browser interaction
extern "env" fn consoleLog(ptr: [*]const u8, len: usize) void;
extern "env" fn clearCanvas() void;
extern "env" fn drawRect(x: f32, y: f32, width: f32, height: f32, r: u8, g: u8, b: u8) void;

// Additional drawing functions we'll need to implement in JavaScript
extern "env" fn drawCircle(x: f32, y: f32, radius: f32, r: u8, g: u8, b: u8, fill: bool) void;
extern "env" fn drawLine(x1: f32, y1: f32, x2: f32, y2: f32, thickness: f32, r: u8, g: u8, b: u8) void;
extern "env" fn drawTriangle(x1: f32, y1: f32, x2: f32, y2: f32, x3: f32, y3: f32, r: u8, g: u8, b: u8, fill: bool) void;
extern "env" fn drawText(x: f32, y: f32, text_ptr: [*]const u8, text_len: usize, size: f32, r: u8, g: u8, b: u8) void;

// Audio functions
extern "env" fn playJumpSound() void;
extern "env" fn playExplodeSound() void;
extern "env" fn playFailSound() void;

// Game constants
const GRAVITY: f32 = 1200.0;
const JUMP_VELOCITY: f32 = -400.0;
const BIRD_SIZE: f32 = 30.0;
const PIPE_WIDTH: f32 = 80.0;
const PIPE_GAP: f32 = 200.0;
const PIPE_SPEED: f32 = 200.0;
const PIPE_SPAWN_INTERVAL: f32 = 1.5;

// Game state enum
const GameState = enum {
    Menu,
    Playing,
    Paused,
    GameOver,
};

// Bird structure
const Bird = struct {
    x: f32,
    y: f32,
    velocity: f32,
    rotation: f32,

    fn init(x: f32, y: f32) Bird {
        return Bird{
            .x = x,
            .y = y,
            .velocity = 0,
            .rotation = 0,
        };
    }

    fn update(self: *Bird, delta_time: f32) void {
        // Apply gravity
        self.velocity += GRAVITY * delta_time;

        // Update position
        self.y += self.velocity * delta_time;

        // Update rotation based on velocity
        self.rotation = std.math.clamp(self.velocity * 0.1, -45.0, 45.0);
    }

    fn jump(self: *Bird) void {
        self.velocity = JUMP_VELOCITY;
        playJumpSound();
    }
};

// Pipe structure
const Pipe = struct {
    x: f32,
    gap_y: f32,
    active: bool,
    passed: bool,

    fn init(x: f32, gap_y: f32) Pipe {
        return Pipe{
            .x = x,
            .gap_y = gap_y,
            .active = true,
            .passed = false,
        };
    }

    fn update(self: *Pipe, delta_time: f32) void {
        if (!self.active) return;

        // Move pipe to the left
        self.x -= PIPE_SPEED * delta_time;

        // Deactivate if off screen
        if (self.x < -PIPE_WIDTH) {
            self.active = false;
        }
    }
};

// Game data structure
const GameData = struct {
    state: GameState,
    bird: Bird,
    pipes: [10]Pipe,
    pipe_count: usize,
    spawn_timer: f32,
    score: u32,
    high_score: u32,
    random_seed: u32,

    fn init() GameData {
        return GameData{
            .state = GameState.Menu,
            .bird = Bird.init(200, 300),
            .pipes = undefined,
            .pipe_count = 0,
            .spawn_timer = 0,
            .score = 0,
            .high_score = 0,
            .random_seed = 12345,
        };
    }

    // Simple random number generator
    fn random(self: *GameData) u32 {
        self.random_seed = self.random_seed *% 1664525 +% 1013904223;
        return self.random_seed;
    }

    // Get random value in range [min, max)
    fn randomInRange(self: *GameData, min: u32, max: u32) u32 {
        return min + (self.random() % (max - min));
    }

    fn reset(self: *GameData) void {
        // Update high score if needed
        if (self.score > self.high_score) {
            self.high_score = self.score;
        }

        // Reset game state
        self.bird = Bird.init(200, 300);
        self.pipe_count = 0;
        self.spawn_timer = 0;
        self.score = 0;
        self.state = GameState.Playing;
    }

    fn addPipe(self: *GameData) void {
        if (self.pipe_count >= self.pipes.len) return;

        // Random gap position between 150 and canvas_height - 150
        const min_gap_y: u32 = 150;
        const max_gap_y: u32 = @intFromFloat(canvas_height - 150);
        const gap_y = @as(f32, @floatFromInt(self.randomInRange(min_gap_y, max_gap_y)));

        self.pipes[self.pipe_count] = Pipe.init(canvas_width, gap_y);
        self.pipe_count += 1;
    }
};

// Global state
var canvas_width: f32 = 800;
var canvas_height: f32 = 600;
var game: GameData = undefined;

// Helper to log strings to browser console
fn logString(msg: []const u8) void {
    consoleLog(msg.ptr, msg.len);
}

// Initialize the WASM module
export fn init(width: f32, height: f32) void {
    canvas_width = width;
    canvas_height = height;

    // Initialize game data
    game = GameData.init();

    logString("ASCII FlappyBird initialized");
}

// Start or reset the game
export fn resetGame() void {
    game.reset();
    logString("Game reset");
}

// Update animation frame
export fn update(delta_time: f32) void {
    if (game.state != GameState.Playing) {
        drawMenu();
        return;
    }

    // Clear canvas
    clearCanvas();

    // Update game logic
    updateGame(delta_time);

    // Draw game elements
    drawBackground();
    drawPipes();
    drawBird();
    drawUI();
}

// Handle jump (spacebar or click)
export fn handleJump() void {
    if (game.state == GameState.Menu) {
        // Start game if in menu
        game.state = GameState.Playing;
        return;
    }

    if (game.state == GameState.Paused) {
        // Resume game if paused
        game.state = GameState.Playing;
        return;
    }

    if (game.state == GameState.GameOver) {
        // Reset game if game over
        resetGame();
        return;
    }

    // Make the bird jump
    game.bird.jump();
}

// Handle mouse click
export fn handleClick(_: f32, _: f32) void {
    // Just call handleJump for any click
    handleJump();
}

// Update game logic
fn updateGame(delta_time: f32) void {
    // Update bird
    game.bird.update(delta_time);

    // Check for collision with floor or ceiling
    const hit_ceiling = game.bird.y < 0;
    const hit_floor = game.bird.y > canvas_height;

    if (hit_ceiling or hit_floor) {
        gameOver();
        return;
    }

    // Update pipes and spawn new ones
    game.spawn_timer += delta_time;
    if (game.spawn_timer >= PIPE_SPAWN_INTERVAL) {
        game.spawn_timer = 0;
        game.addPipe();
    }

    var i: usize = 0;
    while (i < game.pipe_count) {
        var pipe = &game.pipes[i];
        pipe.update(delta_time);

        // Check for collision with pipe
        if (checkCollision(game.bird, pipe.*)) {
            gameOver();
            return;
        }

        // Check if bird passed the pipe
        if (!pipe.passed and game.bird.x > pipe.x + PIPE_WIDTH) {
            pipe.passed = true;
            game.score += 1;

            // Log score for debugging
            var score_buf: [32]u8 = undefined;
            const score_msg = std.fmt.bufPrint(&score_buf, "Score: {d}", .{game.score}) catch "Score updated";
            logString(score_msg);
        }

        // Remove inactive pipes
        if (!pipe.active) {
            game.pipes[i] = game.pipes[game.pipe_count - 1];
            game.pipe_count -= 1;
        } else {
            i += 1;
        }
    }
}

// Check collision between bird and pipe
fn checkCollision(bird: Bird, pipe: Pipe) bool {
    // Bird hitbox (simplified as a circle)
    const bird_radius = BIRD_SIZE / 2;

    // Check if bird is within pipe's x-range
    const bird_right = bird.x + bird_radius;
    const bird_left = bird.x - bird_radius;
    const pipe_right = pipe.x + PIPE_WIDTH;

    const is_within_x_range = bird_right > pipe.x and bird_left < pipe_right;

    if (is_within_x_range) {
        // Check if bird is outside the gap
        const bird_top = bird.y - bird_radius;
        const bird_bottom = bird.y + bird_radius;
        const gap_top = pipe.gap_y - PIPE_GAP / 2;
        const gap_bottom = pipe.gap_y + PIPE_GAP / 2;

        const is_above_gap = bird_top < gap_top;
        const is_below_gap = bird_bottom > gap_bottom;

        if (is_above_gap or is_below_gap) {
            return true;
        }
    }

    return false;
}

// Game over
fn gameOver() void {
    game.state = GameState.GameOver;
    playFailSound();
    logString("Game Over!");
}

// Draw background
fn drawBackground() void {
    // Draw sky
    drawRect(0, 0, canvas_width, canvas_height, 135, 206, 235);

    // Draw ground
    drawRect(0, canvas_height - 50, canvas_width, 50, 83, 54, 10);

    // Draw grass
    drawRect(0, canvas_height - 50, canvas_width, 5, 34, 139, 34);
}

// Draw the bird
fn drawBird() void {
    // Draw bird body (circle)
    drawCircle(game.bird.x, game.bird.y, BIRD_SIZE / 2, 255, 255, 0, true);

    // Draw bird eye
    drawCircle(game.bird.x + 8, game.bird.y - 5, 5, 0, 0, 0, true);

    // Draw bird beak
    drawTriangle(game.bird.x + 15, game.bird.y, game.bird.x + 5, game.bird.y - 5, game.bird.x + 5, game.bird.y + 5, 255, 165, 0, true);
}

// Draw all pipes
fn drawPipes() void {
    for (game.pipes[0..game.pipe_count]) |pipe| {
        if (!pipe.active) continue;

        // Draw top pipe
        drawRect(pipe.x, 0, PIPE_WIDTH, pipe.gap_y - PIPE_GAP / 2, 0, 128, 0);

        // Draw pipe cap
        drawRect(pipe.x - 5, pipe.gap_y - PIPE_GAP / 2 - 10, PIPE_WIDTH + 10, 10, 0, 100, 0);

        // Draw bottom pipe
        drawRect(pipe.x, pipe.gap_y + PIPE_GAP / 2, PIPE_WIDTH, canvas_height - (pipe.gap_y + PIPE_GAP / 2), 0, 128, 0);

        // Draw pipe cap
        drawRect(pipe.x - 5, pipe.gap_y + PIPE_GAP / 2, PIPE_WIDTH + 10, 10, 0, 100, 0);
    }
}

// Draw game UI
fn drawUI() void {
    // Draw score
    var score_text_buf: [32]u8 = undefined;
    const score_text = std.fmt.bufPrint(&score_text_buf, "Score: {d}", .{game.score}) catch "Score: ???";
    drawText(10, 40, score_text.ptr, score_text.len, 24, 255, 255, 255);

    // Draw high score
    var high_score_text_buf: [32]u8 = undefined;
    const high_score_text = std.fmt.bufPrint(&high_score_text_buf, "High Score: {d}", .{game.high_score}) catch "High Score: ???";
    drawText(10, 70, high_score_text.ptr, high_score_text.len, 18, 255, 255, 255);

    // Draw game over message if applicable
    if (game.state == GameState.GameOver) {
        const game_over_text = "GAME OVER - Press Space to restart";
        drawText(canvas_width / 2 - 200, canvas_height / 2, game_over_text.ptr, game_over_text.len, 30, 255, 0, 0);
    }
}

// Draw menu screen
fn drawMenu() void {
    // Clear canvas
    clearCanvas();

    // Draw background
    drawBackground();

    // Draw title
    const title_text = "ASCII FLAPPY BIRD";
    drawText(canvas_width / 2 - 150, canvas_height / 2 - 50, title_text.ptr, title_text.len, 36, 255, 255, 255);

    // Draw start instruction
    const start_text = "Press Space to Start";
    drawText(canvas_width / 2 - 120, canvas_height / 2 + 50, start_text.ptr, start_text.len, 24, 255, 255, 255);

    // Draw bird
    drawCircle(canvas_width / 2, canvas_height / 2, BIRD_SIZE / 2, 255, 255, 0, true);
    drawCircle(canvas_width / 2 + 8, canvas_height / 2 - 5, 5, 0, 0, 0, true);
    drawTriangle(canvas_width / 2 + 15, canvas_height / 2, canvas_width / 2 + 5, canvas_height / 2 - 5, canvas_width / 2 + 5, canvas_height / 2 + 5, 255, 165, 0, true);
}

// Toggle pause state
export fn togglePause() void {
    if (game.state == GameState.Playing) {
        game.state = GameState.Paused;
        logString("Game paused");
    } else if (game.state == GameState.Paused) {
        game.state = GameState.Playing;
        logString("Game resumed");
    }
}
