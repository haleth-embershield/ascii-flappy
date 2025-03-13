// WebGL utilities for ASCII Flappy Bird
// This file handles WebGL initialization and rendering

// WebGL context and resources
let gl = null;
let program = null;
let positionBuffer = null;
let texture = null;

// Initialize WebGL
function initWebGL(canvas) {
    // Try to get WebGL context
    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported or disabled');
        return false;
    }

    // Create shader program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
        attribute vec4 a_position;
        attribute vec2 a_texcoord;
        varying vec2 v_texcoord;
        void main() {
            gl_Position = a_position;
            v_texcoord = a_texcoord;
        }
    `);

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_texcoord;
        void main() {
            gl_FragColor = texture2D(u_texture, v_texcoord);
        }
    `);

    // Create program
    program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        return false;
    }

    // Look up attribute locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');

    // Create position buffer (full-screen quad)
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        // positions    // texture coordinates
        -1, -1,         0, 0,
        -1,  1,         0, 1,
         1, -1,         1, 0,
         1,  1,         1, 1,
    ]), gl.STATIC_DRAW);

    // Create texture
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Set up vertex attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 16, 8);

    return true;
}

// Create shader from source
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    // Check if compilation was successful
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        console.error('Could not compile shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Create program from shaders
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // Check if linking was successful
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error('Could not link program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
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

// Check if WebGL is supported
function isWebGLSupported() {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
}

// Export functions
window.AsciiFlappyWebGL = {
    init: initWebGL,
    render: renderAsciiFrameWebGL,
    isSupported: isWebGLSupported
}; 