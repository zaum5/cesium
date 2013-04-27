/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     */
    function createGlowFragmentShaderSource(fragmentShaderSource) {
        if (typeof fragmentShaderSource === 'undefined') {
            throw new DeveloperError('fragmentShaderSource is required.');
        }

        var renamedFS = fragmentShaderSource.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_old_main()');
        var main =
            'void main() \n' +
            '{ \n' +
            '    czm_old_main(); \n' +
            '    if (gl_FragColor.a == 0.0) { \n' +
            '        discard; \n' +
            '    } \n' +
            '    gl_FragColor = vec4(1.0); \n' +
            '}';

        return renamedFS + '\n' + main;
    }

    return createGlowFragmentShaderSource;
});
