// TODO: expose as uniform
const float frequency = 0.001;

// TODO: Make czm_ function.
// From http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 czm_getFilter(czm_FilterInput filterInput)
{
    float noiseValue = rand(filterInput.st + sin(czm_frameNumber * frequency)) * 0.1;
    vec3 rgb = texture2D(czm_color, filterInput.st).rgb;
    const vec3 green = vec3(0.0, 1.0, 0.0);

    return vec4((noiseValue + rgb) * green, 1.0);
}