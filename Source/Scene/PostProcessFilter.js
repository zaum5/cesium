/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Shaders/ViewportQuadVS',
    ], function(
        DeveloperError,
        destroyObject,
        ViewportQuadVS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PostProcessFilter = function(touchUp) {
        if (typeof touchUp === 'undefined') {
            throw new DeveloperError('touchUp is required.');
        }
// TODO: validate touchUp

// TODO: make public and readonly
        this._touchUp = touchUp;

        /**
         * @private
         */
        this.shaderProgram = undefined;

        /**
         * @private
         */
        this.uniformMap = undefined;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    PostProcessFilter.prototype.update = function(context) {
        if (typeof this.shaderProgram === 'undefined') {
            var fs =
                'uniform sampler2D czm_color; \n' +             // Allow czm_getFilter direct access since GLSL ES doesn't allow samplers in structs.
                'uniform vec2 u_postprocessColorStep; \n' +     // private
                'varying vec2 v_textureCoordinates; \n' +       // private
                '#line 0 \n' +
                this._touchUp.source + '\n' +
                'void main(void) \n' +
                '{ \n' +
                '    czm_FilterInput filterInput; \n' +
                '    filterInput.colorStep = u_postprocessColorStep; \n' +
                '    filterInput.st = v_textureCoordinates; \n' +
                '    gl_FragColor = czm_getFilter(filterInput); \n' +
                '}';

            this.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, fs, attributeIndices);
        }
// TODO: expose uniformMap
    };

    PostProcessFilter.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessFilter.prototype.destroy = function() {
        this.shaderProgram = this.shaderProgram && this.shaderProgram.release();

        return destroyObject(this);
    };

    return PostProcessFilter;
});
