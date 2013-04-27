vec4 czm_getFilter(czm_FilterInput filterInput)
{
    float gradations = 5.0;
    vec3 rgb = texture2D(czm_color, filterInput.st).rgb;
    float luminance = czm_luminance(rgb);

    float darkness = luminance * gradations;
    darkness = (darkness - fract(darkness)) / gradations;

    return vec4(vec3(darkness), 1.0);
}