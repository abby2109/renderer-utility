const vertexShaderScript = `
attribute vec4 vertexPos;
attribute vec4 texturePos;
varying vec2 textureCoord;

void main()
{
    gl_Position = vertexPos;
    textureCoord = texturePos.xy;
}
`;

export default vertexShaderScript;
