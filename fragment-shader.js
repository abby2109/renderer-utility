const fragmentShaderScript = `
precision highp float;
varying highp vec2 textureCoord;
uniform sampler2D ySampler;
uniform sampler2D uSampler;
uniform sampler2D vSampler;
const mat4 YUV2RGB = mat4
(
    1.1643828125, 0, 1.59602734375, -.87078515625,
    1.1643828125, -.39176171875, -.81296875, .52959375,
    1.1643828125, 2.017234375, 0, -1.081390625,
    0, 0, 0, 1
);
void main(void) {
    highp float y = texture2D(ySampler,  textureCoord).r;
    highp float u = texture2D(uSampler,  textureCoord).r;
    highp float v = texture2D(vSampler,  textureCoord).r;
    gl_FragColor = vec4(y, u, v, 1) * YUV2RGB;
}
`;

export default fragmentShaderScript;
