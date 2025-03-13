// WebGL utilities for ASCII Flappy Bird
// This file handles WebGL initialization and rendering

// WebGL context and resources
let gl = null;
let program = null;
let positionBuffer = null;
let texture = null;

// Check if WebGL is supported by the browser
function isWebGLSupported() {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
}

// Initialize WebGL context and resources
function initWebGL(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas element not found');
        return null;
    }
    
    // Get WebGL context
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return null;
    }
    
    // Create shader program
    program = createShaderProgram(gl);
    if (!program) {
        console.error('Failed to create shader program');
        return null;
    }
    
    // Set up buffers and textures
    setupBuffers(gl);
    texture = setupTexture(gl);
    
    // Use the shader program
    gl.useProgram(program);
    
    // Set up viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    return {
        gl: gl,
        program: program,
        texture: texture
    };
}

// Create shader program
function createShaderProgram(gl) {
    // Vertex shader source
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        varying highp vec2 vTextureCoord;
        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;
    
    // Fragment shader source
    const fsSource = `
        varying highp vec2 vTextureCoord;
        uniform sampler2D uSampler;
        void main(void) {
            gl_FragColor = texture2D(uSampler, vTextureCoord);
        }
    `;
    
    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // Check if program linked successfully
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

// Create shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    // Check if shader compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Set up vertex and texture coordinate buffers
function setupBuffers(gl) {
    // Create buffer for vertex positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Quad vertices (full screen)
    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Set up vertex attribute
    const positionAttributeLocation = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Create buffer for texture coordinates
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    
    // Texture coordinates
    const textureCoordinates = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    
    // Set up texture coordinate attribute
    const texCoordAttributeLocation = gl.getAttribLocation(program, 'aTextureCoord');
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
}

// Set up texture
function setupTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Fill texture with a placeholder (1x1 black pixel)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
}

// Render a frame
function renderFrame(gl, texture) {
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Render ASCII frame using WebGL
function renderAsciiFrameWebGL(ptr, width, height, zigMemory) {
    if (!gl || !program || !texture) {
        console.error('WebGL not initialized');
        return false;
    }
    
    // Get the ASCII frame data from WASM memory
    const buffer = new Uint8Array(zigMemory.buffer);
    const frameData = buffer.subarray(ptr, ptr + width * height * 3);
    
    // Set viewport and use program
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);
    
    // Upload texture data
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,                // level
        gl.RGB,           // internal format
        width,            // width
        height,           // height
        0,                // border
        gl.RGB,           // format
        gl.UNSIGNED_BYTE, // type
        frameData         // data
    );
    
    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    return true;
}

// WebGL constants to match those in the Zig code
const GL_TEXTURE_2D = 0x0DE1;
const GL_RGB = 0x1907;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_TRIANGLE_STRIP = 0x0005;

// Export functions
window.AsciiFlappyWebGL = {
    init: initWebGL,
    render: renderAsciiFrameWebGL,
    isSupported: isWebGLSupported,
    // Export constants
    GL_TEXTURE_2D: GL_TEXTURE_2D,
    GL_RGB: GL_RGB,
    GL_UNSIGNED_BYTE: GL_UNSIGNED_BYTE,
    GL_TRIANGLE_STRIP: GL_TRIANGLE_STRIP
}; 