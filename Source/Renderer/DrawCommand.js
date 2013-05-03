/*global define*/
define([
        '../Core/DeveloperError',
        './PassCommand'
    ], function(
        DeveloperError,
        PassCommand) {
    "use strict";

    /**
     * Represents a command to the renderer for drawing.
     *
     * @alias DrawCommand
     * @constructor
     *
     * @see ClearCommand
     * @see PassState
     */
    var DrawCommand = function() {
        /**
         * The bounding volume of the geometry.
         * @type DOC_TBA
         */
        this.boundingVolume = undefined;

        /**
         * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
         * If the command was already culled, set this to <code>false</code> for a performance improvement.
         *
         * @type Boolean
         * @default true
         */
        this.cull = true;

        /**
         * The transformation from the geometry in model space to world space.
         * @type Matrix4
         */
        this.modelMatrix = undefined;

        /**
         * The type of geometry in the vertex array.
         * @type PrimitiveType
         */
        this.primitiveType = undefined;

        /**
         * The vertex array.
         * @type VertexArray
         */
        this.vertexArray = undefined;

        /**
         * The number of vertices to draw in the vertex array.
         * @type Number
         */
        this.count = undefined;

        /**
         * The offset to start drawing in the vertex array.
         * @type Number
         */
        this.offset = undefined;

        /**
         * DOC_TBA
         */
        this.passCommand = undefined;

        this.passes = {
            /**
             * DOC_TBA
             */
            color : undefined,
            /**
             * DOC_TBA
             */
            glow : undefined,
            /**
             * DOC_TBA
             */
            pick : undefined,
            /**
             * DOC_TBA
             */
            overlay : undefined
        };

        this._shaderProgram = undefined;
        this._uniformMap = undefined;

        /**
         * The render state.
         * @type Object
         *
         * @see Context#createRenderState
         */
        this.renderState = undefined;

        /**
         * The framebuffer to draw to.
         * @type Framebuffer
         */
        this.framebuffer = undefined;

        /**
         * Specifies if this command is only to be executed in the frustum closest
         * to the eye containing the bounding volume. Defaults to <code>false</code>.
         * @type Boolean
         */
        this.executeInClosestFrustum = false;
    };

    /**
     * Executes the draw command.
     *
     * @memberof DrawCommand
     *
     * @param {Context} context The renderer context in which to draw.
     * @param {PassState} [passState] TBA.
     */
    DrawCommand.prototype.execute = function(context, passState) {

// TODO: pass passCommand to draw(); instead of this hack.
        var passCommand = this.passes[passState.name];
        if (typeof passCommand !== 'undefined') {
            this._shaderProgram = passCommand.shaderProgram;
            this._uniformMap = passCommand.uniformMap;
            context.draw(this, passState);
        }
    };

    return DrawCommand;
});