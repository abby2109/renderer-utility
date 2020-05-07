import vertexShaderScript from './vertical-shader';
import fragmentShaderScript from './fragment-shader';

class Renderer {
  constructor(canvas) {
    if (canvas === null || canvas === undefined) {
      throw new Error('Please try passing a valid can element');
    }

    this.canvas = canvas;
    this.xStart = 0;
    this.yStart = 0;
    this.gl = this.canvas.getContext('webgl');
    if (this.gl === undefined || this.gl === null) {
      throw new Error('Failed to get the WebGL context');
    }
    this.compileVerticalShader();
    this.compileFragmentShader();
    this.createProgram();
    this.initializeBuffers();
    this.initializeTextures();
  }

  compileVerticalShader() {
    this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(this.vertexShader, vertexShaderScript);
    this.gl.compileShader(this.vertexShader);
    if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
      throw new Error(`Vertex shader failed to compile: ${this.gl.getShaderInfoLog(this.vertexShader)}`);
    }
  }

  compileFragmentShader() {
    this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(this.fragmentShader, fragmentShaderScript);
    this.gl.compileShader(this.fragmentShader);
    if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
      throw new Error(`Fragment shader failed to compile: ${this.gl.getShaderInfoLog(this.fragmentShader)}`);
    }
  }

  createProgram() {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, this.vertexShader);
    this.gl.attachShader(program, this.fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(`Program failed to compile: ${this.gl.getProgramInfoLog(program)}`);
    }

    this.gl.useProgram(program);

    this.shaderProgram = program;
  }

  /**
* Initialize vertex buffers and attach to shader program
*/
  initializeBuffers() {
    const vertexPosBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexPosBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER,
      new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]),
      this.gl.STATIC_DRAW);

    const vertexPosRef = this.gl.getAttribLocation(this.shaderProgram, 'vertexPos');
    this.gl.enableVertexAttribArray(vertexPosRef);
    this.gl.vertexAttribPointer(vertexPosRef, 2, this.gl.FLOAT, false, 0, 0);

    const texturePosBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texturePosBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER,
      new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]),
      this.gl.STATIC_DRAW);

    const texturePosRef = this.gl.getAttribLocation(this.shaderProgram, 'texturePos');
    this.gl.enableVertexAttribArray(texturePosRef);
    this.gl.vertexAttribPointer(texturePosRef, 2, this.gl.FLOAT, false, 0, 0);

    this.texturePosBuffer = texturePosBuffer;
  }

  /**
 * Initialize GL textures and attach to shader program
 */
  initializeTextures() {
    const yTextureRef = this.initTexture();
    const ySamplerRef = this.gl.getUniformLocation(this.shaderProgram, 'ySampler');
    this.gl.uniform1i(ySamplerRef, 0);
    this.yTextureRef = yTextureRef;

    const uTextureRef = this.initTexture();
    const uSamplerRef = this.gl.getUniformLocation(this.shaderProgram, 'uSampler');
    this.gl.uniform1i(uSamplerRef, 1);
    this.uTextureRef = uTextureRef;

    const vTextureRef = this.initTexture();
    const vSamplerRef = this.gl.getUniformLocation(this.shaderProgram, 'vSampler');
    this.gl.uniform1i(vSamplerRef, 2);
    this.vTextureRef = vTextureRef;
  }

  /**
 * Create and configure a single texture
 */
  initTexture() {
    const textureRef = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureRef);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    return textureRef;
  }

  /**
 * Draw picture data to the canvas using WebGL.
 * The data must be an I420 formatted ArrayBuffer,
 */

  drawNextOuptutPictureGL(width, height, remoteWidth, remoteHeight, croppingParams, data) {
    if (croppingParams === null) {
      this.gl.viewport(this.xStart, this.yStart, width, height);
    } else {
      this.gl.viewport(0, 0, croppingParams.width, croppingParams.height);

      const tTop = croppingParams.top / height;
      const tLeft = croppingParams.left / width;
      const tBottom = croppingParams.height / height;
      const tRight = croppingParams.width / width;
      const texturePosValues = new Float32Array([tRight, tTop, tLeft,
        tTop, tRight, tBottom, tLeft, tBottom]);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texturePosBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, texturePosValues, this.gl.DYNAMIC_DRAW);
    }

    const i420Data = data;

    const yDataLength = remoteWidth * remoteHeight;
    const yData = i420Data.subarray(0, yDataLength);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTextureRef);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE,
      remoteWidth, remoteHeight, 0, this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE, yData);

    const cbDataLength = (remoteWidth / 2) * (remoteHeight / 2);
    const cbData = i420Data.subarray(yDataLength, yDataLength + cbDataLength);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTextureRef);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE,
      remoteWidth / 2, remoteHeight / 2, 0, this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE, cbData);

    const crDataLength = cbDataLength;
    const crData = i420Data.subarray(yDataLength + cbDataLength,
      yDataLength + cbDataLength + crDataLength);
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTextureRef);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE,
      remoteWidth / 2, remoteHeight / 2, 0, this.gl.LUMINANCE,
      this.gl.UNSIGNED_BYTE, crData);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}


export default Renderer;
