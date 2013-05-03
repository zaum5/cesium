/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PassCommand = function(shaderProgram, uniformMap) {
        /**
         * The shader program to apply.
         *
         * @type ShaderProgram
         * @default undefined
         */
        this.shaderProgram = shaderProgram;

        /**
         * An object with functions whose names match the uniforms in the shader program
         * and return values to set those uniforms.
         *
         * @type Object
         * @default undefined
         */
        this.uniformMap = uniformMap;
    };

    return PassCommand;
});